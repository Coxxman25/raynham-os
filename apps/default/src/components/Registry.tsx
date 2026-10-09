import React, { useState, useMemo } from 'react';
import { Location, Incident, RiskZone, createLocation, getUnifiedAnchorQrUrl } from '@/lib/api';
import {
  QrCode, ClipboardCheck, Plus, Download, AlertTriangle, MapPin, X,
  ChevronDown, ChevronRight, Shield, Layers, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RegistryProps {
  locations: Location[];
  incidents?: Incident[];
  riskZones?: RiskZone[];
  search?: string;
  onRefresh: () => void;
  onOpenAria?: (context?: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  low: 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/20 dark:bg-[#00C853]/20 dark:text-[#00C853] dark:border-[#00C853]/30',
};

const RISK_DOT: Record<string, string> = {
  critical: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
  high: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
  medium: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  low: 'bg-[#00C853] shadow-[0_0_8px_rgba(0,200,83,0.6)]',
};

const TYPE_LABEL: Record<string, string> = {
  classroom:    'Office / Workstation',
  corridor:     'Corridor / Airside Passage',
  toilet:       'Welfare / Rest Area',
  playground:   'Perimeter / External Zone',
  sports_hall:  'Terminal / Concourse Area',
  canteen:      'Cafeteria / Dining Zone',
  library:      'Resource / Admin Area',
  other:        'General Zone',
  pitch:        'Logistics / Operations Zone',
  changing:     'Staff / Welfare Facility',
  court:        'Baggage / Transit Area',
};

const CHECKLIST: Record<string, string[]> = {
  classroom: [
    'Safety protocol poster visible and current',
    'Occupancy log maintained and accessible',
    'Clear sightlines — no blind spots or obstructions',
    'Lone-worker policy enforced in this zone',
    'All personnel know how to raise an alert',
  ],
  corridor: [
    'CCTV coverage confirmed operational',
    'Adequate lighting — no dark blind spots',
    'Supervision coverage during peak movement periods',
    'Emergency exit routes unobstructed',
    'Fire doors close and latch correctly',
  ],
  toilet: [
    'Welfare checks conducted at scheduled intervals',
    'Dignity and privacy protocols respected',
    'Emergency contact information clearly posted',
    'No surveillance — privacy policy compliant',
    'Concerns logged within 24 hours of report',
  ],
  playground: [
    'Supervision roster confirmed and deployed',
    'Blind-spot areas identified and monitored',
    'Recent incident log reviewed this period',
    'First aid kit accessible and fully stocked',
    'Perimeter access controlled and secured',
  ],
  sports_hall: [
    'Passenger flow management protocols in place',
    'No unauthorised recording devices — policy enforced',
    'CCTV coverage confirmed — no blind spots',
    'Lone-working policy applied to this area',
    'Contractor and visitor clearance records on file',
  ],
  canteen: [
    'Adequate supervision during peak occupancy',
    'Vulnerability monitoring active in this zone',
    'Known hotspot areas identified and monitored',
    'Safety signage clearly displayed',
    'Incidents reported to Safety Lead same day',
  ],
  library: [
    'Network safety filters active and tested',
    'Acceptable use policy displayed and acknowledged',
    'Adequate supervision maintained at all times',
    'Concerning online activity reported to Safety Lead',
    'Lone-use policy enforced — no unmonitored access',
  ],
  other: [
    'Zone risk assessment completed this period',
    'Safety signage visible and current',
    'Supervision protocols defined and communicated',
    'Concerns reported to Safety Lead within 24 hours',
    'All personnel know the primary Safety Lead contact',
  ],
  pitch: [
    'Ground handling operations risk assessment completed',
    'Airside access controls active and verified',
    'Safety signage visible and current',
    'Concerns reported to Safety Lead within 24 hours',
  ],
  changing: [
    'Staff welfare facility access strictly controlled',
    'Regular welfare checks conducted at set intervals',
    'No unauthorised devices — policy enforced',
    'Concerns reported to Safety Lead within 24 hours',
  ],
  court: [
    'Baggage handling area supervision maintained',
    'Equipment and belt systems inspected each shift',
    'Safety signage visible',
    'Concerns reported to Safety Lead within 24 hours',
  ],
};

// ─── Add Location Modal ───────────────────────────────────────────────────────

function AddLocationModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', type: 'sports_hall', lat: '', lng: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createLocation({
        name: form.name,
        code: form.code,
        type: form.type,
        lat: parseFloat(form.lat) || 52.2348,
        lng: parseFloat(form.lng) || -0.5234,
      });
      toast.success(`Zone ${form.code} added to the Registry`);
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to add location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-panel w-full max-w-md p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-50"></div>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Register New Zone</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Zone Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
                placeholder="e.g. North Entrance Foyer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Zone Code</label>
              <input
                required
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
                placeholder="Z1-NORTH-ENT"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Type</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF] transition-all appearance-none"
            >
              <option value="classroom">Office / Workstation</option>
              <option value="corridor">Corridor / Airside Passage</option>
              <option value="toilet">Welfare / Rest Area</option>
              <option value="playground">Perimeter / External Zone</option>
              <option value="sports_hall">Terminal / Concourse Area</option>
              <option value="canteen">Cafeteria / Dining Zone</option>
              <option value="pitch">Logistics / Operations Zone</option>
              <option value="court">Baggage / Transit Area</option>
              <option value="changing">Staff / Welfare Facility</option>
              <option value="library">Resource / Admin Area</option>
              <option value="other">General Zone</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Latitude</label>
              <input
                value={form.lat}
                onChange={e => setForm({ ...form, lat: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF] transition-all"
                placeholder="52.2348"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Longitude</label>
              <input
                value={form.lng}
                onChange={e => setForm({ ...form, lng: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF] transition-all"
                placeholder="-0.5234"
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 text-xs font-bold uppercase tracking-widest text-white dark:text-slate-900 bg-slate-900 dark:bg-[#00E5FF] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add Area'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Registry ────────────────────────────────────────────────────────────────

export function Registry({ locations: locationsProp, incidents = [], riskZones = [], search = '', onRefresh, onOpenAria }: RegistryProps) {
  const locations = locationsProp ?? [];
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // All groups start collapsed; first group opens after data loads
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean> | null>(null);
  const toggleType = (type: string, currentIndex: number) =>
    setCollapsedTypes(prev => {
      const base = prev ?? {};
      const current = type in base ? base[type] : currentIndex !== 0;
      return { ...base, [type]: !current };
    });

  const selectedLoc = locations.find(l => l.id === selectedLocId) ?? null;
  const checklist = CHECKLIST[selectedLoc?.type ?? 'classroom'] ?? CHECKLIST['other'] ?? [];
  const unifiedQrUrl = selectedLoc ? getUnifiedAnchorQrUrl(selectedLoc.code) : '';

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? locations.filter(l =>
          l.name?.toLowerCase().includes(q) ||
          l.code?.toLowerCase().includes(q) ||
          l.type?.toLowerCase().includes(q)
        )
      : locations;
    const map: Record<string, Location[]> = {};
    for (const loc of filtered) {
      if (!map[loc.type]) map[loc.type] = [];
      map[loc.type].push(loc);
    }
    return map;
  }, [locations, search]);

  const toggleCheck = (key: string) => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));

  const checkedCount = checklist.filter((_, i) => !!checkedItems[`${selectedLoc?.id}-${i}`]).length;
  const allChecked = checkedCount === checklist.length;

  const handleDownloadQR = () => {
    if (!selectedLoc) return;
    const link = document.createElement('a');
    link.href = unifiedQrUrl;
    link.download = `AD-UNIFIED-${selectedLoc.code}.png`;
    link.target = '_blank';
    link.click();
    toast.success(`Unified QR for ${selectedLoc.code} downloading`);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto no-scrollbar">
      <AnimatePresence>
        {showAddModal && (
          <AddLocationModal
            onClose={() => setShowAddModal(false)}
            onSaved={onRefresh}
          />
        )}
      </AnimatePresence>

      <div className="p-8 pt-12 max-w-5xl mx-auto w-full space-y-4 pb-32">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="glass-panel px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:border-[#00E5FF] dark:hover:border-[#00E5FF] flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add Area
          </button>
        </div>

        <div className="space-y-3">
          {locations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
              <MapPin className="mx-auto mb-3 opacity-20" size={32} />
              No nodes operational.
            </div>
          ) : (
            Object.entries(grouped).map(([type, locs], groupIndex) => {
              // First group open by default, rest collapsed
              const isCollapsed = collapsedTypes === null
                ? groupIndex !== 0
                : type in collapsedTypes ? collapsedTypes[type] : groupIndex !== 0;
              const totalCases = locs.reduce((s, l) => s + (l.incidentCount || 0), 0);
              // Determine dominant anchor type for this group (red > amber > green priority)
              const allAnchorTypes = locs.flatMap(l => l.anchorTypes ?? []);
              const dominantAnchor = allAnchorTypes.includes('red') ? 'red'
                : allAnchorTypes.includes('amber') ? 'amber'
                : 'green';
              const anchorPillStyle = dominantAnchor === 'red'
                ? 'text-rose-400 border-rose-500/25 bg-rose-500/8'
                : dominantAnchor === 'amber'
                  ? 'text-amber-400 border-amber-500/25 bg-amber-500/8'
                  : 'text-[#00C853] border-[#00C853]/25 bg-[#00C853]/8';
              return (
                <div key={type} className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]">
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleType(type, groupIndex)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                  >
                    <Layers size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.18em] flex-1 text-left">
                      {TYPE_LABEL[type] ?? type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mr-2">
                      {locs.length} zone{locs.length !== 1 ? 's' : ''}
                    </span>
                    {totalCases > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border mr-2',
                        anchorPillStyle
                      )}>
                        {totalCases} case{totalCases !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isCollapsed
                      ? <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-slate-200/50 dark:border-white/5 pt-2">
                          {locs.map(loc => {
                            const isCritical = loc.risk === 'critical' || loc.risk === 'high';
                            const riskDot = RISK_DOT[loc.risk] ?? 'bg-[#00C853]';
                            // Determine anchor colour for this specific zone's case pill
                            const locAnchorTypes = loc.anchorTypes ?? [];
                            const locAnchor = locAnchorTypes.includes('red') ? 'red'
                              : locAnchorTypes.includes('amber') ? 'amber'
                              : 'green';
                            const locCasePillColor = locAnchor === 'red'
                              ? 'text-rose-400'
                              : locAnchor === 'amber'
                                ? 'text-amber-400'
                                : 'text-[#00C853]';
                            return (
                              <div
                                key={loc.id}
                                onClick={() => setSelectedLocId(loc.id)}
                                className="flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer group hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                              >
                                {/* Status dot */}
                                <div className={cn(
                                  'w-2.5 h-2.5 rounded-full shrink-0',
                                  riskDot,
                                  isCritical && 'animate-pulse'
                                )} />

                                {/* Name + code */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#00E5FF] transition-colors truncate">
                                    {loc.name}
                                  </h4>
                                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                    {loc.code}
                                  </p>
                                </div>

                                {/* Case count — coloured by anchor type */}
                                <div className="shrink-0 text-right">
                                  {loc.incidentCount > 0 ? (
                                    <span className={cn('text-[10px] font-bold', locCasePillColor)}>
                                      {loc.incidentCount} open
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-600">Clear</span>
                                  )}
                                </div>

                                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-[#00E5FF] transition-colors shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Master Slide-out Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full max-w-[550px] transform transition-transform duration-700 ease-surgical z-50",
        selectedLocId ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Drawer Glass Backdrop */}
        <div className="absolute inset-0 bg-white/90 dark:bg-[#12141A]/95 backdrop-blur-3xl border-l border-slate-200 dark:border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_100px_rgba(0,0,0,0.5)] transition-colors duration-500" />
        
        {selectedLoc && (
          <div className="relative h-full flex flex-col p-12">
            {/* Drawer Header */}
            <div className="flex items-start justify-between mb-10 pb-8 border-b border-slate-200/50 dark:border-white/5">
              <div>
                <span className="px-3 py-1 bg-[#00E5FF]/10 text-[#00E5FF] rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">
                  Operational Zone
                </span>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight font-display">
                  {selectedLoc.name}
                </h2>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
                  Zone Code: {selectedLoc.code}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLocId(null)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#1A1C23] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content Area */}
            <div className="flex-1 overflow-y-auto space-y-12 no-scrollbar pb-10">
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Unified Anchor QR</h4>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-[2rem] p-8 text-center"
                >
                  {/* Colour accent bar */}
                  <div className="h-1 w-16 mx-auto rounded-full bg-[#00E5FF] mb-6 shadow-[0_0_12px_rgba(0,229,255,0.6)]" />

                  <div className="w-36 h-36 mx-auto bg-white rounded-2xl p-3 flex items-center justify-center mb-6 shadow-[0_8px_40px_rgba(0,229,255,0.2)]">
                    {unifiedQrUrl ? (
                      <img src={unifiedQrUrl} alt={`Unified QR for ${selectedLoc?.code}`} className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-full h-full text-slate-900" />
                    )}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-1">Unified Anchor QR</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    One QR code for Information, Reporting, and Emergency Help. No app required. Anonymous by design.
                  </p>

                  <div className="flex items-center gap-2 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-xl px-4 py-2.5 mb-5 text-left">
                    <MapPin size={12} className="text-[#00E5FF] shrink-0" />
                    <p className="text-[10px] text-[#00E5FF] font-semibold font-mono">
                      → ?a={selectedLoc?.code}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadQR}
                    className="w-full py-4 bg-[#00E5FF] text-slate-900 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 shadow-lg shadow-[#00E5FF]/20"
                  >
                    <Download size={16} /> Download Unified QR
                  </button>
                </motion.div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4 mt-8">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Safeguarding Checklist</h4>
                  <span className={cn(
                    'text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest',
                    allChecked ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  )}>
                    {checkedCount}/{checklist.length} Verified
                  </span>
                </div>
                <div className="space-y-3">
                  {checklist.map((item, i) => {
                    const key = `${selectedLoc.id}-${i}`;
                    const checked = !!checkedItems[key];
                    return (
                      <label key={key} className="flex items-center gap-4 p-5 glass-panel rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-[#1A1C23] transition-colors group">
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          checked ? "bg-[#00C853] border-[#00C853]" : "border-slate-300 dark:border-slate-600 group-hover:border-[#00C853]"
                        )}>
                          {checked && <Check size={12} className="text-[#12141A]" strokeWidth={3} />}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleCheck(key)} className="sr-only" />
                        <span className={cn("text-xs font-bold transition-colors", checked ? "text-[#00C853] line-through opacity-70" : "text-slate-700 dark:text-slate-300")}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
