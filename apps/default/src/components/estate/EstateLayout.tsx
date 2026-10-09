import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Reports, Safety, Notices, Settings } from './views/index.ts';
import { EstateNav, EstateTopBar } from './EstateNav.tsx';
import { FloatingAgentChat } from './EstateAgentChat.tsx';
import { toast, Toaster } from 'sonner';
import { cn } from '@/lib/utils';

const MapView = lazy(() => import('./views/MapView.tsx').then(m => ({ default: m.Map })));

type View = 'map' | 'reports' | 'safety' | 'notices' | 'settings';

export function EstateLayout() {
  const [view, setView] = useState<View>('map');
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('raynham-theme') ?? 'light';
    } catch {
      return 'light';
    }
  });
  const [workspace, setWorkspace] = useState<string>('all');
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('raynham-nav-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const changeNavCollapsed = useCallback((collapsed: boolean) => {
    setNavCollapsed(collapsed);
    try {
      localStorage.setItem('raynham-nav-collapsed', String(collapsed));
    } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('raynham-theme', next);
      } catch { /* ignore */ }
      const html = document.documentElement;
      html.setAttribute('data-theme', next);
      if (next === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }, [theme]);

  return (
    <div
      className={cn(
        'h-screen w-full flex flex-col overflow-hidden',
        'font-sans'
      )}
      style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)' }}
    >
      <Toaster position="bottom-center" richColors />

      {/* Top bar */}
      <EstateTopBar
        theme={theme}
        onToggleTheme={toggleTheme}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
      />

      {/* Middle row: left rail (lg+) + main content */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left rail — visible at lg+ (Section 10.3 / 23.1 responsive rule) */}
        <EstateNav view={view} onViewChange={setView} variant="rail" collapsed={navCollapsed} onCollapsedChange={changeNavCollapsed} />

        <main className="flex-1 min-h-0 relative overflow-hidden">
          {view === 'map' && (
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-slate-300 border-t-[var(--brass)] rounded-full animate-spin" /></div>}>
              <MapView workspace={workspace} />
            </Suspense>
          )}
          {view === 'reports' && <Reports />}
          {view === 'safety' && <Safety />}
          {view === 'notices' && <Notices />}
          {view === 'settings' && <Settings theme={theme} onToggleTheme={toggleTheme} />}
        </main>
      </div>

      {/* Bottom navigation — mobile/tablet only, hidden at lg+ */}
      <EstateNav view={view} onViewChange={setView} variant="bottom" />

      {/* Floating agent chat */}
      <FloatingAgentChat />
    </div>
  );
}
