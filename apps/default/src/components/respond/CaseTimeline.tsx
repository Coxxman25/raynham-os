/**
 * CaseTimeline — Right panel of Respond mode.
 *
 * Structure:
 *   Case Header (urgency, location, time, type, status)
 *   Action Buttons (Assign, Escalate, View Map, Close Case)
 *   Timeline of Events
 *   Operator Notes
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { type Incident, type SlaCase, updateIncidentStatus } from '@/lib/api';
import {
  MapPin, UserPlus, ArrowUpRight, XCircle,
  Clock, FileText, Shield, Zap, Send, AlertTriangle, CheckCircle, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { summariseIncident, getAnchorType, ANCHOR_LAYER_CONFIG } from '@/lib/incident-utils';

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function cleanDesc(desc?: string): string {
  return desc ? desc.replace(/^\[[A-Z_]+\]\s*/, '') : 'No description';
}

function getConcernTag(desc?: string): string | null {
  const m = desc?.match(/^\[([A-Z_]+)\]/);
  if (!m) return null;
  const map: Record<string, string> = {
    PHYSICAL_THREAT: 'Physical Threat', PHYSICAL_HARM: 'Assault',
    VERBAL_ABUSE: 'Verbal Abuse', WEAPONS: 'Weapon', SUBSTANCE: 'Substance',
    SELF_HARM: 'Welfare', LONE_WORKER: 'Lone Worker', THEFT: 'Theft',
    BULLYING: 'Harassment', CYBER: 'Cyber', OTHER: 'Other',
  };
  return map[m[1]] ?? m[1];
}

const SEV: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: '#FF6B6B', bg: 'rgba(217,45,32,0.10)', border: 'rgba(217,45,32,0.30)', dot: 'bg-[var(--anchor-red)] animate-pulse' },
  high:     { label: 'HIGH', color: '#FFB066', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', dot: 'bg-orange-500' },
  medium:   { label: 'MEDIUM', color: '#FFD166', bg: 'rgba(255,184,0,0.07)', border: 'rgba(255,184,0,0.20)', dot: 'bg-amber-400' },
  low:      { label: 'LOW', color: '#66E5A0', bg: 'rgba(0,200,83,0.07)', border: 'rgba(0,200,83,0.18)', dot: 'bg-emerald-500' },
};

interface TEvent { id: string; time: string; label: string; detail?: string; icon: React.ElementType; color: string; }

function buildTimeline(inc: Incident): TEvent[] {
  const ev: TEvent[] = [];
  const c = inc.createdAt ?? new Date().toISOString();
  ev.push({ id: 'sub', time: formatTime(c), label: 'Report submitted', detail: inc.reporter === 'SOS-AUTO' ? 'SOS emergency activation' : `By ${inc.reporter ?? 'anonymous'}`, icon: FileText, color: 'var(--aria-cyan)' });
  if (inc.locationCode) ev.push({ id: 'loc', time: formatTime(c), label: `Location: ${inc.locationCode}`, detail: inc.location_name, icon: MapPin, color: '#8A9BB0' });
  ev.push({ id: 'tri', time: formatTime(new Date(new Date(c).getTime() + 45000).toISOString()), label: `ARIA classified as ${inc.severity?.toUpperCase() ?? 'MEDIUM'}`, detail: getConcernTag(inc.description) ?? undefined, icon: Zap, color: 'var(--aria-cyan)' });
  if (inc.status === 'reviewing') ev.push({ id: 'asg', time: formatTime(new Date(new Date(c).getTime() + 120000).toISOString()), label: 'Assigned to security team', icon: UserPlus, color: '#FFB066' });
  if (inc.status === 'resolved') ev.push({ id: 'res', time: formatTime(new Date().toISOString()), label: 'Case closed', detail: 'Resolution published', icon: CheckCircle, color: '#66E5A0' });
  return ev;
}

// ─── Action Button ────────────────────────────────────────────────────────────
const CMAP: Record<string, { bg: string; border: string; text: string; hBg: string }> = {
  cyan:    { bg: 'var(--aria-cyan-glow)',  border: 'var(--aria-cyan-dim)', text: 'var(--aria-cyan)', hBg: 'var(--aria-cyan-dim)' },
  amber:   { bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.20)', text: 'var(--anchor-amber)', hBg: 'rgba(217,119,6,0.14)' },
  aria:    { bg: 'var(--aria-cyan-glow)',  border: 'var(--aria-cyan-dim)', text: 'var(--aria-cyan)', hBg: 'var(--aria-cyan-dim)' },
  default: { bg: 'var(--respond-surface)', border: 'var(--respond-border)', text: 'var(--respond-text-secondary)', hBg: 'var(--respond-surface-hover)' },
  muted:   { bg: 'transparent',           border: 'var(--respond-border)', text: 'var(--respond-text-muted)', hBg: 'var(--respond-surface)' },
};

