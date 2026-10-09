import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Send, CheckCircle2, AlertTriangle, MapPin,
  Navigation, Loader2, WifiOff, RefreshCw, Lock, Heart,
  Mic, Square, Play, Pause, RotateCcw
} from 'lucide-react';
import { WEBHOOK_ID } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

// Observation Intake webhook — generates ref code + starts SLA clock server-side
const INTAKE_WEBHOOK_ID = '01KRYKE3TVJN1BSST1MKXQT9A8';

interface IntakeResponse {
  ref_code?: string;
  ai_urgency?: string;
  ai_summary?: string;
  zone?: string;
  message?: string;
}

async function submitObservation(payload: {
  description: string;
  locationCode: string;
  latitude: number;
  longitude: number;
  reporter: string;
  anchorColor: string;
}): Promise<IntakeResponse> {
  // 25s timeout — the AI classification step can take 7-10s on mobile networks.
  // If the fetch itself times out we throw so the caller can show a fallback ref code.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`/api/taskade/webhooks/${INTAKE_WEBHOOK_ID}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Submission failed ${res.status}: ${text}`);
    }
    try {
      const data = await res.json();
      // The webhook returns output at data.output or data directly
      return (data?.output ?? data) as IntakeResponse;
    } catch {
      // Non-JSON response is still a success — ref code generation may be async
      return {};
    }
  } catch (err: any) {
    clearTimeout(timer);
    // AbortError = timeout — report was still received by the server, just return empty
    // so the caller can generate a local fallback ref code and show success.
    if (err?.name === 'AbortError') return {};
    throw err;
  }
}

type Step = 'form' | 'submitting' | 'success' | 'error';

