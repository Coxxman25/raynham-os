import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Camera, MapPin, Check, RotateCcw, Mic, Plus } from 'lucide-react';

import {
  getAnchor, getStoredProfile, submitReport, CATEGORIES,
  type Anchor, type Category, type DraftReport,
} from '@/lib/personnel-api';
import { getLocations, type EstateLocation } from '@/lib/estate-api';
import { BrandHeader, PrimaryButton, Skeleton } from './ui.tsx';
import { CreateAnchorSheet, type DevicePosition } from './CreateAnchorSheet';

export function ReportConcern() {
  const { anchorId } = useParams<{ anchorId: string }>();
  const navigate = useNavigate();

  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [loadingAnchor, setLoadingAnchor] = useState(true);
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; source: 'device' | 'anchor' } | null>(null);
  const [devicePosition, setDevicePosition] = useState<DevicePosition | null>(null);
  const [locations, setLocations] = useState<EstateLocation[]>([]);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load anchor.
  useEffect(() => {
    let cancelled = false;
    if (!anchorId) {
      setLoadingAnchor(false);
      return;
    }
    getAnchor(anchorId).then(a => {
      if (cancelled) return;
      setAnchor(a);
      setLoadingAnchor(false);
      // Prime a fallback location from the anchor.
      if (a != null) setLocation({ lat: a.lat, lng: a.lng, source: 'anchor' });
    });
    return () => { cancelled = true; };
  }, [anchorId]);

  useEffect(() => {
    getLocations().then(setLocations).catch(() => setLocations([]));
  }, []);

  // Current GPS is the default. A selected anchor remains useful context, never a gate.
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const timer = setTimeout(() => { /* handled by 5s timeout in options */ }, 5100);
    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(timer);
        const captured = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, capturedAt: new Date(pos.timestamp).toISOString() };
        setDevicePosition(captured);
        setLocation({ lat: captured.lat, lng: captured.lng, source: 'device' });
      },
      () => { clearTimeout(timer); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
    );
    return () => clearTimeout(timer);
  }, []);

  const canSubmit = photo != null && category != null && location != null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !photo || !category || !location) return;
    setSubmitting(true);

    const profile = getStoredProfile();
    const draft: DraftReport = {
      anchorId: anchor?.id ?? null,
      category,
      note: note.trim() || undefined,
      photoUrl: photo.url,
      lat: location.lat,
      lng: location.lng,
      w3w: anchor?.w3w || `${location.lat.toFixed(5)},${location.lng.toFixed(5)}`,
      reportedBy: profile != null ? { name: profile.name, mobile: profile.mobile } : null,
    };

    try {
      const report = await submitReport(draft);
      if (report.queued) {
        toast.info('No signal — your report will send automatically when reconnected.');
      }
      navigate(anchor ? `/a/${anchor.id}/report/sent` : '/field/report/sent', { state: { reportId: report.id } });
    } catch (err) {
      console.error(err);
      toast.error('Could not send report. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <BrandHeader
        trailing={
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--brand-gold)' }}
            aria-label="Report in progress"
          />
        }
      />

      {/* Sub-header with back + centered title */}
      <div className="relative flex items-center h-14 px-2" style={{
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center rounded-full"
          aria-label="Back"
          style={{ color: 'var(--p-text-primary)' }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold" style={{ color: 'var(--p-text-primary)' }}>
          Report a Concern
        </h1>
      </div>

      <main className="flex-1 px-4 pt-4 pb-32 w-full max-w-md mx-auto">
        {loadingAnchor ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <PhotoCapture value={photo} onChange={setPhoto} />

            <fieldset className="mt-5">
              <legend className="text-[15px] font-semibold mb-2.5" style={{ color: 'var(--p-text-primary)' }}>
                What's the issue?
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={active}
                      className="min-h-11 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors"
                      style={{
                        background: active ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
                        color: active ? 'var(--p-text-primary)' : 'var(--p-text-primary)',
                        border: active ? '1px solid var(--brand-gold)' : '1px solid var(--border-strong)',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5">
              <label htmlFor="report-note" className="sr-only">Add a note (optional)</label>
              <div className="relative">
                <input
                  id="report-note"
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full h-12 pl-3.5 pr-11 rounded-[10px] text-[15px] outline-none"
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--p-text-primary)',
                  }}
                  onFocusCapture={e => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)')}
                  onBlurCapture={e => (e.currentTarget.style.boxShadow = 'none')}
                />
                <VoiceButton onTranscript={t => setNote(prev => (prev ? `${prev} ${t}` : t))} />
              </div>
            </div>

            <div className="mt-5 rounded-[10px] p-3.5" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
              <label htmlFor="report-location" className="block text-sm font-semibold" style={{ color: 'var(--p-text-primary)' }}>Where is the concern?</label>
              <select
                id="report-location"
                value={anchor?.id ?? 'current'}
                onChange={async event => {
                  if (event.target.value === 'current') {
                    setAnchor(null);
                    if (devicePosition) setLocation({ lat: devicePosition.lat, lng: devicePosition.lng, source: 'device' });
                    return;
                  }
                  const selected = await getAnchor(event.target.value);
                  setAnchor(selected);
                  if (selected) setLocation({ lat: selected.lat, lng: selected.lng, source: 'anchor' });
                }}
                className="mt-2 w-full min-h-12 px-3 rounded-[10px] text-sm"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', color: 'var(--p-text-primary)' }}
              >
                <option value="current">My current GPS position</option>
                {locations.map(item => <option key={item.id} value={item.id}>{item.name}{item.area ? ` · ${item.area}` : ''}</option>)}
              </select>
              <div className="mt-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: location ? 'var(--status-success)' : 'var(--status-warning-p)' }} aria-hidden />
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--p-text-secondary)' }}>
                  {anchor ? `${anchor.assetName} · ///${anchor.w3w || 'anchor location'}` : location ? `Current GPS · ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Waiting for GPS, or choose an estate anchor'}
                </span>
                {location && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--status-success)' }} aria-label="Location ready" />}
              </div>
              {devicePosition && <button type="button" onClick={() => setAnchorOpen(true)} className="mt-3 min-h-11 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4" style={{ color: 'var(--p-text-primary)' }}><Plus className="w-4 h-4" />Create a new anchor here</button>}
            </div>
          </>
        )}
      </main>

      {/* Sticky submit block */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-5"
        style={{
          background: 'var(--surface-raised)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <p className="text-xs text-center mb-2" style={{ color: 'var(--p-text-muted)' }}>
          Sends to the right team automatically.
        </p>
        <div className="max-w-md mx-auto">
          <PrimaryButton disabled={!canSubmit} loading={submitting} onClick={handleSubmit}>
            Submit Report
          </PrimaryButton>
        </div>
      </div>

      {devicePosition && (
        <CreateAnchorSheet
          open={anchorOpen}
          position={devicePosition}
          profile={getStoredProfile()}
          onClose={() => setAnchorOpen(false)}
          onCreated={async locationRecord => {
            setAnchorOpen(false);
            const refreshed = await getLocations();
            setLocations(refreshed);
            const created = await getAnchor(locationRecord.id);
            setAnchor(created);
            if (created) setLocation({ lat: created.lat, lng: created.lng, source: 'anchor' });
            toast.success('Anchor selected for this report');
          }}
        />
      )}
    </>
  );
}

// ─── Photo capture with camera + file-picker fallback ─────────────────────
function PhotoCapture({
  value, onChange,
}: {
  value: { url: string; blob: Blob } | null;
  onChange: (v: { url: string; blob: Blob } | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => fileInputRef.current?.click();

  const handleFile = useCallback(async (file: File) => {
    try {
      const compressed = await compressImage(file, 1600, 0.7);
      // Revoke the previous blob URL to avoid a leak.
      if (value?.url) URL.revokeObjectURL(value.url);
      const url = URL.createObjectURL(compressed);
      onChange({ url, blob: compressed });
    } catch (err) {
      console.error(err);
      toast.error('Could not read that photo. Please try again.');
    }
  }, [onChange, value]);

  // Clean up the blob URL on unmount.
  useEffect(() => {
    return () => { if (value?.url) URL.revokeObjectURL(value.url); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 2px rgba(46,52,56,0.06)',
      }}
    >
      {value == null ? (
        <button
          type="button"
          onClick={openPicker}
          className="w-full aspect-[16/10] flex flex-col items-center justify-center gap-2"
          style={{ background: 'var(--surface-sunken)' }}
          aria-label="Take a photo"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--brand-gold-soft)' }}
          >
            <Camera className="w-7 h-7" style={{ color: 'var(--brand-gold-hover)' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--p-text-primary)' }}>
            Take a photo
          </span>
          <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
            Tap to open camera
          </span>
        </button>
      ) : (
        <>
          <img
            src={value.url}
            alt="Concern photo"
            className="w-full aspect-[16/10] object-cover"
          />
          <div className="flex justify-center py-2.5" style={{ background: 'var(--surface-raised)' }}>
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 text-sm underline underline-offset-4"
              style={{ color: 'var(--p-text-secondary)' }}
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
          </div>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // Allow selecting the same file twice.
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Compress an image to a max long-edge of `maxEdge` at `quality` JPEG. */
async function compressImage(file: File, maxEdge: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmapSafe(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx == null) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob != null ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    );
  });
}

async function createImageBitmapSafe(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ─── Voice-to-text (Web Speech API where supported) ───────────────────────
function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported] = useState<boolean>(() =>
    typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = 'en-GB';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) onTranscript(transcript);
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop dictation' : 'Dictate a note'}
      className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-md"
      style={{
        color: listening ? 'var(--brand-gold)' : 'var(--p-text-muted)',
        background: listening ? 'var(--brand-gold-soft)' : 'transparent',
      }}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
