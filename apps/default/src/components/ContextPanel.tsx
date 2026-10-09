/**
 * ContextPanel — Phase 6 complete rebuild.
 *
 * Opens when a location pin is selected (380px right overlay).
 * Matches the approved mockup:
 *   • Anchor-coloured accent bar across the top
 *   • Prominent stats: Critical / High / Active Since
 *   • ARIA auto-summary card with typewriter animation
 *   • Inline "Ask ARIA…" input
 *   • Quick Actions: Declare Emergency · Dispatch · View Cases
 *   • Recent incidents list
 *   • Full ARIA chat mode (tab switch)
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Zap, MapPin, AlertCircle,
  ArrowLeft, ExternalLink, Clock, ShieldAlert,
  Users, FileText, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Location, type Incident, type VoiceJournal } from '@/lib/api';
import { type AnchorType } from '@/lib/api';
import { AriaDrawer } from './AriaDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode = 'location' | 'aria';

interface ContextPanelProps {
  isOpen: boolean;
  locationCode: string | null;
  locations: Location[];
  incidents: Incident[];
  voiceJournals: VoiceJournal[];
  onClose: () => void;
  onViewInMap: (lat: number, lng: number) => void;
  onRefresh: () => void;
  onOpenAria: (context?: string) => void;
  onLogConcern: (locationCode: string) => void;
}

// ─── Anchor colour palette ────────────────────────────────────────────────────

const ANCHOR_ACCENT: Record<AnchorType, { solid: string; bg: string; border: string; label: string }> = {
  red:   { solid: '#C0392B', bg: 'rgba(192,57,43,0.12)',  border: 'rgba(192,57,43,0.35)',  label: 'SOS ANCHOR' },
  amber: { solid: '#FFB800', bg: 'rgba(255,184,0,0.10)',  border: 'rgba(255,184,0,0.35)',  label: 'HAZARD ANCHOR' },
  green: { solid: '#00C853', bg: 'rgba(0,200,83,0.10)',   border: 'rgba(0,200,83,0.35)',   label: 'SAFE ANCHOR' },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-rose-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-emerald-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d?: string): string {
  if (!d) return '—';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function activeSince(incidents: Incident[]): string {
  if (!incidents.length) return '—';
  const oldest = incidents.reduce((a, b) =>
    new Date(a.createdAt ?? 0) < new Date(b.createdAt ?? 0) ? a : b
  );
  if (!oldest.createdAt) return '—';
  return new Date(oldest.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function buildAriaContext(loc: Location, critical: number, open: number, sos: number): string {
  if (critical > 0)
    return `Threat assessment for ${loc.code}: ${critical} critical incident${critical !== 1 ? 's' : ''} require immediate attention. ${open} case${open !== 1 ? 's' : ''} remain open.${sos > 0 ? ` ${sos} SOS activation${sos !== 1 ? 's' : ''} recorded.` : ''} ${loc.anchorTypes.includes('red') ? 'Emergency protocols active — recommend immediate personnel deployment and lockdown review.' : 'Recommend priority case review.'}`;
  if (open > 0)
    return `Zone ${loc.code} is operational with ${open} pending case${open !== 1 ? 's' : ''}. Risk level is ${loc.risk}. No immediate escalation required — standard monitoring active.`;
  return `Zone ${loc.code} clear. No active incidents recorded. All systems nominal. Standard surveillance protocols apply.`;
}

// ─── ARIA Auto-Summary Card ───────────────────────────────────────────────────

function AriaAutoSummary({
  summary,
  onAskMore,
}: {
  summary: string;
  onAskMore: (q: string) => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const [thinking, setThinking] = useState(true);
  const [input, setInput] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setThinking(true);
    idx.current = 0;
    const thinkTimer = setTimeout(() => {
      setThinking(false);
      const typeTimer = setInterval(() => {
        idx.current += 2;
        setDisplayed(summary.slice(0, idx.current));
        if (idx.current >= summary.length) clearInterval(typeTimer);
      }, 18);
      return () => clearInterval(typeTimer);
    }, 1200);
    return () => clearTimeout(thinkTimer);
  }, [summary]);

  const ARIA_COLOR = '#00E5FF';

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'rgba(0,229,255,0.05)', borderColor: 'rgba(0,229,255,0.18)' }}
    >
      {/* Agent header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(0,200,83,0.12)' }}>
        <motion.div
          className="w-6 h-6 rounded-lg flex items-center justify-center border"
          style={{ background: 'rgba(0,200,83,0.15)', borderColor: 'rgba(0,200,83,0.3)' }}
          animate={{ boxShadow: thinking
            ? [`0 0 0px ${ARIA_COLOR}00`, `0 0 10px ${ARIA_COLOR}80`, `0 0 0px ${ARIA_COLOR}00`]
            : `0 0 0px ${ARIA_COLOR}00`
          }}
          transition={{ repeat: thinking ? Infinity : 0, duration: 1.2 }}
        >
          <Zap size={11} style={{ color: ARIA_COLOR }} />
        </motion.div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ARIA_COLOR }}>
            ARIA — Defence Intelligence
          </p>
          {thinking && (
            <div className="flex items-center gap-1 mt-0.5">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: ARIA_COLOR }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary text */}
      <div className="px-4 py-3 min-h-[72px]">
        {!thinking && (
          <p className="text-[11px] text-[var(--respond-text-secondary)] leading-relaxed">
            <span className="font-bold" style={{ color: ARIA_COLOR }}>ARIA: </span>
            {displayed}
            {displayed.length < summary.length && (
              <motion.span
                className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                style={{ background: ARIA_COLOR }}
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
              />
            )}
          </p>
        )}
      </div>

      {/* Ask ARIA input */}
      <div className="px-3 pb-3">
        <form
          onSubmit={e => { e.preventDefault(); if (input.trim()) { onAskMore(input.trim()); setInput(''); }}}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: 'rgba(0,200,83,0.04)', borderColor: 'rgba(0,200,83,0.14)' }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask ARIA..."
            className="flex-1 text-[11px] bg-transparent text-[var(--respond-text-secondary)] placeholder:text-[var(--respond-text-faint)] outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 transition-opacity disabled:opacity-30"
            style={{ color: ARIA_COLOR }}
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main ContextPanel ────────────────────────────────────────────────────────

