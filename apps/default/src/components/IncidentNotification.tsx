import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Zap, X, ArrowRight, MapPin, ShieldCheck, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Incident, updateIncidentStatus } from '@/lib/api';
import { toast } from 'sonner';

interface IncidentNotificationProps {
  incidents: Incident[];
  onOpenAria: (context: string) => void;
  onRefresh?: () => void;
  onViewInMap?: (lat: number, lng: number) => void;
  onOpenRespond?: () => void;
}

interface QueuedNotif {
  id: string;
  incident: Incident;
}

const AUTO_DISMISS_MS = 9000;
const MAX_VISIBLE = 3;
const SEEN_STORAGE_KEY = 'safeguard_seen_incident_ids_v3';

// Timestamp of when this page session started — incidents older than this
// are NEVER shown as notifications, even if not previously seen.
// This is the primary guard against ghost notifications on refresh.
const PAGE_LOAD_TIME = Date.now();

const SEVERITY_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string; tagBg: string }> = {
  critical: {
    label: 'CRITICAL',
    color: 'text-rose-400',
    dot: 'bg-rose-500',
    bg: 'from-rose-500/[0.08] to-transparent border-rose-500/20',
    tagBg: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
  },
  high: {
    label: 'HIGH',
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    bg: 'from-amber-400/[0.07] to-transparent border-amber-400/20',
    tagBg: 'bg-amber-400/10 border-amber-400/25 text-amber-400',
  },
  medium: {
    label: 'MEDIUM',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
    bg: 'from-yellow-400/[0.06] to-transparent border-yellow-400/15',
    tagBg: 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400',
  },
  low: {
    label: 'LOW',
    color: 'text-[#00C853]',
    dot: 'bg-[#00C853]',
    bg: 'from-[#00C853]/[0.06] to-transparent border-[#00C853]/15',
    tagBg: 'bg-[#00C853]/10 border-[#00C853]/25 text-[#00C853]',
  },
};

