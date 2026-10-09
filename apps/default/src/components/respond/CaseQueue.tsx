/**
 * CaseQueue — Left panel of Respond mode.
 *
 * A vertically scrolling list of active cases, grouped and sorted
 * by urgency. Each card is a slim row showing urgency dot, ID,
 * location, time-ago, and status. Clicking selects a case for the
 * right-panel timeline.
 *
 * Filter tabs at the top: All · Critical · High · Open · Resolved
 */

import React, { useMemo, useState } from 'react';
import { type Incident } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Search, Filter, ShieldAlert } from 'lucide-react';
import { summariseIncident } from '@/lib/incident-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-[var(--anchor-red)]',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-emerald-500',
};

const SEVERITY_GLOW: Record<string, string> = {
  critical: 'shadow-[0_0_6px_var(--anchor-red)]',
  high:     'shadow-[0_0_4px_rgba(249,115,22,0.5)]',
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:   { text: 'New',       color: 'text-[var(--aria-cyan)]' },
  reviewing: { text: 'Reviewing', color: 'text-amber-500 dark:text-amber-400' },
  resolved:  { text: 'Closed',    color: 'text-[var(--respond-text-faint)]' },
};

type FilterTab = 'all' | 'critical' | 'high' | 'open' | 'resolved';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high',     label: 'High' },
  { key: 'open',     label: 'Open' },
  { key: 'resolved', label: 'Closed' },
];

// ─── Clean description — strip [TAG] prefix ──────────────────────────────────

function cleanDesc(desc?: string): string {
  if (!desc) return 'No description';
  return desc.replace(/^\[[A-Z_]+\]\s*/, '');
}

function getConcernTag(desc?: string): string | null {
  if (!desc) return null;
  const m = desc.match(/^\[([A-Z_]+)\]/);
  if (!m) return null;
  const map: Record<string, string> = {
    PHYSICAL_THREAT: 'Threat',
    PHYSICAL_HARM:   'Assault',
    VERBAL_ABUSE:    'Verbal',
    WEAPONS:         'Weapon',
    SUBSTANCE:       'Substance',
    SELF_HARM:       'Welfare',
    LONE_WORKER:     'Lone Worker',
    THEFT:           'Theft',
    BULLYING:        'Harassment',
    CYBER:           'Cyber',
    OTHER:           'Other',
  };
  return map[m[1]] ?? m[1];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CaseQueueProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export function CaseQueue({
  incidents,
  selectedId,
  onSelect,
  search,
  onSearchChange,
}: CaseQueueProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    let list = incidents;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.description?.toLowerCase().includes(q) ||
        i.incidentId?.toLowerCase().includes(q) ||
        i.locationCode?.toLowerCase().includes(q)
      );
    }

    // Tab filter
    switch (activeFilter) {
      case 'critical': list = list.filter(i => i.severity === 'critical'); break;
      case 'high':     list = list.filter(i => i.severity === 'high'); break;
      case 'open':     list = list.filter(i => i.status !== 'resolved'); break;
      case 'resolved': list = list.filter(i => i.status === 'resolved'); break;
    }

    // Sort: critical pending first, then by date desc
    return list.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusOrder: Record<string, number> = { pending: 0, reviewing: 1, resolved: 2 };
      const sa = (statusOrder[a.status] ?? 2) * 10 + (sevOrder[a.severity] ?? 3);
      const sb = (statusOrder[b.status] ?? 2) * 10 + (sevOrder[b.severity] ?? 3);
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [incidents, search, activeFilter]);

  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
  const openCount = incidents.filter(i => i.status !== 'resolved').length;

  return (
    <div
      className="w-[340px] shrink-0 flex flex-col h-full border-r"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--respond-border)',
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert
              size={15}
              style={{ color: 'var(--aria-cyan)' }}
            />
            <h2 className="text-[13px] font-bold text-[var(--respond-text-primary)] tracking-wide">
              Cases
            </h2>
            {openCount > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{
                  background: 'var(--aria-cyan-dim)',
                  color: 'var(--aria-cyan)',
                }}
              >
                {openCount}
              </span>
            )}
          </div>

          {criticalCount > 0 && (
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                background: 'var(--anchor-red-glow)',
                color: 'var(--anchor-red)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--anchor-red)] animate-pulse" />
              {criticalCount} critical
            </span>
          )}
        </div>

        {/* ── Search ── */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
          style={{
            background: 'var(--respond-surface)',
            border: '1px solid var(--respond-input-border)',
          }}
        >
          <Search size={13} className="text-[var(--respond-text-faint)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search cases…"
            className="flex-1 bg-transparent text-xs text-[var(--respond-text-primary)] placeholder:text-[var(--respond-text-faint)] outline-none"
          />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-colors',
                activeFilter === f.key
                  ? 'text-[var(--respond-text-primary)]'
                  : 'text-[var(--respond-text-faint)] hover:text-[var(--respond-text-muted)]',
              )}
              style={activeFilter === f.key ? {
                background: 'var(--aria-cyan-glow)',
                color: 'var(--aria-cyan)',
              } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mx-5" style={{ background: 'var(--respond-border)' }} />

      {/* ── Case list ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter size={20} className="text-[var(--respond-text-faint)] mb-3" />
            <p className="text-xs text-[var(--respond-text-muted)]">No cases match</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(inc => {
              const isSelected = inc.id === selectedId;
              const tag = getConcernTag(inc.description);
              const statusInfo = STATUS_LABEL[inc.status] ?? STATUS_LABEL.pending;
              const isResolved = inc.status === 'resolved';

              const summary = summariseIncident(inc.description);

              return (
                <button
                  key={inc.id}
                  onClick={() => onSelect(inc.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-colors duration-150',
                    'hover:bg-[var(--respond-surface-hover)]',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aria-cyan)]/30',
                    isSelected && 'bg-[var(--respond-surface-active)]',
                    isResolved && 'opacity-50',
                  )}
                  style={isSelected ? {
                    borderLeft: '2px solid var(--aria-cyan)',
                  } : {
                    borderLeft: '2px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Severity dot */}
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full mt-1.5 shrink-0',
                        SEVERITY_DOT[inc.severity] ?? 'bg-slate-400',
                        SEVERITY_GLOW[inc.severity] ?? '',
                      )}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: ID + time */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[var(--respond-text-secondary)] font-mono truncate">
                          {inc.incidentId ?? 'INC-—'}
                        </span>
                        <span className="text-[9px] text-[var(--respond-text-faint)] font-mono shrink-0 tabular-nums">
                          {timeAgo(inc.createdAt)}
                        </span>
                      </div>

                      {/* Type badge + short summary */}
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <span
                          className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-px"
                          style={{
                            background: inc.severity === 'critical' ? 'var(--anchor-red-glow)' :
                                        inc.severity === 'high'     ? 'rgba(217,119,6,0.12)' :
                                        'var(--respond-surface)',
                            color: inc.severity === 'critical' ? 'var(--anchor-red)' :
                                   inc.severity === 'high'     ? 'var(--anchor-amber)' :
                                   'var(--respond-text-muted)',
                          }}
                        >
                          {summary.type}
                        </span>
                        <p className="text-[10px] text-[var(--respond-text-muted)] leading-snug line-clamp-1">
                          {summary.cardLine}
                        </p>
                      </div>

                      {/* Bottom row: location + status */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--respond-text-faint)] font-semibold uppercase tracking-wider truncate">
                          {inc.locationCode ?? '—'}
                        </span>
                        <span className={cn('text-[9px] font-bold uppercase tracking-wider ml-auto shrink-0', statusInfo.color)}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
