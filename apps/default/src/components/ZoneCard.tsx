/**
 * ZoneCard — Floating zone intelligence card for Monitor mode.
 *
 * Appears when a map location pin is clicked. Positioned as an overlay
 * above the map (bottom-right of the map canvas). Keeps the map full-screen
 * while giving instant context and action shortcuts.
 *
 * Shows:
 *   Zone name + code
 *   Deployed anchor types (ACT / KNOW / GO badges)
 *   Open cases count + severity
 *   Status (active notices / guidance / clear)
 *   Last scan time
 *
 * Actions:
 *   [Respond →]         — switches to Respond mode
 *   [Publish update →]  — switches to Publish mode
 *   [Full details →]    — opens ContextPanel
 *   [×] close
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ShieldAlert, Megaphone, Info } from 'lucide-react';
import { type Location, type Incident } from '@/lib/api';
import { ANCHOR_LAYER_CONFIG, type AnchorLayer } from '@/lib/incident-utils';

interface ZoneCardProps {
  locationCode: string | null;
  locations: Location[];
  incidents: Incident[];
  onClose: () => void;
  onRespond: () => void;
  onPublish: () => void;
  onDetails: (code: string) => void;
}

const ANCHOR_SHORT: Record<AnchorLayer, string> = { red: 'ACT', amber: 'KNOW', green: 'GO', system: 'SYS' };

export function ZoneCard({ locationCode, locations, incidents, onClose, onRespond, onPublish, onDetails }: ZoneCardProps) {
  const loc = useMemo(() => locations.find(l => l.code === locationCode) ?? null, [locations, locationCode]);

  const activeCases = useMemo(() =>
    incidents.filter(i => i.locationCode === locationCode && i.status !== 'resolved'),
    [incidents, locationCode],
  );
  const critCount = activeCases.filter(i => i.severity === 'critical').length;
  const highCount = activeCases.filter(i => i.severity === 'high').length;

  function timeAgo(iso?: string): string {
    if (!iso) return '—';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  const lastCase = activeCases.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  const statusColor = critCount > 0 ? '#FF4444' : highCount > 0 ? '#FFB066' : '#00E5FF';
  const statusLabel = critCount > 0 ? 'Critical' : highCount > 0 ? 'High priority' : activeCases.length > 0 ? 'Cases open' : 'Clear';

  const glass: React.CSSProperties = {
    background: 'rgba(8,10,16,0.90)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: `1px solid ${critCount > 0 ? 'rgba(192,57,43,0.28)' : 'rgba(255,255,255,0.09)'}`,
    boxShadow: critCount > 0
      ? '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(192,57,43,0.15)'
      : '0 24px 60px rgba(0,0,0,0.7)',
  };

  return (
    <AnimatePresence>
      {locationCode && (
        <motion.div
          key={locationCode}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-24 right-5 z-[450] w-72 rounded-2xl overflow-hidden"
          style={glass}
        >
          {/* Status bar */}
          <div className="h-0.5 w-full" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}60` }} />

          {/* Header */}
          <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/85 leading-tight truncate">
                {loc?.name ?? locationCode}
              </p>
              <p className="text-[9px] font-mono text-white/30 mt-0.5">{locationCode}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-white/55 hover:bg-white/[0.06] transition-all"
            >
              <X size={11} />
            </button>
          </div>

          {/* Anchor types */}
          {loc && loc.anchorTypes.length > 0 && (
            <div className="px-4 pb-2.5 flex items-center gap-1.5 flex-wrap">
              {(loc.anchorTypes as AnchorLayer[]).map(t => {
                const c = ANCHOR_LAYER_CONFIG[t];
                return (
                  <span key={t} className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                    {ANCHOR_SHORT[t]} anchor
                  </span>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Open cases</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: critCount > 0 ? `0 0 4px ${statusColor}` : 'none' }} />
                <span className="text-[9px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white/80">{activeCases.length}</span>
              {(critCount > 0 || highCount > 0) && (
                <span className="text-[10px] text-white/35">
                  {critCount > 0 && `${critCount} critical`}
                  {critCount > 0 && highCount > 0 && ' · '}
                  {highCount > 0 && `${highCount} high`}
                </span>
              )}
            </div>
            {lastCase && (
              <p className="text-[9px] text-white/25 mt-0.5">Last activity {timeAgo(lastCase.createdAt)}</p>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 space-y-1.5">
            <button
              onClick={() => { onRespond(); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group"
              style={{ background: critCount > 0 ? 'rgba(192,57,43,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${critCount > 0 ? 'rgba(192,57,43,0.25)' : 'rgba(255,255,255,0.07)'}` }}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={11} style={{ color: critCount > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.45)' }} />
                <span className="text-[11px] font-semibold" style={{ color: critCount > 0 ? '#FF9999' : 'rgba(255,255,255,0.65)' }}>
                  Respond
                </span>
              </div>
              <ArrowRight size={10} className="text-white/20 group-hover:text-white/45 transition-colors" />
            </button>

            <button
              onClick={() => { onPublish(); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone size={11} className="text-white/40" />
                <span className="text-[11px] font-semibold text-white/55">Publish update</span>
              </div>
              <ArrowRight size={10} className="text-white/20 group-hover:text-white/45 transition-colors" />
            </button>

            {locationCode && (
              <button
                onClick={() => { onDetails(locationCode); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group"
                style={{ background: 'transparent' }}
              >
                <div className="flex items-center gap-2.5">
                  <Info size={11} className="text-white/25" />
                  <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors">Full zone details</span>
                </div>
                <ArrowRight size={10} className="text-white/15 group-hover:text-white/35 transition-colors" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