function AB({ label, icon: Icon, color, onClick, loading }: { label: string; icon: React.ElementType; color: string; onClick: () => void; loading?: boolean }) {
  const c = CMAP[color] ?? CMAP.default;
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold tracking-wide transition-all disabled:opacity-40"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      onMouseEnter={e => (e.currentTarget.style.background = c.hBg)}
      onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
    ><Icon size={12} />{label}</button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[280px]">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--aria-cyan-glow)', border: '1px solid var(--aria-cyan-dim)' }}>
          <Shield size={20} style={{ color: 'var(--aria-cyan)' }} />
        </div>
        <h3 className="text-sm font-bold text-[var(--respond-text-muted)] mb-2">Select a case</h3>
        <p className="text-xs text-[var(--respond-text-faint)] leading-relaxed">Choose a case from the queue to view its timeline, take action, and add operator notes.</p>
      </div>
    </div>
  );
}

// ─── Main CaseTimeline ────────────────────────────────────────────────────────
interface CaseTimelineProps { incident: Incident | null; onViewInMap: (lat: number, lng: number) => void; onOpenAria: (ctx: string) => void; onRefresh: () => void; }

export function CaseTimeline({ incident, onViewInMap, onOpenAria, onRefresh }: CaseTimelineProps) {
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState<{ text: string; time: string }[]>([]);
  const timeline = useMemo(() => incident ? buildTimeline(incident) : [], [incident]);

  if (!incident) return <EmptyState />;
  const sev = SEV[incident.severity] ?? SEV.medium;
  const resolved = incident.status === 'resolved';
  const isSos = incident.reporter === 'SOS-AUTO';
  const tag = getConcernTag(incident.description);
  const summary = summariseIncident(incident.description);
  const anchorLayer = getAnchorType(incident.reporter, incident.description);
  const anchorCfg = ANCHOR_LAYER_CONFIG[anchorLayer];
  const ANCHOR_SHORT: Record<string, string> = { red:'ACT', amber:'KNOW', green:'GO', system:'SYS' };

  const act = async (a: 'ack' | 'close') => {
    setUpdating(true);
    try {
      await updateIncidentStatus(incident.id, a === 'ack' ? 'reviewing' : 'resolved');
      toast.success(a === 'ack' ? `${incident.incidentId} acknowledged` : `${incident.incidentId} closed`);
      onRefresh();
    } catch { toast.error('Action failed'); }
    finally { setUpdating(false); }
  };

  const addNote = () => { if (!note.trim()) return; setNotes(p => [...p, { text: note.trim(), time: formatTime(new Date().toISOString()) }]); setNote(''); toast.success('Note added'); };

  return (
    <motion.div key={incident.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar">
      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-5" style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
          <span className={cn('w-2 h-2 rounded-full shrink-0', sev.dot)} />
          <span className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: sev.color }}>{sev.label} — Action Required</span>
          {isSos && <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-[var(--anchor-red)]"><AlertTriangle size={10} />SOS</span>}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-lg font-bold text-[var(--respond-text-primary)] font-mono tracking-wide">{incident.incidentId ?? 'INC-—'}</h2>
            {/* SLA ref code — shown when the case has been processed by the intake flow */}
            {(incident as any).refCode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em]"
                style={{ background: 'var(--aria-cyan-glow)', border: '1px solid var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }}>
                <Tag size={9} />
                REF: {(incident as any).refCode}
              </span>
            )}
            <span className="text-[10px] text-[var(--respond-text-faint)] font-semibold uppercase tracking-widest">{incident.status === 'pending' ? 'Unacknowledged' : incident.status}</span>
            {/* Anchor layer badge */}
            <span
              className="text-[8px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-md ml-auto"
              style={{ background: anchorCfg.bg, border: `1px solid ${anchorCfg.border}`, color: anchorCfg.color }}
            >
              {ANCHOR_SHORT[anchorLayer]} · {anchorCfg.sublabel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--respond-text-muted)] mb-3 flex-wrap">
            <span className="flex items-center gap-1.5"><MapPin size={11} className="text-[var(--respond-text-faint)]" />{incident.location_name ?? incident.locationCode ?? 'Unknown'}</span>
            <span className="flex items-center gap-1.5"><Clock size={11} className="text-[var(--respond-text-faint)]" />{timeAgo(incident.createdAt)} · {formatDate(incident.createdAt)}</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--respond-surface)', color: 'var(--respond-text-muted)' }}>{summary.type}</span>
          </div>

          {/* SLA Deadline strip — only rendered when case data is present */}
          {(() => {
            const slaCase: SlaCase | undefined = (incident as any)._slaCase;
            if (!slaCase) return null;
            const t1 = slaCase.t1Deadline;
            const t2 = slaCase.t2Deadline;
            const now = Date.now();
            const toMins = (iso: string | null) => iso ? Math.round((new Date(iso).getTime() - now) / 60000) : null;
            const t1Mins = toMins(t1);
            const t2Mins = toMins(t2);
            const fmtMins = (m: number | null) => m === null ? '—' : m < 0 ? `${Math.abs(m)}m overdue` : `${m}m`;
            const t1Color = t1Mins === null ? 'var(--respond-text-faint)' : t1Mins < 0 ? '#FF6B6B' : t1Mins < 5 ? '#FFB066' : 'var(--aria-cyan)';
            const t2Color = t2Mins === null ? 'var(--respond-text-faint)' : t2Mins < 0 ? '#FF6B6B' : t2Mins < 15 ? '#FFB066' : 'var(--respond-text-muted)';
            return (
              <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--respond-surface)', border: '1px solid var(--respond-border)' }}>
                <Clock size={11} style={{ color: 'var(--respond-text-faint)', flexShrink: 0 }} />
                <span className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--respond-text-faint)' }}>SLA</span>
                <span className="text-[10px] font-mono" style={{ color: t1Color }}>
                  T1 {fmtMins(t1Mins)}
                </span>
                <span className="text-[var(--respond-border)]">·</span>
                <span className="text-[10px] font-mono" style={{ color: t2Color }}>
                  T2 {fmtMins(t2Mins)}
                </span>
                {slaCase.status === 'acknowledged' && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[#00C853]">Acked</span>
                )}
                {slaCase.status === 'breach' && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[var(--anchor-red)]">⚠ BREACH</span>
                )}
              </div>
            );
          })()}

          <p className="text-[13px] text-[var(--respond-text-secondary)] leading-relaxed">{summary.detail}</p>
        </div>

        {/* Actions */}
        {!resolved && (
          <div className="flex items-center gap-2 flex-wrap">
            {incident.status === 'pending' && <AB label="Acknowledge" icon={Shield} color="cyan" loading={updating} onClick={() => act('ack')} />}
            <AB label="Assign" icon={UserPlus} color="default" onClick={() => toast.info('Assignment — next phase')} />
            <AB label="Escalate" icon={ArrowUpRight} color="amber" onClick={() => toast.info('Escalation — next phase')} />
            <AB label="View Map" icon={MapPin} color="default" onClick={() => onViewInMap(incident.lat, incident.lng)} />
            <AB label="Ask ARIA" icon={Zap} color="aria" onClick={() => onOpenAria(`Analyse case ${incident.incidentId}: ${incident.description}`)} />
            <div className="flex-1" />
            <AB label="Close Case" icon={XCircle} color="muted" loading={updating} onClick={() => act('close')} />
          </div>
        )}
      </div>

      <div className="h-px mx-5" style={{ background: 'var(--respond-border)' }} />

      {/* ── Timeline ── */}
      <div className="px-5 py-5 flex-1">
        <h3 className="text-[10px] font-bold text-[var(--respond-text-faint)] uppercase tracking-[0.15em] mb-5">Case Timeline</h3>
        <div className="relative">
          <div className="absolute left-[7px] top-0 bottom-0 w-px" style={{ background: 'var(--respond-border-strong)' }} />
          <div className="space-y-5">
            {timeline.map(ev => (
              <div key={ev.id} className="flex items-start gap-4 relative">
                <div className="w-[15px] h-[15px] rounded-full shrink-0 flex items-center justify-center z-10" style={{ background: 'var(--surface)', border: `2px solid ${ev.color}` }}>
                  <span className="w-[5px] h-[5px] rounded-full" style={{ background: ev.color }} />
                </div>
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-[var(--respond-text-faint)] tabular-nums">{ev.time}</span>
                    <span className="text-[10px] text-[var(--respond-text-faint)]">·</span>
                    <ev.icon size={11} style={{ color: ev.color, opacity: 0.7 }} />
                  </div>
                  <p className="text-[12px] text-[var(--respond-text-secondary)] font-medium leading-snug">{ev.label}</p>
                  {ev.detail && <p className="text-[11px] text-[var(--respond-text-faint)] mt-0.5">{ev.detail}</p>}
                </div>
              </div>
            ))}
            {notes.map((n, i) => (
              <div key={`n${i}`} className="flex items-start gap-4 relative">
                <div className="w-[15px] h-[15px] rounded-full shrink-0 flex items-center justify-center z-10" style={{ background: 'var(--surface)', border: '2px solid var(--respond-border-strong)' }}>
                  <span className="w-[5px] h-[5px] rounded-full bg-[var(--respond-text-muted)]" />
                </div>
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-[var(--respond-text-faint)] tabular-nums">{n.time}</span>
                    <span className="text-[10px] text-[var(--respond-text-faint)]">·</span>
                    <FileText size={11} className="text-[var(--respond-text-faint)]" />
                    <span className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-widest font-bold">Operator Note</span>
                  </div>
                  <p className="text-[12px] text-[var(--respond-text-muted)] leading-snug">{n.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notes input ── */}
      {!resolved && (
        <div className="shrink-0 px-5 py-4 border-t" style={{ borderColor: 'var(--respond-border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--respond-surface)', border: '1px solid var(--respond-border)' }}>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add operator note…" className="flex-1 bg-transparent text-xs text-[var(--respond-text-secondary)] placeholder:text-[var(--respond-text-faint)] outline-none" />
            <button onClick={addNote} disabled={!note.trim()} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20" style={{ background: note.trim() ? 'var(--aria-cyan-dim)' : 'transparent', color: note.trim() ? 'var(--aria-cyan)' : 'var(--respond-text-faint)' }}><Send size={12} /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
