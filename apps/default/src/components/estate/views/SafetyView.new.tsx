import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, MapPin, Radio, Shield, UserRoundX } from 'lucide-react';
import { getCheckIns, type SafetyCheckIn } from '@/lib/estate-api';

type Truth = 'current' | 'due' | 'stale' | 'off';
const truthFor = (checkIn: SafetyCheckIn, now: number): Truth => {
  if (checkIn.workMode === 'off_duty') return 'off';
  if (!checkIn.capturedAt) return checkIn.status === 'escalated' ? 'stale' : checkIn.status === 'overdue' ? 'due' : 'stale';
  if (checkIn.status === 'escalated') return 'stale';
  if (checkIn.nextCheckIn && new Date(checkIn.nextCheckIn).getTime() < now) return 'due';
  const age = now - new Date(checkIn.capturedAt).getTime();
  return age <= Math.max((checkIn.intervalMinutes || 60) * 60000, 15 * 60000) ? 'current' : 'stale';
};
const CONFIG: Record<Truth, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  current: { label: 'Current', color: 'var(--status-operational)', icon: CheckCircle2 },
  due: { label: 'Check-in due', color: 'var(--status-maintenance)', icon: Clock3 },
  stale: { label: 'Needs attention', color: 'var(--status-critical)', icon: AlertTriangle },
  off: { label: 'Off duty', color: 'var(--text-muted)', icon: UserRoundX },
};

export function Safety() {
  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const fetchData = useCallback(async () => { setCheckIns(await getCheckIns()); setLoading(false); setNow(Date.now()); }, []);
  useEffect(() => { fetchData(); const timer = window.setInterval(fetchData, 15000); return () => window.clearInterval(timer); }, [fetchData]);
  const latest = useMemo(() => {
    const bySession = new Map<string, SafetyCheckIn>();
    checkIns.forEach(item => { const key = item.sessionId || item.workerName || item.id; const previous = bySession.get(key); if (!previous || time(item.capturedAt) >= time(previous.capturedAt)) bySession.set(key, item); });
    return [...bySession.values()].sort((a, b) => priority(truthFor(a, now)) - priority(truthFor(b, now)) || time(b.capturedAt) - time(a.capturedAt));
  }, [checkIns, now]);
  const counts = latest.reduce((all, item) => ({ ...all, [truthFor(item, now)]: all[truthFor(item, now)] + 1 }), { current: 0, due: 0, stale: 0, off: 0 });

  return <div className="h-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}><header className="px-4 py-5"><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brass)' }}>Safety operations</p><h1 className="mt-1 text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Lone-worker sessions</h1><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Only explicit check-ins are shown. Browser GPS is not continuous background tracking.</p></header><section className="px-4 grid grid-cols-3 gap-2 mb-4"><StatusCard label="Current" value={counts.current} truth="current" /><StatusCard label="Due" value={counts.due} truth="due" /><StatusCard label="Attention" value={counts.stale} truth="stale" /></section><div className="px-4 pb-5 space-y-2.5">{loading ? [1, 2, 3].map(i => <div key={i} className="shimmer rounded-2xl h-24" />) : latest.length === 0 ? <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}><Shield className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm font-semibold">No safety sessions yet</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Workers can start one from the field screen.</p></div> : latest.map(item => <SessionCard key={`${item.sessionId}-${item.id}`} item={item} truth={truthFor(item, now)} now={now} />)}</div></div>;
}

function StatusCard({ label, value, truth }: { label: string; value: number; truth: Truth }) { const config = CONFIG[truth]; const Icon = config.icon; return <div className="rounded-2xl p-3 flex flex-col items-center gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}><Icon className="w-5 h-5" style={{ color: config.color }} /><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p></div>; }

function SessionCard({ item, truth, now }: { item: SafetyCheckIn; truth: Truth; now: number }) { const config = CONFIG[truth]; const Icon = config.icon; const namedLocation = item.location || 'Location not named'; const source = item.locationSource === 'live_gps' ? `Explicit GPS${item.accuracyMeters ? ` ±${Math.round(item.accuracyMeters)} m` : ''}` : item.locationSource ? item.locationSource.replace('_', ' ') : 'Source not recorded'; return <article className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: `1px solid ${truth === 'stale' ? config.color : 'var(--surface-border)'}` }}><div className="flex items-start gap-3"><span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold" style={{ background: config.color }}>{item.workerName ? item.workerName.charAt(0).toUpperCase() : '?'}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold truncate">{item.workerName || 'Unnamed worker'}</h2><span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ color: config.color, background: `${config.color}22` }}>{config.label}</span></div><p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><MapPin className="w-3 h-3" />{namedLocation}</p><p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--text-faint)' }}><Radio className="w-3 h-3" />{item.capturedAt ? `${source} · ${relative(item.capturedAt, now)}` : 'No capture time recorded'}</p>{item.nextCheckIn && truth !== 'off' && <p className="mt-1 text-xs" style={{ color: truth === 'due' ? config.color : 'var(--text-faint)' }}>Next explicit check-in {dueLabel(item.nextCheckIn, now)}</p>}</div><Icon className="w-5 h-5 shrink-0" style={{ color: config.color }} /></div></article>; }

function time(iso: string) { const value = new Date(iso).getTime(); return Number.isFinite(value) ? value : 0; }
function priority(truth: Truth) { return truth === 'stale' ? 0 : truth === 'due' ? 1 : truth === 'current' ? 2 : 3; }
function relative(iso: string, now: number) { const minutes = Math.max(0, Math.floor((now - time(iso)) / 60000)); return minutes < 1 ? 'captured just now' : `captured ${minutes} min ago`; }
function dueLabel(iso: string, now: number) { const minutes = Math.round((time(iso) - now) / 60000); if (minutes < 0) return `${Math.abs(minutes)} min overdue`; if (minutes < 1) return 'due now'; return `due in ${minutes} min`; }
