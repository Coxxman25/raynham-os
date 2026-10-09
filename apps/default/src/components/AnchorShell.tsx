/**
 * AnchorShell — Unified QR Mobile Interface (v3)
 *
 * One QR code. One page. Three clear actions.
 * Supports light and dark themes.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, AlertTriangle, ShieldAlert, ArrowLeft, Send, RefreshCw,
  CheckCircle2, MapPin, Mic, Square, ChevronRight, Sun, Moon, Phone,
} from 'lucide-react';
import {
  createIncidentDirect, getPinboardNotices, getLocations,
  PinboardNotice, Location,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShellMode = 'landing' | 'information' | 'report-category' | 'report-form' |
  'report-sent' | 'help' | 'help-sent' | 'journal' | 'journal-sent';

interface AnchorShellProps { anchorCode?: string; }

interface AnchorData {
  code: string; name: string; siteName: string;
  notices: PinboardNotice[];
  infoEnabled: boolean; reportEnabled: boolean; helpEnabled: boolean;
}

type Theme = 'dark' | 'light';
const THEME_KEY = 'ados-anchor-theme';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'dark'; }
  });
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  }, []);
  return { theme, toggleTheme };
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_NOTICES: PinboardNotice[] = [
  {
    id: 'd1',
    text: 'Departures Hall is currently at high footfall. Passengers should allow extra time through security screening.',
    zoneCode: 'WJ-ARR-001', zoneLabel: 'Terminal 1 — Departures Hall',
    urgency: 'guidance', category: 'safety', status: 'active',
    publishedBy: 'Site Management', publishedAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'd2',
    text: 'Security Checkpoint A queue currently around 15 minutes. Please have bags ready for inspection.',
    zoneCode: 'WJ-ARR-003', zoneLabel: 'Security Checkpoint A — Airside',
    urgency: 'info', category: 'security', status: 'active',
    publishedBy: 'Security', publishedAt: new Date(Date.now() - 8 * 60000).toISOString(),
  },
];

const DEMO_LOCATIONS: Location[] = [
  { id: 'l1', code: 'WJ-ARR-001', name: 'Terminal 1 — Departures Hall', type: 'gate', lat: 52.2348, lng: -0.5234, risk: 'critical', incidentCount: 4, anchorTypes: ['red', 'amber', 'green'], zoneId: 'WJ-ARR-001' },
  { id: 'l2', code: 'WJ-ARR-003', name: 'Security Checkpoint A — Airside', type: 'security', lat: 52.2344, lng: -0.5241, risk: 'high', incidentCount: 1, anchorTypes: ['red', 'amber', 'green'], zoneId: 'WJ-ARR-003' },
  { id: 'l3', code: 'WJ-ARR-006', name: 'Car Park — Multi-Storey Level P3', type: 'parking', lat: 52.2355, lng: -0.5228, risk: 'low', incidentCount: 0, anchorTypes: ['red', 'amber', 'green'], zoneId: 'WJ-ARR-006' },
];

const REPORT_CATEGORIES = [
  { id: 'maintenance', icon: '🔧', label: 'Maintenance Issue', sub: 'Broken equipment, lights, facilities' },
  { id: 'suspicious', icon: '👁', label: 'Suspicious Behaviour', sub: 'Unusual activity or person' },
  { id: 'welfare', icon: '🤝', label: 'Welfare Concern', sub: 'Someone may need help or support' },
  { id: 'lost', icon: '🔑', label: 'Lost Property', sub: 'Item lost or found at this location' },
  { id: 'accessibility', icon: '♿', label: 'Accessibility', sub: 'Access issue or assistance needed' },
  { id: 'facilities', icon: '🚻', label: 'Facilities', sub: 'Toilets, seating, temperature' },
  { id: 'overcrowding', icon: '👥', label: 'Overcrowding', sub: 'Area feels too busy or unsafe' },
  { id: 'other', icon: '📝', label: 'Something Else', sub: 'Any other concern or feedback' },
];

const HELP_CATEGORIES = [
  { id: 'medical', icon: '🏥', label: 'Medical Help', sub: 'Injury, illness, first aid needed' },
  { id: 'security', icon: '🛡️', label: 'Security Threat', sub: 'Feeling unsafe or threatened' },
  { id: 'violence', icon: '⚠️', label: 'Violence or Aggression', sub: 'Physical altercation or abuse' },
  { id: 'lost_child', icon: '👶', label: 'Lost or Vulnerable Person', sub: 'Missing child or vulnerable adult' },
  { id: 'fire', icon: '🔥', label: 'Fire or Evacuation', sub: 'Smoke, alarm, or unsafe exit' },
  { id: 'other_urgent', icon: '🆘', label: 'Other Urgent Help', sub: 'Any urgent assistance needed' },
];

// ─── Demo mode detection (module-level so all sub-components can access) ──────
// env=demo in the URL tags submissions without contaminating live data.
const isDemo = new URLSearchParams(window.location.search).get('env') === 'demo';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--anchor-card-border)' }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00E5FF' }} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#00D9FF' }}>Unified Anchor</span>
      </div>
      <button onClick={onToggleTheme} className="p-1.5 rounded-lg" style={{ color: 'var(--anchor-text-muted)' }}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}

function LocationHeader({ name }: { name: string }) {
  return (
    <div className="px-5 pt-5 pb-3">
      <div className="flex items-center gap-1.5 mb-1">
        <MapPin size={12} style={{ color: 'var(--anchor-text-muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--anchor-text-muted)' }}>You are at</span>
      </div>
      <h1 className="text-xl font-black" style={{ color: 'var(--anchor-text-primary)' }}>{name}</h1>
    </div>
  );
}

function LatestUpdateCard({ notice }: { notice: PinboardNotice | null }) {
  if (!notice) return null;
  const urgencyColor = notice.urgency === 'urgent' ? '#EF4444' : notice.urgency === 'guidance' ? '#F59E0B' : '#10B981';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mb-4 rounded-2xl p-4 border" style={{ background: 'var(--anchor-card-bg)', borderColor: 'var(--anchor-card-border)', borderLeft: `3px solid ${urgencyColor}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: urgencyColor }} />
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: urgencyColor }}>
          {notice.urgency === 'urgent' ? 'Urgent' : notice.urgency === 'guidance' ? 'Advisory' : 'Info'}
        </span>
        <span className="text-[9px] ml-auto" style={{ color: 'var(--anchor-text-faint)' }}>{timeAgo(notice.publishedAt)}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--anchor-text-primary)' }}>{notice.text}</p>
    </motion.div>
  );
}

function ActionButton({ icon: Icon, label, sub, color, bgColor, borderColor, onClick, delay }: any) {
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onClick={onClick} whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all"
      style={{ background: bgColor, borderColor }}>
      <Icon size={20} style={{ color }} />
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>{label}</p>
        <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>{sub}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--anchor-text-faint)' }} />
    </motion.button>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="p-1.5 rounded-xl" style={{ background: 'var(--anchor-surface-2)', color: 'var(--anchor-text-muted)' }}>
      <ArrowLeft size={16} />
    </button>
  );
}

function Footer() {
  return (
    <div className="px-5 pb-6 pt-2 text-center">
      <p className="text-[9px]" style={{ color: 'var(--anchor-text-faint)' }}>Powered by Absolute Defence OS · Anonymous by design</p>
    </div>
  );
}

function SentScreen({ title, message, onBack, color }: { title: string; message: string; onBack: () => void; color: string }) {
  return (
    <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1 px-8 text-center min-h-full">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2" style={{ background: `${color}18`, borderColor: `${color}60` }}>
        <CheckCircle2 size={32} style={{ color }} />
      </motion.div>
      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--anchor-text-primary)' }}>{title}</h2>
      <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--anchor-text-muted)' }}>{message}</p>
      <button onClick={onBack} className="px-6 py-3 rounded-2xl text-sm font-bold border" style={{ borderColor: 'var(--anchor-card-border)', color: 'var(--anchor-text-muted)', background: 'var(--anchor-card-bg)' }}>Back</button>
    </motion.div>
  );
}

// ─── Screen Components ────────────────────────────────────────────────────────

function LandingScreen({ anchorData, onInfo, onReport, onHelp }:
  { anchorData: AnchorData; onInfo: () => void; onReport: () => void; onHelp: () => void }) {
  const latestNotice = anchorData.notices[0] ?? null;
  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
      <LocationHeader name={anchorData.name} />
      <LatestUpdateCard notice={latestNotice} />
      <div className="px-5 mb-4">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--anchor-text-primary)' }}>What do you need?</h2>
        <div className="space-y-3">
          {anchorData.infoEnabled && (
            <ActionButton icon={Info} label="Information" sub="View updates, directions and site guidance"
              color="#10B981" bgColor="rgba(16,185,129,0.12)" borderColor="rgba(16,185,129,0.25)" onClick={onInfo} delay={0.05} />)}
          {anchorData.reportEnabled && (
            <ActionButton icon={AlertTriangle} label="Report a Concern" sub="Tell the site team about something non-urgent"
              color="#F59E0B" bgColor="rgba(245,158,11,0.12)" borderColor="rgba(245,158,11,0.25)" onClick={onReport} delay={0.1} />)}
          {anchorData.helpEnabled && (
            <ActionButton icon={ShieldAlert} label="Get Help Now" sub="Request urgent assistance from the site team"
              color="#EF4444" bgColor="rgba(239,68,68,0.12)" borderColor="rgba(239,68,68,0.25)" onClick={onHelp} delay={0.15} />)}
        </div>
      </div>
      <Footer />
    </motion.div>
  );
}

function InformationScreen({ notices, onBack }: { notices: PinboardNotice[]; onBack: () => void }) {
  return (
    <motion.div key="information" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BackButton onBack={onBack} />
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>Information & Updates</p>
          <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>Live notices for this location</p>
        </div>
      </div>
      <div className="px-5 pb-8 space-y-3">
        {notices.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)' }}>
            <Info size={24} style={{ color: 'var(--anchor-text-faint)', margin: '0 auto 12px' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--anchor-text-muted)' }}>No active notices</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--anchor-text-faint)' }}>All clear — have a safe day</p>
          </div>
        ) : notices.map((notice) => {
          const urgencyColor = notice.urgency === 'urgent' ? '#EF4444' : notice.urgency === 'guidance' ? '#F59E0B' : '#10B981';
          return (
            <motion.div key={notice.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4" style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)', borderLeft: `3px solid ${urgencyColor}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: urgencyColor }} />
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: urgencyColor }}>
                    {notice.urgency === 'urgent' ? 'Urgent' : notice.urgency === 'guidance' ? 'Advisory' : 'Info'}
                  </span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: 'var(--anchor-text-faint)' }}>{timeAgo(notice.publishedAt)}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--anchor-text-primary)' }}>{notice.text}</p>
              {notice.zoneLabel && (
                <div className="mt-2 flex items-center gap-1">
                  <MapPin size={10} style={{ color: 'var(--anchor-text-faint)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--anchor-text-faint)' }}>{notice.zoneLabel}</span>
                </div>)}
            </motion.div>);
        })}
      </div>
    </motion.div>
  );
}

function ReportCategoryScreen({ onSelect, onBack }: { onSelect: (cat: string) => void; onBack: () => void }) {
  return (
    <motion.div key="report-category" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BackButton onBack={onBack} />
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>Report a Concern</p>
          <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>What should we know about?</p>
        </div>
      </div>
      <div className="px-5 pb-8 grid grid-cols-2 gap-2.5">
        {REPORT_CATEGORIES.map((cat, i) => (
          <motion.button key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(cat.id)} whileTap={{ scale: 0.97 }}
            className="flex flex-col items-start gap-1.5 p-3.5 rounded-2xl text-left"
            style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)', minHeight: 80 }}>
            <span className="text-lg">{cat.icon}</span>
            <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--anchor-text-primary)' }}>{cat.label}</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--anchor-text-muted)' }}>{cat.sub}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function ReportFormScreen({ category, zoneCode, onBack, onSent }:
  { category: string; zoneCode: string; onBack: () => void; onSent: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const catLabel = REPORT_CATEGORIES.find((c) => c.id === category)?.label ?? 'Concern';

  const submit = async () => {
    setBusy(true); setErr('');
    let lat = 0, lng = 0;
    try {
      const p = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 4000 }));
      lat = p.coords.latitude; lng = p.coords.longitude;
    } catch { /* no geo */ }
    try {
      await createIncidentDirect({ locationCode: (isDemo ? 'DEMO-' : '') + (zoneCode || 'UNKNOWN'), severity: 'medium', latitude: lat, longitude: lng,
        reporter: isDemo ? 'DEMO-Anonymous' : 'Anonymous', description: `[${category.toUpperCase()}] ${text || catLabel}` });
      onSent();
    } catch { setErr('Could not send — please try again.'); setBusy(false); }
  };

  return (
    <motion.div key="report-form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      className="flex flex-col min-h-full px-5 pt-5 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <BackButton onBack={onBack} />
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>{catLabel}</p>
          <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>Anonymous · Sent to site team</p>
        </div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add details (optional)…" rows={5}
        className="w-full rounded-2xl p-4 text-sm resize-none outline-none mb-4"
        style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)', color: 'var(--anchor-text-primary)' }} />
      <div className="flex items-center gap-2 rounded-xl p-3 mb-4" style={{ background: 'var(--anchor-cyan-dim)', border: '1px solid var(--anchor-cyan-border)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--anchor-cyan)' }} />
        <p className="text-[11px]" style={{ color: 'var(--anchor-cyan)' }}>Anonymous · No personal data collected</p>
      </div>
      {err && <p className="text-[11px] text-red-400 mb-3">{err}</p>}
      <motion.button onClick={submit} disabled={busy} whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ background: '#F59E0B', color: '#000', opacity: busy ? 0.6 : 1 }}>
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}{busy ? 'Sending…' : 'Submit concern'}
      </motion.button>
    </motion.div>
  );
}