// ─── Persist seen IDs ─────────────────────────────────────────────────────────
// Uses localStorage (not sessionStorage) so IDs survive page refreshes.

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function persistSeenIds(ids: Set<string>) {
  try {
    const arr = [...ids];
    // Keep last 2000 entries to prevent unbounded growth
    const trimmed = arr.length > 2000 ? arr.slice(arr.length - 2000) : arr;
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({
  notif,
  onDismiss,
  onOpenAria,
  onRefresh,
  onViewInMap,
  onOpenRespond,
}: {
  notif: QueuedNotif;
  onDismiss: (id: string) => void;
  onOpenAria: (context: string) => void;
  onRefresh?: () => void;
  onViewInMap?: (lat: number, lng: number) => void;
  onOpenRespond?: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const [acknowledging, setAcknowledging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        onDismiss(notif.id);
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inc = notif.incident;
  const sev = SEVERITY_CONFIG[inc.severity] ?? SEVERITY_CONFIG.low;
  const cleanDesc = (inc.description || '').replace(/^\[[A-Z_]+\]\s*/, '');
  const displayTitle = cleanDesc.length > 70 ? cleanDesc.slice(0, 70) + '…' : cleanDesc || 'Concern Reported';

  const buildContext = () => {
    const locationStr = inc.locationCode ? `in zone ${inc.locationCode}` : '';
    return `A new ${inc.severity.toUpperCase()}-urgency concern has been reported ${locationStr}. ` +
      `Incident ID: ${inc.incidentId}. ` +
      `Details: ${cleanDesc}. ` +
      `Status: ${inc.status}. As the Safety Lead AI, advise on immediate next steps.`;
  };

  const handleAskAria = () => {
    onOpenAria(buildContext());
    onDismiss(notif.id);
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (acknowledging) return;
    setAcknowledging(true);
    try {
      await updateIncidentStatus(inc.id, 'reviewing');
      toast.success(`${inc.incidentId} acknowledged`, {
        icon: <ShieldCheck size={14} className="text-green-400" />,
      });
      onRefresh?.();
      onDismiss(notif.id);
    } catch {
      toast.error('Failed to acknowledge');
      setAcknowledging(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.22 } }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-[360px] overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      style={{ background: '#0F1117' }}
    >
      <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-b border pointer-events-none', sev.bg)} />
      <div className={cn('absolute top-0 left-0 right-0 h-px', sev.dot)} style={{ opacity: 0.5 }} />

      <div className="relative z-10 px-5 pt-5 pb-4">
        {/* Header — severity + time + dismiss */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
              inc.severity === 'critical' && 'bg-rose-500/10 border border-rose-500/20',
              inc.severity === 'high' && 'bg-amber-400/10 border border-amber-400/20',
              inc.severity === 'medium' && 'bg-yellow-400/10 border border-yellow-400/15',
              inc.severity === 'low' && 'bg-[#00C853]/10 border border-[#00C853]/15'
            )}>
              <Zap size={14} className={sev.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[9px] font-black uppercase tracking-[0.2em]', sev.color)}>{sev.label}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse shrink-0', sev.dot)} />
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">
                New Concern · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
            className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all shrink-0 mt-0.5"
          >
            <X size={11} />
          </button>
        </div>

        {/* Incident ID + Zone Code tags */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-300 tracking-wide">
            {inc.incidentId || 'INC-UNKNOWN'}
          </span>
          {inc.locationCode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-400 tracking-wide">
              <MapPin size={9} className="shrink-0" />
              {inc.locationCode}
            </span>
          )}
          <span className={cn('px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-[0.1em]', sev.tagBg)}>
            {sev.label}
          </span>
        </div>

        {/* Title / description */}
        <p className="text-[13px] font-bold text-white leading-snug mb-3 pr-2">{displayTitle}</p>

        {/* Action row — primary actions */}
        <div className="flex gap-2 mb-2">
          {/* Ask ARIA */}
          <button
            onClick={handleAskAria}
            className={cn(
              'flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group',
              'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10',
              'text-slate-300 hover:text-white'
            )}
          >
            <span className="flex items-center gap-2">
              <Zap size={12} className={cn(sev.color, 'shrink-0')} />
              <span className="text-[10px] uppercase tracking-[0.1em]">Ask ARIA</span>
            </span>
            <ArrowRight size={11} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Quick Acknowledge — only for pending critical/high */}
          {inc.status === 'pending' && (inc.severity === 'critical' || inc.severity === 'high') && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all',
                'bg-[#00C853]/10 border border-[#00C853]/20 text-[#00C853]',
                'hover:bg-[#00C853]/20 hover:border-[#00C853]/40',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'active:scale-95'
              )}
            >
              <ShieldCheck size={13} />
              {acknowledging ? 'Ack…' : 'Ack'}
            </button>
          )}
        </div>

        {/* Secondary row — navigate to map pin or open case in Respond */}
        <div className="flex gap-2">
          {/* View on Map — only if GPS coords exist */}
          {onViewInMap && inc.lat !== 0 && inc.lng !== 0 && (
            <button
              onClick={() => { onViewInMap(inc.lat, inc.lng); onDismiss(notif.id); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all',
                'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.09]',
                'text-[10px] font-semibold text-slate-400 hover:text-slate-200 uppercase tracking-[0.1em]'
              )}
            >
              <Navigation size={11} />
              View on Map
            </button>
          )}

          {/* Open in Respond — always shown */}
          {onOpenRespond && (
            <button
              onClick={() => { onOpenRespond(); onDismiss(notif.id); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all',
                'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.09]',
                'text-[10px] font-semibold text-slate-400 hover:text-slate-200 uppercase tracking-[0.1em]'
              )}
            >
              <MapPin size={11} />
              Open Case
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/[0.04] relative overflow-hidden">
        <div
          className={cn('absolute left-0 top-0 h-full transition-none', sev.dot)}
          style={{ width: `${progress}%`, opacity: 0.5 }}
        />
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IncidentNotification({ incidents, onOpenAria, onRefresh, onViewInMap, onOpenRespond }: IncidentNotificationProps) {
  const [queue, setQueue] = useState<QueuedNotif[]>([]);
  // seenIds persists in localStorage across refreshes — prevents ghost re-fires
  const seenIds = useRef<Set<string>>(loadSeenIds());
  // Track whether we've done the initial seed on this component mount
  const initialSeedDone = useRef(false);

  useEffect(() => {
    if (!incidents || incidents.length === 0) return;

    if (!initialSeedDone.current) {
      // On first load: mark ALL currently-loaded incidents as seen.
      // This suppresses any notification for pre-existing incidents regardless
      // of whether they were in localStorage or not.
      incidents.forEach(inc => seenIds.current.add(inc.id));
      persistSeenIds(seenIds.current);
      initialSeedDone.current = true;
      return;
    }

    // Subsequent loads (polling / manual refresh):
    // Only show notifications for incidents that are:
    //   1. Not previously seen
    //   2. Created AFTER this page session started (prevents old incidents re-notifying)
    const unseen = incidents.filter(inc => {
      if (seenIds.current.has(inc.id)) return false;
      // Age guard: ignore incidents older than when this page loaded
      const incidentTime = inc.createdAt ? new Date(inc.createdAt).getTime() : 0;
      return incidentTime >= PAGE_LOAD_TIME;
    });

    if (unseen.length === 0) {
      // Still mark all as seen to keep the set up-to-date
      incidents.forEach(inc => seenIds.current.add(inc.id));
      persistSeenIds(seenIds.current);
      return;
    }

    unseen.forEach(inc => seenIds.current.add(inc.id));
    incidents.forEach(inc => seenIds.current.add(inc.id));
    persistSeenIds(seenIds.current);

    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = unseen.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
    const toShow = sorted.slice(0, MAX_VISIBLE);

    const newNotifs: QueuedNotif[] = toShow.map(inc => ({
      id: `${inc.id}-${Date.now()}`,
      incident: inc,
    }));

    setQueue(prev => [...prev, ...newNotifs].slice(-MAX_VISIBLE));
  }, [incidents]);

  const dismiss = useCallback((id: string) => {
    setQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="sync">
        {queue.map(notif => (
          <div key={notif.id} className="pointer-events-auto">
            <NotificationCard
              notif={notif}
              onDismiss={dismiss}
              onOpenAria={onOpenAria}
              onRefresh={onRefresh}
              onViewInMap={onViewInMap}
              onOpenRespond={onOpenRespond}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
