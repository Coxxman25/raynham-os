import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ShieldCheck, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createCheckIn, endSafetySession } from '@/lib/estate-api';
import type { StaffProfile } from '@/lib/personnel-api';
import type { DevicePosition } from './CreateAnchorSheet';

type Session = { id: string; startedAt: string; lastAt: string; nextAt: string; interval: number; lastRecordId: string };
const STORAGE_KEY = 'raynham-lone-worker-session';
const readSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
const sessionId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function SafetySessionCard({ profile, position, locationName, what3words, onIdentify }: { profile: StaffProfile | null; position: DevicePosition | null; locationName: string; what3words: string; onIdentify: () => void }) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [interval, setIntervalMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const overdue = Boolean(session && new Date(session.nextAt).getTime() < now);
  const freshness = useMemo(() => session ? relativeTime(session.lastAt, now) : '', [session, now]);

  const record = async (id: string, startedAt: string, minutes: number) => {
    if (!profile) { onIdentify(); toast.info('Identify yourself before starting a safety session.'); return; }
    setSaving(true);
    try {
      const freshPosition = await capturePosition(position);
      const capturedAt = freshPosition.capturedAt;
      const nextAt = new Date(new Date(capturedAt).getTime() + minutes * 60000).toISOString();
      const saved = await createCheckIn({ workerName: profile.name, location: locationName, what3words, lat: freshPosition.lat, lng: freshPosition.lng, status: 'checked_in', workMode: 'lone', capturedAt, accuracyMeters: freshPosition.accuracy, locationSource: 'live_gps', nextCheckIn: nextAt, intervalMinutes: minutes, sessionId: id });
      const next = { id, startedAt, lastAt: capturedAt, nextAt, interval: minutes, lastRecordId: saved.id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSession(next);
      toast.success(session ? 'Safety check-in recorded' : 'Lone-working session started');
    } catch { toast.error('Check-in could not be saved. Stay in contact with your manager.'); }
    finally { setSaving(false); }
  };

  const start = () => { const startedAt = new Date().toISOString(); void record(sessionId(), startedAt, interval); };
  const checkIn = () => { if (session) void record(session.id, session.startedAt, session.interval); };
  const end = async () => {
    if (!session) return; setSaving(true);
    try { await endSafetySession(session.lastRecordId, new Date().toISOString()); localStorage.removeItem(STORAGE_KEY); setSession(null); toast.success('Session ended. You are marked off duty.'); }
    catch { toast.error('Session could not be ended. Contact your manager.'); }
    finally { setSaving(false); }
  };

  if (!session) return <section className="mt-4 rounded-[14px] p-4" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}><div className="flex gap-3"><span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--status-warning-soft)', color: 'var(--status-warning-p)' }}><ShieldCheck className="w-5 h-5" /></span><div><h2 className="font-semibold">Working alone?</h2><p className="mt-1 text-sm" style={{ color: 'var(--p-text-secondary)' }}>Start an explicit check-in session. This browser does not track you in the background.</p></div></div><label className="block mt-4 text-xs font-semibold" htmlFor="check-in-interval">Check-in every</label><select id="check-in-interval" value={interval} onChange={e => setIntervalMinutes(Number(e.target.value))} className="mt-1 w-full min-h-11 rounded-lg px-3" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select><button type="button" disabled={saving} onClick={start} className="mt-3 w-full min-h-11 rounded-lg font-semibold text-white disabled:opacity-60" style={{ background: 'var(--status-warning-p)' }}>{saving ? 'Saving check-in…' : 'Start lone-working session'}</button></section>;

  return <section className="mt-4 rounded-[14px] p-4" style={{ background: overdue ? 'var(--status-danger-soft)' : 'var(--status-warning-soft)', border: `1px solid ${overdue ? 'var(--status-danger)' : 'var(--status-warning-p)'}` }}><div className="flex items-start gap-3"><span style={{ color: overdue ? 'var(--status-danger)' : 'var(--status-warning-p)' }}>{overdue ? <Clock3 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}</span><div className="min-w-0"><h2 className="font-semibold">{overdue ? 'Check-in overdue' : 'Lone-working session active'}</h2><p className="mt-1 text-sm" style={{ color: 'var(--p-text-secondary)' }}>Last explicit GPS check-in {freshness}. {overdue ? 'Check in now or contact your manager.' : `Next due ${formatTime(session.nextAt)}.`}</p><p className="mt-1 text-xs" style={{ color: 'var(--p-text-muted)' }}>No continuous background tracking</p></div></div><button type="button" disabled={saving} onClick={checkIn} className="mt-4 w-full min-h-11 rounded-lg font-semibold text-white disabled:opacity-60" style={{ background: overdue ? 'var(--status-danger)' : 'var(--status-warning-p)' }}>{saving ? 'Saving…' : 'Check in with fresh GPS'}</button><button type="button" disabled={saving} onClick={end} className="mt-2 w-full min-h-11 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ border: '1px solid var(--border-subtle)' }}><StopCircle className="w-4 h-4" />End session</button></section>;
}

function relativeTime(iso: string, now: number) { const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000)); return minutes < 1 ? 'just now' : `${minutes} min ago`; }
function formatTime(iso: string) { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
function capturePosition(fallback: DevicePosition | null): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { if (fallback) resolve(fallback); else reject(new Error('GPS unavailable')); return; }
    navigator.geolocation.getCurrentPosition(
      point => resolve({ lat: point.coords.latitude, lng: point.coords.longitude, accuracy: point.coords.accuracy, capturedAt: new Date(point.timestamp).toISOString() }),
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
