import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Printer, ShieldAlert, CheckCircle2, Smartphone,
  Package, BookOpen, ClipboardList, Monitor, Trash2, RotateCcw,
  Info, AlertTriangle, MapPin, FlaskConical, Copy, ExternalLink, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Demo helpers (env=demo tagged) ──────────────────────────────────────────
function getDemoAnchorUrl(zoneCode: string): string {
  return `${window.location.origin}?a=${encodeURIComponent(zoneCode)}&env=demo`;
}
function buildQrImageUrl(dest: string): string {
  const p = new URLSearchParams({ size: '400x400', data: dest, color: '00E5FF', bgcolor: '000000', format: 'png', margin: '12', ecc: 'M' });
  return `https://api.qrserver.com/v1/create-qr-code/?${p.toString()}`;
}
function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em]"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
      <FlaskConical size={9} />Demo Environment
    </span>
  );
}

const ZONES = [
  { code: 'DEMO-MAIN-ENT',  label: 'Main Entrance' },
  { code: 'DEMO-CAR-PARK',  label: 'Car Park Level 1' },
  { code: 'DEMO-RETAIL-A',  label: 'Retail Area A' },
  { code: 'DEMO-CORRIDOR',  label: 'East Corridor' },
  { code: 'DEMO-STAIRWELL', label: 'Stairwell B' },
  { code: 'DEMO-RECEPTION', label: 'Reception' },
];

const BAG = [
  { icon: Monitor,      item: 'iPad / Tablet',          desc: 'Full-screen map view for the live demo' },
  { icon: Package,      item: 'Laminated QR Posters',   desc: 'Unified anchor — one QR per zone' },
  { icon: Package,      item: 'Blu-Tack / Command Strips', desc: 'Non-permanent, policy-compliant placement' },
  { icon: BookOpen,     item: 'Policy Summary',         desc: 'One-pager referencing UK law alignment' },
  { icon: ClipboardList,item: 'Demo Case Pack',         desc: 'Anonymised example: concern → triage → close' },
];

function UnifiedPhoneMockup({ zoneLabel }: { zoneLabel?: string }) {
  const label = zoneLabel ?? 'Main Entrance';
  return (
    <div className="rounded-[2rem] border-4 overflow-hidden shadow-2xl" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0B0F17', minHeight: 380 }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#F59E0B' }}>DEMO</span>
        </div>
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>ANCHOR</span>
      </div>
      <div className="px-5 pt-5 pb-5">
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={10} style={{ color: '#64748B' }} />
          <span className="text-[10px] font-bold" style={{ color: '#CBD5E1' }}>{label}</span>
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#F1F5F9' }}>What do you need?</h2>
        <p className="text-[10px] mb-4" style={{ color: '#64748B' }}>Scan once. Three actions. No app required.</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl border text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)', color: '#10B981' }}>
            <Info size={12} />Information & Updates
          </div>
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl border text-[11px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', color: '#F59E0B' }}>
            <AlertTriangle size={12} />Report a Concern
          </div>
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl border text-[11px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#EF4444' }}>
            <ShieldAlert size={12} />Get Help Now
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', color: '#F59E0B' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#F59E0B' }} />Demo · env=demo tagged
        </div>
      </div>
    </div>
  );
}

