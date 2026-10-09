/**
 * useTheme — Three-mode theme system for Absolute Defence OS
 *
 * Modes:
 *   'night' → Absolute Night (deepest dark, default for operators)
 *   'dusk'  → Dusk (deep navy-blue, clearly distinct from night)
 *   'light' → Command Light (clean white, bright environments)
 *
 * Strategy: CSS variables are injected directly onto document.documentElement
 * via JavaScript so every component responds instantly, regardless of whether
 * it uses Tailwind tokens or inline styles.
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'night' | 'dusk' | 'light';

const STORAGE_KEY = 'ados-theme';
const DEFAULT_THEME: Theme = 'night';

// ─── Per-theme CSS variable maps ──────────────────────────────────────────────
// Injected directly onto :root.style so every var(--canvas-bg) etc. responds.
// CRITICAL: Night vs Dusk must be unmistakably different.
//   Night → near-black  #060810
//   Dusk  → deep navy   #0B1628  (blue cast, immediately obvious)
//   Light → warm stone  #F5F4F2

const THEME_VARS: Record<Theme, Record<string, string>> = {
  night: {
    '--canvas-bg':            '#060810',
    '--rail-bg':              '#07090F',
    '--rail-border':          'rgba(255,255,255,0.04)',
    '--surface':              '#0D1520',
    '--surface-2':            '#111D2E',
    '--surface-3':            '#162438',
    '--surface-border':       'rgba(255,255,255,0.06)',
    '--text-primary':         '#F1F5F9',
    '--text-secondary':       '#CBD5E1',
    '--text-muted':           '#64748B',
    '--text-faint':           '#475569',
    '--panel-bg':             'rgba(13,15,20,0.95)',
    '--strip-bg':             '#060810',
    '--strip-border':         'rgba(255,255,255,0.04)',
    '--aria-cyan':            '#00D9FF',
    '--aria-cyan-dim':        'rgba(0,217,255,0.12)',
    '--aria-cyan-glow':       'rgba(0,217,255,0.06)',
    '--respond-text-primary':   'rgba(255,255,255,0.88)',
    '--respond-text-secondary': 'rgba(255,255,255,0.60)',
    '--respond-text-muted':     'rgba(255,255,255,0.40)',
    '--respond-text-faint':     'rgba(255,255,255,0.22)',
    '--respond-border':         'rgba(255,255,255,0.05)',
    '--respond-border-strong':  'rgba(255,255,255,0.10)',
    '--respond-surface':        'rgba(255,255,255,0.03)',
    '--respond-surface-hover':  'rgba(255,255,255,0.05)',
    '--respond-surface-active': 'rgba(255,255,255,0.08)',
    '--respond-input-bg':       'rgba(255,255,255,0.03)',
    '--respond-input-border':   'rgba(255,255,255,0.06)',
    '--anchor-red':             '#D92D20',
    '--anchor-red-glow':        'rgba(217,45,32,0.18)',
  },
  dusk: {
    '--canvas-bg':            '#0B1628',
    '--rail-bg':              '#0C1A30',
    '--rail-border':          'rgba(51,119,255,0.18)',
    '--surface':              '#112038',
    '--surface-2':            '#163050',
    '--surface-3':            '#1A3D66',
    '--surface-border':       'rgba(51,187,255,0.12)',
    '--text-primary':         '#E8EFF8',
    '--text-secondary':       '#CBD5E1',
    '--text-muted':           '#6B8BB0',
    '--text-faint':           '#475569',
    '--panel-bg':             'rgba(11,22,40,0.97)',
    '--strip-bg':             '#0A1428',
    '--strip-border':         'rgba(51,119,255,0.10)',
    '--aria-cyan':            '#33BBFF',
    '--aria-cyan-dim':        'rgba(51,187,255,0.12)',
    '--aria-cyan-glow':       'rgba(51,187,255,0.06)',
    '--respond-text-primary':   'rgba(255,255,255,0.88)',
    '--respond-text-secondary': 'rgba(255,255,255,0.60)',
    '--respond-text-muted':     'rgba(255,255,255,0.40)',
    '--respond-text-faint':     'rgba(255,255,255,0.22)',
    '--respond-border':         'rgba(255,255,255,0.05)',
    '--respond-border-strong':  'rgba(255,255,255,0.10)',
    '--respond-surface':        'rgba(255,255,255,0.03)',
    '--respond-surface-hover':  'rgba(255,255,255,0.05)',
    '--respond-surface-active': 'rgba(255,255,255,0.08)',
    '--respond-input-bg':       'rgba(255,255,255,0.03)',
    '--respond-input-border':   'rgba(255,255,255,0.06)',
    '--anchor-red':             '#D92D20',
    '--anchor-red-glow':        'rgba(217,45,32,0.18)',
  },
  light: {
    '--canvas-bg':            '#F5F4F2',
    '--rail-bg':              '#FFFFFF',
    '--rail-border':          'rgba(0,0,0,0.08)',
    '--surface':              '#FFFFFF',
    '--surface-2':            '#F0EEEB',
    '--surface-3':            '#E8E5E0',
    '--surface-border':       'rgba(0,0,0,0.08)',
    '--text-primary':         '#14171C',
    '--text-secondary':       '#334155',
    '--text-muted':           '#64748B',
    '--text-faint':           '#94A3B8',
    '--panel-bg':             'rgba(255,255,255,0.97)',
    '--strip-bg':             '#EDEAE5',
    '--strip-border':         'rgba(0,0,0,0.05)',
    '--aria-cyan':            '#0891B2',
    '--aria-cyan-dim':        'rgba(8,145,178,0.12)',
    '--aria-cyan-glow':       'rgba(8,145,178,0.06)',
    '--respond-text-primary':   '#0F172A',
    '--respond-text-secondary': '#334155',
    '--respond-text-muted':     '#64748B',
    '--respond-text-faint':     '#94A3B8',
    '--respond-border':         'rgba(0,0,0,0.06)',
    '--respond-border-strong':  'rgba(0,0,0,0.10)',
    '--respond-surface':        'rgba(0,0,0,0.02)',
    '--respond-surface-hover':  'rgba(0,0,0,0.04)',
    '--respond-surface-active': 'rgba(0,0,0,0.06)',
    '--respond-input-bg':       'rgba(0,0,0,0.02)',
    '--respond-input-border':   'rgba(0,0,0,0.08)',
    '--anchor-red':             '#B91C1C',
    '--anchor-red-glow':        'rgba(185,28,28,0.18)',
  },
};

// ─── DOM application ──────────────────────────────────────────────────────────

/** Apply theme to the document root. Safe to call outside React. */
export function applyTheme(theme: Theme): void {
  const html = document.documentElement;

  // 1. Set data-theme attribute (for CSS [data-theme] selectors)
  html.setAttribute('data-theme', theme);

  // 2. Toggle Tailwind dark: class
  if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
  }

  // 3. Inject CSS variables directly onto :root.style
  const vars = THEME_VARS[theme];
  for (const [key, value] of Object.entries(vars)) {
    html.style.setProperty(key, value);
  }

  // 4. Clean up any stale inline background from old versions
  html.style.removeProperty('background');
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'night' || stored === 'dusk' || stored === 'light') return stored;
  } catch { /* localStorage unavailable */ }
  return DEFAULT_THEME;
}

// ─── React hook ───────────────────────────────────────────────────────────────

/** React hook — provides theme state with localStorage persistence. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getStoredTheme();
    applyTheme(t);
    return t;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch { /* ignore */ }
    setThemeState(newTheme);
  }, []);

  /** Cycle: night → dusk → light → night */
  const cycleTheme = useCallback(() => {
    setTheme(
      theme === 'night' ? 'dusk'
      : theme === 'dusk' ? 'light'
      : 'night'
    );
  }, [theme, setTheme]);

  return { theme, setTheme, cycleTheme };
}

// ─── Labels & icons ───────────────────────────────────────────────────────────

/** Human-readable label for each theme — used in Settings UI. */
export const THEME_LABELS: Record<Theme, string> = {
  night: 'Absolute Night',
  dusk:  'Dusk',
  light: 'Command Light',
};

/** Icon character for each theme — used in NavRail cycle button. */
export const THEME_ICONS: Record<Theme, string> = {
  night: '🌑',
  dusk:  '🌘',
  light: '☀',
};
