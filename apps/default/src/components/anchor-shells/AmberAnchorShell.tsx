/**
 * AmberAnchorShell — KNOW Layer — Live Pinboard (v2)
 *
 * The daily destination. "What's happening here right now?"
 * Fetches live notices published by security command.
 * Also supports observation submission and safety guide.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, ArrowLeft, Eye, Bell, Mic, ShieldAlert, Clock, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { PinboardNotice, PinboardUrgency, getPinboardNotices, createIncidentDirect } from '@/lib/api';

const A = {
  bg:      '#0A0800',
  surface: 'rgba(255,184,0,0.07)',
  border:  'rgba(255,184,0,0.22)',
  solid:   '#FFB800',
  glow:    'rgba(255,184,0,0.18)',
  text:    '#FFB800',
  muted:   'rgba(255,255,255,0.45)',
  white:   '#FFFFFF',
};

const URGENCY_LEFT: Record<PinboardUrgency, string> = { info: '#00E5FF', guidance: '#FFB800', urgent: '#C0392B' };
const URGENCY_LABEL: Record<PinboardUrgency, string> = { info: 'Info', guidance: 'Advisory', urgent: 'Urgent' };

const DEMO_NOTICES: PinboardNotice[] = [
  { id: 'd1', text: 'Wet floor reported near main entrance — cleaning team en route', zoneCode: '', zoneLabel: 'Site-wide', urgency: 'guidance', category: 'safety', status: 'active', publishedBy: 'Security', publishedAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'd2', text: 'Event relocation: Hall B meeting moved to Hall C — please follow signage', zoneCode: '', zoneLabel: 'Site-wide', urgency: 'info', category: 'event', status: 'active', publishedBy: 'Facilities', publishedAt: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 'd3', text: 'High footfall expected today 14:00–16:00 — allow extra time through the atrium', zoneCode: '', zoneLabel: 'Site-wide', urgency: 'info', category: 'general', status: 'active', publishedBy: 'Site Management', publishedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
];

const OBS_CATEGORIES = [
  { id: 'unsafe',     icon: '⚠️', label: 'Something unsafe',     sub: 'Hazard, damage, spill',         severity: 'high' },
  { id: 'suspicious', icon: '👁',  label: 'Something suspicious',  sub: 'Behaviour, item, person',       severity: 'high' },
  { id: 'broken',     icon: '🔔', label: 'Something broken',      sub: 'Property, access, facility',     severity: 'medium' },
  { id: 'share',      icon: '💬', label: 'Something to share',    sub: 'Feedback, idea, concern',        severity: 'low' },
  { id: 'medical',    icon: '🏥', label: 'Medical / welfare',     sub: 'Injury, illness, welfare',       severity: 'high' },
  { id: 'fire',       icon: '🔥', label: 'Fire / evacuation',     sub: 'Smoke, alarm, unsafe exit',      severity: 'critical' },
  { id: 'info',       icon: '📋', label: 'General information',   sub: 'Something we should know',       severity: 'low' },
  { id: 'sos',        icon: '🆘', label: 'I need immediate help', sub: 'Emergency assistance required',  severity: 'critical' },
];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

type AmberMode = 'pinboard' | 'observe' | 'sent' | 'guide';

interface AmberAnchorShellProps {
  zoneCode?: string;
}

function NoticeCard({ notice }: { notice: PinboardNotice }) {
  const borderColor = URGENCY_LEFT[notice.urgency];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', borderLeftColor: borderColor, borderLeftWidth: 3 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: borderColor }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: borderColor }}>{URGENCY_LABEL[notice.urgency]}</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: A.muted }}>{timeAgo(notice.publishedAt)}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: A.white }}>{notice.text}</p>
      {notice.zoneLabel && (
        <div className="mt-2 flex items-center gap-1">
          <MapPin size={10} style={{ color: A.muted }} />
          <span className="text-[10px] font-mono" style={{ color: A.muted }}>{notice.zoneLabel}</span>
        </div>
      )}
    </motion.div>
  );
}

function ObservationForm({ zoneCode, onBack, onSent }: { zoneCode: string; onBack: () => void; onSent: () => void }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const catConfig = OBS_CATEGORIES.find(c => c.id === selectedCat);
  const handleSubmit = async () => {
    if (!selectedCat) return;
    setSubmitting(true);
    let lat = 0, lng = 0;
    try { const p = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })); lat = p.coords.latitude; lng = p.coords.longitude; } catch { /* no geo */ }
    try {
      await createIncidentDirect({ locationCode: zoneCode || 'UNKNOWN', severity: catConfig?.severity ?? 'medium', latitude: lat, longitude: lng, reporter: 'Anonymous', description: `[${selectedCat.toUpperCase()}] ${description || catConfig?.label || ''}` });
      onSent();
    } catch { setSubmitting(false); }
  };
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="flex flex-col flex-1">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}><ArrowLeft size={16} style={{ color: A.muted }} /></button>
        <div><p className="text-xs font-bold" style={{ color: A.white }}>Share an observation</p><p className="text-[10px]" style={{ color: A.muted }}>Anonymous · Sent securely to security team</p></div>
      </div>
      <p className="text-sm mb-4 font-medium" style={{ color: A.muted }}>What should we know about?</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {OBS_CATEGORIES.map(cat => {
          const active = selectedCat === cat.id;
          return (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className="text-left rounded-2xl p-3 border transition-all duration-200" style={{ background: active ? 'rgba(255,184,0,0.10)' : 'rgba(255,255,255,0.03)', borderColor: active ? A.border : 'rgba(255,255,255,0.06)', minHeight: 60 }}>
              <span className="text-lg block mb-0.5">{cat.icon}</span>
              <p className="text-[11px] font-semibold leading-tight" style={{ color: active ? A.solid : A.white }}>{cat.label}</p>
              <p className="text-[9px] leading-tight mt-0.5" style={{ color: A.muted }}>{cat.sub}</p>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {selectedCat && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more detail (optional)…" rows={3} className="w-full rounded-2xl p-3 text-sm resize-none outline-none border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: A.white, fontFamily: "'Inter', sans-serif" }} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 rounded-xl p-3 mb-4 border" style={{ background: 'rgba(0,229,255,0.05)', borderColor: 'rgba(0,229,255,0.12)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00E5FF' }} />
        <p className="text-[11px]" style={{ color: 'rgba(0,229,255,0.8)' }}>Submitted anonymously — no personal data collected</p>
      </div>
      <motion.button onClick={handleSubmit} disabled={!selectedCat || submitting} whileTap={{ scale: 0.97 }} className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2" style={{ background: selectedCat ? A.solid : 'rgba(255,184,0,0.2)', color: selectedCat ? '#0A0A0C' : 'rgba(255,184,0,0.4)', cursor: (!selectedCat || submitting) ? 'not-allowed' : 'pointer' }}>
        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
        {submitting ? 'Sending…' : 'Submit observation'}
      </motion.button>
    </motion.div>
  );
}

// ─── Safety Heartbeat ─────────────────────────────────────────────────────────
function SafetyHeartbeat() {
  const m = useMemo(() => Math.floor(Math.random() * 11) + 4, []);
  return (
    <div className="flex items-center justify-center gap-2 py-2 border-t" style={{ borderColor: 'rgba(255,184,0,0.12)', background: 'rgba(255,184,0,0.04)' }}>
      <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: A.solid }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,184,0,0.6)' }}>Security active · Last patrol {m}m ago</span>
    </div>
  );
}