function HelpScreen({ zoneCode, onBack, onSent }: { zoneCode: string; onBack: () => void; onSent: () => void }) {
  const [step, setStep] = useState<'categories' | 'confirm' | 'sending' | 'sent'>('categories');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const sendHelp = async () => {
    setStep('sending');
    let lat = 0, lng = 0;
    try {
      const p = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 4000 }));
      lat = p.coords.latitude; lng = p.coords.longitude;
    } catch { /* no geo */ }
    try {
      await createIncidentDirect({ locationCode: (isDemo ? 'DEMO-' : '') + (zoneCode || 'UNKNOWN'), severity: 'critical', latitude: lat, longitude: lng,
        reporter: isDemo ? 'DEMO-Anonymous' : 'Anonymous', description: `[URGENT_HELP] ${selectedCat?.toUpperCase() ?? 'HELP'}: ${details || 'Urgent assistance requested'}` });
      setStep('sent'); onSent();
    } catch { setStep('confirm'); }
  };

  if (step === 'sent') return <SentScreen title="Help requested" message="A trained responder has been alerted to your location. Stay calm." onBack={onBack} color="#EF4444" />;
  if (step === 'sending') return (
    <div className="flex flex-col items-center justify-center min-h-full gap-4">
      <RefreshCw size={28} className="animate-spin" style={{ color: '#EF4444' }} />
      <p className="text-sm" style={{ color: 'var(--anchor-text-muted)' }}>Sending alert securely…</p>
    </div>);

  if (step === 'confirm') {
    const cat = HELP_CATEGORIES.find((c) => c.id === selectedCat);
    return (
      <motion.div key="help-confirm" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
        className="flex flex-col min-h-full px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onBack={() => setStep('categories')} />
          <div><p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>Confirm urgent help</p></div>
        </div>
        <div className="rounded-2xl p-4 mb-4 border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{cat?.icon}</span>
            <p className="text-sm font-bold" style={{ color: '#EF4444' }}>{cat?.label}</p>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--anchor-text-muted)' }}>{cat?.sub}</p>
        </div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add any detail (optional)…" rows={3}
          className="w-full rounded-2xl p-4 text-sm resize-none outline-none mb-4"
          style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)', color: 'var(--anchor-text-primary)' }} />
        <div className="rounded-xl p-3 mb-6 border" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <p className="text-[11px]" style={{ color: '#EF4444' }}>
            ⚠️ This will immediately alert the site team. For life-threatening emergencies, call <a href="tel:999" className="font-bold underline">999</a> first.
          </p>
        </div>
        <motion.button onClick={sendHelp} whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ background: '#EF4444', color: '#fff' }}>
          <ShieldAlert size={16} /> Send Alert Now
        </motion.button>
        <button onClick={onBack} className="mt-3 w-full py-3 rounded-2xl text-[12px] font-bold border"
          style={{ borderColor: 'var(--anchor-card-border)', color: 'var(--anchor-text-muted)', background: 'var(--anchor-card-bg)' }}>Cancel</button>
      </motion.div>);
  }

  return (
    <motion.div key="help-categories" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BackButton onBack={onBack} />
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--anchor-text-primary)' }}>Get Help Now</p>
          <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>What kind of help do you need?</p>
        </div>
      </div>
      <div className="px-5 pb-8 space-y-2.5">
        {HELP_CATEGORIES.map((cat, i) => (
          <motion.button key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => { setSelectedCat(cat.id); setStep('confirm'); }} whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ background: 'var(--anchor-card-bg)', border: '1px solid var(--anchor-card-border)' }}>
            <span className="text-xl">{cat.icon}</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--anchor-text-primary)' }}>{cat.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--anchor-text-muted)' }}>{cat.sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--anchor-text-faint)' }} />
          </motion.button>
        ))}
      </div>
      <div className="px-5 pb-8">
        <a href="tel:999" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest"
          style={{ background: '#EF4444', color: '#fff' }}><Phone size={16} /> Call 999 Emergency</a>
      </div>
    </motion.div>
  );
}

