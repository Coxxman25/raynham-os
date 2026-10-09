/**
 * StatusStrip — The ambient command surface header.
 *
 * Always visible at 36px. Shows:
 *   - ADOS system status (left)
 *   - Alert pills — only rendered when alerts exist (centre-left)
 *   - Spacer
 *   - Live clock + refresh indicator (right)
 *
 * Philosophy: Critical state should be obvious but not chaotic.
 * Pills replace scrolling marquee — each pill is a tappable summary.
 * No scrolling banners. No unnecessary animation.
 * On critical state: strip background shifts to deep red, ring applies to canvas.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { type Incident } from '@/lib/api';
import {
  selectCriticalPending,
  selectSosPending,
  selectHighPending,
} from '@/lib/app-context';
import { cn } from '@/lib/utils';

interface StatusStripProps {
  incidents: Incident[];
  onAlertChange: (active: boolean) => void;
  refreshing?: boolean;
}

// ─── Live Clock ────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] tracking-wide">
      {time}
    </span>
  );
}

// ─── Alert Pill ────────────────────────────────────────────────────────────────

interface AlertPillProps {
  count: number;
  label: string;
  color: 'red' | 'amber' | 'cyan';
}

function AlertPill({ count, label, color }: AlertPillProps) {
  if (count === 0) return null;

  const styles = {
    red:   { bg: 'var(--anchor-red-glow)',   border: 'var(--anchor-red)',  text: 'var(--anchor-red)',   dot: 'var(--anchor-red)' },
    amber: { bg: 'var(--anchor-amber-glow)', border: 'var(--anchor-amber)', text: 'var(--anchor-amber)', dot: 'var(--anchor-amber)' },
    cyan:  { bg: 'var(--aria-cyan-glow)',    border: 'var(--aria-cyan)',   text: 'var(--aria-cyan)',    dot: 'var(--aria-cyan)' },
  }[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-default select-none"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 animate-dot-blink"
        style={{ background: styles.dot }}
      />
      <span
        className="text-[10px] font-bold tracking-wide whitespace-nowrap"
        style={{ color: styles.text }}
      >
        {count} {label}
      </span>
    </motion.div>
  );
}

// ─── StatusStrip ──────────────────────────────────────────────────────────────

export function StatusStrip({ incidents, onAlertChange, refreshing = false }: StatusStripProps) {
  const sos      = selectSosPending(incidents);
  const critical = selectCriticalPending(incidents);
  const high     = selectHighPending(incidents);
  const isCritical = sos.length > 0 || critical.length > 0;
  const hasAlerts  = isCritical || high.length > 0;

  // Notify parent of alert state
  const prevAlert = useRef(false);
  useEffect(() => {
    if (isCritical !== prevAlert.current) {
      prevAlert.current = isCritical;
      onAlertChange(isCritical);
    }
  }, [isCritical, onAlertChange]);

  return (
    <div
      className="shrink-0 flex items-center px-4 gap-3 transition-all duration-500 select-none"
      style={{
        height: 36,
        background: isCritical
          ? 'linear-gradient(90deg, rgba(217,45,32,0.14) 0%, var(--strip-bg, #060810) 40%)'
          : 'var(--strip-bg, #060810)',
        borderBottom: '1px solid var(--strip-border, rgba(255,255,255,0.04))',
      }}
    >
      {/* ── System status (left) ── */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            isCritical ? 'bg-[var(--anchor-red)] animate-dot-blink' : 'bg-emerald-500',
          )}
        />
        <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--text-muted)]">
          {isCritical ? 'Alert' : 'System Online'}
        </span>
      </div>

      {/* ── Divider ── */}
      <span className="w-px h-4 shrink-0" style={{ background: 'var(--strip-border)' }} />

      {/* ── Alert pills ── */}
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {sos.length > 0 && (
            <AlertPill key="sos" count={sos.length} label="SOS" color="red" />
          )}
          {critical.length > 0 && (
            <AlertPill key="critical" count={critical.length} label="Critical" color="red" />
          )}
          {high.length > 0 && !isCritical && (
            <AlertPill key="high" count={high.length} label="High Priority" color="amber" />
          )}
          {!hasAlerts && (
            <motion.span
              key="calm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-[var(--text-faint)] tracking-wide"
            >
              All zones calm
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Right: refresh + clock ── */}
      <div className="flex items-center gap-3 shrink-0">
        <AnimatePresence>
          {refreshing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RefreshCw
                size={10}
                className="animate-spin text-[var(--text-faint)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <LiveClock />
      </div>
    </div>
  );
}