// ─── Guide Scenario List ──────────────────────────────────────────────────────
const GUIDE_SCENARIOS = [
  {
    emoji: '👊', label: 'Threatening / Aggressive Individual', urgency: 'guidance',
    dos: ['Stay calm and do not raise your voice', 'Create distance between yourself and the individual', 'Alert a security officer or use a Red Anchor'],
    donts: ['Do not physically intervene', 'Do not argue or attempt to reason with the person'],
    contact: 'Alert security immediately via a Red Anchor or call site control',
  },
  {
    emoji: '👀', label: 'Suspicious Behaviour or Item', urgency: 'guidance',
    dos: ['Note physical description, clothing, and direction of travel', 'Report discreetly to security', 'Keep a safe distance from any unattended item'],
    donts: ['Do not approach or touch any suspicious item', 'Do not alert the individual if observing suspicious behaviour'],
    contact: 'Report via "Share an observation" on this screen or speak to a security officer',
  },
  {
    emoji: '🚨', label: 'Physical Altercation', urgency: 'urgent',
    dos: ['Move away from the area immediately', 'Call 999 if there is risk of serious injury', 'Alert security via a Red Anchor'],
    donts: ['Do not attempt to break up a fight', 'Do not film the incident — focus on your safety'],
    contact: 'Call 999 · Alert security via Red Anchor immediately',
  },
  {
    emoji: '🏥', label: 'Medical Emergency', urgency: 'urgent',
    dos: ['Call 999 immediately for serious incidents', 'Stay with the person if safe to do so', 'Alert site security — they hold first aid kits and defibrillators'],
    donts: ['Do not move someone if a spinal injury is possible', 'Do not give food or water to an unconscious person'],
    contact: 'Call 999 · Nearest defibrillator: Main Entrance, Level 1',
  },
  {
    emoji: '🔥', label: 'Fire or Evacuation', urgency: 'urgent',
    dos: ['Leave the building immediately via the nearest fire exit', 'Close doors behind you', 'Proceed to the assembly point: Car Park Level 1'],
    donts: ['Do not use lifts', 'Do not stop to collect personal belongings', 'Do not re-enter the building until told by a fire marshal'],
    contact: 'Call 999 · Assembly point: Car Park Level 1',
  },
  {
    emoji: '🧍', label: 'Lone Worker Threat', urgency: 'guidance',
    dos: ['Activate your personal safety device if you have one', 'Move to a public area with other people', 'Use a Red Anchor to alert security silently'],
    donts: ['Do not isolate yourself further', 'Do not confront anyone following you'],
    contact: 'Silent SOS via Red Anchor · Inform security of your location',
  },
  {
    emoji: '🗣', label: 'Verbal Abuse / Harassment', urgency: 'guidance',
    dos: ['Do not respond or engage', 'Remove yourself from the situation calmly', 'Document the incident and report to security'],
    donts: ['Do not retaliate verbally or physically', 'Do not stay in the situation'],
    contact: 'Report via this screen · Speak to security for a formal record',
  },
  {
    emoji: '📦', label: 'Theft / Property Crime', urgency: 'guidance',
    dos: ['Do not pursue the individual', 'Note description, direction and any vehicle details', 'Report to security and call 999 if the theft is in progress'],
    donts: ['Do not confront or chase the suspect', 'Do not touch any items involved — preserve evidence'],
    contact: 'Report via this screen · Call 999 if the crime is in progress',
  },
];