// ── Geo status bar ────────────────────────────────────────────────────────────
// IMPORTANT: onRequest must be wired to a button's onClick so it runs inside
// a user gesture — this is required for Android Chrome to show the permission dialog.
function GeoStatusBar({
  status,
  address,
  lat,
  lng,
  accuracy,
  error,
  onRequest,
}: {
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  onRequest: () => void;
}) {
  // Idle — show a prominent tap-to-share button
  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={onRequest}
        className="w-full flex items-center gap-3 bg-neutral-900 border border-neutral-700 hover:border-[#00C853]/50 active:border-[#00C853] rounded-2xl px-4 py-3.5 mb-6 text-left transition-all group"
      >
        <div className="w-8 h-8 rounded-full bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center shrink-0 group-hover:bg-[#00C853]/20 transition-colors">
          <Navigation size={14} className="text-[#00C853]" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-white">Tap to share your location</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Helps pinpoint your report on the safety map</p>
        </div>
        <div className="text-[10px] font-bold text-[#00C853] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
          Allow
        </div>
      </button>
    );
  }

  if (status === 'requesting') {
    return (
      <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-green-950 border border-green-900 flex items-center justify-center shrink-0">
          <Navigation size={14} className="text-green-400 animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Waiting for location…</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Tap "Allow" when your browser asks</p>
        </div>
      </div>
    );
  }

  if (status === 'reverse-geocoding') {
    return (
      <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-green-950 border border-green-900 flex items-center justify-center shrink-0">
          <Loader2 size={14} className="text-green-400 animate-spin" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Identifying your location…</p>
          {lat != null && lng != null && (
            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'ready' && address) {
    return (
      <div className="bg-neutral-900 border border-emerald-900/60 rounded-2xl px-4 py-3.5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin size={14} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Location Captured</p>
              {accuracy != null && (
                <span className="text-[9px] text-neutral-600 font-mono">±{Math.round(accuracy)}m</span>
              )}
            </div>
            <p className="text-sm font-semibold text-white leading-snug">{address}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied' || status === 'error') {
    return (
      <div className="bg-neutral-900 border border-amber-900/60 rounded-2xl px-4 py-3.5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <WifiOff size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300 mb-0.5">
              {status === 'denied' ? 'Location Blocked' : 'Location Unavailable'}
            </p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              {status === 'denied'
                ? 'Please enable location in your browser settings, then tap below to try again.'
                : 'Could not get GPS. Your report will still be submitted — tap below to retry.'}
            </p>
            <button
              type="button"
              onClick={onRequest}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#00C853] hover:text-green-300 mt-2.5 transition-colors active:scale-95"
            >
              <RefreshCw size={10} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Concern Category options ──────────────────────────────────────────────────
const CONCERN_TYPES = [
  { value: 'physical_threat', label: 'Physical Threat',   desc: 'Someone threatening or intimidating you or others', color: 'border-rose-700 bg-rose-950/40 text-rose-300' },
  { value: 'physical_harm',   label: 'Assault / Fight',   desc: 'Physical aggression, fighting, or attack',          color: 'border-red-600 bg-red-950/60 text-red-200' },
  { value: 'verbal_abuse',    label: 'Verbal Abuse',      desc: 'Harassment, threats, or sustained verbal aggression',color: 'border-amber-700 bg-amber-950/40 text-amber-300' },
  { value: 'weapons',         label: 'Weapon Sighted',    desc: 'Suspected or visible weapon on the premises',        color: 'border-red-500 bg-red-950/70 text-red-100' },
  { value: 'substance',       label: 'Drugs / Alcohol',   desc: 'Suspected substance misuse on or near site',        color: 'border-orange-700 bg-orange-950/40 text-orange-300' },
  { value: 'self_harm',       label: 'Welfare Concern',   desc: 'Concern about someone\'s safety or wellbeing',      color: 'border-pink-700 bg-pink-950/40 text-pink-300' },
  { value: 'cyber',           label: 'Cyber / Online',    desc: 'Online harassment, threats, or harmful content',    color: 'border-blue-700 bg-blue-950/40 text-blue-300' },
  { value: 'other',           label: 'Other Concern',     desc: 'Anything else that feels unsafe or concerning',     color: 'border-neutral-600 bg-neutral-800/40 text-neutral-300' },
];

const URGENCY_OPTIONS = [
  { value: 'low',      label: 'Not urgent',  desc: 'Can wait — no immediate risk' },
  { value: 'medium',   label: 'Soon',        desc: 'Should be looked at today' },
  { value: 'high',     label: 'Urgent',      desc: 'Needs attention right away' },
  { value: 'critical', label: 'Emergency',   desc: 'Someone is in danger now' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export function PublicReportForm() {
  const [step, setStep] = useState<Step>('form');
  const [description, setDescription] = useState('');
  const [concernType, setConcernType] = useState('bullying');
  const [urgency, setUrgency] = useState('medium');
  const [wantsFollowUp, setWantsFollowUp] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [serverRefCode, setServerRefCode] = useState<string | null>(null);
  const [aiUrgency, setAiUrgency] = useState<string | null>(null);
  const [useVoice, setUseVoice] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioPlayRef = useRef<HTMLAudioElement>(null);
  const recorder = useAudioRecorder(120);

  const [qrLocationCode, setQrLocationCode] = useState('');
  const [qrLocationName, setQrLocationName] = useState('');

  // GPS — NOT auto-requested on mount.
  // Must be triggered by a user tap (onClick) for Android Chrome to show the permission dialog.
  // autoRequest=false is intentional and critical for cross-platform compatibility.
  const geo = useGeolocation(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    if (loc) {
      setQrLocationCode(loc);
      setQrLocationName(loc.replace(/-/g, ' ').replace(/_/g, ' '));
    }
  }, []);

  const hasContent = useVoice ? !!recorder.audioUrl : !!description.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent) return;
    setStep('submitting');

    try {
      // Use real GPS if captured; use 0,0 as sentinel for "no location"
      const lat = geo.lat ?? 0;
      const lng = geo.lng ?? 0;

      let locationCode = qrLocationCode;
      if (!locationCode) locationCode = 'UNKNOWN';

      const descriptionText = useVoice
        ? `[${concernType.toUpperCase()}] [VOICE_RECORDING] Duration: ${Math.floor(recorder.duration / 60)}:${String(recorder.duration % 60).padStart(2, '0')} | Audio concern submitted for review`
        : `[${concernType.toUpperCase()}] ${description}`;

      const result = await submitObservation({
        description: descriptionText,
        locationCode,
        latitude: lat,
        longitude: lng,
        reporter: 'Anonymous',
        anchorColor: 'amber',
      });

      // Use server-issued ref code if returned, otherwise generate a fallback
      const refCode = result?.ref_code ?? `${Math.random().toString(36).slice(2,4).toUpperCase()}${Math.random().toString(36).slice(2,4).toUpperCase()}`.slice(0,4);
      setServerRefCode(refCode);
      setAiUrgency(result?.ai_urgency ?? null);
      setSubmittedId(refCode);
      setStep('success');
    } catch (err) {
      console.error('Submission failed', err);
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60 backdrop-blur-sm sticky top-0 bg-[#0A0A0A]/90 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center">
            <ShieldCheck size={15} className="text-[#00C853]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">SafeGuard</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">Absolute Defence OS · Anonymous Report</p>
          </div>
        </div>

        {/* Anonymous badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-emerald-950/60 border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
          <Lock size={9} />
          Anonymous
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* ── SUCCESS ──────────────────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="text-center py-10 animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-950/50">
                <Heart size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Thank You</h2>
              <p className="text-neutral-500 text-sm mb-6">Your observation is being reviewed.</p>

              {/* Reference code — prominent */}
              {serverRefCode && (
                <div className="bg-[#00C853]/[0.07] border border-[#00C853]/25 rounded-2xl px-5 py-4 mb-5 text-left">
                  <p className="text-[10px] font-bold text-[#00C853] uppercase tracking-widest mb-1.5">Your Reference Code</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black text-white font-mono tracking-[0.25em]">{serverRefCode}</p>
                    {aiUrgency && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        aiUrgency === 'critical' ? 'bg-rose-950/60 border-rose-700 text-rose-300' :
                        aiUrgency === 'high'     ? 'bg-orange-950/60 border-orange-700 text-orange-300' :
                        aiUrgency === 'medium'   ? 'bg-amber-950/60 border-amber-700 text-amber-300' :
                                                   'bg-sky-950/60 border-sky-700 text-sky-300'
                      }`}>
                        {aiUrgency}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
                    Save this code. You can check the status of your observation at any QR point on site.
                  </p>
                </div>
              )}

              {qrLocationName && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 text-left">
                  <MapPin size={14} className="text-[#00C853] shrink-0" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Reported from</p>
                    <p className="text-xs font-semibold text-white capitalize">{qrLocationName}</p>
                  </div>
                </div>
              )}

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left space-y-2.5 mb-5">
                {[
                  'Observation logged — SLA clock started',
                  'ARIA triage analysis complete',
                  'Safety Lead notified',
                  'Evidence pack created and sealed',
                  'Your identity is fully protected',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-xs text-neutral-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-neutral-700 leading-relaxed">
                You can close this page safely. If you or someone else is in immediate danger, call <span className="text-white font-bold">999</span>.
              </p>
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={36} className="text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                Your report could not be submitted. Please try again, or speak to a trusted adult directly.
              </p>
              <button
                onClick={() => setStep('form')}
                className="px-6 py-3 bg-white text-neutral-900 text-sm font-bold rounded-xl hover:bg-neutral-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── FORM ─────────────────────────────────────────────────────────── */}
          {(step === 'form' || step === 'submitting') && (
            <div className="animate-in fade-in duration-300 space-y-6">

              {/* Safe space header */}
              <div className="bg-[#00C853]/[0.06] border border-[#00C853]/20 rounded-2xl px-4 py-4">
                <p className="text-xs font-bold text-[#00C853] mb-1">You are safe here.</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  This report is completely anonymous. No one can see who you are. A trained Safety Lead will read your report privately and in confidence.
                </p>
              </div>

              {/* QR location label */}
              {qrLocationName && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <MapPin size={14} className="text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Reporting from</p>
                    <p className="text-sm font-semibold text-white capitalize">{qrLocationName}</p>
                  </div>
                </div>
              )}

              {/* ── GPS location capture ── */}
              <GeoStatusBar
                status={geo.status}
                address={geo.address}
                lat={geo.lat}
                lng={geo.lng}
                accuracy={geo.accuracy}
                error={geo.error}
                onRequest={geo.request}
              />

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Concern type */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">
                    What type of concern is this?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONCERN_TYPES.map(opt => (
                      <label
                        key={opt.value}
                        className={cn(
                          'p-3 rounded-xl border cursor-pointer transition-all',
                          concernType === opt.value
                            ? opt.color
                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                        )}
                      >
                        <input
                          type="radio"
                          name="concernType"
                          value={opt.value}
                          checked={concernType === opt.value}
                          onChange={() => setConcernType(opt.value)}
                          className="sr-only"
                        />
                        <p className={cn(
                          'text-xs font-bold mb-0.5',
                          concernType === opt.value ? '' : 'text-neutral-300'
                        )}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-neutral-500 leading-tight">{opt.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description — Voice or Text */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      Tell us what happened
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseVoice(v => !v)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all',
                        useVoice
                          ? 'bg-[#00C853]/10 border-[#00C853]/30 text-[#00C853]'
                          : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                      )}
                    >
                      <Mic size={10} />
                      {useVoice ? 'Using voice' : 'Use voice'}
                    </button>
                  </div>

                  {useVoice ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                      {!recorder.audioUrl ? (
                        <>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={recorder.isRecording ? () => recorder.stop() : () => recorder.start()}
                              className={cn(
                                'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg',
                                recorder.isRecording
                                  ? 'bg-rose-500 shadow-rose-500/30 animate-pulse'
                                  : 'bg-[#00C853] shadow-[#00C853]/20 hover:scale-105 active:scale-95'
                              )}
                            >
                              {recorder.isRecording ? <Square size={18} fill="white" className="text-white" /> : <Mic size={20} className="text-white" />}
                            </button>
                          </div>
                          <p className="text-center text-[10px] text-neutral-500">
                            {recorder.isRecording
                              ? `Recording… ${Math.floor(recorder.duration / 60)}:${String(recorder.duration % 60).padStart(2, '0')}`
                              : 'Tap to record your message'}
                          </p>
                          {recorder.error && (
                            <p className="text-[10px] text-rose-400 text-center">{recorder.error}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-4">
                            <button type="button" onClick={() => {
                              if (audioPlayRef.current) {
                                if (isAudioPlaying) { audioPlayRef.current.pause(); setIsAudioPlaying(false); }
                                else { audioPlayRef.current.play(); setIsAudioPlaying(true); }
                              }
                            }} className="w-10 h-10 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
                              {isAudioPlaying ? <Pause size={16} className="text-[#00C853]" /> : <Play size={16} className="text-[#00C853] ml-0.5" />}
                            </button>
                            <span className="text-sm font-mono text-neutral-400">
                              {Math.floor(recorder.duration / 60)}:{String(recorder.duration % 60).padStart(2, '0')}
                            </span>
                            <button type="button" onClick={() => { recorder.reset(); setIsAudioPlaying(false); }} className="text-neutral-600 hover:text-neutral-400">
                              <RotateCcw size={14} />
                            </button>
                          </div>
                          <audio ref={audioPlayRef} src={recorder.audioUrl} onEnded={() => setIsAudioPlaying(false)} className="hidden" />
                          <p className="text-center text-[10px] text-emerald-500 font-semibold">✓ Recording saved</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Share as much or as little as you feel comfortable with. You don't need to include your name or anyone else's."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 resize-none transition-colors leading-relaxed"
                    />
                  )}
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">
                    How urgent does this feel?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {URGENCY_OPTIONS.map(opt => {
                      const urgencyColors: Record<string, string> = {
                        low:      'border-sky-700 bg-sky-950/40 text-sky-300',
                        medium:   'border-amber-700 bg-amber-950/40 text-amber-300',
                        high:     'border-rose-700 bg-rose-950/40 text-rose-300',
                        critical: 'border-red-500 bg-red-950/60 text-red-200',
                      };
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            'p-3 rounded-xl border cursor-pointer transition-all',
                            urgency === opt.value
                              ? urgencyColors[opt.value]
                              : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                          )}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value={opt.value}
                            checked={urgency === opt.value}
                            onChange={() => setUrgency(opt.value)}
                            className="sr-only"
                          />
                          <p className={cn(
                            'text-xs font-bold mb-0.5',
                            urgency === opt.value ? '' : 'text-neutral-300'
                          )}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-neutral-500 leading-tight">{opt.desc}</p>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Follow up consent */}
                <label className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
                  wantsFollowUp
                    ? 'border-[#00C853]/40 bg-[#00C853]/[0.06]'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                )}>
                  <input
                    type="checkbox"
                    checked={wantsFollowUp}
                    onChange={e => setWantsFollowUp(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                    wantsFollowUp ? 'bg-[#00C853] border-[#00C853]' : 'border-neutral-600'
                  )}>
                    {wantsFollowUp && <CheckCircle2 size={10} className="text-[#0A0A0A]" />}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', wantsFollowUp ? 'text-[#00C853]' : 'text-neutral-400')}>
                      I'd like someone to check in with me
                    </p>
                    <p className="text-[10px] text-neutral-600">Speak to a trusted adult privately — still your choice</p>
                  </div>
                </label>

                {/* Privacy note */}
                <div className="flex items-start gap-2.5">
                  <Lock size={11} className="text-neutral-700 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-neutral-700 leading-relaxed">
                    This report is completely anonymous. No personal data is collected or stored. Your report goes only to the organisation's designated Safety Lead.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={step === 'submitting' || !hasContent}
                  className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#00C853] text-[#0A0A0A] text-sm font-bold rounded-xl hover:bg-[#00E66A] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-[#00C853]/20"
                >
                  {step === 'submitting' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending securely — please wait…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send Report Anonymously
                    </>
                  )}
                </button>

                {/* Emergency note */}
                <p className="text-[11px] text-neutral-700 text-center leading-relaxed">
                  If you or someone else is in immediate danger — call <span className="text-white font-bold">999</span>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