function QrCard({ zone }: { zone: string }) {
  const destUrl = getDemoAnchorUrl(zone);
  const qrUrl = buildQrImageUrl(destUrl);
  const copy = () => navigator.clipboard.writeText(destUrl).then(() => toast.success('Demo URL copied')).catch(() => {});
  return (
    <div className="rounded-xl border p-4 flex flex-col items-center gap-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--aria-cyan)' }}>DEMO ANCHOR</p>
      <div className="relative p-2 rounded-lg border-2" style={{ borderColor: 'var(--aria-cyan)', background: '#000' }}>
        <img src={qrUrl} alt="Demo QR" className="w-32 h-32 block" />
        <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
          <span className="text-[7px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.92)', color: '#000' }}>DEMO</span>
        </div>
      </div>
      <p className="text-[9px] text-center" style={{ color: 'var(--text-faint)' }}>Opens real AnchorShell · tagged env=demo</p>
      <div className="flex gap-2 w-full">
        <button onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold border transition-all hover:opacity-80"
          style={{ borderColor: 'var(--aria-cyan-dim)', color: 'var(--aria-cyan)', background: 'var(--aria-cyan-dim)' }}>
          <Copy size={11} />Copy URL
        </button>
        <button onClick={() => window.open(destUrl, '_blank')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold border transition-all hover:opacity-80"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)', background: 'var(--surface)' }}>
          <Eye size={11} />Preview
        </button>
      </div>
    </div>
  );
}

type Section = 'studio' | 'blueprint' | 'bag';

interface DemoKitProps {
  locations?: { code: string; name: string }[];
  onResetDemo?: () => void;
}

export function DemoKit({ locations = [], onResetDemo }: DemoKitProps) {
  const [zone, setZone] = useState(ZONES[0].code);
  const [section, setSection] = useState<Section>('studio');
  const [bagChecked, setBagChecked] = useState<Record<string, boolean>>({});
  const bagDone = Object.values(bagChecked).filter(Boolean).length;

  const selectedZone = ZONES.find(z => z.code === zone) ?? ZONES[0];
  const destUrl = getDemoAnchorUrl(zone);
  const qrImg = buildQrImageUrl(destUrl);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrImg; link.download = `AD-DEMO-${zone}.png`; link.target = '_blank'; link.click();
    toast.success(`Demo QR for ${selectedZone.label} downloading`);
  };

  const previewUrl = destUrl;
  const zoneOptions = ZONES;

  const SECTION_TABS: { id: Section; label: string }[] = [
    { id: 'studio',    label: 'Anchor Studio' },
    { id: 'blueprint', label: 'Blueprint' },
    { id: 'bag',       label: 'Deployment Bag' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
      {/* Sub-header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Demo Mode</h2>
              <DemoBadge />
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Live demo QRs tagged env=demo — no live data contamination</p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
          {SECTION_TABS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
              style={section === s.id
                ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: 'var(--text-muted)' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {section === 'studio' && <StudioSection zone={zone} setZone={setZone} zoneOptions={zoneOptions} onResetDemo={onResetDemo} handleDownload={handleDownload} previewUrl={previewUrl} selectedZone={selectedZone} />}
          {section === 'blueprint' && <BlueprintSection />}
          {section === 'bag' && <BagSection bagDone={bagDone} bagChecked={bagChecked} setBagChecked={setBagChecked} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StudioSection({ zone, setZone, zoneOptions, onResetDemo, handleDownload, previewUrl, selectedZone }: any) {
  return (
    <motion.div key="studio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex h-full min-h-0">
      {/* Left: config panel */}
      <div className="w-80 shrink-0 border-r overflow-y-auto p-6 space-y-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface)' }}>
        {/* Zone picker */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-faint)' }}>Demo Zone</label>
          <select value={zone} onChange={e => setZone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>
            {zoneOptions.map((z: any) => <option key={z.code} value={z.code}>{z.label}</option>)}
          </select>
          <p className="text-[10px] mt-1.5 font-mono" style={{ color: 'var(--text-faint)' }}>{zone}</p>
        </div>

        {/* QR preview */}
        <QrCard zone={zone} />

        {/* Action buttons */}
        <div className="space-y-2">
          <button onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all hover:opacity-90"
            style={{ background: 'var(--aria-cyan)', color: '#000' }}>
            <Download size={13} />Download QR
          </button>
          <button onClick={() => window.open(previewUrl, '_blank')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:opacity-80"
            style={{ background: 'var(--aria-cyan-dim)', border: '1px solid var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }}>
            <Smartphone size={13} />Preview on Mobile
          </button>
          <button onClick={() => { toast.success('Opening print dialog…'); setTimeout(() => window.print(), 300); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
            <Printer size={13} />Print Poster
          </button>
        </div>

        {/* Demo env notice */}
        <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-1.5">
            <FlaskConical size={11} style={{ color: '#F59E0B' }} />
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#F59E0B' }}>Demo Environment</p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            All submissions tagged env=demo. Live operational data stays clean.
          </p>
        </div>

        {/* Reset */}
        {onResetDemo && (
          <div className="rounded-lg p-3 space-y-2.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2.5">
              <Trash2 size={13} style={{ color: '#F87171' }} />
              <div>
                <p className="text-[12px] font-black" style={{ color: 'var(--text-primary)' }}>Reset Demo Data</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clear all DEMO-prefixed incidents</p>
              </div>
            </div>
            <button onClick={onResetDemo}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs uppercase tracking-widest"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              <RotateCcw size={12} />Reset
            </button>
          </div>
        )}
      </div>

      {/* Right: phone preview + info */}
      <div className="flex-1 overflow-y-auto p-8 flex gap-10">
        {/* Phone */}
        <div className="w-72 shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-faint)' }}>Mobile Preview</p>
            <DemoBadge />
          </div>
          <UnifiedPhoneMockup zoneLabel={selectedZone?.label} />
        </div>

        {/* Info cards */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* The moment */}
          <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--aria-cyan)' }}>The Demo Moment</p>
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              "Hand the client a single poster. They scan once — information, reporting, and emergency help, all from one QR. Live on the map in real time."
            </p>
          </div>

          {/* URL */}
          <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-faint)' }}>Demo URL</p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
              <code className="flex-1 text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{previewUrl}</code>
              <button onClick={() => window.open(previewUrl, '_blank')} className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-faint)' }}>How Demo Mode Works</p>
            <div className="space-y-2.5">
              {[
                { step: '1', text: 'Select a demo zone and download or print its QR poster' },
                { step: '2', text: 'Scan with the client — the real AnchorShell opens with the DEMO badge visible' },
                { step: '3', text: 'Submit a test report — it appears on the live map tagged DEMO' },
                { step: '4', text: 'Use Reset Demo Data to clear all DEMO-prefixed entries after the session' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                    style={{ background: 'var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }}>{step}</span>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BlueprintSection() {
  const steps = [
    { n: '01', title: 'Site Survey',      desc: 'Walk the venue. Map Client → Site → Zone hierarchy. Identify entry points, blind spots, lone-worker areas.', tool: 'Site Structure' },
    { n: '02', title: 'Register Anchors', desc: 'Create QR Anchors in Site Structure. Set deployment status: Draft → Generated → Printed → Deployed → Live.', tool: 'QR Anchors' },
    { n: '03', title: 'Upload Policies',  desc: 'Upload safety policies and legal frameworks into the Knowledge Vault for ARIA to reference during queries.', tool: 'Knowledge Vault' },
    { n: '04', title: 'Deploy Anchors',   desc: 'Print, laminate, and place one unified QR per zone. Update status to Live after physical placement is confirmed.', tool: 'Printed QR' },
    { n: '05', title: 'Live Demo',        desc: 'Scan the demo anchor with the client. Events appear live on the map. All tagged DEMO — live data stays clean.', tool: 'ARIA + Map' },
  ];
  return (
    <motion.div key="blueprint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-8 max-w-3xl">
      <h2 className="text-base font-black mb-1" style={{ color: 'var(--text-primary)' }}>Site Deployment Blueprint</h2>
      <p className="text-[12px] mb-6" style={{ color: 'var(--text-muted)' }}>Repeatable 5-step anchor deployment for any venue</p>
      <div className="relative space-y-3">
        <div className="absolute left-5 top-6 bottom-6 w-px" style={{ background: 'var(--surface-border)' }} />
        {steps.map((step, i) => (
          <motion.div key={step.n} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 text-xs font-black"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>{step.n}</div>
            <div className="flex-1 rounded-xl p-4 flex items-start justify-between gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>{step.tool}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function BagSection({ bagDone, bagChecked, setBagChecked }: any) {
  return (
    <motion.div key="bag" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Deployment Bag</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Everything for a professional, no-hesitation install</p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg border"
          style={bagDone === BAG.length
            ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }
            : { background: 'var(--surface-2)', borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}>
          {bagDone}/{BAG.length} packed
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface-2)' }}>
        <motion.div className="h-full rounded-full" style={{ background: '#10B981' }}
          animate={{ width: `${(bagDone / BAG.length) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <div className="space-y-2">
        {BAG.map(({ icon: Icon, item, desc }: any) => {
          const done = bagChecked[item];
          return (
            <button key={item} onClick={() => setBagChecked((p: any) => ({ ...p, [item]: !p[item] }))}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:opacity-80"
              style={done
                ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }
                : { background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                style={done
                  ? { background: '#10B981', borderColor: '#10B981' }
                  : { background: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
                {done ? <CheckCircle2 size={12} style={{ color: '#fff' }} /> : <Icon size={12} style={{ color: 'var(--text-faint)' }} />}
              </div>
              <div>
                <p className="text-[13px] font-bold" style={done ? { color: '#10B981', textDecoration: 'line-through', opacity: 0.6 } : { color: 'var(--text-primary)' }}>{item}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
