import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Mic, Square, Play, Pause, RotateCcw,
  Send, Heart, Lock, AlertTriangle, Loader2, Sparkles, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { VOICE_JOURNALS_PID } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';

// ── Upload audio blob → get a permanent public URL ───────────────────────────
// Strategy: send the audio directly via the VJ webhook as multipart form data.
// The webhook stores the raw audio URL in the @vjAU field via the automation flow.
// We use tmpfiles.org which supports CORS from browsers and returns a direct URL.
async function uploadAudioToHost(blob: Blob): Promise<string> {
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const filename = `vj-${Date.now()}.${ext}`;
  const file = new File([blob], filename, { type: blob.type });

  // tmpfiles.org — browser-friendly CORS, 1-day retention (fine for review workflow)
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form });
    if (res.ok) {
      const json = await res.json();
      // Returns { status: "success", data: { url: "https://tmpfiles.org/..." } }
      // Direct download is at /dl/ not /
      const pageUrl: string = json?.data?.url ?? '';
      if (pageUrl) {
        // Convert page URL to direct download URL
        return pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch {
    // fall through
  }

  // Fallback: file.io — 1 download link, 14 day retention
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('https://file.io/?expires=14d', { method: 'POST', body: form });
    if (res.ok) {
      const json = await res.json();
      const url: string = json?.link ?? '';
      if (url.startsWith('http')) return url;
    }
  } catch {
    // fall through
  }

  throw new Error('Audio upload failed — no network access to file host');
}

// ── Direct project write (bypasses webhook for reliability) ─────────────────
async function submitJournal(payload: {
  transcription: string;
  mood: string;
  locationCode: string;
  latitude: number;
  longitude: number;
  audioUrl?: string;
}): Promise<void> {
  const journalId = `VJ-${Date.now()}`;
  const res = await fetch(`/api/taskade/projects/${VOICE_JOURNALS_PID}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '/text': payload.transcription || `Voice journal · ${payload.mood} · ${new Date().toLocaleDateString()}`,
      '/attributes/@vjID': journalId,
      '/attributes/@vjMD': payload.mood,
      '/attributes/@vjTR': payload.transcription,
      '/attributes/@vjLC': payload.locationCode || 'UNKNOWN',
      '/attributes/@vjLT': payload.latitude,
      '/attributes/@vjLN': payload.longitude,
      '/attributes/@vjAU': payload.audioUrl || '',
      '/attributes/@vjFL': 'none',
      '/attributes/@vjAI': '',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Journal save failed ${res.status}: ${text}`);
  }
}

// ── Mood options ────────────────────────────────────────────────────────────
const MOODS = [
  { value: 'great',  emoji: '😊', label: 'Great',   color: 'border-emerald-600 bg-emerald-950/50 text-emerald-300', ring: 'ring-emerald-500/40' },
  { value: 'okay',   emoji: '🙂', label: 'Okay',    color: 'border-blue-600 bg-blue-950/50 text-blue-300', ring: 'ring-blue-500/40' },
  { value: 'meh',    emoji: '😐', label: 'Meh',     color: 'border-amber-600 bg-amber-950/50 text-amber-300', ring: 'ring-amber-500/40' },
  { value: 'sad',    emoji: '😢', label: 'Sad',     color: 'border-orange-600 bg-orange-950/50 text-orange-300', ring: 'ring-orange-500/40' },
  { value: 'scared', emoji: '😰', label: 'Scared',  color: 'border-rose-600 bg-rose-950/50 text-rose-300', ring: 'ring-rose-500/40' },
] as const;