function VoiceJournalScreen({ zoneCode, onBack, onSent }: { zoneCode: string; onBack: () => void; onSent: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'submitting' | 'sent'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [err, setErr] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<SpeechRecognition | null>(null);

  const startRecording = async () => {
    setErr(''); setTranscript(''); setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mr.start(); mediaRef.current = mr;
      setState('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const sr = new SR(); sr.continuous = true; sr.interimResults = true; sr.lang = 'en-GB';
        sr.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setTranscript(t); };
        sr.start(); speechRef.current = sr;
      }
    } catch { setErr('Microphone access denied. Please allow access and try again.'); }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    if (speechRef.current) { try { speechRef.current.stop(); } catch {} }
    setState('done');
  };

  const submit = async () => {
    setState('submitting');
    let lat = 0, lng = 0;
    try {
      const p = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 4000 }));
      lat = p.coords.latitude; lng = p.coords.longitude;
    } catch {}
    try {
      await createIncidentDirect({ locationCode: (isDemo ? 'DEMO-' : '') + (zoneCode || 'UNKNOWN'), severity: 'low', latitude: lat, longitude: lng,
        reporter: isDemo ? 'DEMO-Voice' : 'Anonymous Voice', description: `[VOICE] ${transcript || 'Voice note submitted'}` });
      setState('sent'); onSent();
    } catch { setState('done'); setErr('Could not send — please try again.'); }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (state === 'sent') return <SentScreen title="Voice note received" message="Sent anonymously to the security team." onBack={onBack} color="#10B981" />;

  return (
    <motion.div key="journal" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      className="flex flex-col items-center min-h-full px-5 pt-5 pb-8 text-center">
      <button onClick={onBack} className="self-start flex items-center gap-2 text-[11px] mb-8" style={{ color: 'var(--anchor-text-muted)' }}>
        <ArrowLeft size={12} /> Back
      </button>
      <motion.div className="w-24 h-24 rounded-full flex items-center justify-center border-2 mb-6 cursor-pointer"
        style={{ background: state === 'recording' ? 'rgba(239,68,68,0.2)' : 'var(--anchor-card-bg)', borderColor: state === 'recording' ? '#EF4444' : 'var(--anchor-card-border)' }}
        animate={state === 'recording' ? { boxShadow: ['0 0 0px rgba(239,68,68,0.3)', '0 0 40px rgba(239,68,68,0.3)', '0 0 0px rgba(239,68,68,0.3)'] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
        onClick={state === 'idle' ? startRecording : state === 'recording' ? stopRecording : () => {}} whileTap={{ scale: 0.95 }}>
        {state === 'recording' ? <Square size={28} style={{ color: '#EF4444' }} /> : <Mic size={36} style={{ color: 'var(--anchor-text-secondary)' }} />}
      </motion.div>

      {state === 'idle' && (<>
        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--anchor-text-primary)' }}>Leave a Voice Note</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--anchor-text-muted)' }}>Your voice note is anonymous. Speak freely.</p>
        <motion.button onClick={startRecording} whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm"
          style={{ background: 'var(--anchor-card-bg)', color: 'var(--anchor-text-primary)', border: '1px solid var(--anchor-card-border)' }}>
          <Mic size={16} className="inline mr-2" />Start Recording
        </motion.button>
      </>)}

      {state === 'recording' && (<>
        <p className="text-2xl font-black font-mono mb-1" style={{ color: 'var(--anchor-text-primary)' }}>{fmt(seconds)}</p>
        <p className="text-xs mb-4" style={{ color: '#EF4444' }}>Recording… tap to stop</p>
        {transcript && (
          <div className="w-full rounded-2xl p-3 border mb-4 text-left" style={{ background: 'var(--anchor-card-bg)', borderColor: 'var(--anchor-card-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--anchor-text-faint)' }}>Live transcript</p>
            <p className="text-[11px] italic" style={{ color: 'var(--anchor-text-muted)' }}>{transcript}</p>
          </div>)}
        <motion.button onClick={stopRecording} whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 text-sm"
          style={{ background: '#EF4444', color: '#fff' }}><Square size={14} />Stop Recording</motion.button>
      </>)}

      {state === 'done' && (<>
        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--anchor-text-primary)' }}>Recording complete</h2>
        <p className="text-xs mb-2" style={{ color: 'var(--anchor-text-muted)' }}>Duration: {fmt(seconds)}</p>
        {transcript && (
          <div className="w-full rounded-2xl p-3 border mb-4 text-left" style={{ background: 'var(--anchor-card-bg)', borderColor: 'var(--anchor-card-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--anchor-text-faint)' }}>Transcript</p>
            <p className="text-[11px] italic" style={{ color: 'var(--anchor-text-muted)' }}>{transcript}</p>
          </div>)}
        {err && <p className="text-[11px] text-red-400 mb-3">{err}</p>}
        <div className="w-full space-y-2 mt-2">
          <motion.button onClick={submit} whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 text-sm"
            style={{ background: '#10B981', color: '#fff' }}><Send size={14} />Submit Voice Note</motion.button>
          <button onClick={() => { setState('idle'); setSeconds(0); setTranscript(''); }}
            className="w-full py-3 rounded-2xl font-bold text-sm border"
            style={{ borderColor: 'var(--anchor-card-border)', color: 'var(--anchor-text-muted)', background: 'var(--anchor-card-bg)' }}>Record again</button>
        </div>
      </>)}

      {state === 'submitting' && (
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--anchor-text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--anchor-text-muted)' }}>Sending securely…</p>
        </div>)}
    </motion.div>
  );
}