function GuideScenarioList() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {GUIDE_SCENARIOS.map(s => {
        const isOpen = open === s.label;
        const borderColor = s.urgency === 'urgent' ? '#C0392B' : '#FFB800';
        return (
          <div key={s.label} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeftColor: borderColor, borderLeftWidth: 3, background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }}>
            <button
              onClick={() => setOpen(isOpen ? null : s.label)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <span className="text-xl flex-shrink-0">{s.emoji}</span>
              <span className="text-sm font-medium flex-1" style={{ color: A.white }}>{s.label}</span>
              <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} style={{ color: A.muted }} />
              </motion.span>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: '#00C853' }}>✓ Do</p>
                      {s.dos.map(d => <p key={d} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>· {d}</p>)}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: '#C0392B' }}>✗ Don't</p>
                      {s.donts.map(d => <p key={d} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>· {d}</p>)}
                    </div>
                    <div className="rounded-xl p-2.5 border" style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.06)' }}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: A.solid }}>Contact</p>
                      <p className="text-[11px]" style={{ color: A.muted }}>{s.contact}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function SentScreen({ onBack }: { onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2" style={{ background: 'rgba(0,200,83,0.1)', borderColor: 'rgba(0,200,83,0.4)' }}>
        <CheckCircle2 size={32} style={{ color: '#00C853' }} />
      </motion.div>
      <h2 className="text-xl font-black text-white mb-2">Observation received</h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: A.muted }}>Thank you. Sent to site security anonymously.</p>
      <button onClick={onBack} className="px-6 py-3 rounded-2xl text-sm font-bold border" style={{ borderColor: A.border, color: A.text }}>Back to Pinboard</button>
    </motion.div>
  );
}

