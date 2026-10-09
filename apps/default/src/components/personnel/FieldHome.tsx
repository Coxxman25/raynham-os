import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertOctagon, Camera, Crosshair, LocateFixed, MapPin, Plus, RefreshCw, UserRound } from 'lucide-react';
import { getLocations, type EstateLocation } from '@/lib/estate-api';
import { getStoredProfile, type StaffProfile } from '@/lib/personnel-api';
import { BrandHeader, OfflineBanner, Skeleton } from './ui.tsx';
import { IdentitySheet } from './IdentitySheet.tsx';
import { EmergencySheet } from './EmergencySheet.tsx';
import { CreateAnchorSheet, type DevicePosition } from './CreateAnchorSheet';

type LocState = 'locating' | 'ready' | 'denied' | 'unavailable';
const CENTER: [number, number] = [52.8355, 0.7410];
const MATCH_METERS = 80;
const makeDot = (color: string, size: number) => L.divIcon({ className: 'estate-map-pin', html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 3px ${color}40,0 2px 7px rgba(0,0,0,.3)"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const deviceIcon = makeDot('#2F7D4F', 22);
const anchorIcon = makeDot('#C9A227', 18);

export function FieldHome() {
  const navigate = useNavigate();
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [locState, setLocState] = useState<LocState>('locating');
  const [locations, setLocations] = useState<EstateLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(() => getStoredProfile());
  const [identityOpen, setIdentityOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const load = useCallback(async () => { setLoading(true); setLocations(await getLocations()); setLoading(false); }, []);
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setLocState('unavailable'); return; }
    setLocState('locating');
    navigator.geolocation.getCurrentPosition(
      p => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, capturedAt: new Date(p.timestamp).toISOString() }); setLocState('ready'); },
      e => setLocState(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  }, []);

  useEffect(() => { load(); locate(); }, [load, locate]);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);

  const nearest = useMemo(() => {
    if (!position) return null;
    return locations.reduce<{ location: EstateLocation; distance: number } | null>((best, location) => {
      if (!location.lat || !location.lng) return best;
      const distance = distanceMeters(position.lat, position.lng, location.lat, location.lng);
      return !best || distance < best.distance ? { location, distance } : best;
    }, null);
  }, [locations, position]);
  const matched = nearest && nearest.distance <= MATCH_METERS ? nearest : null;
  const center: [number, number] = position ? [position.lat, position.lng] : CENTER;
  const report = () => navigate(matched ? `/a/${matched.location.id}/report` : '/field/report');

  return <>
    <BrandHeader trailing={<Crosshair className="w-4 h-4" style={{ color: 'var(--status-success)' }} aria-label="Field location" />} />
    {!online && <OfflineBanner />}
    <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand-gold)' }}>Field mode</p><h1 className="mt-1 text-[26px] leading-tight font-semibold" style={{ color: 'var(--p-text-primary)' }}>{profile ? `Hello, ${profile.name.split(' ')[0]}` : 'Your estate position'}</h1><p className="mt-1 text-sm" style={{ color: 'var(--p-text-secondary)' }}>Your phone provides the live field context.</p></div>
        <button type="button" onClick={() => setIdentityOpen(true)} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }} aria-label="Identify yourself"><UserRound className="w-5 h-5" /></button>
      </div>
      <section className="mt-4 h-52 rounded-[14px] overflow-hidden relative" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)' }} aria-label="Your position on the estate">
        <MapContainer key={`${center[0]}-${center[1]}`} center={center} zoom={position ? 17 : 14} zoomControl={false} attributionControl={false} className="h-full w-full">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          {position && <><Circle center={[position.lat, position.lng]} radius={Math.max(position.accuracy, 8)} pathOptions={{ color: '#2F7D4F', fillColor: '#2F7D4F', fillOpacity: .12, weight: 1 }} /><Marker position={[position.lat, position.lng]} icon={deviceIcon} /></>}
          {matched && <Marker position={[matched.location.lat, matched.location.lng]} icon={anchorIcon} />}
        </MapContainer>
        <button type="button" onClick={locate} className="absolute z-[1000] right-3 bottom-3 w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-md" aria-label="Refresh location"><RefreshCw className={locState === 'locating' ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} /></button>
      </section>
      <LocationCard state={locState} position={position} loading={loading} matched={matched} onLocate={locate} onCreate={() => setAnchorOpen(true)} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Action icon={<Camera className="w-5 h-5" />} title="Report concern" detail="Photo and short note" onClick={report} />
        <Action icon={<AlertOctagon className="w-5 h-5" />} title="Get help" detail="Alert on-call manager" danger onClick={() => setEmergencyOpen(true)} />
      </div>
      {position && <button type="button" onClick={() => setAnchorOpen(true)} className="mt-3 w-full min-h-11 text-sm font-medium underline underline-offset-4" style={{ color: 'var(--p-text-secondary)' }}>Create an anchor at this position</button>}
      <p className="mt-5 text-center text-xs" style={{ color: 'var(--p-text-muted)' }}>One link for staff and lone workers</p>
    </main>
    <IdentitySheet open={identityOpen} onClose={() => setIdentityOpen(false)} onSaved={setProfile} />
    <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    {position && <CreateAnchorSheet open={anchorOpen} position={position} profile={profile} onClose={() => setAnchorOpen(false)} onCreated={async () => { setAnchorOpen(false); await load(); toast.success('Anchor ready for future reports'); }} />}
  </>;
}