export function ContextPanel({
  isOpen,
  locationCode,
  locations,
  incidents,
  voiceJournals,
  onClose,
  onViewInMap,
  onRefresh,
  onOpenAria,
  onLogConcern,
}: ContextPanelProps) {
  const [mode, setMode] = useState<PanelMode>('location');

  useEffect(() => { if (!isOpen) setMode('location'); }, [isOpen]);
  useEffect(() => { setMode('location'); }, [locationCode]);

  const location = useMemo(() =>
    locations.find(l => l.code === locationCode),
    [locations, locationCode]
  );

  const locationIncidents = useMemo(() =>
    incidents.filter(i => i.locationCode === locationCode),
    [incidents, locationCode]
  );

  const locationJournals = useMemo(() =>
    voiceJournals.filter(j => (j as any).locationCode === locationCode || (j as any).zoneCode === locationCode),
    [voiceJournals, locationCode]
  );

  const openCount     = locationIncidents.filter(i => i.status !== 'resolved').length;
  const criticalCount = locationIncidents.filter(i => i.severity === 'critical').length;
  const highCount     = locationIncidents.filter(i => i.severity === 'high').length;
  const sosCount      = locationIncidents.filter(i => i.reporter === 'SOS-AUTO').length;
  const recentIncidents = [...locationIncidents]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 4);

  const primaryAnchor: AnchorType = location?.anchorTypes?.includes('red') ? 'red'
    : location?.anchorTypes?.includes('amber') ? 'amber'
    : 'green';

  const accent = ANCHOR_ACCENT[primaryAnchor];

  const ariaSummary = location
    ? buildAriaContext(location, criticalCount, openCount, sosCount)
    : '';

  const ariaZoneContext = location
    ? `Zone: ${location.name} (${location.code}). Open: ${openCount}. Critical: ${criticalCount}. SOS: ${sosCount}. Risk: ${location.risk}.`
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && location && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 bg-black/25 backdrop-blur-[1px] pointer-events-auto"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="cp-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'var(--panel-bg, rgba(13,15,20,0.96))' }}
            className="absolute right-0 top-0 h-full z-40 w-[390px] flex flex-col backdrop-blur-2xl border-l shadow-2xl shadow-black/70"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Anchor-colour accent bar ── */}
            <div
              className="flex-shrink-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${accent.solid}dd, ${accent.solid}55, transparent)` }}
            />

            {/* ══════════ LOCATION MODE ══════════ */}
            {mode === 'location' && (
              <div className="flex flex-col h-full overflow-hidden">

                {/* Header */}
                <div
                  className="flex-shrink-0 px-5 pt-4 pb-4 border-b"
                  style={{ borderColor: 'var(--respond-border)', background: `${accent.bg}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Anchor label */}
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.22em] border mb-2"
                        style={{ color: accent.solid, background: accent.bg, borderColor: accent.border }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent.solid }} />
                        {accent.label}
                      </span>

                      {/* Zone name — matches mockup header */}
                      <h2 className="text-[15px] font-black text-white leading-tight tracking-tight">
                        {location.name.toUpperCase()}
                      </h2>

                      <div className="flex items-center gap-2 mt-1.5">
                        <MapPin size={9} className="text-slate-500" />
                        <span
                          className="text-[10px] text-slate-500 uppercase tracking-wider"
                          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                        >
                          {location.code}
                        </span>
                        <span className="text-slate-700 text-[8px]">·</span>
                        <span className="text-[10px] text-slate-500 capitalize">{location.type}</span>
                        <button
                          onClick={() => onViewInMap(location.lat, location.lng)}
                          className="ml-auto flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
                        >
                          <ExternalLink size={8} />
                          Centre
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      className="shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Stats row — matches mockup: Critical | High | Active Since */}
                <div className="flex-shrink-0 grid grid-cols-3 border-b" style={{ borderColor: 'var(--respond-border)' }}>
                  {[
                    { label: 'Critical', value: criticalCount, accent: criticalCount > 0 ? '#C0392B' : undefined },
                    { label: 'High',     value: highCount,     accent: highCount > 0 ? '#FFB800' : undefined },
                    { label: 'Active Since', value: activeSince(locationIncidents), mono: true },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={cn('px-4 py-4 flex flex-col gap-0.5', i < 2 && 'border-r')}
                      style={{ borderColor: 'var(--respond-border)' }}
                    >
                      <p
                        className="text-2xl font-black leading-none tabular-nums"
                        style={{
                          color: stat.accent ?? 'var(--respond-text-primary)',
                          fontFamily: stat.mono ? 'IBM Plex Mono, monospace' : undefined,
                          fontSize: stat.mono ? '1rem' : undefined,
                        }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-0.5">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">

                  {/* ARIA Auto-Summary */}
                  <AriaAutoSummary
                    key={locationCode ?? ''}
                    summary={ariaSummary}
                    onAskMore={q => {
                      onOpenAria(`${ariaZoneContext} User question: ${q}`);
                    }}
                  />

                  {/* Recent incidents */}
                  {recentIncidents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Recent Cases</p>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                        <span
                          className="text-[8px] font-bold text-slate-600"
                          style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                        >
                          {openCount} open
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {recentIncidents.map(inc => (
                          <div
                            key={inc.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl border hover:bg-white/[0.04] transition-colors"
                            style={{ background: 'var(--respond-surface)', borderColor: 'var(--respond-border)' }}
                          >
                            <span className={cn('w-2 h-2 rounded-full mt-1 shrink-0', SEVERITY_DOT[inc.severity] ?? 'bg-slate-500')} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                                {inc.title || inc.description?.replace(/^\[[A-Z_]+\]\s*/, '').slice(0, 60) || 'Incident'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock size={8} className="text-slate-600" />
                                <span
                                  className="text-[9px] text-slate-600"
                                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                                >
                                  {timeAgo(inc.createdAt)}
                                </span>
                                <span className="text-[9px] text-slate-700 capitalize">· {inc.severity}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentIncidents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 border"
                        style={{ background: 'rgba(0,200,83,0.08)', borderColor: 'rgba(0,200,83,0.2)' }}
                      >
                        <span style={{ color: '#00C853', fontSize: 16 }}>✓</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-400">No active incidents</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">This zone is clear.</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div
                  className="flex-shrink-0 px-5 py-4 border-t space-y-2"
                  style={{ borderColor: 'var(--respond-border)' }}
                >
                  {/* Emergency button — red anchor only */}
                  {primaryAnchor === 'red' && (
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border font-bold text-[11px] uppercase tracking-widest transition-all"
                      style={{
                        background: 'rgba(192,57,43,0.12)',
                        borderColor: 'rgba(192,57,43,0.35)',
                        color: '#FF6B6B',
                      }}
                    >
                      <ShieldAlert size={13} />
                      Declare Emergency
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('aria')}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: 'rgba(0,200,83,0.06)',
                        borderColor: 'rgba(0,200,83,0.2)',
                        color: '#00C853',
                      }}
                    >
                      <Zap size={11} />
                      Full ARIA
                    </button>
                    <button
                      onClick={() => onLogConcern(locationCode ?? '')}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      <AlertCircle size={11} />
                      Log Concern
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ ARIA CHAT MODE ══════════ */}
            {mode === 'aria' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div
                  className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 pb-4 border-b"
                  style={{ borderColor: 'var(--respond-border)' }}
                >
                  <button
                    onClick={() => setMode('location')}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-200 transition-colors uppercase tracking-wider"
                  >
                    <ArrowLeft size={12} />
                    {location?.name}
                  </button>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AriaDrawer
                    isOpen={true}
                    onClose={() => setMode('location')}
                    context={ariaZoneContext}
                    inline={true}
                  />
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
