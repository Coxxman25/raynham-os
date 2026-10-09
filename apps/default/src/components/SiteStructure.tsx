/**
 * SiteStructure — Site Structure & QR Anchors (Phase 3)
 * Deployment model: Client → Site → Zone → QR Anchor
 * Anchor statuses: Draft | Generated | Printed | Deployed | Live | Paused | Retired
 * Right-hand inspector panel with Copy URL / Download QR / Preview actions.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, QrCode, Plus, ChevronRight, ChevronDown,
  Copy, Download, Eye, X, Search,
  CheckCircle2, Clock, Printer, Layers, Pause, Archive,
  Zap, RefreshCw, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Location, Incident, createLocation } from '@/lib/api';

export type AnchorStatus = 'draft' | 'generated' | 'printed' | 'deployed' | 'live' | 'paused' | 'retired';

interface QrAnchor { id: string; code: string; label: string; zoneId: string; status: AnchorStatus; url: string; incidentCount?: number; }
interface Zone { id: string; name: string; type: string; siteId: string; anchors: QrAnchor[]; riskLevel?: string; }
interface Site { id: string; name: string; clientId: string; zones: Zone[]; }
interface Client { id: string; name: string; sites: Site[]; }

const STATUS_CFG: Record<AnchorStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType; desc: string }> = {
  draft:     { label: 'Draft',     color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', icon: Clock,        desc: 'Created, not yet generated' },
  generated: { label: 'Generated', color: '#818CF8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)', icon: Zap,          desc: 'QR generated, awaiting print' },
  printed:   { label: 'Printed',   color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.2)',  icon: Printer,      desc: 'Printed, ready for placement' },
  deployed:  { label: 'Deployed',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: MapPin,       desc: 'Placed, not yet scanned' },
  live:      { label: 'Live',      color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: CheckCircle2, desc: 'Active and receiving scans' },
  paused:    { label: 'Paused',    color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', icon: Pause,        desc: 'Temporarily disabled' },
  retired:   { label: 'Retired',   color: '#475569', bg: 'rgba(71,85,105,0.1)',  border: 'rgba(71,85,105,0.2)',  icon: Archive,      desc: 'Permanently decommissioned' },
};

function StatusBadge({ status, small = false }: { status: AnchorStatus; small?: boolean }) {
  const c = STATUS_CFG[status];
  const Icon = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-bold', small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-1')}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <Icon size={small ? 8 : 9} />{c.label}
    </span>
  );
}

function getAnchorUrl(code: string): string {
  return `${window.location.origin}?a=${encodeURIComponent(code)}`;
}
function getQrImageUrl(code: string): string {
  const dest = getAnchorUrl(code);
  const p = new URLSearchParams({ size: '400x400', data: dest, color: '00E5FF', bgcolor: '000000', format: 'png', margin: '12', ecc: 'M' });
  return `https://api.qrserver.com/v1/create-qr-code/?${p.toString()}`;
}

function buildHierarchy(locations: Location[], incidents: Incident[]): Client[] {
  const incByCode: Record<string, number> = {};
  for (const i of incidents) { if (i.locationCode) incByCode[i.locationCode] = (incByCode[i.locationCode] ?? 0) + 1; }
  const clientMap: Record<string, Client> = {};
  const siteMap: Record<string, Site> = {};
  for (const loc of locations) {
    const siteName = loc.zoneId ? `Site — ${loc.zoneId.split('-')[0] ?? 'Main'}` : 'Default Site';
    const siteId = `site-${siteName.replace(/\s/g, '-').toLowerCase()}`;
    const clientId = 'client-main';
    if (!clientMap[clientId]) clientMap[clientId] = { id: clientId, name: 'Main Client', sites: [] };
    if (!siteMap[siteId]) { siteMap[siteId] = { id: siteId, name: siteName, clientId, zones: [] }; clientMap[clientId].sites.push(siteMap[siteId]); }
    const anchor: QrAnchor = { id: loc.id, code: loc.code, label: loc.name, zoneId: loc.zoneId ?? loc.code, status: 'live', url: getAnchorUrl(loc.code), incidentCount: incByCode[loc.code] ?? 0 };
    const zone: Zone = { id: `zone-${loc.code}`, name: loc.name, type: loc.type, siteId, riskLevel: loc.risk, anchors: [anchor] };
    siteMap[siteId].zones.push(zone);
  }
  return Object.values(clientMap);
}


const ZONE_TYPES = [
  { value: 'entry', label: 'Entrance / Entry Point' }, { value: 'corridor', label: 'Corridor / Walkway' },
  { value: 'parking', label: 'Car Park / Parking Area' }, { value: 'retail', label: 'Retail / Trading Area' },
  { value: 'office', label: 'Office / Workstation' }, { value: 'welfare', label: 'Welfare / Rest Area' },
  { value: 'outdoor', label: 'Outdoor / Perimeter Zone' }, { value: 'reception', label: 'Reception / Lobby' },
  { value: 'common', label: 'Common / Communal Space' }, { value: 'other', label: 'General Zone' },
];

function AddAnchorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', type: 'entry', lat: '', lng: '' });
  const [saving, setSaving] = useState(false);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createLocation({ name: form.name, code: form.code, type: form.type, lat: parseFloat(form.lat) || 52.2348, lng: parseFloat(form.lng) || -0.5234 });
      toast.success(`Anchor ${form.code} registered`); onSaved(); onClose();
    } catch { toast.error('Failed to register anchor'); } finally { setSaving(false); }
  };
  const inp = "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all";
  const inpStyle = { background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' };
  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
        initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Register New Anchor</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add a QR anchor to the site structure</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}><X size={13} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Zone Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} style={inpStyle} placeholder="Main Entrance" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Anchor Code</label>
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className={cn(inp, 'font-mono')} style={inpStyle} placeholder="Z1-MAIN-ENT" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Zone Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inp} style={inpStyle}>
              {ZONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Latitude (opt.)</label>
              <input value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className={cn(inp, 'font-mono')} style={inpStyle} placeholder="52.2348" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Longitude (opt.)</label>
              <input value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} className={cn(inp, 'font-mono')} style={inpStyle} placeholder="-0.5234" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-1"
            style={{ background: 'var(--aria-cyan)', color: '#000' }}>
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}{saving ? 'Registering…' : 'Register Anchor'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function InspectorPanel({ anchor, hierarchy, onClose }: { anchor: QrAnchor; hierarchy: { client: string; site: string; zone: string }; onClose: () => void }) {
  const url = anchor.url;
  const qrImg = getQrImageUrl(anchor.code);
  const c = STATUS_CFG[anchor.status];
  const copy = () => navigator.clipboard.writeText(url).then(() => toast.success('URL copied')).catch(() => {});
  const dl = () => { const l = document.createElement('a'); l.href = qrImg; l.download = `ANCHOR-${anchor.code}.png`; l.target = '_blank'; l.click(); toast.success('QR downloading'); };
  return (
    <motion.div initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-80 shrink-0 h-full flex flex-col border-l overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
      {/* Inspector header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--aria-cyan)' }}>Anchor Inspector</p>
          <p className="text-sm font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{anchor.label}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}><X size={12} /></button>
      </div>
      {/* QR */}
      <div className="px-5 py-5 border-b flex justify-center" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="p-2 rounded-xl border-2" style={{ borderColor: 'var(--aria-cyan)', background: '#000' }}>
          <img src={qrImg} alt="QR" className="w-40 h-40 block" />
        </div>
      </div>
      {/* Details */}
      <div className="px-5 py-4 space-y-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-faint)' }}>Status</p>
          <div className="flex items-center gap-2"><StatusBadge status={anchor.status} /><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.desc}</p></div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-faint)' }}>Location Hierarchy</p>
          <div className="space-y-1.5">
            {([['Client', Building2, hierarchy.client], ['Site', Layers, hierarchy.site], ['Zone', MapPin, hierarchy.zone], ['Anchor', QrCode, anchor.code]] as [string, React.ElementType, string][]).map(([label, Icon, value]) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon size={11} style={{ color: 'var(--text-faint)' }} />
                <span className="text-[10px] font-black uppercase tracking-wider w-14 shrink-0" style={{ color: 'var(--text-faint)' }}>{label}</span>
                <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-faint)' }}>Anchor URL</p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
            <code className="flex-1 text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{url}</code>
          </div>
        </div>
        {anchor.incidentCount !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Total Incidents</span>
            <span className="text-sm font-black" style={{ color: (anchor.incidentCount ?? 0) > 0 ? '#F59E0B' : '#10B981' }}>{anchor.incidentCount}</span>
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-faint)' }}>Actions</p>
        <button onClick={copy} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
          style={{ background: 'var(--aria-cyan-dim)', border: '1px solid var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }}>
          <Copy size={13} />Copy Anchor URL
        </button>
        <button onClick={dl} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
          <Download size={13} />Download QR Code
        </button>
        <button onClick={() => window.open(url, '_blank')} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-80"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
          <Eye size={13} />Preview Anchor
        </button>
      </div>
    </motion.div>
  );
}

function AnchorRow({ anchor, zone, site, client, onSelect, isSelected }: { anchor: QrAnchor; zone: Zone; site: Site; client: Client; onSelect: (a: QrAnchor, h: { client: string; site: string; zone: string }) => void; isSelected: boolean }) {
  const hasInc = (anchor.incidentCount ?? 0) > 0;
  return (
    <button onClick={() => onSelect(anchor, { client: client.name, site: site.name, zone: zone.name })}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
      style={isSelected
        ? { background: 'var(--aria-cyan-dim)', border: '1px solid var(--aria-cyan)', borderColor: 'var(--aria-cyan)' }
        : { background: 'transparent', border: '1px solid transparent' }}>
      <QrCode size={12} style={{ color: isSelected ? 'var(--aria-cyan)' : 'var(--text-faint)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold block truncate" style={{ color: isSelected ? 'var(--aria-cyan)' : 'var(--text-primary)' }}>{anchor.label}</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{anchor.code}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <StatusBadge status={anchor.status} small />
        {hasInc && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>{anchor.incidentCount}</span>}
      </div>
    </button>
  );
}

function ZoneSection({ zone, site, client, onSelectAnchor, selectedAnchorId, searchQ }: { zone: Zone; site: Site; client: Client; onSelectAnchor: (a: QrAnchor, h: { client: string; site: string; zone: string }) => void; selectedAnchorId: string | null; searchQ: string }) {
  const [expanded, setExpanded] = useState(false);
  const riskColors: Record<string, string> = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981' };
  const filtered = zone.anchors.filter(a => !searchQ || a.label.toLowerCase().includes(searchQ) || a.code.toLowerCase().includes(searchQ));
  if (filtered.length === 0) return null;
  return (
    <div className="space-y-0.5">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left hover:opacity-70 transition-all">
        {expanded ? <ChevronDown size={10} style={{ color: 'var(--text-faint)' }} /> : <ChevronRight size={10} style={{ color: 'var(--text-faint)' }} />}
        <MapPin size={10} style={{ color: zone.riskLevel ? (riskColors[zone.riskLevel] ?? 'var(--text-faint)') : 'var(--text-faint)' }} />
        <span className="text-[11px] font-bold flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{zone.name}</span>
        <span className="text-[9px] ml-auto" style={{ color: 'var(--text-faint)' }}>{filtered.length}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-4 space-y-0.5 overflow-hidden">
            {filtered.map(a => <AnchorRow key={a.id} anchor={a} zone={zone} site={site} client={client} onSelect={onSelectAnchor} isSelected={selectedAnchorId === a.id} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SiteSection({ site, client, onSelectAnchor, selectedAnchorId, searchQ }: { site: Site; client: Client; onSelectAnchor: (a: QrAnchor, h: { client: string; site: string; zone: string }) => void; selectedAnchorId: string | null; searchQ: string }) {
  const [expanded, setExpanded] = useState(false);
  const total = site.zones.reduce((acc, z) => acc + z.anchors.length, 0);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:opacity-80 transition-all"
        style={{ borderBottom: expanded ? '1px solid var(--surface-border)' : 'none' }}>
        {expanded ? <ChevronDown size={12} style={{ color: 'var(--text-faint)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />}
        <Layers size={12} style={{ color: '#818CF8' }} />
        <span className="text-[12px] font-black flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{site.name}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(129,140,248,0.1)', color: '#818CF8' }}>{total}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-2 py-2 space-y-0.5 overflow-hidden">
            {site.zones.map(z => <ZoneSection key={z.id} zone={z} site={site} client={client} onSelectAnchor={onSelectAnchor} selectedAnchorId={selectedAnchorId} searchQ={searchQ} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusOverview({ anchors }: { anchors: QrAnchor[] }) {
  const counts = anchors.reduce<Record<AnchorStatus, number>>((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {} as Record<AnchorStatus, number>);
  const order: AnchorStatus[] = ['live', 'deployed', 'printed', 'generated', 'draft', 'paused', 'retired'];
  if (anchors.length === 0) return <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>No anchors registered yet</p>;
  return (
    <div className="flex gap-2 flex-wrap">
      {order.map(s => { const n = counts[s] ?? 0; if (!n) return null; const c = STATUS_CFG[s]; return (
        <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <span className="text-[12px] font-black" style={{ color: c.color }}>{n}</span>
          <span className="text-[10px] font-bold" style={{ color: c.color }}>{c.label}</span>
        </div>
      ); })}
    </div>
  );
}

interface SiteStructureProps { locations: Location[]; incidents: Incident[]; onRefresh: () => void; }

export function SiteStructure({ locations, incidents, onRefresh }: SiteStructureProps) {
  const [searchQ, setSearchQ] = useState('');
  const [selectedAnchor, setSelectedAnchor] = useState<QrAnchor | null>(null);
  const [selectedHierarchy, setSelectedHierarchy] = useState<{ client: string; site: string; zone: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const hierarchy = useMemo(() => buildHierarchy(locations, incidents), [locations, incidents]);
  const allAnchors = useMemo(() => hierarchy.flatMap(c => c.sites.flatMap(s => s.zones.flatMap(z => z.anchors))), [hierarchy]);
  const handleSelect = (anchor: QrAnchor, h: { client: string; site: string; zone: string }) => {
    if (selectedAnchor?.id === anchor.id) { setSelectedAnchor(null); setSelectedHierarchy(null); }
    else { setSelectedAnchor(anchor); setSelectedHierarchy(h); }
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--canvas-bg)' }}>

      {/* ── LEFT SIDEBAR: Hierarchy tree (fixed 320px) ── */}
      <div className="w-72 shrink-0 flex flex-col border-r h-full" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface)' }}>
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--aria-cyan-dim)' }}>
                <QrCode size={12} style={{ color: 'var(--aria-cyan)' }} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>Site Structure</span>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--aria-cyan)', color: '#000' }}>
              <Plus size={11} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value.toLowerCase())}
              placeholder="Search anchors…"
              className="w-full pl-7 pr-3 py-2 rounded-lg text-[12px] outline-none transition-all"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <QrCode size={24} style={{ color: 'var(--text-faint)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No anchors yet</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Click + to register your first anchor</p>
              </div>
            </div>
          ) : (
            hierarchy.map(client => (
              <div key={client.id}>
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <Building2 size={11} style={{ color: 'var(--aria-cyan)' }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--aria-cyan)' }}>{client.name}</span>
                </div>
                <div className="space-y-2">
                  {client.sites.map(site => <SiteSection key={site.id} site={site} client={client} onSelectAnchor={handleSelect} selectedAnchorId={selectedAnchor?.id ?? null} searchQ={searchQ} />)}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Sidebar footer — refresh */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
          <button onClick={onRefresh} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all hover:opacity-70"
            style={{ color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
            <RefreshCw size={11} />Refresh
          </button>
        </div>
      </div>

      {/* ── MAIN AREA: Overview + Inspector ── */}
      <div className="flex-1 flex min-w-0 overflow-hidden">

        {/* Overview / empty state */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Site Structure <span style={{ color: 'var(--text-muted)' }}>&</span> QR Anchors
            </h1>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Client → Site → Zone → QR Anchor · Manage physical deployments
            </p>
          </div>

          {/* Status overview bar */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--text-faint)' }}>Deployment Status</p>
            <StatusOverview anchors={allAnchors} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Anchors',  value: allAnchors.length,                                                     icon: QrCode,    accent: 'var(--aria-cyan)' },
              { label: 'Live',           value: allAnchors.filter(a => a.status === 'live').length,                    icon: CheckCircle2, accent: '#10B981' },
              { label: 'Pending Deploy', value: allAnchors.filter(a => ['draft','generated','printed'].includes(a.status)).length, icon: Clock, accent: '#818CF8' },
              { label: 'Total Incidents',value: allAnchors.reduce((acc, a) => acc + (a.incidentCount ?? 0), 0),        icon: AlertCircle, accent: '#F59E0B' },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <Icon size={14} style={{ color: accent }} />
                </div>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Select prompt */}
          {!selectedAnchor && (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="text-center max-w-xs">
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
                  <QrCode size={20} style={{ color: 'var(--text-faint)' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Select an anchor</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>Click any anchor in the tree to inspect its details, copy its URL, or download its QR code.</p>
              </div>
            </div>
          )}
        </div>

        {/* Inspector panel */}
        <AnimatePresence>
          {selectedAnchor && selectedHierarchy && (
            <InspectorPanel anchor={selectedAnchor} hierarchy={selectedHierarchy} onClose={() => { setSelectedAnchor(null); setSelectedHierarchy(null); }} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddModal && <AddAnchorModal onClose={() => setShowAddModal(false)} onSaved={onRefresh} />}
      </AnimatePresence>
    </div>
  );
}
