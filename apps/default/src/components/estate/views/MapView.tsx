import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { getLocations, getReports, getCheckIns, MAP_DATA_CHANGED_EVENT, EstateLocation, EstateReport, SafetyCheckIn } from '@/lib/estate-api';
import { anchorHasActiveNotice, subscribeNotices } from '@/lib/notices-store';
import { AlertTriangle, Users, MapPin as LocIcon, Layers } from 'lucide-react';
import { AssetDetailPanel, type AssetForPanel } from './AssetDetailPanel.tsx';

type Basemap = 'satellite' | 'streets' | 'terrain';

const BASEMAPS: Record<Basemap, { url: string; attribution: string; maxZoom: number; label: string }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    label: 'Satellite',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    label: 'Streets',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Tiles &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    label: 'Terrain',
  },
};

const ESTATE_CENTER: [number, number] = [52.8355, 0.7410];

// Token-driven pin colours (Section 23.1)
const TOKEN = {
  staff:  '#2F7D4F', // status-success  — staff green
  report: '#C9821E', // status-warning-p — reports amber
  anchor: '#C9A227', // brand-gold       — anchors
  alert:  '#C43D2E', // status-danger    — alerts red
} as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function staffPin(initials: string, attention = false): L.DivIcon {
  const ring = attention ? TOKEN.report : TOKEN.staff;
  return L.divIcon({
    className: 'estate-map-pin',
    html: `<div style="width:36px;height:36px;background:${TOKEN.staff};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 0 0 3px ${ring},0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:11px;font-weight:700;color:#fff;letter-spacing:.02em">${initials}</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
  });
}

function reportPin(): L.DivIcon {
  return L.divIcon({
    className: 'estate-map-pin',
    html: `<div style="width:30px;height:30px;background:${TOKEN.report};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;font-weight:800;color:#fff;">!</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30],
  });
}

function anchorDot(hasNotice: boolean): L.DivIcon {
  return L.divIcon({
    className: 'estate-map-pin',
    html: `<div style="position:relative;width:20px;height:20px;"><div style="width:20px;height:20px;border-radius:50%;background:${TOKEN.anchor};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>${hasNotice ? `<div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:${TOKEN.report};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);"><span style="font-size:10px;font-weight:800;color:#fff;line-height:1;">!</span></div>` : ''}</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10],
  });
}

