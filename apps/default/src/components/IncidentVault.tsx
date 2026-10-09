import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Incident,
  updateIncidentStatus,
  bulkUpdateIncidentStatus,
  bulkDeleteIncidents,
  BulkProgressCallback,
  publishResolutionNotice,
} from '@/lib/api';
import {
  ShieldAlert, CheckCircle, Clock,
  Hourglass, MapPin, AlertTriangle, ShieldCheck,
  ChevronDown, ChevronRight, Trash2, CheckCheck, X, Square, CheckSquare,
  Zap, UserCheck, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAcknowledgementChain } from '@/hooks/useAcknowledgementChain';
import { AcknowledgementTimer } from './AcknowledgementTimer';

// ─── Human Override Webhook ───────────────────────────────────────────────────
const OVERRIDE_WEBHOOK_ID = '01KRYKE3TV76SKAVKJ8C7F75GY';

async function submitHumanOverride(payload: {
  observation_id: string;
  ref_code: string;
  ai_urgency: string;
  human_urgency: string;
  operator_name: string;
  reason: string;
  zone_id: string;
}): Promise<void> {
  const res = await fetch(`/api/taskade/webhooks/${OVERRIDE_WEBHOOK_ID}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Override failed: ${res.status}`);
}

// ─── Override Modal ───────────────────────────────────────────────────────────
const URGENCY_LEVELS = [
  { value: 'low',      label: 'Low',      color: 'border-sky-700 bg-sky-950/40 text-sky-300' },
  { value: 'medium',   label: 'Medium',   color: 'border-amber-700 bg-amber-950/40 text-amber-300' },
  { value: 'high',     label: 'High',     color: 'border-rose-700 bg-rose-950/40 text-rose-300' },
  { value: 'critical', label: 'Critical', color: 'border-red-500 bg-red-950/60 text-red-200' },
];

interface OverrideModalProps {
  incident: Incident;
  onClose: () => void;
  onSuccess: () => void;
}

