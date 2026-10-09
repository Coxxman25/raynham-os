/**
 * AnchorControl — Unified zone management console.
 *
 * Consolidates three previously separate views into one operator destination:
 *   ZONES     → add/edit zones, manage QR codes per zone
 *   BROADCAST → push live notices to zone pinboards
 *   STUDIO    → generate and preview QR anchors for deployment
 *
 * Phase 1: wrapper-only consolidation. Each tab renders its legacy component
 * with zero internal changes. Visual polish comes in Phase 2+.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SiteStructure } from './SiteStructure';
import { DemoKit } from './DemoKit';
import { Location, Incident, RiskZone } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AnchorTab = 'site-structure' | 'demo';

interface AnchorControlProps {
  locations: Location[];
  incidents: Incident[];
  riskZones: RiskZone[];
  search: string;
  onRefresh: () => void;
  onOpenAria?: (ctx?: string) => void;
  demoMode?: boolean;
  onResetDemo?: () => void;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: AnchorTab; label: string; icon: React.ElementType; sublabel: string }[] = [
  { id: 'site-structure', label: 'SITE STRUCTURE', icon: QrCode,      sublabel: 'Client · Site · Zone · Anchor' },
  { id: 'demo',           label: 'DEMO MODE',       icon: FlaskConical, sublabel: 'Live demos & deployment kits' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AnchorControl({
  locations,
  incidents,
  riskZones,
  search,
  onRefresh,
  onOpenAria,
  demoMode,
  onResetDemo,
}: AnchorControlProps) {
  const [activeTab, setActiveTab] = useState<AnchorTab>('site-structure');

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--canvas-bg)' }}>
      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 px-6 pt-0 pb-0" style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-200',
                )}
                style={isActive
                  ? { color: 'var(--aria-cyan)', borderBottom: '2px solid var(--aria-cyan)' }
                  : { color: 'var(--text-muted)', borderBottom: '2px solid transparent' }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'site-structure' && (
            <motion.div key="site-structure" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
              <SiteStructure locations={locations} incidents={incidents} onRefresh={onRefresh} />
            </motion.div>
          )}
          {activeTab === 'demo' && (
            <motion.div key="demo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
              <DemoKit locations={locations} onResetDemo={onResetDemo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