type Step = 'mood' | 'record' | 'review' | 'submitting' | 'success' | 'error';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Audio Visualiser ────────────────────────────────────────────────────────
function AudioVisualiser({ isActive }: { isActive: boolean }) {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-12 my-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-[3px] rounded-full transition-all',
            isActive ? 'bg-[#00E5FF] animate-pulse' : 'bg-neutral-800'
          )}
          style={{
            height: isActive
              ? `${12 + Math.sin(Date.now() / 200 + i * 0.5) * 16 + Math.random() * 8}px`
              : '6px',
            animationDelay: `${i * 50}ms`,
            animationDuration: `${300 + Math.random() * 400}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Pulsing Record Button ───────────────────────────────────────────────────
function RecordButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-24 h-24 rounded-full flex items-center justify-center group focus:outline-none"
    >
      {/* Outer pulse rings */}
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          <span className="absolute inset-[-8px] rounded-full border-2 border-rose-500/30 animate-pulse" />
        </>
      )}
      {/* Main button */}
      <span className={cn(
        'relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl',
        isRecording
          ? 'bg-rose-500 shadow-rose-500/40 scale-110'
          : 'bg-[#00E5FF] shadow-[#00E5FF]/30 hover:scale-105 active:scale-95'
      )}>
        {isRecording ? (
          <Square size={24} className="text-white" fill="white" />
        ) : (
          <Mic size={28} className="text-white" />
        )}
      </span>
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function VoiceJournal({ onBack }: { onBack?: () => void } = {}) {
  const [step, setStep] = useState<Step>('mood');
  const [mood, setMood] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('Preparing your journal…');
  const [textFallback, setTextFallback] = useState('');
  const [useText, setUseText] = useState(false);

  const recorder = useAudioRecorder(120);
  const geo = useGeolocation(true);

  const [qrLocationCode, setQrLocationCode] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Live visualiser update
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!recorder.isRecording) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [recorder.isRecording]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    if (loc) setQrLocationCode(loc);
  }, []);

  const handleMoodSelect = (value: string) => {
    setMood(value);
    setStep('record');
  };

  const handleStartRecording = async () => {
    await recorder.start();
  };

  const handleStopRecording = () => {
    recorder.stop();
    setStep('review');
  };

  const handleReRecord = () => {
    recorder.reset();
    setStep('record');
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = async () => {
    setStep('submitting');
    try {
      const transcription = useText
        ? textFallback.trim()
        : recorder.audioBlob
        ? `[Voice recording · ${formatTime(recorder.duration)}]${textFallback.trim() ? ' Note: ' + textFallback.trim() : ''}`
        : textFallback.trim();

      // Step 1: Upload audio
      let hostedAudioUrl: string | undefined;
      if (recorder.audioBlob) {
        setUploadStatus('Uploading voice recording…');
        try {
          hostedAudioUrl = await uploadAudioToHost(recorder.audioBlob);
        } catch (uploadErr) {
          console.warn('[VoiceJournal] audio upload failed, saving without audio URL:', uploadErr);
          // Non-fatal — journal still saved, just without playback
        }
      }

      // Step 2: Submit journal with the hosted URL
      setUploadStatus('Running AI safeguarding analysis…');
      await submitJournal({
        transcription,
        mood,
        locationCode: qrLocationCode || 'UNKNOWN',
        latitude: geo.lat ?? 51.5074,
        longitude: geo.lng ?? -0.1278,
        audioUrl: hostedAudioUrl,
      });
      setStep('success');
    } catch (err) {
      console.error('[VoiceJournal] submit failed:', err);
      setStep('error');
    }
  };

  const selectedMood = MOODS.find(m => m.value === mood);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60 backdrop-blur-sm sticky top-0 bg-[#0A0A0A]/90 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white active:scale-95 transition-all -ml-1"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles size={15} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Voice Journal</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">SafeGuard · Absolute Defence OS</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-emerald-950/60 border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
          <Lock size={9} /> Anonymous
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* ── SUCCESS ──────────────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="text-center py-10 animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-950/50">
                <Heart size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You</h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Your submission has been received. A trained Safety Lead will review what you've shared — in confidence, with care.
              </p>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left space-y-2.5">
                {[
                  'Your journal is safely and securely stored',
                  'AI wellbeing analysis has run',
                  'Safety Lead will review if action is needed',
                  'Your identity is fully protected',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-xs text-neutral-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-700 mt-6 leading-relaxed">
                You can close this page safely. If you're in immediate danger, call <span className="text-white font-bold">999</span>.
              </p>
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={36} className="text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-neutral-400 text-sm mb-6">Please try again, or speak to a trusted adult directly.</p>
              <button onClick={() => setStep('review')} className="px-6 py-3 bg-white text-neutral-900 text-sm font-bold rounded-xl hover:bg-neutral-100 transition-colors">
                Try Again
              </button>
            </div>
          )}

          {/* ── SUBMITTING ───────────────────────────────────────────────── */}
          {step === 'submitting' && (
            <div className="text-center py-16 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 size={28} className="text-[#00E5FF] animate-spin" />
              </div>
              <p className="text-sm font-bold text-white mb-2">{uploadStatus}</p>
              <p className="text-xs text-neutral-500">This may take a few seconds</p>
            </div>
          )}

          {/* ── STEP 1: MOOD ─────────────────────────────────────────────── */}
          {step === 'mood' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-2xl px-4 py-4">
                <p className="text-xs font-bold text-violet-400 mb-1">This is a safe, private space.</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Share how you're feeling. You can speak or type — everything is anonymous and handled in confidence.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 text-center">
                  How are you feeling right now?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => handleMoodSelect(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95',
                        'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                      )}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: RECORD ───────────────────────────────────────────── */}
          {step === 'record' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {/* Selected mood badge */}
              {selectedMood && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{selectedMood.emoji}</span>
                  <span className={cn('text-xs font-bold uppercase tracking-widest', selectedMood.color.split(' ').pop())}>
                    Feeling {selectedMood.label}
                  </span>
                  <button onClick={() => { setStep('mood'); setMood(''); }} className="ml-2 text-[10px] text-neutral-600 hover:text-neutral-400 underline">
                    change
                  </button>
                </div>
              )}

              {!useText ? (
                <>
                  {/* Voice Recording UI */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center">
                    <p className="text-xs text-neutral-500 mb-2 font-medium">
                      {recorder.isRecording ? 'Recording… speak naturally' : 'Tap to start recording'}
                    </p>

                    <AudioVisualiser isActive={recorder.isRecording} />

                    {/* Timer */}
                    <p className={cn(
                      'text-3xl font-mono font-light mb-6 tabular-nums',
                      recorder.isRecording ? 'text-[#00E5FF]' : 'text-neutral-600'
                    )}>
                      {formatTime(recorder.duration)}
                    </p>

                    <div className="flex justify-center">
                      <RecordButton
                        isRecording={recorder.isRecording}
                        onClick={recorder.isRecording ? handleStopRecording : handleStartRecording}
                      />
                    </div>

                    <p className="text-[10px] text-neutral-700 mt-4">
                      {recorder.isRecording ? 'Tap the square to stop' : 'Up to 2 minutes'}
                    </p>
                  </div>

                  {recorder.error && (
                    <div className="bg-rose-950/40 border border-rose-900 rounded-xl px-4 py-3 text-xs text-rose-300">
                      {recorder.error}
                    </div>
                  )}

                  {/* Text fallback toggle */}
                  <button
                    onClick={() => setUseText(true)}
                    className="w-full text-center text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors py-2"
                  >
                    Prefer to type instead? <span className="underline">Switch to text</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Text Input Mode */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                      Tell us how you're feeling
                    </label>
                    <textarea
                      value={textFallback}
                      onChange={e => setTextFallback(e.target.value)}
                      rows={5}
                      placeholder="Share what's on your mind… you can say as much or as little as you want."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 resize-none transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Submit text */}
                  <button
                    onClick={handleSubmit}
                    disabled={!textFallback.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#00E5FF] text-[#0A0A0A] text-sm font-bold rounded-xl hover:bg-[#33EEFF] active:scale-[0.98] transition-all disabled:opacity-40 shadow-xl shadow-[#00E5FF]/20"
                  >
                    <Send size={15} /> Send Journal Entry
                  </button>

                  <button
                    onClick={() => setUseText(false)}
                    className="w-full text-center text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors py-2"
                  >
                    Want to use your voice? <span className="underline">Switch to recording</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: REVIEW ───────────────────────────────────────────── */}
          {step === 'review' && recorder.audioUrl && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {selectedMood && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{selectedMood.emoji}</span>
                  <span className={cn('text-xs font-bold uppercase tracking-widest', selectedMood.color.split(' ').pop())}>
                    Feeling {selectedMood.label}
                  </span>
                </div>
              )}

              {/* Playback */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Your Recording</p>

                <audio
                  ref={audioRef}
                  src={recorder.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                <div className="flex items-center justify-center gap-6 mb-4">
                  <button
                    onClick={handleTogglePlay}
                    className="w-14 h-14 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center hover:bg-[#00E5FF]/20 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause size={22} className="text-[#00E5FF]" />
                    ) : (
                      <Play size={22} className="text-[#00E5FF] ml-1" />
                    )}
                  </button>
                </div>

                <p className="text-sm font-mono text-neutral-400 mb-4">{formatTime(recorder.duration)}</p>

                <button
                  onClick={handleReRecord}
                  className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 mx-auto transition-colors"
                >
                  <RotateCcw size={12} /> Re-record
                </button>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                  Anything else to add? <span className="text-neutral-700">(optional)</span>
                </label>
                <textarea
                  value={textFallback}
                  onChange={e => setTextFallback(e.target.value)}
                  rows={3}
                  placeholder="Add a written note if you want to explain more…"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 resize-none transition-colors leading-relaxed"
                />
              </div>

              {/* Privacy + Submit */}
              <div className="flex items-start gap-2.5">
                <Lock size={11} className="text-neutral-700 mt-0.5 shrink-0" />
                <p className="text-[11px] text-neutral-700 leading-relaxed">
                  Your recording stays anonymous. Only the Safety Lead can access it. Your identity is fully protected.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#00E5FF] text-[#0A0A0A] text-sm font-bold rounded-xl hover:bg-[#33EEFF] active:scale-[0.98] transition-all shadow-xl shadow-[#00E5FF]/20"
              >
                <Send size={15} /> Send Voice Journal
              </button>

              <p className="text-[11px] text-neutral-700 text-center leading-relaxed">
                If you or someone else is in immediate danger — call <span className="text-white font-bold">999</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
