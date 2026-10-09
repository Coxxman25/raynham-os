/**
 * NavRail — The 56px permanent mode rail.
 *
 * Philosophy: One mode. One intent. One clear next action.
 *
 * Live Operations (top group):
 *   Monitor   — What is happening across my site?
 *   Respond   — What needs action right now?
 *   Publish   — What information do I need to put out?
 *
 * Admin (separated below divider):
 *   Configure — How is this environment structured?
 *
 * Intelligence (bottom):
 *   ARIA      — The AI intelligence layer. Triage, analysis, interaction.
 *
 * Active state: 2px left cyan accent + icon/label turn cyan.
 * Inactive: 35% opacity until hover (90%).
 * Configure: slightly smaller, visually distinct from live operations.
 */

import React from 'react';
import {
  ShieldAlert, Radar, Shield, Megaphone,
  SlidersHorizontal, Sparkles, Settings,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type View } from '@/lib/app-context';
import { type Theme, THEME_LABELS } from '@/lib/use-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavRailProps {
  activeView: View;
  onViewChange: (v: View) => void;
  criticalCount: number;
  flaggedJournals: number;
  onOpenAria: () => void;
  onOpenSettings: () => void;
  theme: Theme;
  onCycleTheme: () => void;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
}

// ─── Mode Rail Item ────────────────────────────────────────────────────────────

interface RailItemProps {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  active?: boolean;
  urgentCount?: number;
  onClick: () => void;
  small?: boolean; // for Configure — visually de-emphasised
}

