import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { type Incident, type Location } from '@/lib/api';
import { MapPin, ArrowRight, Clock, AlertTriangle, Shield } from 'lucide-react';
import {
  getAnchorType, getReporterLabel,
  ANCHOR_LAYER_CONFIG, type AnchorLayer,
} from '@/lib/incident-utils';

function getEscalationRoute(severity: string, reporter: string): string[] {
  if (reporter === 'SOS-AUTO') return ['Control Room', 'Site Security Lead', 'Emergency Services'];
  if (severity === 'critical')  return ['Control Room', 'Site Security Lead'];
  if (severity === 'high')      return ['Site Manager', 'Facilities Lead'];
  if (severity === 'medium')    return ['Zone Supervisor'];
  return ['On-duty Officer'];
}

function getEvidenceStatus(i: Incident): { label: string; active: boolean } {
  if (i.reporter === 'SOS-AUTO' || i.severity === 'critical' || i.severity === 'high')
    return { label: 'Recording active', active: true };
  if (i.status === 'reviewing') return { label: 'Monitoring', active: false };
  return { label: 'Not recording', active: false };
}

function makeMiniPin(layer: AnchorLayer): L.DivIcon {
  const cfg = ANCHOR_LAYER_CONFIG[layer];
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:-8px;border-radius:50%;background:${cfg.color}18;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div><div style="width:14px;height:14px;background:${cfg.color};border:2px solid rgba(255,255,255,0.75);border-radius:50%;box-shadow:0 0 14px ${cfg.color}80;position:relative;z-index:1;"></div></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

const SHORT: Record<AnchorLayer, string> = { red:'ACT', amber:'KNOW', green:'GO', system:'SYS' };

function ABadge({ type, small }: { type: AnchorLayer; small?: boolean }) {
  const c = ANCHOR_LAYER_CONFIG[type];
  return (
    <span className={`inline-flex items-center font-black uppercase tracking-wider rounded ${small ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {SHORT[type]}
    </span>
  );
}

function Div() { return <div className="h-px" style={{ background: 'var(--respond-border)' }} />; }

function Row({ label, value, hi }: { label: string; value: React.ReactNode; hi?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold text-[var(--respond-text-faint)] uppercase tracking-[0.18em]">{label}</span>
      <span className="text-[12px] font-semibold leading-snug" style={{ color: hi ? 'var(--aria-cyan)' : 'var(--respond-text-secondary)' }}>
        {value}
      </span>
    </div>
  );
}

interface ZoneDetailPanelProps {
  incident: Incident | null;
  allIncidents: Incident[];
  locations: Location[];
}

export function ZoneDetailPanel({ incident, allIncidents, locations }: ZoneDetailPanelProps) {
  const tile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const loc = useMemo(() => locations.find(l => l.code === incident?.locationCode) ?? null, [locations, incident]);
  const layer = useMemo(() => incident ? getAnchorType(incident.reporter, incident.description) : ('red' as AnchorLayer), [incident]);
  const prev24h = useMemo(() => {
    if (!incident) return 0;
    const cut = Date.now() - 86400000;
    return allIncidents.filter(i => i.id !== incident.id && i.locationCode === incident.locationCode && new Date(i.createdAt ?? 0).getTime() > cut).length;
  }, [incident, allIncidents]);

  const mapLat = loc?.lat ?? incident?.lat ?? 51.5074;
  const mapLng = loc?.lng ?? incident?.lng ?? -0.1278;

  const glass: React.CSSProperties = {
    background: 'var(--surface)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '1px solid var(--respond-border)',
  };

  return (
    <div className="w-72 shrink-0 flex flex-col h-full overflow-y-auto no-scrollbar" style={glass}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Shield size={11} style={{ color:'var(--aria-cyan)' }} />
          <span className="text-[10px] font-black text-[var(--respond-text-muted)] uppercase tracking-[0.18em]">Zone Details</span>
        </div>
      </div>
      <Div />
      <AnimatePresence mode="wait">
        {!incident ? (
          <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex-1 flex flex-col items-center justify-center px-5 gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'var(--aria-cyan-glow)', border:'1px solid var(--aria-cyan-dim)' }}>
              <MapPin size={16} style={{ color:'var(--aria-cyan)' }} />
            </div>
            <p className="text-[11px] text-[var(--respond-text-muted)] text-center leading-relaxed">Select a case to view zone &amp; anchor details</p>
          </motion.div>
        ) : (
          <motion.div key={incident.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2, ease:[0.16,1,0.3,1] }} className="flex-1 flex flex-col">

            {/* Triggered-by anchor banner */}
            {(() => {
              const c = ANCHOR_LAYER_CONFIG[layer];
              return (
                <div className="mx-4 mt-4 px-3 py-2.5 rounded-xl flex items-center gap-3" style={{ background:c.bg, border:`1px solid ${c.border}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-[9px] tracking-wider" style={{ background:c.color+'22', color:c.color }}>
                    {SHORT[layer]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color:c.color }}>{c.label} Layer</p>
                    <p className="text-[9px] mt-px" style={{ color:c.color+'AA' }}>{getReporterLabel(incident.reporter)}</p>
                  </div>
                </div>
              );
            })()}

            {/* Mini map — canonical anchor position */}
            <div className="relative mx-4 mt-3 rounded-xl overflow-hidden" style={{ height:148, border:'1px solid var(--respond-border-strong)' }}>
              <MapContainer center={[mapLat, mapLng]} zoom={17} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false} dragging={false} className="w-full h-full" key={`${mapLat}-${mapLng}`}>
                <TileLayer
                  url={tile}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  className="basemap-streets"
                  maxZoom={19}
                />
                <Marker position={[mapLat, mapLng]} icon={makeMiniPin(layer)} />
              </MapContainer>
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background:'linear-gradient(to top,rgba(0,0,0,0.75),transparent)' }}>
                <p className="text-[10px] font-bold text-white truncate">{loc?.name ?? incident.location_name ?? incident.locationCode}</p>
              </div>
            </div>

            {/* Info fields */}
            <div className="px-5 py-4 space-y-3.5">
              <Row label="Zone ID" value={incident.locationCode} hi />
              <Row label="Zone name" value={loc?.name ?? incident.location_name ?? '—'} />

              {loc && loc.anchorTypes.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[var(--respond-text-faint)] uppercase tracking-[0.18em]">Anchors deployed</span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {(loc.anchorTypes as AnchorLayer[]).map(t => <ABadge key={t} type={t} small />)}
                  </div>
                </div>
              )}

              <Div />

              <Row label="Previous cases (24h)" value={
                prev24h === 0 ? 'None recorded' :
                <span className="flex items-center gap-1.5">
                  <Clock size={10} style={{ color: prev24h > 1 ? 'var(--anchor-amber)' : 'var(--respond-text-muted)' }} />
                  {prev24h} {prev24h === 1 ? 'case' : 'cases'} at this zone
                </span>
              } />

              <Row label="Escalation route" value={
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {getEscalationRoute(incident.severity, incident.reporter).map((step, i, arr) => (
                    <React.Fragment key={step}>
                      <span className="text-[11px] font-semibold text-[var(--respond-text-secondary)]">{step}</span>
                      {i < arr.length - 1 && <ArrowRight size={9} className="text-[var(--respond-text-faint)] shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              } />

              <Div />

              {(() => {
                const ev = getEvidenceStatus(incident);
                return (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-[var(--respond-text-faint)] uppercase tracking-[0.18em]">Evidence status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.active ? 'var(--anchor-red)' : 'var(--respond-text-faint)', boxShadow: ev.active ? '0 0 6px var(--anchor-red)' : 'none' }} />
                      <span className="text-[12px] font-semibold" style={{ color: ev.active ? 'var(--anchor-red)' : 'var(--respond-text-muted)' }}>{ev.label}</span>
                    </div>
                  </div>
                );
              })()}

              {incident.reporter === 'SOS-AUTO' && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background:'var(--anchor-red-glow)', border:'1px solid var(--anchor-red-glow)' }}>
                  <AlertTriangle size={11} className="text-[var(--anchor-red)] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[var(--anchor-red)] leading-relaxed font-medium">SOS anchor activated. Automatic evidence capture in progress.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes ping{75%,100%{transform:scale(2.5);opacity:0;}}`}</style>
    </div>
  );
}