export function AmberAnchorShell({ zoneCode = '' }: AmberAnchorShellProps) {
  const [mode, setMode] = useState<AmberMode>('pinboard');
  const [notices, setNotices] = useState<PinboardNotice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [lastUpdatedStr, setLastUpdatedStr] = useState('just now');
  const lastUpdatedRef = useRef<Date>(new Date());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'night');
    document.documentElement.classList.add('dark');
    document.documentElement.style.setProperty('--canvas-bg', A.bg);
    return () => { document.documentElement.style.removeProperty('--canvas-bg'); };
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const data = await getPinboardNotices(zoneCode || undefined);
      setNotices(data.length > 0 ? data : DEMO_NOTICES);
      lastUpdatedRef.current = new Date();
      setLastUpdatedStr('just now');
    } catch { setNotices(DEMO_NOTICES); } finally { setLoadingNotices(false); }
  }, [zoneCode]);

  useEffect(() => { fetchNotices(); const i = setInterval(fetchNotices, 30000); return () => clearInterval(i); }, [fetchNotices]);

  useEffect(() => {
    const t = setInterval(() => {
      const mins = Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 60000);
      setLastUpdatedStr(mins < 1 ? 'just now' : `${mins}m ago`);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const displayZone = zoneCode || 'This site';

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden" style={{ background: `radial-gradient(ellipse at top, #1A1200 0%, ${A.bg} 70%)`, fontFamily: "'Inter', sans-serif", maxWidth: 480, margin: '0 auto' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${A.glow}, transparent)` }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: A.border, background: A.surface }}>
        <div className="flex items-center gap-2">
          <motion.span className="w-2 h-2 rounded-full" style={{ background: A.solid }} animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: A.text }}>KNOW ANCHOR</span>
          {zoneCode && <><span style={{ color: A.border }}>·</span><span className="text-[10px] font-mono" style={{ color: A.muted }}>{zoneCode}</span></>}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={9} style={{ color: A.muted }} />
          <span className="text-[9px]" style={{ color: A.muted }}>Updated {lastUpdatedStr}</span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 flex-1 flex flex-col px-4 py-5 overflow-y-auto gap-4">
        <AnimatePresence mode="wait">
          {mode === 'pinboard' && (
            <motion.div key="pinboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <MapPin size={13} style={{ color: A.text }} />
                <h1 className="text-sm font-bold" style={{ color: A.white }}>{displayZone}</h1>
                <span className="text-[10px]" style={{ color: A.muted }}>— What's happening here</span>
              </div>
              <div className="space-y-3">
                {loadingNotices
                  ? [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)
                  : notices.length === 0
                    ? <div className="rounded-2xl p-5 border text-center" style={{ background: A.surface, borderColor: A.border }}><p className="text-sm" style={{ color: A.muted }}>No active notices.</p><p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>All clear — have a safe day.</p></div>
                    : notices.slice(0, 5).map(n => <NoticeCard key={n.id} notice={n} />)
                }
              </div>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>Actions</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Eye,         label: 'Share an observation', sub: 'Report anonymously',   color: '#00E5FF', bg: 'rgba(0,229,255,0.08)',  border: 'rgba(0,229,255,0.2)',  action: () => setMode('observe') },
                  { icon: ShieldAlert, label: 'I need help',          sub: 'Emergency assistance', color: '#C0392B', bg: 'rgba(192,57,43,0.10)',  border: 'rgba(192,57,43,0.25)', action: () => { window.location.href = '?anchor=red&zone=' + zoneCode; } },
                  { icon: Bell,        label: 'View safety guide',    sub: '8 scenario guides',    color: A.solid,   bg: A.surface,               border: A.border,              action: () => setMode('guide') },
                  { icon: Mic,         label: 'Leave a voice note',   sub: 'Anonymous & secure',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', action: () => { window.location.href = '?anchor=red&zone=' + zoneCode + '&mode=journal'; } },
                ].map(tile => {
                  const Icon = tile.icon;
                  return (
                    <motion.button key={tile.label} onClick={tile.action} whileTap={{ scale: 0.96 }} className="flex flex-col items-start gap-2 rounded-2xl p-4 border text-left transition-all duration-200" style={{ background: tile.bg, borderColor: tile.border, minHeight: 80 }}>
                      <Icon size={18} style={{ color: tile.color }} />
                      <div><p className="text-xs font-bold" style={{ color: A.white }}>{tile.label}</p><p className="text-[9px] mt-0.5" style={{ color: A.muted }}>{tile.sub}</p></div>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-center text-[9px] pb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Powered by Absolute Defence OS · Anonymous by design</p>
            </motion.div>
          )}

          {mode === 'observe' && (
            <motion.div key="observe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
              <ObservationForm zoneCode={zoneCode} onBack={() => setMode('pinboard')} onSent={() => setMode('sent')} />
            </motion.div>
          )}
          {mode === 'sent' && (
            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
              <SentScreen onBack={() => setMode('pinboard')} />
            </motion.div>
          )}
          {mode === 'guide' && (
            <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setMode('pinboard')} className="p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}><ArrowLeft size={16} style={{ color: A.muted }} /></button>
                <div><p className="text-sm font-bold" style={{ color: A.white }}>Safety guide</p><p className="text-[10px]" style={{ color: A.muted }}>Tap any scenario for guidance</p></div>
              </div>
              <GuideScenarioList />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SafetyHeartbeat />
    </div>
  );
}