function RailItem({
  icon: Icon,
  label,
  sublabel,
  active = false,
  urgentCount,
  onClick,
  small = false,
}: RailItemProps) {
  return (
    <div className="relative group flex items-center justify-center w-full">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          'relative flex items-center justify-center rounded-xl',
          'transition-transform duration-150',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aria-cyan)]/40',
          small ? 'w-9 h-9' : 'w-10 h-10',
          active
            ? 'text-[var(--aria-cyan)]'
            : cn(
                'text-slate-500 dark:text-white/30',
                'hover:text-slate-800 dark:hover:text-white/75',
                small && 'text-slate-400 dark:text-white/20 hover:text-slate-700 dark:hover:text-white/50',
              ),
        )}
      >
        {/* Active background — very subtle cyan wash */}
        {active && (
          <span
            className="absolute inset-0 rounded-xl"
            style={{ background: 'var(--aria-cyan-glow)' }}
          />
        )}

        <Icon
          size={small ? 15 : 17}
          className="relative z-10 transition-transform duration-200 group-hover:scale-105"
          strokeWidth={active ? 2 : 1.75}
        />

        {/* Urgent count badge */}
        {urgentCount != null && urgentCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
            style={{ background: 'var(--anchor-red)' }}
          >
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {/* Active left-border accent */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
          style={{
            background: 'var(--aria-cyan)',
            boxShadow: '0 0 8px var(--aria-cyan)',
          }}
        />
      )}

      {/* Hover tooltip — always dark for visibility in any theme */}
      <div
        className={cn(
          'absolute left-[calc(100%+12px)] z-50 pointer-events-none',
          'flex flex-col',
          'opacity-0 group-hover:opacity-100',
          '-translate-x-1 group-hover:translate-x-0',
          'transition-all duration-150',
        )}
      >
        <div
          className="px-3 py-2 rounded-lg whitespace-nowrap shadow-2xl"
          style={{
            background: '#111D2E',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span className="block text-[11px] font-semibold text-white/90 tracking-wide">
            {label}
          </span>
          {sublabel && (
            <span className="block text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">
              {sublabel}
            </span>
          )}
        </div>
        {/* Tooltip caret */}
        <div
          className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
          style={{
            background: '#111D2E',
            borderLeft: '1px solid rgba(255,255,255,0.10)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Theme Cycle Button ────────────────────────────────────────────────────────

const THEME_ORDER: Theme[] = ['night', 'dusk', 'light'];

function ThemeCycleButton({ theme, onCycle }: { theme: Theme; onCycle: () => void }) {
  return (
    <div className="relative group flex items-center justify-center w-full">
      <button
        onClick={onCycle}
        className="w-8 h-8 rounded-lg flex flex-col items-center justify-center gap-[3px] text-slate-400 dark:text-white/25 hover:text-slate-700 dark:hover:text-white/50 transition-transform duration-150"
        aria-label={`Theme: ${THEME_LABELS[theme]}. Click to cycle.`}
      >
        {THEME_ORDER.map(t => (
          <span
            key={t}
            className={cn(
              'w-3 h-[1.5px] rounded-full transition-all duration-300',
              t === theme
                ? 'bg-[var(--aria-cyan)] opacity-100 w-4'
                : 'bg-slate-300/50 dark:bg-white/20',
            )}
          />
        ))}
      </button>

      <div
        className="absolute left-[calc(100%+12px)] z-50 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
      >
        <div
          className="px-3 py-2 rounded-lg whitespace-nowrap"
          style={{
            background: '#111D2E',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span className="text-[11px] font-semibold text-white/90">{THEME_LABELS[theme]}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ARIA Intelligence Button ──────────────────────────────────────────────────

function AriaIntelligenceButton({ onClick, urgentCount }: { onClick: () => void; urgentCount: number }) {
  return (
    <div className="relative group flex items-center justify-center w-full px-1.5">
      <button
        onClick={() => onClick()}
        className="relative w-full h-9 rounded-xl flex items-center justify-center transition-all duration-200 focus-visible:outline-none"
        style={{
          background: 'var(--aria-cyan-glow)',
          border: '1px solid var(--aria-cyan-dim)',
        }}
        aria-label="Open ARIA Intelligence"
      >
        {/* ARIA label */}
        <span
          className="text-[9px] font-black tracking-[0.18em] uppercase"
          style={{ color: 'var(--aria-cyan)' }}
        >
          ARIA
        </span>

        {/* Live pulse dot */}
        <span
          className="absolute -top-[3px] -right-[3px] w-2 h-2 rounded-full animate-aria-pulse"
          style={{
            background: 'var(--aria-cyan)',
            boxShadow: '0 0 6px var(--aria-cyan)',
          }}
        />

        {/* Urgent badge */}
        {urgentCount > 0 && (
          <span
            className="absolute -bottom-[3px] -right-[3px] min-w-[14px] h-3.5 px-1 rounded-full flex items-center justify-center text-[8px] font-black text-white"
            style={{ background: 'var(--anchor-red)' }}
          >
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {/* Tooltip — always dark for visibility */}
      <div
        className="absolute left-[calc(100%+12px)] z-50 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
      >
        <div
          className="px-3 py-2.5 rounded-lg whitespace-nowrap min-w-[140px]"
          style={{
            background: '#111D2E',
            border: '1px solid rgba(0,217,255,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,217,255,0.06)',
          }}
        >
          <span
            className="block text-[11px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--aria-cyan)' }}
          >
            ARIA
          </span>
          <span className="block text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">
            {urgentCount > 0
              ? `${urgentCount} case${urgentCount === 1 ? '' : 's'} need review`
              : 'Intelligence ready'}
          </span>
        </div>
        <div
          className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
          style={{
            background: '#111D2E',
            borderLeft: '1px solid rgba(0,217,255,0.15)',
            borderBottom: '1px solid rgba(0,217,255,0.15)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main NavRail ──────────────────────────────────────────────────────────────

export function NavRail({
  activeView,
  onViewChange,
  criticalCount,
  flaggedJournals,
  onOpenAria,
  onOpenSettings,
  theme,
  onCycleTheme,
  demoMode = false,
  onToggleDemoMode,
}: NavRailProps) {
  const urgentCount = criticalCount + flaggedJournals;

  return (
    <aside
      style={{
        background: 'var(--rail-bg)',
        borderRight: '1px solid var(--rail-border)',
      }}
      className={cn(
        'flex-shrink-0 w-14 h-screen flex flex-col items-center py-4 gap-1.5',
        'z-40 relative',
      )}
    >
      {/* ── ADOS Mark ── */}
      <div className="relative group flex items-center justify-center w-full mb-2">
        <button
          onClick={() => onViewChange('monitor')}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'transition-all duration-200 hover:scale-[1.04] active:scale-95',
          )}
          style={{
            background: 'var(--aria-cyan)',
            boxShadow: '0 2px 12px var(--aria-cyan-dim)',
          }}
          aria-label="ADOS — Go to Monitor"
        >
          <ShieldAlert size={16} className="text-[#06080D]" strokeWidth={2.5} />
        </button>

        {/* Brand tooltip — always dark for visibility */}
        <div
          className="absolute left-[calc(100%+12px)] z-50 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
        >
          <div
            className="px-3 py-2 rounded-lg whitespace-nowrap"
            style={{
              background: '#111D2E',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <span className="block text-[11px] font-bold text-white/90">Absolute Defence OS</span>
            <span className="block text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">Operator Console</span>
          </div>
        </div>
      </div>

      {/* ── Live Operations divider label ── */}
      <span className="w-6 h-px mb-0.5" style={{ background: 'var(--rail-border)' }} />

      {/* ── Live Operations group ── */}
      <RailItem
        icon={Radar}
        label="Monitor"
        sublabel="Site overview"
        active={activeView === 'monitor'}
        onClick={() => onViewChange('monitor')}
      />
      <RailItem
        icon={Shield}
        label="Respond"
        sublabel="Cases & triage"
        active={activeView === 'respond'}
        urgentCount={criticalCount > 0 ? criticalCount : undefined}
        onClick={() => onViewChange('respond')}
      />
      <RailItem
        icon={Megaphone}
        label="Publish"
        sublabel="Live information"
        active={activeView === 'publish'}
        onClick={() => onViewChange('publish')}
      />

      {/* ── Admin divider ── */}
      <div className="flex items-center w-full px-3 my-1">
        <span className="flex-1 h-px" style={{ background: 'var(--rail-border)' }} />
      </div>

      {/* ── Configure (admin, visually de-emphasised) ── */}
      <RailItem
        icon={SlidersHorizontal}
        label="Configure"
        sublabel="Site structure & demo"
        active={activeView === 'configure'}
        onClick={() => onViewChange('configure')}
        small
      />

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── ARIA Intelligence ── */}
      <AriaIntelligenceButton onClick={onOpenAria} urgentCount={urgentCount} />

      {/* ── Bottom divider ── */}
      <span className="w-6 h-px my-1" style={{ background: 'var(--rail-border)' }} />

      {/* ── Theme cycle ── */}
      <ThemeCycleButton theme={theme} onCycle={onCycleTheme} />

      {/* ── Demo Mode toggle ── */}
      {onToggleDemoMode && (
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={onToggleDemoMode}
            aria-label={demoMode ? 'Exit Demo Mode' : 'Enter Demo Mode'}
            className={cn(
              'relative flex items-center justify-center rounded-xl w-9 h-9',
              'transition-all duration-200 hover:scale-105 active:scale-95',
              demoMode
                ? 'text-white'
                : 'text-slate-400 dark:text-white/20 hover:text-slate-700 dark:hover:text-white/50',
            )}
            style={demoMode ? { background: 'var(--anchor-amber)', boxShadow: '0 2px 8px var(--anchor-amber-glow)' } : undefined}
          >
            <FlaskConical size={15} strokeWidth={2} />
          </button>
          {demoMode && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white" />
          )}
          {/* Tooltip */}
          <div className="absolute left-[calc(100%+12px)] z-50 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150">
            <div className="px-3 py-2 rounded-lg whitespace-nowrap" style={{ background: '#111D2E', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <span className="block text-[11px] font-bold text-white/90">{demoMode ? 'Exit Demo Mode' : 'Demo Mode'}</span>
              <span className="block text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">{demoMode ? 'Active' : 'Toggle'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      <RailItem
        icon={Settings}
        label="Settings"
        onClick={onOpenSettings}
        small
      />
    </aside>
  );
}