function OverrideModal({ incident, onClose, onSuccess }: OverrideModalProps) {
  const [newUrgency, setNewUrgency] = useState(incident.severity ?? 'medium');
  const [reason, setReason] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !operatorName.trim()) return;
    setSubmitting(true);
    try {
      await submitHumanOverride({
        observation_id: incident.incidentId ?? `obs-${Date.now()}`,
        ref_code: incident.incidentId?.slice(-4)?.toUpperCase() ?? 'UNKN',
        ai_urgency: incident.severity ?? 'medium',
        human_urgency: newUrgency,
        operator_name: operatorName,
        reason,
        zone_id: incident.locationCode ?? 'UNKNOWN',
      });
      toast.success(`Override recorded — ${incident.severity?.toUpperCase()} → ${newUrgency.toUpperCase()} sealed in evidence pack.`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Override failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDifferent = newUrgency !== incident.severity;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm bg-[#12141A] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <UserCheck size={13} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-widest">Human Override</p>
              <p className="text-[9px] text-white/30 font-mono mt-0.5">{incident.incidentId ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={13} className="text-white/50" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* AI classification */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/6">
            <Zap size={11} className="text-[#00E5FF] shrink-0" />
            <div>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">ARIA Classification</p>
              <p className="text-xs font-black text-white/70 uppercase">{incident.severity ?? '—'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-[9px] text-amber-400 font-bold">
              <UserCheck size={9} />
              Override below
            </div>
          </div>

          {/* New urgency */}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">Set Effective Urgency</p>
            <div className="grid grid-cols-2 gap-1.5">
              {URGENCY_LEVELS.map(lvl => (
                <button
                  key={lvl.value}
                  onClick={() => setNewUrgency(lvl.value)}
                  className={cn(
                    'py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all',
                    newUrgency === lvl.value ? lvl.color : 'border-white/8 text-white/30 hover:border-white/20'
                  )}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operator name */}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Your Name</p>
            <input
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              placeholder="Operator / Security Lead name…"
              className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>

          {/* Reason */}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Reason for Override <span className="text-amber-400">*</span></p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Direct observation, CCTV evidence, witness account…"
              rows={3}
              className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Evidence note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-950/20 border border-violet-500/15">
            <Lock size={10} className="text-violet-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-violet-300/60 leading-relaxed">
              This override will be permanently sealed in the evidence pack. It cannot be edited or deleted. Your name and reason will be logged with a timestamp.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim() || !operatorName.trim()}
            className={cn(
              'w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border',
              isDifferent
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40'
                : 'bg-white/5 border-white/10 text-white/40 disabled:opacity-40',
              'disabled:cursor-not-allowed'
            )}
          >
            {submitting ? 'Sealing in evidence pack…' : isDifferent
              ? `Confirm Override → ${newUrgency.toUpperCase()}`
              : 'Confirm (same urgency — note only)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Agent Identity System ────────────────────────────────────────────────────
// Each AI agent has a distinct color identity so operators immediately
// know which intelligence layer processed or is acting on data.

const AGENTS = {
  aria:      { name: 'ARIA',      color: '#00E5FF', bg: 'rgba(0,229,255,0.08)',   border: 'rgba(0,229,255,0.2)',   role: 'Defence Intelligence' },
  sentinel:  { name: 'SENTINEL', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   role: 'Threat Detection' },
  oracle:    { name: 'ORACLE',   color: '#A855F7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', role: 'Pattern Intelligence' },
  guardian:  { name: 'GUARDIAN', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', role: 'Asset Monitoring' },
  chronicle: { name: 'CHRONICLE',color: '#64748B', bg: 'rgba(100,116,139,0.08)',border: 'rgba(100,116,139,0.2)',role: 'Evidence Layer' },
  scribe:    { name: 'SCRIBE',   color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', role: 'Documentation' },
} as const;

type AgentKey = keyof typeof AGENTS;

function AgentBadge({ agent, size = 'sm' }: { agent: AgentKey; size?: 'xs' | 'sm' }) {
  const a = AGENTS[agent];
  return (
    <span
      className={cn('inline-flex items-center gap-1 font-bold uppercase tracking-widest rounded-full border', size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5')}
      style={{ color: a.color, background: a.bg, borderColor: a.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
      {a.name}
    </span>
  );
}

function AgentActionButton({
  agent,
  onClick,
  label = 'Analyse',
  isThinking = false,
}: {
  agent: AgentKey;
  onClick: () => void;
  label?: string;
  isThinking?: boolean;
}) {
  const a = AGENTS[agent];
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border"
      style={{
        color: a.color,
        background: a.bg,
        borderColor: a.border,
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      title={`${a.role}: ${label}`}
    >
      {isThinking ? (
        <motion.span
          className="w-3 h-3 rounded-full"
          style={{ background: a.color }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      ) : (
        <Zap size={11} />
      )}
      {label}
    </motion.button>
  );
}


interface IncidentVaultProps {
  incidents: Incident[];
  search?: string;
  onRefresh: () => void;
  onViewInMap: (lat: number, lng: number) => void;
  onOpenAria?: (context: string) => void;
}

const INITIALS: Record<string, string> = {
  pending: '–',
  reviewing: 'SJ',
  resolved: 'DM',
};

function getConcernTag(description: string): { label: string; color: string } | null {
  const match = description.match(/^\[([A-Z_]+)\]/);
  if (!match) return null;
  const tagMap: Record<string, { label: string; color: string }> = {
    PHYSICAL_THREAT:  { label: 'Physical Threat',  color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    PHYSICAL_HARM:    { label: 'Assault',           color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    VERBAL_ABUSE:     { label: 'Verbal Abuse',      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    WEAPONS:          { label: 'Weapon',            color: 'bg-red-600/10 text-red-300 border-red-600/20' },
    SUBSTANCE:        { label: 'Drugs/Alcohol',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    SELF_HARM:        { label: 'Welfare',           color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    CYBER:            { label: 'Cyber Threat',      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    LONE_WORKER:      { label: 'Lone Worker',       color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    THEFT:            { label: 'Theft',             color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    BULLYING:         { label: 'Harassment',        color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    EMOTIONAL_HARM:   { label: 'Emotional Harm',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    OTHER:            { label: 'Other',             color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
  };
  return tagMap[match[1]] ?? { label: match[1], color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
}

function getSeverityBadge(sev: string) {
  switch (sev) {
    case 'critical': return (
      <span className="px-3 py-1 bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 rounded-full text-[10px] font-bold border border-rose-500/20 dark:border-rose-500/30 uppercase tracking-[0.2em]">Critical</span>
    );
    case 'high': return (
      <span className="px-3 py-1 bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 rounded-full text-[10px] font-bold border border-orange-500/20 dark:border-orange-500/30 uppercase tracking-[0.2em]">High</span>
    );
    case 'medium': return (
      <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-full text-[10px] font-bold border border-amber-500/20 dark:border-amber-500/30 uppercase tracking-[0.2em]">Med</span>
    );
    default: return (
      <span className="px-3 py-1 bg-[#00C853]/10 text-[#00C853] dark:bg-[#00C853]/20 rounded-full text-[10px] font-bold border border-[#00C853]/20 dark:border-[#00C853]/30 uppercase tracking-[0.2em]">Low</span>
    );
  }
}

export function IncidentVault({ incidents: incidentsProp, search = '', onRefresh, onViewInMap, onOpenAria }: IncidentVaultProps) {
  const [overrideTarget, setOverrideTarget] = useState<Incident | null>(null);
  const incidents = incidentsProp ?? [];
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number; succeeded: number; failed: number } | null>(null);

  const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkProgress(null);
  }, []);

  const onProgress: BulkProgressCallback = useCallback((p) => {
    setBulkProgress({ ...p });
  }, []);

  const handleBulkClose = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkProcessing(true);
    setBulkProgress({ completed: 0, total: ids.length, succeeded: 0, failed: 0 });
    try {
      const { succeeded, failed } = await bulkUpdateIncidentStatus(ids, 'resolved', onProgress);
      toast.success(`${succeeded} case${succeeded !== 1 ? 's' : ''} closed${failed > 0 ? ` · ${failed} failed` : ''}`, {
        icon: <CheckCircle size={16} className="text-green-400" />,
      });
      exitSelectionMode();
      onRefresh();
    } catch {
      toast.error('Bulk close failed');
    } finally {
      setBulkProcessing(false);
      setBulkProgress(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkProcessing(true);
    setBulkProgress({ completed: 0, total: ids.length, succeeded: 0, failed: 0 });
    try {
      const { succeeded, failed } = await bulkDeleteIncidents(ids, onProgress);
      toast.success(`${succeeded} case${succeeded !== 1 ? 's' : ''} removed${failed > 0 ? ` · ${failed} failed` : ''}`, {
        icon: <Trash2 size={16} className="text-rose-400" />,
      });
      exitSelectionMode();
      onRefresh();
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkProcessing(false);
      setBulkProgress(null);
    }
  };

  // ── Acknowledgement chain ────────────────────────────────────────────────
  const { ackMap, acknowledge, getCountdown } = useAcknowledgementChain(incidents);

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleAcknowledge = async (inc: Incident) => {
    setUpdatingId(inc.id);
    try {
      acknowledge(inc.id);
      await updateIncidentStatus(inc.id, 'reviewing');
      toast.success(`Case ${inc.incidentId} acknowledged — Safety Lead assigned`, {
        icon: <ShieldCheck size={16} className="text-green-400" />,
      });
      onRefresh();
    } catch {
      toast.error('Failed to acknowledge — please try again');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResolve = async (inc: Incident) => {
    setUpdatingId(inc.id);
    try {
      await updateIncidentStatus(inc.id, 'resolved');
      // Push resolution notice back to Pinboard so public QR portals reflect it
      const shortDesc = (inc.title ?? inc.description ?? 'Observation').slice(0, 80);
      void publishResolutionNotice({
        text: shortDesc,
        zoneCode: inc.locationCode ?? '',
        zoneLabel: inc.location_name ?? inc.locationCode ?? '',
        publishedBy: 'Security Team',
      }).catch(() => { /* non-blocking — resolution notice failure is soft */ });
      toast.success(`Case ${inc.incidentId} closed — resolution published to Pinboard`);
      onRefresh();
    } catch {
      toast.error('Failed to close case');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    return (
      inc.description?.toLowerCase().includes(q) ||
      inc.locationCode?.toLowerCase().includes(q) ||
      inc.severity?.toLowerCase().includes(q) ||
      inc.status?.toLowerCase().includes(q)
    );
  });

  const byDate = (a: Incident, b: Incident) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

  const groups = useMemo(() => [
    {
      key: 'critical',
      label: 'Critical',
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/20',
      bgColor: 'bg-rose-500/5',
      items: filtered.filter(i => i.severity === 'critical' && i.status !== 'resolved').sort(byDate),
    },
    {
      key: 'high',
      label: 'High Priority',
      dotColor: 'bg-orange-500',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      bgColor: 'bg-orange-500/5',
      items: filtered.filter(i => i.severity === 'high' && i.status !== 'resolved').sort(byDate),
    },
    {
      key: 'medium',
      label: 'Medium',
      dotColor: 'bg-amber-400',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-500/5',
      items: filtered.filter(i => i.severity === 'medium' && i.status !== 'resolved').sort(byDate),
    },
    {
      key: 'low',
      label: 'Low / Monitoring',
      dotColor: 'bg-green-400',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/20',
      bgColor: 'bg-green-500/5',
      items: filtered.filter(i => i.severity === 'low' && i.status !== 'resolved').sort(byDate),
    },
    {
      key: 'resolved',
      label: 'Resolved',
      dotColor: 'bg-slate-400',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-200/60 dark:border-white/5',
      bgColor: 'bg-slate-500/5',
      items: filtered.filter(i => i.status === 'resolved').sort(byDate),
    },
  ], [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean> | null>(null);
  const toggleGroup = (key: string, currentIndex: number) =>
    setCollapsedGroups(prev => {
      const base = prev ?? {};
      const current = key in base ? base[key] : currentIndex !== 0;
      return { ...base, [key]: !current };
    });

  const selectedCount = selectedIds.size;
  const allFilteredIds = filtered.map(i => i.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

  return (
    <>
    {/* Human Override Modal */}
    <AnimatePresence>
      {overrideTarget && (
        <OverrideModal
          incident={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSuccess={onRefresh}
        />
      )}
    </AnimatePresence>

    <div className="h-full w-full bg-[#F4F7F9] dark:bg-transparent flex flex-col overflow-auto z-10 animate-in fade-in duration-500 ease-surgical">
      <div className="p-8 pt-6 max-w-[1400px] mx-auto w-full">

        {/* ── Bulk Action Bar ── */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 overflow-hidden"
            >
              <div className="rounded-2xl bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                {/* Progress bar — shown during processing */}
                {bulkProgress && (
                  <div className="px-5 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Processing {bulkProgress.completed} / {bulkProgress.total}
                      </span>
                      <span className="text-[10px] font-bold text-[#00E5FF] tabular-nums">
                        {Math.round((bulkProgress.completed / bulkProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00E5FF] rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                    {bulkProgress.failed > 0 && (
                      <p className="text-[9px] text-amber-400 mt-1 font-semibold">
                        {bulkProgress.succeeded} succeeded · {bulkProgress.failed} retrying…
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex items-center gap-4">
                    {/* Select all toggle */}
                    <button
                      onClick={() => isAllSelected ? deselectAll() : selectAll(allFilteredIds)}
                      disabled={bulkProcessing}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-[#00E5FF] transition-colors disabled:opacity-40"
                    >
                      {isAllSelected
                        ? <CheckSquare size={14} className="text-[#00E5FF]" />
                        : <Square size={14} />
                      }
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </button>

                    <div className="w-px h-5 bg-slate-200 dark:bg-white/10" />

                    <span className="text-xs font-bold text-slate-700 dark:text-white">
                      {bulkProcessing ? 'Processing…' : `${selectedCount} selected`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bulk Close */}
                    <button
                      onClick={handleBulkClose}
                      disabled={selectedCount === 0 || bulkProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#33EEFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCheck size={13} />
                      Close {selectedCount > 0 && !bulkProcessing ? `(${selectedCount})` : ''}
                    </button>

                    {/* Bulk Delete */}
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedCount === 0 || bulkProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                      Delete {selectedCount > 0 && !bulkProcessing ? `(${selectedCount})` : ''}
                    </button>

                    {/* Exit — disabled during processing */}
                    <button
                      onClick={exitSelectionMode}
                      disabled={bulkProcessing}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toggle selection mode button ── */}
        {!selectionMode && filtered.length > 0 && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setSelectionMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#00E5FF]/40 hover:text-[#00E5FF] transition-all"
            >
              <CheckSquare size={13} />
              Manage Cases
            </button>
          </div>
        )}

        {/* ── Accordion groups ── */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
            {incidents.length === 0 ? 'No incidents reported yet.' : 'No results match your search.'}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.filter(g => g.items.length > 0).map((group, groupIndex) => {
              const isCollapsed = collapsedGroups === null
                ? groupIndex !== 0
                : group.key in collapsedGroups ? collapsedGroups[group.key] : groupIndex !== 0;

              const groupSelectedCount = group.items.filter(i => selectedIds.has(i.id)).length;
              const isGroupAllSelected = group.items.length > 0 && groupSelectedCount === group.items.length;

              return (
                <div key={group.key}>
                  {/* Group header */}
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2 transition-all',
                    'hover:bg-slate-100 dark:hover:bg-white/5',
                    group.bgColor
                  )}>
                    {/* Group select checkbox (only in selection mode) */}
                    {selectionMode && !isCollapsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGroupAllSelected) {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              group.items.forEach(i => next.delete(i.id));
                              return next;
                            });
                          } else {
                            selectAll(group.items.map(i => i.id));
                          }
                        }}
                        className="shrink-0"
                      >
                        {isGroupAllSelected
                          ? <CheckSquare size={14} className="text-[#00E5FF]" />
                          : <Square size={14} className="text-slate-400" />
                        }
                      </button>
                    )}

                    <button
                      onClick={() => toggleGroup(group.key, groupIndex)}
                      className="flex-1 flex items-center gap-3"
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', group.dotColor)} />
                      <span className={cn('text-[11px] font-black uppercase tracking-[0.18em]', group.textColor)}>
                        {group.label}
                      </span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', group.textColor, group.borderColor)}>
                        {group.items.length}
                      </span>

                      {selectionMode && groupSelectedCount > 0 && (
                        <span className="text-[10px] font-bold text-[#00E5FF] px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                          {groupSelectedCount} selected
                        </span>
                      )}

                      <div className="ml-auto">
                        {isCollapsed
                          ? <ChevronRight size={14} className="text-slate-400" />
                          : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pb-2">
                          {group.items.map(inc => {
              const initials = INITIALS[inc.status] ?? 'SJ';
              const isResolved = inc.status === 'resolved';
              const isReviewing = inc.status === 'reviewing';
              const needsChain = (inc.severity === 'critical' || inc.severity === 'high') && inc.status === 'pending';
              const ackState = ackMap[inc.id];
              const countdown = needsChain && ackState && !ackState.acknowledged ? getCountdown(inc.id) : null;
              const isExpanded = expandedId === inc.id;
              const tag = getConcernTag(inc.description || '');
              const cleanDesc = (inc.description || '').replace(/^\[[A-Z_]+\]\s*/, '');
              const isSelected = selectedIds.has(inc.id);

              const rowBorder =
                isSelected ? 'border-[#00E5FF]/40 dark:border-[#00E5FF]/40 bg-[#00E5FF]/[0.03]' :
                countdown?.phase === 'breached' ? 'border-red-600/30 dark:border-red-600/30' :
                countdown?.phase === 'tier2'    ? 'border-orange-600/25 dark:border-orange-600/25' :
                countdown?.phase === 'tier1'    ? 'border-green-700/20 dark:border-green-700/20' :
                                                  'border-slate-200/60 dark:border-white/5';

              return (
                <motion.div
                  key={inc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      'glass-panel rounded-[1.75rem] border transition-all duration-300 cursor-pointer group',
                      rowBorder,
                      isExpanded ? 'shadow-lg' : 'hover:bg-white dark:hover:bg-[#1A1C23] shadow-sm',
                    )}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelect(inc.id);
                      } else {
                        setExpandedId(isExpanded ? null : inc.id);
                      }
                    }}
                  >
                    <div className="flex items-center p-6">

                      {/* Selection checkbox */}
                      {selectionMode && (
                        <div className="shrink-0 mr-4">
                          <div className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-[#00E5FF] border-[#00E5FF]'
                              : 'border-slate-300 dark:border-slate-600 group-hover:border-[#00E5FF]/60'
                          )}>
                            {isSelected && <CheckCircle size={12} className="text-slate-900" />}
                          </div>
                        </div>
                      )}

                      {/* Severity + time */}
                      <div className="w-28 shrink-0 text-center border-r border-slate-200 dark:border-white/10 pr-6">
                        {getSeverityBadge(inc.severity)}
                        <span
                          className="text-[10px] mt-2 block tabular-nums tracking-wider"
                          style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted, #64748B)' }}
                        >
                          {inc.createdAt
                            ? new Date(inc.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                        <span
                          className="text-[9px] block mt-0.5 tabular-nums"
                          style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted, #64748B)', opacity: 0.6 }}
                        >
                          {inc.incidentId ?? ''}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="flex-1 px-8 min-w-0">
                        {tag && (
                          <span className={cn('inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider mb-1', tag.color)}>
                            {tag.label}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#00E5FF] transition-colors line-clamp-1">
                          {cleanDesc || '—'}
                        </h4>
                        <p
                          className="text-[10px] mt-1 uppercase tracking-widest"
                          style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted, #64748B)' }}
                        >
                          {inc.locationCode || 'Unknown'}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="w-52 px-6 border-l border-slate-200 dark:border-white/10 flex flex-col justify-center shrink-0">
                        {isResolved ? (
                          <div className="flex items-center gap-2 text-[#00E5FF]">
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Case Closed</span>
                          </div>
                        ) : isReviewing ? (
                          <div className="flex items-center gap-2 text-amber-500">
                            <Hourglass size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Under Review</span>
                          </div>
                        ) : countdown ? (
                          <div className="flex items-center gap-2">
                            {countdown.phase === 'breached' ? (
                              <AlertTriangle size={12} className="text-red-400 shrink-0" />
                            ) : (
                              <Clock size={12} className={countdown.phase === 'tier2' ? 'text-orange-400' : 'text-green-400'} />
                            )}
                            <div>
                              <span className={cn(
                                'text-[10px] font-black uppercase tracking-widest block',
                                countdown.phase === 'breached' ? 'text-red-400' :
                                countdown.phase === 'tier2' ? 'text-orange-400' : 'text-green-400'
                              )}>
                                {countdown.phase === 'breached' ? 'BREACHED' :
                                 countdown.phase === 'tier2' ? 'Escalated' : 'Pending Ack'}
                              </span>
                              {countdown.phase !== 'breached' && (
                                <span className="text-[9px] text-white/30 tabular-nums font-mono">
                                  {Math.ceil(countdown.remainingMs / 1000 / 60)}m left
                                </span>
                              )}
                            </div>
                          </div>
                        ) : needsChain ? (
                          <div className="flex items-center gap-2 text-rose-500">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Urgent Review</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Pending</span>
                          </div>
                        )}
                      </div>

                      {/* Assignee avatar */}
                      <div className="w-12 flex justify-end shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1A1C23] flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 group-hover:border-[#00E5FF]/50 transition-colors">
                          {initials}
                        </div>
                      </div>

                      {/* Quick actions (hover — hidden in selection mode) */}
                      {!selectionMode && (
                        <div className="flex gap-2 items-center justify-end shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-4 border-l border-slate-200 dark:border-white/10 pl-6">
                          {/* Ask ARIA — with Agent Identity badge */}
                          {onOpenAria && (
                            <AgentActionButton
                              agent="aria"
                              label="ARIA"
                              onClick={() => {
                                const ctx = `Incident ${inc.incidentId} in zone ${inc.locationCode || 'Unknown'}. Severity: ${inc.severity.toUpperCase()}. Status: ${inc.status}. Details: ${cleanDesc}. Please analyse this incident and advise on appropriate next steps.`;
                                onOpenAria(ctx);
                              }}
                            />
                          )}

                          {/* Human Override — triage correction */}
                          {inc.status !== 'resolved' && (
                            <motion.button
                              onClick={e => { e.stopPropagation(); setOverrideTarget(inc); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/40"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              title="Override AI triage — log to evidence pack"
                            >
                              <UserCheck size={11} />
                              Override
                            </motion.button>
                          )}

                          {(() => {
                            const hasCoords =
                              typeof inc.lat === 'number' && typeof inc.lng === 'number' &&
                              !isNaN(inc.lat) && !isNaN(inc.lng) &&
                              !(inc.lat === 0 && inc.lng === 0) &&
                              Math.abs(inc.lat) <= 90 && Math.abs(inc.lng) <= 180;
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); onViewInMap(inc.lat, inc.lng); }}
                                title={hasCoords ? 'View on Map' : 'No GPS data captured for this incident'}
                                className={cn(
                                  'flex items-center justify-center w-8 h-8 rounded-xl transition-colors',
                                  hasCoords
                                    ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-[#00E5FF]/10 hover:text-[#00E5FF]'
                                    : 'bg-slate-100/50 dark:bg-white/[0.03] text-slate-400/40 dark:text-slate-600/40 cursor-not-allowed'
                                )}
                              >
                                <MapPin size={14} />
                              </button>
                            );
                          })()}

                          {inc.status === 'pending' && !countdown && (
                            <button
                              disabled={updatingId === inc.id}
                              onClick={e => { e.stopPropagation(); handleAcknowledge(inc); }}
                              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-xl hover:scale-105 transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                              Assign Lead
                            </button>
                          )}

                          {inc.status === 'reviewing' && (
                            <button
                              disabled={updatingId === inc.id}
                              onClick={e => { e.stopPropagation(); handleResolve(inc); }}
                              className="px-4 py-2 bg-[#00E5FF] text-[#12141A] text-[10px] font-bold rounded-xl hover:scale-105 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50"
                            >
                              Close Case
                            </button>
                          )}

                          {inc.status === 'resolved' && (
                            <span className="text-[10px] font-bold text-slate-400 px-4 uppercase tracking-widest">Archived</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Expanded: acknowledgement timer ── */}
                    {!selectionMode && (
                      <AnimatePresence>
                        {isExpanded && countdown && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 border-t border-white/5 pt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <ShieldAlert size={12} className="text-white/30" />
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
                                  Acknowledgement Chain · {inc.incidentId}
                                </span>
                              </div>
                              <AcknowledgementTimer
                                remainingMs={countdown.remainingMs}
                                totalMs={countdown.totalMs}
                                tier={countdown.tier}
                                phase={countdown.phase}
                                percentLeft={countdown.percentLeft}
                                onAcknowledge={() => {
                                  handleAcknowledge(inc);
                                  setExpandedId(null);
                                }}
                                isUpdating={updatingId === inc.id}
                                isServerAnchored={countdown.isServerAnchored}
                                windowLabel={countdown.windowLabel}
                              />
                            </div>
                          </motion.div>
                        )}

                        {isExpanded && !countdown && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 border-t border-white/5 pt-4">
                              <div className="flex items-start gap-6">
                                <div className="flex-1">
                                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">Full Description</p>
                                  <p className="text-sm text-white/70 leading-relaxed">{inc.description || '—'}</p>
                                </div>
                                <div className="shrink-0 flex flex-col gap-2">
                                  {inc.status === 'reviewing' && (
                                    <button
                                      disabled={updatingId === inc.id}
                                      onClick={e => { e.stopPropagation(); handleResolve(inc); }}
                                      className="px-5 py-2.5 bg-[#00E5FF] text-[#12141A] text-[10px] font-bold rounded-xl hover:scale-105 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50"
                                    >
                                      Close Case
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Ask ARIA from expanded view — agent identity */}
                              {onOpenAria && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const ctx = `Incident ${inc.incidentId} in zone ${inc.locationCode || 'Unknown'}. Severity: ${inc.severity.toUpperCase()}. Status: ${inc.status}. Full details: ${inc.description}. Please provide a full analysis, risk assessment, and recommended response protocol.`;
                                    onOpenAria(ctx);
                                  }}
                                  className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group border"
                                  style={{ background: AGENTS.aria.bg, borderColor: AGENTS.aria.border }}
                                >
                                  <span className="flex items-center gap-3">
                                    {/* Pulsing ARIA avatar */}
                                    <motion.div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center border"
                                      style={{ background: AGENTS.aria.bg, borderColor: AGENTS.aria.border }}
                                      animate={{ boxShadow: [`0 0 0px ${AGENTS.aria.color}00`, `0 0 8px ${AGENTS.aria.color}60`, `0 0 0px ${AGENTS.aria.color}00`] }}
                                      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                                    >
                                      <Zap size={12} style={{ color: AGENTS.aria.color }} />
                                    </motion.div>
                                    <span className="flex flex-col">
                                      <AgentBadge agent="aria" size="xs" />
                                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors mt-0.5">
                                        Full incident analysis + response protocol
                                      </span>
                                    </span>
                                  </span>
                                  <ChevronRight size={13} style={{ color: AGENTS.aria.color }} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </motion.div>
              );
            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
