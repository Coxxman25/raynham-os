/**
 * PinboardPublisher — Command Layer
 *
 * The operator's surface for composing and pushing live notices
 * to any zone's Amber QR portal. Matches the wireframe spec:
 *
 *  ┌─ Compose Notice ──┬─ Select Zones ──┬─ Preview ────┐
 *  │ textarea          │ zone radio list  │ phone mockup │
 *  │ urgency selector  │ select all/clear │              │
 *  │ category tags     │                 │              │
 *  └───────────────────┴─────────────────┴──────────────┘
 *  ── Last published: X min ago ── [Draft saved] [PUBLISH] [Schedule] ──
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Clock, CheckCircle2, AlertTriangle, Info,
  ChevronDown, RefreshCw, Smartphone, Globe, X,
  Shield, Wrench, Eye, Calendar, Cloud, LayoutGrid,
  CircleCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Location, PinboardNotice, PinboardUrgency, PinboardCategory, SiteContentItem,
  getLocations, getPinboardNotices, publishPinboardNotice, resolvePinboardNotice,
  getSiteContent,
} from '@/lib/api';

// ─── Color tokens ─────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<PinboardUrgency, { label: string; color: string; border: string; bg: string }> = {
  info:     { label: 'Info',     color: '#00E5FF', border: 'rgba(0,229,255,0.5)',   bg: 'rgba(0,229,255,0.08)' },
  guidance: { label: 'Guidance', color: '#FFB800', border: 'rgba(255,184,0,0.5)',   bg: 'rgba(255,184,0,0.08)' },
  urgent:   { label: 'Urgent',   color: '#C0392B', border: 'rgba(192,57,43,0.5)',   bg: 'rgba(192,57,43,0.08)' },
};

const CATEGORY_CONFIG: Record<PinboardCategory, { label: string; icon: React.ElementType }> = {
  safety:     { label: 'Safety',     icon: Shield },
  facilities: { label: 'Facilities', icon: Wrench },
  security:   { label: 'Security',   icon: Eye },
  event:      { label: 'Event',      icon: Calendar },
  weather:    { label: 'Weather',    icon: Cloud },
  general:    { label: 'General',    icon: LayoutGrid },
};

const URGENCY_LEFT_COLOR: Record<PinboardUrgency, string> = {
  info:     '#00E5FF',
  guidance: '#FFB800',
  urgent:   '#C0392B',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneSelection {
  zoneCode: string;
  zoneName: string;
  activeCount: number;
}

// ─── Phone Preview ────────────────────────────────────────────────────────────

function PhonePreview({
  text,
  urgency,
  zoneLabel,
}: {
  text: string;
  urgency: PinboardUrgency;
  zoneLabel: string;
}) {
  const cfg = URGENCY_CONFIG[urgency];
  const previewText = text.trim() || 'Your notice will appear here…';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone shell */}
      <div
        className="relative rounded-[2rem] overflow-hidden border-2 shadow-2xl"
        style={{
          width: 180,
          background: '#0A0A0C',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 0 40px rgba(0,229,255,0.1)',
        }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-16 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Screen content */}
        <div className="px-3 pb-4 space-y-2" style={{ minHeight: 220 }}>
          {/* Status bar */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>9:41</span>
            <div className="flex gap-0.5">
              {[3,2,2].map((h, i) => (
                <div key={i} className="w-0.5 rounded-full" style={{ height: h * 2, background: 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          </div>

          {/* Pinboard card */}
          <motion.div
            key={text + urgency}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-2.5 border-l-2"
            style={{
              background: cfg.bg,
              borderLeftColor: cfg.color,
              border: `1px solid ${cfg.border}`,
              borderLeftWidth: 3,
            }}
          >
            {/* Urgency dot + label */}
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
              <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            {/* Notice text */}
            <p className="text-[8px] leading-relaxed" style={{ color: '#E8E8E8' }}>
              {previewText.length > 80 ? previewText.slice(0, 80) + '…' : previewText}
            </p>
            {/* Footer */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Just now</span>
              <span className="text-[6px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {zoneLabel || 'All Zones'}
              </span>
            </div>
          </motion.div>

          {/* Placeholder cards */}
          {[0.4, 0.25].map((op, i) => (
            <div
              key={i}
              className="rounded-xl p-2 border"
              style={{
                background: `rgba(255,255,255,${op * 0.03})`,
                borderColor: `rgba(255,255,255,${op * 0.08})`,
                opacity: op,
              }}
            >
              <div className="h-1.5 rounded-full bg-white/10 w-3/4 mb-1" />
              <div className="h-1 rounded-full bg-white/10 w-full mb-0.5" />
              <div className="h-1 rounded-full bg-white/10 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'rgba(232,232,232,0.4)', maxWidth: 180 }}>
        Appears instantly on all selected zone QR portals
      </p>
    </div>
  );
}

// ─── Active Notices Panel ─────────────────────────────────────────────────────

function ActiveNotices({
  notices,
  onResolve,
}: {
  notices: PinboardNotice[];
  onResolve: (id: string, text: string) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="mt-6 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,232,232,0.4)' }}>
        Active Notices ({notices.length})
      </p>
      {notices.map(n => {
        const cfg = URGENCY_CONFIG[n.urgency];
        const ageMs = Date.now() - new Date(n.publishedAt).getTime();
        const ageMins = Math.floor(ageMs / 60000);
        const ageStr = ageMins < 1 ? 'just now' : ageMins < 60 ? `${ageMins}m ago` : `${Math.floor(ageMins / 60)}h ago`;
        return (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex items-start gap-3 rounded-xl p-3 border group"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.05)',
              borderLeftColor: cfg.color,
              borderLeftWidth: 3,
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug" style={{ color: '#E8E8E8' }}>
                {n.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-[10px]" style={{ color: 'rgba(232,232,232,0.35)' }}>·</span>
                <span className="text-[10px] font-mono" style={{ color: 'rgba(232,232,232,0.35)' }}>{n.zoneLabel || n.zoneCode}</span>
                <span className="text-[10px]" style={{ color: 'rgba(232,232,232,0.35)' }}>·</span>
                <span className="text-[10px]" style={{ color: 'rgba(232,232,232,0.35)' }}>{ageStr}</span>
              </div>
            </div>
            <button
              onClick={() => onResolve(n.id, n.text)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/5"
              title="Mark resolved"
            >
              <CheckCircle2 size={14} style={{ color: '#00E5FF' }} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PinboardPublisherProps {
  onOpenAria?: (ctx?: string) => void;
  /** Pre-selected zone code (from StudioBroadcast unified zone selector) */
  defaultZone?: string;
  /** Pre-selected broadcast tab (from StudioBroadcast anchor type) */
  defaultBroadcastTab?: 'pinboard' | 'green';
  /** Pre-loaded locations (avoids a second API call when used inside StudioBroadcast) */
  locations?: Location[];
  /** Called after a notice is successfully published */
  onPublished?: () => void;
}

export function PinboardPublisher({
  onOpenAria,
  defaultZone,
  defaultBroadcastTab,
  locations: propLocations,
  onPublished,
}: PinboardPublisherProps) {
  // ── Form state ────────────────────────────────────────────────────────
  const [text, setText] = useState('');
  const [urgency, setUrgency] = useState<PinboardUrgency>('info');
  const [category, setCategory] = useState<PinboardCategory>('general');
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    () => defaultZone ? new Set([defaultZone]) : new Set()
  );
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<{ time: Date; zones: string } | null>(null);

  // ── Data state ────────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>(propLocations ?? []);
  const [notices, setNotices] = useState<PinboardNotice[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContentItem[]>([]);
  const [loadingData, setLoadingData] = useState(!propLocations?.length);

  // ── Tab state ─────────────────────────────────────────────────────────
  const [broadcastTab, setBroadcastTab] = useState<'pinboard' | 'green'>(defaultBroadcastTab ?? 'pinboard');

  const MAX_CHARS = 280;
  const remaining = MAX_CHARS - text.length;

  // ── Load data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // If locations were pre-supplied by StudioBroadcast, skip the locations fetch
      const fetches: Promise<any>[] = [getPinboardNotices(), getSiteContent()];
      if (!propLocations?.length) fetches.unshift(getLocations());

      const results = await Promise.all(fetches);
      if (!propLocations?.length) {
        setLocations(results[0] as Location[]);
        setNotices(results[1] as PinboardNotice[]);
        setSiteContent(results[2] as SiteContentItem[]);
      } else {
        setNotices(results[0] as PinboardNotice[]);
        setSiteContent(results[1] as SiteContentItem[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Sync defaultZone changes from parent (zone selector in StudioBroadcast)
  useEffect(() => {
    if (defaultZone) setSelectedZones(new Set([defaultZone]));
  }, [defaultZone]);

  // Sync defaultBroadcastTab from parent (anchor type change)
  useEffect(() => {
    if (defaultBroadcastTab) setBroadcastTab(defaultBroadcastTab);
  }, [defaultBroadcastTab]);

  // Sync prop locations
  useEffect(() => {
    if (propLocations?.length) setLocations(propLocations);
  }, [propLocations]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Zone helpers ──────────────────────────────────────────────────────
  const zoneList: ZoneSelection[] = locations.map(loc => ({
    zoneCode: loc.code,
    zoneName: loc.name,
    activeCount: notices.filter(n => n.zoneCode === loc.code).length,
  }));

  const primaryZone = locations.find(l => selectedZones.has(l.code));
  const previewZoneLabel = primaryZone
    ? (selectedZones.size > 1 ? `${primaryZone.name} +${selectedZones.size - 1}` : primaryZone.name)
    : 'All Zones';

  const toggleZone = (code: string) => {
    setSelectedZones(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const selectAll = () => setSelectedZones(new Set(locations.map(l => l.code)));
  const clearAll = () => setSelectedZones(new Set());

  // ── Publish ───────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!text.trim()) { toast.error('Notice text is required'); return; }
    if (selectedZones.size === 0) { toast.error('Select at least one zone'); return; }
    setPublishing(true);
    try {
      const zonesToPublish = Array.from(selectedZones);
      await Promise.all(zonesToPublish.map(code => {
        const loc = locations.find(l => l.code === code);
        return publishPinboardNotice({
          text: text.trim(),
          zoneCode: code,
          zoneLabel: loc?.name ?? code,
          urgency,
          category,
          publishedBy: 'Security Lead',
        });
      }));
      setLastPublished({ time: new Date(), zones: zonesToPublish.join(', ') });
      toast.success(`Notice published to ${zonesToPublish.length} zone${zonesToPublish.length > 1 ? 's' : ''}`);
      setText('');
      // Keep zone selected when in unified Studio mode (defaultZone present)
      if (!defaultZone) setSelectedZones(new Set());
      await loadData();
      onPublished?.();
    } catch (err) {
      toast.error('Failed to publish notice');
    } finally {
      setPublishing(false);
    }
  };

  // ── Resolve notice ────────────────────────────────────────────────────
  const handleResolve = async (id: string, noticeText: string) => {
    try {
      await resolvePinboardNotice(id);
      toast.success('Notice marked as resolved');
      await loadData();
    } catch {
      toast.error('Failed to resolve notice');
    }
  };

  // ── Time ago helper ───────────────────────────────────────────────────
  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    return `${Math.floor(mins / 60)} hour${Math.floor(mins / 60) > 1 ? 's' : ''} ago`;
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#0A0A0C', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Page title + tabs ── */}
      <div
        className="flex-shrink-0 px-8 py-6 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold uppercase tracking-widest font-display"
              style={{ color: '#E8E8E8', letterSpacing: '0.1em' }}
            >
              Pinboard Publisher
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(232,232,232,0.45)' }}>
              Push live notices to any zone QR portal — instantly
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 mr-2">
              <button
                onClick={() => setBroadcastTab('pinboard')}
                className={cn(
                  'px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                  broadcastTab === 'pinboard'
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                Broadcast
              </button>
              <button
                onClick={() => setBroadcastTab('green')}
                className={cn(
                  'px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5',
                  broadcastTab === 'green'
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF]'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                Green Channel
              </button>
            </div>
            {lastPublished && broadcastTab === 'pinboard' && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.2)' }}
              >
                <CircleCheck size={12} style={{ color: '#00E5FF' }} />
                <span className="text-[11px]" style={{ color: '#00E5FF' }}>
                  Last published {timeAgo(lastPublished.time)}
                </span>
              </motion.div>
            )}
            <button
              onClick={loadData}
              className="p-2 rounded-xl transition-colors"
              style={{ color: 'rgba(232,232,232,0.4)' }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {broadcastTab === 'pinboard' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[1fr_280px_220px] gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>

        {/* ── Panel A: Compose ── */}
        <div
          className="flex flex-col p-6 overflow-y-auto"
          style={{ background: '#0A0A0C' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(232,232,232,0.4)' }}>
            Compose Notice
          </p>

          {/* Textarea */}
          <div
            className="relative rounded-2xl border overflow-hidden mb-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: text ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)',
              transition: 'border-color 0.2s',
            }}
          >
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What should people in this zone know right now?"
              rows={6}
              className="w-full bg-transparent resize-none p-4 text-sm outline-none placeholder:text-sm"
              style={{
                color: '#E8E8E8',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.6,
              }}
            />
            <div
              className="flex justify-end px-4 py-2 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <span
                className="text-[10px] font-mono"
                style={{ color: remaining < 40 ? '#C0392B' : 'rgba(232,232,232,0.3)' }}
              >
                {remaining} / {MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Urgency selector */}
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(232,232,232,0.4)' }}>
            Urgency
          </p>
          <div className="flex gap-2 mb-5">
            {(Object.entries(URGENCY_CONFIG) as [PinboardUrgency, typeof URGENCY_CONFIG[PinboardUrgency]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setUrgency(key)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border"
                style={{
                  background: urgency === key ? cfg.bg : 'rgba(255,255,255,0.02)',
                  borderColor: urgency === key ? cfg.border : 'rgba(255,255,255,0.06)',
                  color: urgency === key ? cfg.color : 'rgba(232,232,232,0.45)',
                  transform: urgency === key ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {cfg.label}
                {key === 'guidance' && (
                  <span className="block text-[9px] opacity-70 normal-case tracking-normal font-normal">
                    Warning Gold
                  </span>
                )}
                {key === 'urgent' && (
                  <span className="block text-[9px] opacity-70 normal-case tracking-normal font-normal">
                    Strategic Red
                  </span>
                )}
                {key === 'info' && (
                  <span className="block text-[9px] opacity-70 normal-case tracking-normal font-normal">
                    #00E5FF
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Category tags */}
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(232,232,232,0.4)' }}>
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORY_CONFIG) as [PinboardCategory, typeof CATEGORY_CONFIG[PinboardCategory]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const active = category === key;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200"
                  style={{
                    background: active ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                    borderColor: active ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#00E5FF' : 'rgba(232,232,232,0.55)',
                  }}
                >
                  <Icon size={11} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Active notices */}
          <ActiveNotices notices={notices} onResolve={handleResolve} />
        </div>

        {/* ── Panel B: Select Zones ── */}
        <div
          className="flex flex-col p-5 border-l overflow-y-auto"
          style={{ background: '#0A0A0C', borderColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,232,0.4)' }}>
              Select Zones
            </p>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: '#00E5FF' }}
              >
                Select All
              </button>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <button
                onClick={clearAll}
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(232,232,232,0.4)' }}
              >
                Clear
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {zoneList.length === 0 ? (
                /* Demo zones when no real locations exist */
                [
                  { zoneCode: 'ZONE-B2', zoneName: 'North Wing', activeCount: 2 },
                  { zoneCode: 'ZONE-A1', zoneName: 'Main Entrance', activeCount: 2 },
                  { zoneCode: 'ZONE-C3', zoneName: 'Car Park West', activeCount: 0 },
                  { zoneCode: 'ZONE-D4', zoneName: 'Library', activeCount: 1 },
                ].map(z => {
                  const sel = selectedZones.has(z.zoneCode);
                  return (
                    <button
                      key={z.zoneCode}
                      onClick={() => toggleZone(z.zoneCode)}
                      className="w-full text-left rounded-xl p-3 border transition-all duration-200"
                      style={{
                        background: sel ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                        borderColor: sel ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          style={{
                            borderColor: sel ? '#00E5FF' : 'rgba(255,255,255,0.2)',
                            background: sel ? '#00E5FF' : 'transparent',
                          }}
                        >
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: '#E8E8E8' }}>{z.zoneName}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ color: 'rgba(232,232,232,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                              {z.zoneCode}
                            </span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,232,232,0.4)' }}>
                            {z.activeCount} active notice{z.activeCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                zoneList.map(z => {
                  const sel = selectedZones.has(z.zoneCode);
                  return (
                    <button
                      key={z.zoneCode}
                      onClick={() => toggleZone(z.zoneCode)}
                      className="w-full text-left rounded-xl p-3 border transition-all duration-200"
                      style={{
                        background: sel ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                        borderColor: sel ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          style={{
                            borderColor: sel ? '#00E5FF' : 'rgba(255,255,255,0.2)',
                            background: sel ? '#00E5FF' : 'transparent',
                          }}
                        >
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: '#E8E8E8' }}>{z.zoneName}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ color: 'rgba(232,232,232,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                              {z.zoneCode}
                            </span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,232,232,0.4)' }}>
                            {z.activeCount} active notice{z.activeCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Panel C: Preview ── */}
        <div
          className="flex flex-col p-5 border-l overflow-y-auto"
          style={{ background: '#0A0A0C', borderColor: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(232,232,232,0.4)' }}>
            Preview
          </p>
          <div className="flex justify-center">
            <PhonePreview
              text={text}
              urgency={urgency}
              zoneLabel={previewZoneLabel}
            />
          </div>
        </div>
      </div>
      )}

      {/* ── Footer action bar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t"
        style={{
          background: 'rgba(255,255,255,0.015)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Last published */}
        <div className="flex items-center gap-2">
          {lastPublished ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00E5FF' }} />
              <span className="text-[11px]" style={{ color: 'rgba(232,232,232,0.45)' }}>
                Last published {timeAgo(lastPublished.time)} to {lastPublished.zones}
              </span>
            </>
          ) : (
            <span className="text-[11px]" style={{ color: 'rgba(232,232,232,0.25)' }}>
              No notices published this session
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Draft saved indicator */}
          {text.trim() && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px]"
              style={{ color: 'rgba(232,232,232,0.35)' }}
            >
              Draft saved automatically
            </motion.span>
          )}

          {/* Schedule (stub) */}
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(232,232,232,0.5)',
            }}
            onClick={() => toast.info('Scheduled publishing coming soon')}
          >
            <Clock size={13} />
            Schedule for later
          </button>

          {/* Publish */}
          <motion.button
            onClick={handlePublish}
            disabled={publishing || !text.trim() || selectedZones.size === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
            style={{
              background: publishing || !text.trim() || selectedZones.size === 0
                ? 'rgba(0,229,255,0.2)'
                : '#00E5FF',
              color: publishing || !text.trim() || selectedZones.size === 0
                ? 'rgba(0,229,255,0.5)'
                : '#0A0A0C',
              cursor: publishing || !text.trim() || selectedZones.size === 0 ? 'not-allowed' : 'pointer',
              boxShadow: (!publishing && text.trim() && selectedZones.size > 0)
                ? '0 0 20px rgba(0,229,255,0.25)'
                : 'none',
            }}
          >
            {publishing ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {publishing ? 'Publishing…' : 'Publish to Pinboard'}
          </motion.button>
        </div>
      </div>

      {/* ── Green Channel Tab ── */}
      {broadcastTab === 'green' && (
        <div className="flex-1 overflow-auto p-6" style={{ background: '#0A0A0C' }}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,200,83,0.1)', border: '1px solid rgba(0,200,83,0.2)' }}>
                <Globe size={16} style={{ color: '#00E5FF' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Green Channel Content</h2>
                <p className="text-[11px]" style={{ color: 'rgba(232,232,232,0.4)' }}>
                  Edit what appears on the Green Anchor QR portal
                </p>
              </div>
            </div>

            {siteContent.length === 0 ? (
              <div className="text-center py-12 text-[11px]" style={{ color: 'rgba(232,232,232,0.3)' }}>
                No site content configured. Add items in the Site Content project.
              </div>
            ) : (
              <div className="space-y-6">
                {(['cafeteria-item', 'parking-level', 'service'] as const).map(groupType => {
                  const items = siteContent.filter(i => i.type === groupType);
                  if (items.length === 0) return null;
                  const groupLabel = groupType === 'cafeteria-item' ? 'Cafeteria Menu'
                    : groupType === 'parking-level' ? 'Parking Levels'
                    : 'Services';
                  const groupColor = groupType === 'cafeteria-item' ? '#00C853'
                    : groupType === 'parking-level' ? '#FFB800'
                    : '#00C853';
                  return (
                    <div key={groupType}>
                      <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: groupColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: groupColor }} />
                        {groupLabel}
                      </h3>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 rounded-xl border"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">{item.name}</span>
                                {item.tag && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,232,232,0.5)' }}>
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(232,232,232,0.4)' }}>{item.detail}</p>
                              {item.hours && (
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(232,232,232,0.3)' }}>{item.hours}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                              {item.total > 0 && (
                                <div className="text-right">
                                  <p className="text-xs font-bold" style={{ color: groupColor }}>
                                    {item.availability} / {item.total}
                                  </p>
                                  <p className="text-[9px]" style={{ color: 'rgba(232,232,232,0.3)' }}>spaces</p>
                                </div>
                              )}
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{
                                background: item.status === 'Available' || item.status === 'Open' || item.status === 'Active'
                                  ? 'rgba(0,200,83,0.08)'
                                  : 'rgba(255,184,0,0.08)',
                                color: item.status === 'Available' || item.status === 'Open' || item.status === 'Active'
                                  ? '#00C853'
                                  : '#FFB800',
                              }}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
