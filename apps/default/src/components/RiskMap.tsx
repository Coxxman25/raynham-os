import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Flame,
  ShieldAlert, BarChart3, Layers, ChevronRight,
  Users, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location, RiskZone, Incident } from '@/lib/api';
import { summariseIncident, getAnchorType, ANCHOR_LAYER_CONFIG } from '@/lib/incident-utils';
import { useHeatmapData, TimeWindow, ClusterZone, ZoneRiskRow } from '@/hooks/useHeatmapData';

// ─── Personnel types ──────────────────────────────────────────────────────────

type PersonnelRole = 'security' | 'supervisor' | 'operative' | 'contractor' | 'medic';
type PersonnelStatus = 'active' | 'standby' | 'incident' | 'offline';

interface Personnel {
  id: string;
  name: string;
  role: PersonnelRole;
  status: PersonnelStatus;
  lat: number;
  lng: number;
  zone: string;
  lastPing: string; // "Xs ago"
  heightBand?: 'ground' | 'low' | 'mid' | 'high' | 'rope';
}

// Seed realistic personnel around whatever locations exist
function seedPersonnel(locations: Location[]): Personnel[] {
  if (locations.length === 0) return [];

  const PERSONNEL_SEEDS: Omit<Personnel, 'lat' | 'lng' | 'zone'>[] = [
    { id: 'p1', name: 'M. Hargrove', role: 'supervisor',  status: 'active',   lastPing: '12s ago',  heightBand: 'ground' },
    { id: 'p2', name: 'J. Okafor',   role: 'security',    status: 'active',   lastPing: '8s ago',   heightBand: 'ground' },
    { id: 'p3', name: 'A. Petrov',   role: 'operative',   status: 'incident', lastPing: '3s ago',   heightBand: 'high'   },
    { id: 'p4', name: 'L. Mbeki',    role: 'contractor',  status: 'active',   lastPing: '22s ago',  heightBand: 'mid'    },
    { id: 'p5', name: 'T. Singh',    role: 'medic',       status: 'standby',  lastPing: '45s ago',  heightBand: 'ground' },
    { id: 'p6', name: 'R. Castillo', role: 'security',    status: 'active',   lastPing: '6s ago',   heightBand: 'ground' },
    { id: 'p7', name: 'D. Nkosi',    role: 'operative',   status: 'active',   lastPing: '18s ago',  heightBand: 'rope'   },
    { id: 'p8', name: 'F. Laurent',  role: 'contractor',  status: 'offline',  lastPing: '4m ago',   heightBand: 'ground' },
    { id: 'p9', name: 'K. Yamamoto', role: 'supervisor',  status: 'active',   lastPing: '31s ago',  heightBand: 'low'    },
  ];

  // Spread personnel across available locations with small offsets
  const offsets = [
    [0.00012,  0.00015], [-0.00018, 0.00008], [0.00005, -0.00020],
    [-0.00008, -0.00012],[0.00022, -0.00005], [-0.00015,  0.00018],
    [0.00009,  0.00025], [-0.00025, -0.00008],[0.00018,  0.00011],
  ];

  return PERSONNEL_SEEDS.map((p, i) => {
    const loc = locations[i % locations.length];
    const [dlat, dlng] = offsets[i % offsets.length];
    return {
      ...p,
      lat: loc.lat + dlat,
      lng: loc.lng + dlng,
      zone: loc.code,
    };
  });
}

// ─── Personnel config ─────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<PersonnelRole, { label: string; color: string; bg: string }> = {
  supervisor:  { label: 'Supervisor',  color: '#818cf8', bg: '#818cf820' },
  security:    { label: 'Security',    color: '#00C853', bg: '#00C85320' },
  operative:   { label: 'Operative',   color: '#34d399', bg: '#34d39920' },
  contractor:  { label: 'Contractor',  color: '#f59e0b', bg: '#f59e0b20' },
  medic:       { label: 'Medic',       color: '#f87171', bg: '#f8717120' },
};

const STATUS_CONFIG: Record<PersonnelStatus, { dot: string; pulse: boolean; label: string }> = {
  active:   { dot: '#34d399', pulse: false, label: 'Active'   },
  standby:  { dot: '#f59e0b', pulse: false, label: 'Standby'  },
  incident: { dot: '#ef4444', pulse: true,  label: 'INCIDENT' },
  offline:  { dot: '#475569', pulse: false, label: 'Offline'  },
};

const HEIGHT_LABEL: Record<NonNullable<Personnel['heightBand']>, string> = {
  ground: '▬ Ground',
  low:    '↑ Low  (0–4m)',
  mid:    '↑↑ Mid (4–15m)',
  high:   '↑↑↑ High (15m+)',
  rope:   '🧗 Rope Access',
};

