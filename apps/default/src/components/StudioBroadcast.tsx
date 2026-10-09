/**
 * StudioBroadcast — Phase 3 unified view.
 *
 * Left pane  — Live Studio: actual iframe rendering the unified anchor shell.
 *              As content is published on the right, the phone preview
 *              refreshes automatically.
 *
 * Right pane — Broadcast: PinboardPublisher.
 *              Shares zone selector with Studio.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Smartphone, Radio, RefreshCw, ExternalLink,
  Monitor, Zap, Globe, ChevronDown, Download,
} from 'lucide-react';
import {
  getLocations, Location,
  getUnifiedAnchorQrUrl,
} from '@/lib/api';
import { PinboardPublisher } from './PinboardPublisher';

// ─── Live Phone Frame ─────────────────────────────────────────────────────────

interface LivePhoneFrameProps {
  zone: string;
  refreshKey: number;
}

function LivePhoneFrame({ zone, refreshKey }: LivePhoneFrameProps) {
  const src = `${window.location.origin}?a=${encodeURIComponent(zone)}&_r=${refreshKey}`;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); }, [zone, refreshKey]);

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative rounded-[2.8rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
        style={{ width: 264, height: 556, border: '8px solid #1A1C23', background: '#000', outline: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1A1C23] rounded-b-2xl z-20" />
        <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: '#00E5FF', boxShadow: '0 0 12px #00E5FF' }} />
        <iframe
          key={`${zone}-${refreshKey}`}
          src={src}
          title="Live unified preview"
          className="absolute inset-0 w-full h-full border-none"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: '#0B0F17' }}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#00E5FF20', borderTopColor: '#00E5FF' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00E5FF' }}>Loading…</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: '#00E5FF18', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00E5FF' }} />
          LIVE
        </span>
        <span className="text-[11px] font-mono text-slate-500">{zone}</span>
      </div>
    </div>
  );
}

// ─── QR Tile ──────────────────────────────────────────────────────────────────

function QrTile({ zone }: { zone: string }) {
  const qrUrl = getUnifiedAnchorQrUrl(zone);

  const download = () => {
    const link = document.createElement('a');
    link.href = qrUrl; link.download = `AD-UNIFIED-${zone}.png`; link.target = '_blank'; link.click();
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col items-center gap-3 border" style={{ background: 'rgba(0,229,255,0.06)', borderColor: 'rgba(0,229,255,0.18)' }}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#00E5FF' }}>UNIFIED QR · {zone}</p>
      <div className="relative p-2 rounded-xl border-2" style={{ borderColor: '#00E5FF', background: '#000' }}>
        <img src={qrUrl} alt="Unified QR" className="w-24 h-24 block"
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            const fb = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '?a=' + zone)}&format=png&margin=10`;
            if (el.src !== fb) el.src = fb;
          }}
        />
      </div>
      <button onClick={download} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl hover:opacity-80 transition-all" style={{ background: '#00E5FF', color: '#000' }}>
        <Download size={10} /> Download
      </button>
    </div>
  );
}

const FALLBACK_ZONES = [
  { code: 'ZONE-A1', label: 'Main Entrance' },
  { code: 'ZONE-B2', label: 'East Corridor' },
  { code: 'ZONE-C3', label: 'West Stairwell' },
  { code: 'ZONE-D4', label: 'Cafeteria' },
  { code: 'ZONE-E5', label: 'Staff Office' },
  { code: 'ZONE-F6', label: 'Car Park Level 1' },
];

// ─── Main StudioBroadcast ─────────────────────────────────────────────────────

interface StudioBroadcastProps {
  locations?: Location[];
}

export function StudioBroadcast({ locations: propLocations }: StudioBroadcastProps) {
  const [zone, setZone] = useState('ZONE-A1');
  const [refreshKey, setRefreshKey] = useState(0);
  const [locations, setLocations] = useState<Location[]>(propLocations ?? []);

  useEffect(() => {
    if (propLocations?.length) {
      setLocations(propLocations);
      if (propLocations[0]) setZone(propLocations[0].code);
      return;
    }
    getLocations().then(locs => {
      setLocations(locs);
      if (locs[0]) setZone(locs[0].code);
    }).catch(() => {});
  }, []);

  const handlePublished = useCallback(() => {
    setTimeout(() => setRefreshKey(k => k + 1), 900);
  }, []);

  const loc = locations.find(l => l.code === zone);
  const previewUrl = `${window.location.origin}?a=${encodeURIComponent(zone)}`;

  const ZONE_OPTIONS = locations.length > 0
    ? locations.map(l => ({ code: l.code, label: l.name }))
    : FALLBACK_ZONES;

  return (
    <div className="h-full w-full bg-[#0A0B0F] text-white overflow-hidden flex flex-col">

      {/* Unified top bar */}
      <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-white/[0.06] bg-[#0D0F14] gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Monitor size={14} className="text-[#00E5FF]" />
              <h2 className="text-sm font-black text-white tracking-tight">
                Studio <span className="text-slate-500 font-normal mx-1">+</span> Broadcast
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Live preview · Publish · Deploy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={zone} onChange={e => setZone(e.target.value)}
              className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 pr-8 text-[12px] text-white font-mono outline-none hover:bg-white/[0.07] transition-all cursor-pointer"
            >
              {ZONE_OPTIONS.map(z => <option key={z.code} value={z.code} className="bg-[#0D0F14]">{z.label} — {z.code}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-[#00E5FF] hover:bg-[#00E5FF]/[0.06] border border-white/[0.06] hover:border-[#00E5FF]/20 transition-all"
          ><RefreshCw size={11} /> Refresh</button>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all"
          ><ExternalLink size={11} /> Open Live</a>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT — Live Studio */}
        <div className="w-[370px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0D0F14] overflow-y-auto no-scrollbar">
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone size={12} className="text-[#00E5FF]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white">Live Studio</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Unified experience · Refreshes on publish</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest">Live</span>
            </div>
          </div>

          <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl border flex items-center gap-3" style={{ background: 'rgba(0,229,255,0.06)', borderColor: 'rgba(0,229,255,0.15)' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#00E5FF' }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: '#00E5FF' }}>UNIFIED ANCHOR</p>
              <p className="text-[9px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{loc?.name ?? zone}</p>
            </div>
          </div>

          <div className="flex justify-center py-8 px-4">
            <LivePhoneFrame zone={zone} refreshKey={refreshKey} />
          </div>

          <div className="px-4 pb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 px-1">Deploy QR</p>
            <QrTile zone={zone} />
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
            ><Globe size={12} /> Scan as visitor</a>
          </div>
        </div>

        {/* RIGHT — Broadcast */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 px-6 py-3.5 border-b border-white/[0.04] bg-[#0A0B0F] flex items-center gap-3">
            <Radio size={12} className="text-[#00E5FF]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">Broadcast</span>
            <span className="text-[10px] text-slate-600">—</span>
            <span className="text-[10px] text-slate-500 font-mono">{zone}</span>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
              <Zap size={10} className="text-[#00E5FF]/40" />
              <span>Publish → Preview auto-refreshes</span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PinboardPublisher
              locations={locations}
              defaultZone={zone}
              onPublished={handlePublished}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