function alertPin(): L.DivIcon {
  return L.divIcon({
    className: 'estate-map-pin estate-map-pin-pulse',
    html: `<div style="position:relative;width:36px;height:36px;"><div class="pulse-ring" style="position:absolute;inset:0;border-radius:50%;background:${TOKEN.alert};opacity:.35;"></div><div style="position:absolute;inset:6px;border-radius:50%;background:${TOKEN.alert};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4);"><span style="font-size:12px;font-weight:800;color:#fff;line-height:1;">!</span></div></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18],
  });
}

export function Map({ workspace = 'all' }: { workspace?: string }) {
  const [locations, setLocations] = useState<EstateLocation[]>([]);
  const [reports, setReports] = useState<EstateReport[]>([]);
  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'locations' | 'reports' | 'safety'>('all');
  const [activeAsset, setActiveAsset] = useState<AssetForPanel | null>(null);
  const [, forceTick] = useState(0);
  useEffect(() => subscribeNotices(() => forceTick(t => t + 1)), []);
  const [basemap, setBasemap] = useState<Basemap>(() => {
    try {
      const saved = localStorage.getItem('raynham-basemap') as Basemap | null;
      if (saved === 'satellite' || saved === 'streets' || saved === 'terrain') return saved;
    } catch { /* ignore */ }
    return 'satellite';
  });

  const chooseBasemap = useCallback((b: Basemap) => {
    setBasemap(b);
    try { localStorage.setItem('raynham-basemap', b); } catch { /* ignore */ }
  }, []);

  const fetchData = useCallback(async () => {
    const [locs, reps, cis] = await Promise.all([
      getLocations(),
      getReports(),
      getCheckIns(),
    ]);
    setLocations(locs);
    setReports(reps);
    setCheckIns(cis);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const refresh = () => { void fetchData(); };
    window.addEventListener(MAP_DATA_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(MAP_DATA_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchData]);

  const filteredLocations = workspace === 'all'
    ? locations
    : locations.filter(l => l.area === workspace);

  const showLocations = selectedLayer === 'all' || selectedLayer === 'locations';
  const showReports = selectedLayer === 'all' || selectedLayer === 'reports';
  const showSafety = selectedLayer === 'all' || selectedLayer === 'safety';

  return (
    <div className="relative h-full w-full">
      {/* Layer toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-1.5">
        {([
          { id: 'all', label: 'All' },
          { id: 'locations', label: 'Assets' },
          { id: 'reports', label: 'Reports' },
          { id: 'safety', label: 'Safety' },
        ] as const).map(l => {
          const isActive = selectedLayer === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setSelectedLayer(l.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md',
                'transition-colors glass-panel',
                isActive ? 'text-[var(--brass)]' : 'text-[var(--text-muted)]',
              )}
              style={isActive ? {
                background: 'var(--brass-dim)',
                borderColor: 'var(--brass-dim)',
              } : undefined}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Basemap switcher (top-right) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-0.5 glass-panel rounded-lg p-0.5">
        <Layers className="w-3.5 h-3.5 mx-1.5" style={{ color: 'var(--text-muted)' }} aria-hidden />
        {(Object.keys(BASEMAPS) as Basemap[]).map(b => {
          const isActive = basemap === b;
          return (
            <button
              key={b}
              onClick={() => chooseBasemap(b)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                isActive ? 'text-[var(--brass)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
              style={isActive ? { background: 'var(--brass-dim)' } : undefined}
              aria-pressed={isActive}
              aria-label={`Show ${BASEMAPS[b].label} basemap`}
            >
              {BASEMAPS[b].label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-[999]">
          <div className="w-6 h-6 border-2 border-[var(--surface-border)] border-t-[var(--brass)] rounded-full animate-spin" />
        </div>
      )}

      <MapContainer
        center={ESTATE_CENTER}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
        style={{ background: 'var(--canvas-bg)' }}
      >
        <TileLayer
          key={basemap}
          url={BASEMAPS[basemap].url}
          attribution={BASEMAPS[basemap].attribution}
          maxZoom={BASEMAPS[basemap].maxZoom}
          className={basemap === 'satellite' ? 'basemap-satellite' : basemap === 'terrain' ? 'basemap-terrain' : 'basemap-streets'}
        />

        {showLocations && filteredLocations.map(loc => {
          const hasNotice = anchorHasActiveNotice(loc.id);
          const asset: AssetForPanel = {
            id: loc.id, name: loc.name, zone: loc.area, workspace: (loc.area as any) === 'farm' || (loc.area as any) === 'property' || (loc.area as any) === 'hospitality' ? (loc.area as any) : 'farm',
            w3w: loc.what3words, status: loc.status, lat: loc.lat, lng: loc.lng,
          };
          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={anchorDot(hasNotice)}
              eventHandlers={{ click: () => setActiveAsset(asset) }}
            />
          );
        })}

        {showReports && reports.filter(r => r.lat && r.lng).map(rep => {
          const isAlert = rep.priority === 'critical' || rep.priority === 'urgent';
          return (
            <Marker
              key={rep.id}
              position={[rep.lat, rep.lng]}
              icon={isAlert ? alertPin() : reportPin()}
              eventHandlers={{
                click: () => setActiveAsset({
                  id: rep.id, name: rep.title, zone: rep.location, workspace: 'farm', kind: 'incident',
                  w3w: rep.what3words, status: rep.status, priority: rep.priority, detail: rep.description,
                  lat: rep.lat, lng: rep.lng,
                }),
              }}
            />
          );
        })}

        {showSafety && checkIns.filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180 && !(c.lat === 0 && c.lng === 0)).map(ci => {
          const captureAge = ci.capturedAt ? Date.now() - new Date(ci.capturedAt).getTime() : Number.POSITIVE_INFINITY;
          const isStale = captureAge > Math.max((ci.intervalMinutes || 60) * 60000, 15 * 60000);
          const needsAttention = ci.status === 'escalated' || ci.status === 'overdue' || isStale;
          const isEscalated = ci.status === 'escalated' || ci.workMode === 'emergency';
          const ageMinutes = Number.isFinite(captureAge) ? Math.max(0, Math.floor(captureAge / 60000)) : null;
          const truthLabel = ageMinutes == null ? 'Legacy check-in · capture time unavailable' : `Explicit GPS · ${ageMinutes < 1 ? 'captured just now' : `captured ${ageMinutes} min ago`}`;
          return <Marker
            key={ci.id}
            position={[ci.lat, ci.lng]}
            icon={isEscalated ? alertPin() : staffPin(initialsFor(ci.workerName), needsAttention)}
            eventHandlers={{
              click: () => setActiveAsset({
                id: ci.id, name: ci.workerName, zone: `${ci.location} · ${truthLabel}`, workspace: 'farm', kind: 'personnel',
                w3w: ci.what3words, status: needsAttention ? 'needs_attention' : ci.status,
                capturedAt: ci.capturedAt, source: ci.locationSource, lat: ci.lat, lng: ci.lng,
              }),
            }}
          />;
        })}
      </MapContainer>

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex gap-2 pointer-events-none">
        <StatChip icon={<LocIcon className="w-3.5 h-3.5" />} label="Locations" value={filteredLocations.length} color="var(--brass)" />
        <StatChip icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Open Reports" value={reports.filter(r => r.status !== 'resolved').length} color="var(--status-urgent)" />
        <StatChip icon={<Users className="w-3.5 h-3.5" />} label="Workers" value={checkIns.length} color="var(--status-info)" />
      </div>

      <AssetDetailPanel asset={activeAsset} onClose={() => setActiveAsset(null)} />
    </div>
  );
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}