// ─── Personnel marker icon ────────────────────────────────────────────────────

function makePersonnelIcon(p: Personnel) {
  const cfg = ROLE_CONFIG[p.role];
  const sCfg = STATUS_CONFIG[p.status];
  const pulseRing = sCfg.pulse
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${sCfg.dot}25;animation:personnel-pulse 1.4s ease-in-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: 'custom-icon bg-transparent border-0',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${pulseRing}
        <div style="
          width:24px;height:24px;
          background:${cfg.bg};
          border:2px solid ${cfg.color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          position:absolute;top:2px;left:2px;
          box-shadow:0 0 10px ${cfg.color}60;
          font-size:9px;font-weight:900;color:${cfg.color};
          font-family:system-ui,sans-serif;letter-spacing:-0.5px;
        ">
          ${p.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div style="
          position:absolute;bottom:-1px;right:-1px;
          width:8px;height:8px;
          background:${sCfg.dot};
          border:1.5px solid #0A0C12;
          border-radius:50%;
        "></div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RiskMapProps {
  locations: Location[];
  riskZones: RiskZone[];
  incidents?: Incident[];
  focus?: { lat: number; lng: number; zoom?: number } | null;
  /** Called when a location pin is clicked — opens the ContextPanel */
  onLocationSelect?: (locationCode: string) => void;
  /** Pixels to pan the map left when the ContextPanel is open */
  panOffset?: number;
}

// ─── Anchor-type pin icons ────────────────────────────────────────────────────
// Matches the mockup: teardrop shape, icon inside, radar rings on RED.

const ANCHOR_CONFIG = {
  red: {
    bg:     '#C0392B',
    glow:   '#C0392B',
    border: '#FF6B6B',
    label:  'SOS',
    icon:   '🆘',
    rings:  true,
  },
  amber: {
    bg:     '#FFB800',
    glow:   '#FFB800',
    border: '#FFD700',
    label:  '⚠',
    icon:   '⚠',
    rings:  false,
  },
  green: {
    bg:     '#00C853',
    glow:   '#00C853',
    border: '#69F0AE',
    label:  '✓',
    icon:   '✓',
    rings:  false,
  },
} as const;

function makeAnchorPin(anchorType: 'red' | 'amber' | 'green', isSelected = false): L.DivIcon {
  const cfg = ANCHOR_CONFIG[anchorType];
  const size = isSelected ? 40 : 32;
  const innerSize = isSelected ? 26 : 20;

  const radarRings = cfg.rings ? `
    <div style="
      position:absolute;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:${size * 2.2}px;height:${size * 2.2}px;
      border-radius:50%;
      border:2px solid ${cfg.glow}40;
      animation:anchor-ring-1 2.4s ease-out infinite;
      pointer-events:none;
    "></div>
    <div style="
      position:absolute;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:${size * 1.65}px;height:${size * 1.65}px;
      border-radius:50%;
      border:2px solid ${cfg.glow}55;
      animation:anchor-ring-2 2.4s ease-out infinite 0.6s;
      pointer-events:none;
    "></div>
    <div style="
      position:absolute;
      top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:${size * 1.15}px;height:${size * 1.15}px;
      border-radius:50%;
      border:1.5px solid ${cfg.glow}70;
      animation:anchor-ring-3 2.4s ease-out infinite 1.2s;
      pointer-events:none;
    "></div>
  ` : '';

  const selectedGlow = isSelected
    ? `box-shadow:0 0 0 3px white, 0 0 20px ${cfg.glow};`
    : `box-shadow:0 4px 16px ${cfg.glow}60;`;

  return L.divIcon({
    className: 'custom-icon bg-transparent border-0',
    html: `
      <div style="
        position:relative;
        width:${size + 24}px;
        height:${size + 24}px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        ${radarRings}
        <!-- Teardrop pin -->
        <div style="
          position:relative;
          width:${size}px;
          height:${size}px;
          background:${cfg.bg};
          border:2.5px solid ${cfg.border};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          ${selectedGlow}
          transition:all 0.2s ease;
          flex-shrink:0;
        ">
          <!-- Icon inside (counter-rotated) -->
          <div style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(45deg);
            font-size:${innerSize * 0.5}px;
            font-weight:900;
            color:white;
            font-family:system-ui,sans-serif;
            line-height:1;
            padding-bottom:2px;
          ">${cfg.label}</div>
        </div>
      </div>`,
    iconSize:   [size + 24, size + 24],
    iconAnchor: [(size + 24) / 2, (size + 24) * 0.82],
    popupAnchor:[0, -(size + 8)],
  });
}

// ─── Map pan offset controller ─────────────────────────────────────────────────
// Pans the Leaflet map left by panOffset px when the ContextPanel is open,
// keeping the selected pin visible in the remaining canvas space.

function PanController({ panOffset }: { panOffset: number }) {
  const map = useMap();
  const prevOffset = useRef(0);
  useEffect(() => {
    const delta = panOffset - prevOffset.current;
    if (delta !== 0) {
      map.panBy([-delta / 2, 0], { animate: true, duration: 0.35 });
      prevOffset.current = panOffset;
    }
  }, [panOffset, map]);
  return null;
}


const getIncidentIcon = (severity: string) => {
  const c =
    severity === 'critical' ? '#FF4444' :
    severity === 'high'     ? '#FF8C42' :
    severity === 'medium'   ? '#FFD166' : '#00C853';
  const pulse = severity === 'critical'
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;background:${c}25;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : '';
  return L.divIcon({
    className: 'custom-icon bg-transparent border-0',
    html: `
      <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="
          width:10px;height:10px;
          background:${c};
          border:1.5px solid rgba(255,255,255,0.7);
          border-radius:50%;
          box-shadow:0 0 10px ${c}90, 0 0 3px ${c};
          position:relative;z-index:1;
        "></div>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// ─── FlyToFocus ───────────────────────────────────────────────────────────────

function FlyToFocus({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef<[number, number]>(center);
  useEffect(() => {
    if (prev.current[0] !== center[0] || prev.current[1] !== center[1]) {
      map.flyTo(center, zoom, { duration: 1.2 });
      prev.current = center;
    }
  }, [center[0], center[1], zoom, map]);
  return null;
}

// ─── HeatLayer — SVG circles drawn as Leaflet layer ──────────────────────────
// We render heat points as radial gradient SVG overlays on the map.
// Since we can't use leaflet.heat without installing a new package,
// we use Circle elements with very low opacity stacked to create the heat effect.

interface HeatLayerProps {
  clusterZones: ClusterZone[];
  visible: boolean;
}

const CLUSTER_COLORS: Record<ClusterZone['severity'], { fill: string; stroke: string }> = {
  critical: { fill: '#ef4444', stroke: '#ef4444' },
  high:     { fill: '#f97316', stroke: '#f97316' },
  medium:   { fill: '#f59e0b', stroke: '#f59e0b' },
  low:      { fill: '#00C853', stroke: '#00C853' },
};

function HeatLayer({ clusterZones, visible }: HeatLayerProps) {
  if (!visible) return null;
  return (
    <>
      {clusterZones.map((zone, i) => {
        const col = CLUSTER_COLORS[zone.severity];
        const opacity = 0.08 + (zone.riskScore / 100) * 0.22;
        const strokeOpacity = 0.15 + (zone.riskScore / 100) * 0.35;
        return (
          <React.Fragment key={`heat-${zone.locationCode}-${i}`}>
            {/* Outer glow ring */}
            <Circle
              center={[zone.lat, zone.lng]}
              radius={zone.radius * 2.5}
              pathOptions={{
                color: col.stroke,
                fillColor: col.fill,
                fillOpacity: opacity * 0.4,
                weight: 0,
              }}
            />
            {/* Mid ring */}
            <Circle
              center={[zone.lat, zone.lng]}
              radius={zone.radius * 1.5}
              pathOptions={{
                color: col.stroke,
                fillColor: col.fill,
                fillOpacity: opacity * 0.7,
                weight: 0,
              }}
            />
            {/* Core */}
            <Circle
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: col.stroke,
                fillColor: col.fill,
                fillOpacity: opacity * 1.2,
                weight: 1.5,
                opacity: strokeOpacity,
                dashArray: zone.severity === 'critical' ? undefined : '4 4',
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Time-window config ───────────────────────────────────────────────────────

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: '1h',  label: '1H' },
  { key: '24h', label: '24H' },
  { key: '7d',  label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
];

// ─── Trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: ZoneRiskRow['trend'] }) {
  if (trend === 'rising')  return <TrendingUp  size={11} className="text-rose-400" />;
  if (trend === 'falling') return <TrendingDown size={11} className="text-emerald-400" />;
  return <Minus size={11} className="text-slate-400" />;
}

// ─── Risk score bar ───────────────────────────────────────────────────────────

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-rose-500' :
    score >= 40 ? 'bg-orange-500' :
    score >= 20 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-black tabular-nums text-white/60 w-6 text-right">{score}</span>
    </div>
  );
}

// ─── Fallback marker icon (when no anchorType is set) ────────────────────────

const getMarkerIcon = (risk: string) => {
  const c =
    risk === 'critical' ? '#FF4444' :
    risk === 'high'     ? '#FF8C42' :
    risk === 'medium'   ? '#FFD166' : '#00C853';
  return L.divIcon({
    className: 'custom-icon bg-transparent border-0',
    html: `
      <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:12px;height:12px;
          background:${c};
          border:2px solid rgba(255,255,255,0.6);
          border-radius:50%;
          box-shadow:0 0 10px ${c}80;
        "></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// ─── Personnel Layer — Leaflet markers on the map ────────────────────────────

function PersonnelLayer({ personnel, visible }: { personnel: Personnel[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      {personnel.map(p => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={makePersonnelIcon(p)}>
          <Popup>
            <div className="flex flex-col gap-2 min-w-[190px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-black text-white">{p.name}</span>
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ color: STATUS_CONFIG[p.status].dot, background: STATUS_CONFIG[p.status].dot + '20' }}
                >
                  {STATUS_CONFIG[p.status].label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ color: ROLE_CONFIG[p.role].color, background: ROLE_CONFIG[p.role].bg }}
                >
                  {ROLE_CONFIG[p.role].label}
                </span>
                <span className="text-[10px] font-mono text-white/40">{p.zone}</span>
              </div>
              <div className="text-[9px] text-white/30 font-medium">
                Last ping: {p.lastPing}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ─── Layer Toggle Button ──────────────────────────────────────────────────────

function LayerToggle({ icon: Icon, active, onClick, title }: {
  icon: React.ElementType; active: boolean; onClick: () => void; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-8 flex items-center justify-center transition-all"
      style={{ color: active ? 'var(--aria-cyan)' : 'var(--text-muted)' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
    >
      <Icon size={13} />
    </button>
  );
}

// ─── Map Command Strip — top-right floating pill controls ─────────────────────
// Replaces ThreatOverlayPanel.
// Two stacked pills: stat counters | time window + layer toggles.

interface MapCommandStripProps {
  timeWindow: TimeWindow;
  onTimeWindow: (w: TimeWindow) => void;
  showHeat: boolean; onToggleHeat: () => void;
  showClusters: boolean; onToggleClusters: () => void;
  showPersonnel: boolean; onTogglePersonnel: () => void;
  totalFiltered: number; criticalCount: number; highCount: number; sosCount: number;
}

function MapCommandStrip({
  timeWindow, onTimeWindow,
  showHeat, onToggleHeat,
  showClusters, onToggleClusters,
  showPersonnel, onTogglePersonnel,
  totalFiltered, criticalCount, highCount, sosCount,
}: MapCommandStripProps) {
  const glass = {
    background: 'var(--surface)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--respond-border)',
  } as React.CSSProperties;

  return (
    <div className="absolute top-5 right-5 z-[400] flex flex-col items-end gap-2">
      {/* ── Stat pill ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-full"
        style={glass}
      >
        <div className="flex flex-col items-center">
          <span className="text-[15px] font-black text-[var(--respond-text-primary)] tabular-nums leading-none">{totalFiltered}</span>
          <span className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold mt-0.5">Total</span>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--respond-border)' }} />
        <div className="flex flex-col items-center">
          <span className="text-[15px] font-black tabular-nums leading-none" style={{ color: 'var(--anchor-red)' }}>{criticalCount}</span>
          <span className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold mt-0.5">Critical</span>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--respond-border)' }} />
        <div className="flex flex-col items-center">
          <span className="text-[15px] font-black tabular-nums leading-none" style={{ color: 'var(--anchor-amber)' }}>{highCount}</span>
          <span className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold mt-0.5">High</span>
        </div>
        {sosCount > 0 && (
          <>
            <div className="w-px h-6" style={{ background: 'var(--respond-border)' }} />
            <div className="flex flex-col items-center">
              <span className="text-[15px] font-black tabular-nums leading-none animate-pulse" style={{ color: 'var(--anchor-red)' }}>{sosCount}</span>
              <span className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold mt-0.5">SOS</span>
            </div>
          </>
        )}
      </motion.div>

      {/* ── Time + Layer pill ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
        className="flex items-center rounded-full overflow-hidden"
        style={glass}
      >
        {TIME_WINDOWS.map(tw => (
          <button
            key={tw.key}
            onClick={() => onTimeWindow(tw.key)}
            className="px-3 py-2 text-[10px] font-bold tracking-wide transition-all"
            style={timeWindow === tw.key
              ? { background: 'var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }
              : { color: 'var(--text-muted)' }}
          >
            {tw.label}
          </button>
        ))}
        <div className="w-px h-5 self-center" style={{ background: 'var(--respond-border)' }} />
        <LayerToggle icon={Flame} active={showHeat} onClick={onToggleHeat} title="Heat layer" />
        <LayerToggle icon={Layers} active={showClusters} onClick={onToggleClusters} title="Cluster zones" />
        <LayerToggle icon={Users} active={showPersonnel} onClick={onTogglePersonnel} title="Personnel" />
      </motion.div>
    </div>
  );
}

// ─── Zone Sheet — bottom draggable panel ──────────────────────────────────────
// Replaces ZoneRiskPanel + PersonnelManifest.
// Collapsed: 44px strip. Expanded: zones grid + personnel grid in tabs.

interface ZoneSheetProps {
  rows: ZoneRiskRow[];
  personnel: Personnel[];
  showPersonnel: boolean;
  onZoneClick: (row: ZoneRiskRow) => void;
  onPersonClick: (p: Personnel) => void;
  loading: boolean;
}

function ZoneSheet({ rows, personnel, showPersonnel, onZoneClick, onPersonClick, loading }: ZoneSheetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'zones' | 'personnel'>('zones');

  const topZone = rows[0];
  const elevatedCount = rows.filter(r => r.riskScore >= 40).length;
  const onSite = personnel.filter(p => p.status !== 'offline').length;
  const alerting = personnel.filter(p => p.status === 'incident').length;

  const glass: React.CSSProperties = {
    background: 'var(--surface)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[400] flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-4xl pointer-events-auto">

        {/* ── Handle strip ── */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-3 transition-colors hover:bg-white/[0.02]"
          style={{
            ...glass,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            borderRadius: open ? '20px 20px 0 0' : '20px 20px 0 0',
          }}
        >
          {/* Left: zone summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={14} style={{ color: 'var(--aria-cyan)' }} />
              <span className="text-xs font-black text-[var(--respond-text-secondary)] uppercase tracking-[0.12em]">{rows.length} zones</span>
            </div>
            {elevatedCount > 0 && (
              <span className="text-[11px] font-semibold text-[var(--anchor-red)]">
                · {elevatedCount} elevated
              </span>
            )}
            {topZone && (
              <span className="text-[11px] font-mono text-[var(--respond-text-faint)] hidden sm:block">
                · Peak: {topZone.locationCode}
              </span>
            )}
          </div>

          {/* Right: personnel + drag caret */}
          <div className="flex items-center gap-4">
            {alerting > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold animate-pulse text-[var(--anchor-red)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--anchor-red)]" />
                {alerting} alert
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--respond-text-faint)]">
              <Users size={12} />
              {onSite} on-site
            </span>
            {/* Drag caret */}
            <div className="flex flex-col gap-0.5 items-center">
              <div className="w-5 h-0.5 rounded-full bg-[var(--respond-border-strong)]" />
              <div className="w-5 h-0.5 rounded-full bg-[var(--respond-border-strong)]" />
            </div>
          </div>
        </button>

        {/* ── Expanded panel ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
              style={{ ...glass, borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Tabs */}
              <div className="flex items-center gap-0 border-b px-6" style={{ borderColor: 'var(--respond-border)' }}>
                {(['zones', 'personnel'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all -mb-px"
                    style={tab === t
                      ? { borderColor: 'var(--aria-cyan)', color: 'var(--aria-cyan)' }
                      : { borderColor: 'transparent', color: 'var(--respond-text-faint)' }}
                  >
                    {t === 'zones' ? `Zones (${rows.length})` : `Personnel (${onSite})`}
                  </button>
                ))}
              </div>

              {/* Zones tab */}
              {tab === 'zones' && (
                <div className="px-6 py-4 max-h-60 overflow-y-auto no-scrollbar">
                  {loading || rows.length === 0 ? (
                    <p className="text-sm text-[var(--respond-text-muted)] py-4 text-center">No data for this window</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {rows.slice(0, 8).map((row, i) => (
                        <button
                          key={row.locationCode}
                          onClick={() => { onZoneClick(row); setOpen(false); }}
                          className="group text-left p-3 rounded-xl transition-all"
                          style={{
                            background: 'var(--respond-surface)',
                            border: '1px solid var(--respond-border)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--respond-surface-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--respond-surface)')}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-[var(--respond-text-faint)] font-mono">#{i + 1}</span>
                            <TrendIcon trend={row.trend} />
                          </div>
                          <p className="text-[12px] font-bold text-[var(--respond-text-secondary)] group-hover:text-[var(--respond-text-primary)] transition-colors truncate mb-2">
                            {row.locationName}
                          </p>
                          <RiskBar score={row.riskScore} />
                          <p className="text-[10px] text-[var(--respond-text-faint)] mt-1 font-mono">{row.incidentCount} inc</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Personnel tab */}
              {tab === 'personnel' && (
                <div className="px-6 py-4 max-h-60 overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {personnel.map(p => {
                      const rc = ROLE_CONFIG[p.role];
                      const sc = STATUS_CONFIG[p.status];
                      return (
                        <button
                          key={p.id}
                          onClick={() => { onPersonClick(p); setOpen(false); }}
                          className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: 'var(--respond-surface)',
                            border: '1px solid var(--respond-border)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--respond-surface-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--respond-surface)')}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black relative"
                            style={{ background: rc.bg, border: `1.5px solid ${rc.color}`, color: rc.color }}
                          >
                            {p.name.split(' ').map((n: string) => n[0]).join('')}
                            <div
                              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--canvas-bg)]"
                              style={{ background: sc.dot }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[var(--respond-text-secondary)] truncate">{p.name.split(' ')[0]}</p>
                            <p className="text-[10px] font-semibold" style={{ color: rc.color }}>{rc.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Legend Pill — bottom-left icon button ────────────────────────────────────
// Replaces the old collapsible MapLegend rectangle.

function LegendPill({ showHeat, showClusters }: { showHeat: boolean; showClusters: boolean }) {
  const [open, setOpen] = useState(false);
  const glass: React.CSSProperties = {
    background: 'var(--surface)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--respond-border)',
  };

  return (
    <div className="absolute bottom-8 left-5 z-[400]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden shadow-2xl min-w-[200px]"
            style={glass}
          >
            <div className="px-4 py-3.5 space-y-3">
              <p className="text-[9px] font-black text-[var(--respond-text-faint)] uppercase tracking-[0.2em]">Map Legend</p>
              <div className="space-y-2">
                {[
                  { color: '#C0392B', label: 'SOS Anchor', pulse: true },
                  { color: '#FFB800', label: 'Hazard Anchor', pulse: false },
                  { color: '#00C853', label: 'Safe Zone', pulse: false },
                ].map(({ color, label, pulse }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="relative w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                      {pulse && <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: color }} />}
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    </div>
                    <span className="text-[10px] text-[var(--respond-text-muted)]">{label}</span>
                  </div>
                ))}
              </div>
              {showHeat && (
                <div className="border-t border-[var(--respond-border)] pt-2.5">
                  <p className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold mb-1.5">Heat Intensity</p>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, #00C853, #f59e0b, #ef4444)' }} />
                    <span className="text-[9px] text-[var(--respond-text-faint)]">Low → High</span>
                  </div>
                </div>
              )}
              {showClusters && (
                <div className="border-t border-[var(--respond-border)] pt-2.5 space-y-1.5">
                  <p className="text-[9px] text-[var(--respond-text-faint)] uppercase tracking-[0.18em] font-bold">Zones</p>
                  {[
                    { color: '#ef4444', label: 'Critical' },
                    { color: '#f97316', label: 'High' },
                    { color: '#f59e0b', label: 'Medium' },
                    { color: '#00C853', label: 'Low' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full border border-[var(--respond-border-strong)]" style={{ background: color + '70' }} />
                      <span className="text-[9px] text-[var(--respond-text-muted)]">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg"
        style={{
          ...glass,
          color: open ? 'var(--aria-cyan, #00E5FF)' : 'rgba(255,255,255,0.28)',
          background: open ? 'rgba(0,217,255,0.10)' : 'rgba(8,10,16,0.75)',
        }}
      >
        <Layers size={14} />
      </button>
    </div>
  );
}

// ─── Cluster popup ────────────────────────────────────────────────────────────

function ClusterPopupLayer({ clusterZones, visible }: { clusterZones: ClusterZone[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      {clusterZones.map((zone, i) => {
        const col = CLUSTER_COLORS[zone.severity];
        return (
          <Circle
            key={`cluster-popup-${zone.locationCode}-${i}`}
            center={[zone.lat, zone.lng]}
            radius={zone.radius}
            pathOptions={{ color: 'transparent', fillOpacity: 0, weight: 0 }}
          >
            <Popup>
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert size={12} style={{ color: col.fill }} />
                  <span className="text-xs font-black text-white">{zone.locationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Risk Score</span>
                  <span className="text-sm font-black" style={{ color: col.fill }}>{zone.riskScore}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Incidents</span>
                  <span className="text-xs text-white font-bold">{zone.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Severity</span>
                  <span className="text-[10px] font-black uppercase" style={{ color: col.fill }}>{zone.severity}</span>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

// ─── Main RiskMap ─────────────────────────────────────────────────────────────

export function RiskMap({
  locations,
  riskZones,
  incidents = [],
  focus,
  onLocationSelect,
  panOffset = 0,
}: RiskMapProps) {
  // Default overview: Europe-centred, zoomed out so operators see the full
  // incident landscape at a glance. Individual focus requests (map-pin clicks,
  // notification "View on Map") still fly to their precise zoom level.
  const defaultCenter: [number, number] = [54.0, 10.0];
  const defaultZoom = 5;

  const initialCenter: [number, number] = focus
    ? [focus.lat, focus.lng]
    : defaultCenter;
  const initialZoom = focus?.zoom ?? defaultZoom;

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [showHeat, setShowHeat] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(false);

  // Seed personnel from locations (demo data)
  const personnel = React.useMemo(() => seedPersonnel(locations), [locations]);

  const [isDusk, setIsDusk] = useState(
    document.documentElement.getAttribute('data-theme') === 'dusk'
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDusk(document.documentElement.getAttribute('data-theme') === 'dusk');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // ── Derived heatmap data ──
  const { heatPoints, clusterZones, zoneRiskRows, totalFiltered, criticalCount, highCount } =
    useHeatmapData(incidents, locations, timeWindow);

  // ── Fly to zone on panel click ──
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const handleZoneClick = useCallback((row: ZoneRiskRow) => {
    const loc = locations.find(l => l.code === row.locationCode);
    if (loc) setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 19 });
  }, [locations]);

  // ── Personnel toggle ──
  const handleTogglePersonnel = useCallback(() => {
    setShowPersonnel(v => !v);
  }, []);

  // ── Fly to personnel ──
  const handlePersonClick = useCallback((p: Personnel) => {
    setFlyTarget({ lat: p.lat, lng: p.lng, zoom: 20 });
  }, []);

  return (
    <div className="absolute inset-0 z-0 animate-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      {/* Dusk theme tint — overlays the map with a deep navy wash to visually distinguish from Night */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none transition-opacity duration-700"
        style={{
          background: 'linear-gradient(135deg, rgba(10,40,100,0.28) 0%, rgba(0,15,50,0.22) 100%)',
          opacity: isDusk ? 1 : 0,
        }}
        data-dusk-overlay
      />
      {/* ── Map ── */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          key={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
          className="basemap-streets"
          maxZoom={19}
        />

        {/* Focus fly-to from prop */}
        {focus && <FlyToFocus center={[focus.lat, focus.lng]} zoom={focus.zoom ?? 19} />}

        {/* Focus fly-to from panel click */}
        {flyTarget && (
          <FlyToFocus center={[flyTarget.lat, flyTarget.lng]} zoom={flyTarget.zoom} />
        )}

        {/* Pan controller — shifts map left when ContextPanel opens */}
        <PanController panOffset={panOffset} />

        {/* ── Heat / cluster overlay ── */}
        <HeatLayer clusterZones={clusterZones} visible={showHeat} />
        <ClusterPopupLayer clusterZones={clusterZones} visible={showClusters} />

        {/* ── Location markers — anchor-type aware ── */}
        {locations.map(loc => {
          // Determine primary anchor type for the pin style
          const anchorType = loc.anchorTypes?.[0];
          const icon = anchorType
            ? makeAnchorPin(anchorType)
            : getMarkerIcon(loc.risk);

          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onLocationSelect?.(loc.code);
                  setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 17 });
                },
              }}
            >
              <Popup>
                {(() => {
                  const activeCases = incidents.filter(i => i.locationCode === loc.code && i.status !== 'resolved');
                  const critCount = activeCases.filter(i => i.severity === 'critical').length;
                  const ANCHOR_LABEL: Record<string, string> = { red: 'ACT', amber: 'KNOW', green: 'GO' };
                  const ANCHOR_COLOR: Record<string, string> = { red: '#FF6B6B', amber: '#FFB800', green: '#00C853' };
                  const ANCHOR_BG: Record<string, string> = { red: 'rgba(192,57,43,0.15)', amber: 'rgba(255,184,0,0.12)', green: 'rgba(0,200,83,0.12)' };
                  return (
                    <div className="flex flex-col gap-2 min-w-[210px]">
                      {/* Zone name + code */}
                      <div>
                        <div className="font-bold text-[13px] text-white mb-0.5">{loc.name}</div>
                        <span className="text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded">{loc.code}</span>
                      </div>
                      {/* Deployed anchor types */}
                      {loc.anchorTypes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {loc.anchorTypes.map(t => (
                            <span key={t} className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: ANCHOR_BG[t] ?? 'rgba(255,255,255,0.06)', color: ANCHOR_COLOR[t] ?? 'white', border: `1px solid ${ANCHOR_COLOR[t] ?? 'rgba(255,255,255,0.1)'}30` }}>
                              {ANCHOR_LABEL[t] ?? t} anchor
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Live case count */}
                      {activeCases.length > 0 ? (
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: critCount > 0 ? 'rgba(192,57,43,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${critCount > 0 ? 'rgba(192,57,43,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                          <span className="text-[9px] font-bold" style={{ color: critCount > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.5)' }}>
                            {activeCases.length} active {activeCases.length === 1 ? 'case' : 'cases'}
                            {critCount > 0 && ` · ${critCount} critical`}
                          </span>
                          <span className="w-2 h-2 rounded-full" style={{ background: critCount > 0 ? '#FF4444' : '#FFB800', boxShadow: critCount > 0 ? '0 0 5px #FF4444' : 'none' }} />
                        </div>
                      ) : (
                        <div className="text-[9px] text-white/25 italic">No active cases</div>
                      )}
                      {/* Context panel link */}
                      {onLocationSelect && (
                        <button onClick={() => onLocationSelect(loc.code)} className="w-full text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/18 border border-[#00E5FF]/20 rounded-lg py-1.5 transition-colors mt-0.5">
                          Open zone details →
                        </button>
                      )}
                    </div>
                  );
                })()}
              </Popup>
            </Marker>
          );
        })}

        {/* ── Active incident markers ── */}
        {incidents
          .filter(inc => inc.status !== 'resolved')
          .map(inc => (
            <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={getIncidentIcon(inc.severity)}>
              <Popup>
                {(() => {
                  const s = summariseIncident(inc.description);
                  const al = getAnchorType(inc.reporter, inc.description);
                  const ac = ANCHOR_LAYER_CONFIG[al];
                  return (
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{inc.incidentId}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>{al === 'red' ? 'ACT' : al === 'amber' ? 'KNOW' : al === 'green' ? 'GO' : 'SYS'}</span>
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ac.color }}>{s.type}</div>
                      <div className="text-[11px] font-medium text-white/80 leading-snug">{s.cardLine}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">{inc.locationCode}</div>
                    </div>
                  );
                })()}
              </Popup>
            </Marker>
          ))}

        {/* ── Personnel dots ── */}
        <PersonnelLayer personnel={personnel} visible={showPersonnel} />

        {/* ── Legacy risk zone dashed rings ── */}
        {!showClusters && riskZones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            pathOptions={{
              color: '#f43f5e',
              fillColor: '#f43f5e',
              fillOpacity: 0.04,
              weight: 1,
              dashArray: '4',
            }}
            radius={zone.radius || 25}
          />
        ))}
      </MapContainer>

      {/* ── Overlay panels ── */}

      {/* ── Command Strip — top-right floating pill controls ── */}
      <MapCommandStrip
        timeWindow={timeWindow}
        onTimeWindow={setTimeWindow}
        showHeat={showHeat}
        onToggleHeat={() => setShowHeat(h => !h)}
        showClusters={showClusters}
        onToggleClusters={() => setShowClusters(c => !c)}
        showPersonnel={showPersonnel}
        onTogglePersonnel={handleTogglePersonnel}
        totalFiltered={totalFiltered}
        criticalCount={criticalCount}
        highCount={highCount}
        sosCount={incidents.filter(i => i.reporter === 'SOS-AUTO' && i.status !== 'resolved').length}
      />

      {/* ── Legend Pill — bottom-left icon button ── */}
      <LegendPill showHeat={showHeat} showClusters={showClusters} />

      {/* ── Zone Sheet — bottom slide-up panel ── */}
      <ZoneSheet
        rows={zoneRiskRows}
        personnel={personnel}
        showPersonnel={showPersonnel}
        onZoneClick={handleZoneClick}
        onPersonClick={handlePersonClick}
        loading={false}
      />

      {/* ── Popup + animation styles ── */}
      <style>{`
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #10121A !important;
          color: white !important;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 14px !important;
        }
        .leaflet-popup-content { margin: 14px !important; }
        .leaflet-container a.leaflet-popup-close-button { color: #64748b !important; top: 8px !important; right: 8px !important; }
        @keyframes ping {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        /* Personnel marker pulse */
        @keyframes personnel-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.6); opacity: 0; }
        }
        /* Anchor radar rings — Red SOS zones */
        @keyframes anchor-ring-1 {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0; }
        }
        @keyframes anchor-ring-2 {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0; }
        }
        @keyframes anchor-ring-3 {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0; }
        }
        /* Make pins feel interactive */
        .custom-icon { cursor: pointer !important; }
        .custom-icon:hover div { filter: brightness(1.2); }
      `}</style>
    </div>
  );
}