// ─── Main Shell Export ────────────────────────────────────────────────────────

export function AnchorShell({ anchorCode = '' }: AnchorShellProps) {
  const [mode, setMode] = useState<ShellMode>('landing');
  const [reportCategory, setReportCategory] = useState<string>('');
  const [anchorData, setAnchorData] = useState<AnchorData>({
    code: anchorCode || 'UNKNOWN',
    name: anchorCode || 'Unknown Location',
    siteName: 'Live information for this area',
    notices: [],
    infoEnabled: true,
    reportEnabled: true,
    helpEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function load() {
      setLoading(true);
      let loc: Location | undefined;
      let notices: PinboardNotice[] = [];
      try {
        const locations = await getLocations();
        const allLocs = locations.length > 0 ? locations : DEMO_LOCATIONS;
        loc = allLocs.find((l) => l.code === anchorCode || l.zoneId === anchorCode);
        const allNotices = await getPinboardNotices(anchorCode);
        notices = allNotices.length > 0 ? allNotices : DEMO_NOTICES;
      } catch {
        loc = DEMO_LOCATIONS.find((l) => l.code === anchorCode);
        notices = DEMO_NOTICES;
      }
      setAnchorData({
        code: anchorCode || 'UNKNOWN',
        name: loc?.name || anchorCode || 'Unknown Location',
        siteName: 'Live information for this area',
        notices,
        infoEnabled: true,
        reportEnabled: true,
        helpEnabled: true,
      });
      setLoading(false);
    }
    load();
  }, [anchorCode]);

  useEffect(() => {
    const html = document.documentElement;
    const isDark = theme === 'dark';
    if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
    const vars: Record<string, string> = isDark ? {
      '--anchor-bg': '#0B0F17', '--anchor-bg-gradient': '#0F1520',
      '--anchor-text-primary': '#F1F5F9', '--anchor-text-secondary': '#CBD5E1',
      '--anchor-text-muted': '#64748B', '--anchor-text-faint': '#475569',
      '--anchor-card-bg': 'rgba(255,255,255,0.04)', '--anchor-card-border': 'rgba(255,255,255,0.07)',
      '--anchor-surface-2': 'rgba(255,255,255,0.06)',
      '--anchor-cyan': '#00D9FF', '--anchor-cyan-dim': 'rgba(0,217,255,0.08)', '--anchor-cyan-border': 'rgba(0,217,255,0.18)',
    } : {
      '--anchor-bg': '#F5F4F2', '--anchor-bg-gradient': '#FFFFFF',
      '--anchor-text-primary': '#0F172A', '--anchor-text-secondary': '#334155',
      '--anchor-text-muted': '#64748B', '--anchor-text-faint': '#94A3B8',
      '--anchor-card-bg': '#FFFFFF', '--anchor-card-border': 'rgba(0,0,0,0.08)',
      '--anchor-surface-2': 'rgba(0,0,0,0.04)',
      '--anchor-cyan': '#0891B2', '--anchor-cyan-dim': 'rgba(8,145,178,0.08)', '--anchor-cyan-border': 'rgba(8,145,178,0.18)',
    };
    for (const [key, value] of Object.entries(vars)) html.style.setProperty(key, value);
  }, [theme]);

  const handleBack = () => setMode('landing');

  return (
    <div className="min-h-screen flex flex-col font-sans"
      style={{ background: `linear-gradient(180deg, var(--anchor-bg-gradient) 0%, var(--anchor-bg) 100%)`, color: 'var(--anchor-text-primary)', maxWidth: 480, margin: '0 auto' }}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      {loading && mode === 'landing' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--anchor-cyan)', borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
          <p className="text-sm" style={{ color: 'var(--anchor-text-muted)' }}>Loading location…</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            {mode === 'landing' && (
              <LandingScreen key="landing" anchorData={anchorData}
                onInfo={() => setMode('information')} onReport={() => setMode('report-category')} onHelp={() => setMode('help')} />)}
            {mode === 'information' && <InformationScreen key="information" notices={anchorData.notices} onBack={handleBack} />}
            {mode === 'report-category' && (
              <ReportCategoryScreen key="report-category" onSelect={(cat) => { setReportCategory(cat); setMode('report-form'); }} onBack={handleBack} />)}
            {mode === 'report-form' && (
              <ReportFormScreen key="report-form" category={reportCategory} zoneCode={anchorData.code}
                onBack={() => setMode('report-category')} onSent={() => setMode('report-sent')} />)}
            {mode === 'report-sent' && <SentScreen key="report-sent" title="Concern received" message="Thank you. Sent to the site team anonymously." onBack={handleBack} color="#F59E0B" />}
            {mode === 'help' && <HelpScreen key="help" zoneCode={anchorData.code} onBack={handleBack} onSent={() => setMode('help-sent')} />}
            {mode === 'help-sent' && <SentScreen key="help-sent" title="Help requested" message="A trained responder has been alerted to your location. Stay calm." onBack={handleBack} color="#EF4444" />}
            {mode === 'journal' && <VoiceJournalScreen key="journal" zoneCode={anchorData.code} onBack={handleBack} onSent={() => setMode('journal-sent')} />}
            {mode === 'journal-sent' && <SentScreen key="journal-sent" title="Voice note received" message="Sent anonymously to the security team." onBack={handleBack} color="#10B981" />}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