function LocationCard({ state, position, loading, matched, onLocate, onCreate }: { state: LocState; position: DevicePosition | null; loading: boolean; matched: { location: EstateLocation; distance: number } | null; onLocate: () => void; onCreate: () => void }) {
  if (state === 'locating' || loading) return <Skeleton className="h-28 mt-4" />;
  if (!position) return <section className="mt-4 rounded-[10px] p-4" style={{ background: 'var(--status-warning-soft)', border: '1px solid var(--border-subtle)' }}><h2 className="font-semibold">Location needed</h2><p className="mt-1 text-sm" style={{ color: 'var(--p-text-secondary)' }}>{state === 'denied' ? 'Allow location access in your browser settings, then try again.' : 'We could not get a reliable GPS position.'}</p><button type="button" onClick={onLocate} className="mt-3 min-h-11 underline underline-offset-4">Try again</button></section>;
  return <section className="mt-4 rounded-[10px] p-4" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: matched ? 'var(--status-success-soft)' : 'var(--status-warning-soft)' }}>{matched ? <MapPin className="w-5 h-5" style={{ color: 'var(--status-success)' }} /> : <LocateFixed className="w-5 h-5" style={{ color: 'var(--status-warning-p)' }} />}</div><div className="min-w-0 flex-1"><h2 className="font-semibold truncate">{matched ? matched.location.name : 'Unanchored position'}</h2><p className="mt-0.5 text-sm" style={{ color: 'var(--p-text-secondary)' }}>{matched ? `${Math.round(matched.distance)} m from registered anchor` : 'No registered anchor within 80 m'}</p><p className="mt-1 text-xs font-mono" style={{ color: 'var(--p-text-muted)' }}>GPS ±{Math.round(position.accuracy)} m · just now</p></div></div>{!matched && <button type="button" onClick={onCreate} className="mt-3 w-full min-h-11 rounded-lg flex items-center justify-center gap-2 font-semibold" style={{ background: 'var(--brand-gold)', color: '#2E3438' }}><Plus className="w-4 h-4" />Create anchor here</button>}</section>;
}

function Action({ icon, title, detail, onClick, danger }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className="min-h-28 p-4 rounded-[10px] text-left" style={{ background: 'var(--surface-raised)', border: `1px solid ${danger ? 'var(--status-danger)' : 'var(--border-subtle)'}` }}><span style={{ color: danger ? 'var(--status-danger)' : 'var(--status-warning-p)' }}>{icon}</span><span className="block mt-3 font-semibold">{title}</span><span className="block mt-1 text-xs" style={{ color: 'var(--p-text-muted)' }}>{detail}</span></button>;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371000; const rad = Math.PI / 180; const dLat = (bLat - aLat) * rad; const dLng = (bLng - aLng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
