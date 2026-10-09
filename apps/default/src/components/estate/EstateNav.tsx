import React from 'react';
import { cn } from '@/lib/utils';
import { Map as MapIcon, FileText, Shield, Bell, Settings as SettingsIcon, Moon, Sun, Leaf, Building, Hotel, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type View = 'map' | 'reports' | 'safety' | 'notices' | 'settings';

const NAV_ITEMS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'map', label: 'Live Map', icon: <MapIcon className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { id: 'safety', label: 'Safety', icon: <Shield className="w-5 h-5" /> },
  { id: 'notices', label: 'Notices', icon: <Bell className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
];

export function EstateNav({
  view,
  onViewChange,
  variant = 'bottom',
  collapsed = false,
  onCollapsedChange,
}: {
  view: View;
  onViewChange: (v: View) => void;
  variant?: 'bottom' | 'rail';
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  if (variant === 'rail') {
    return (
      <nav
        className={cn('hidden lg:flex flex-col items-stretch border-r flex-shrink-0 py-3 transition-[width] duration-200 motion-reduce:transition-none', collapsed ? 'w-16' : 'w-56')}
        style={{ background: 'var(--rail-bg)', borderColor: 'var(--rail-border)' }}
        aria-label="Primary"
      >
        {NAV_ITEMS.map(item => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg min-h-11',
                'transition-colors duration-200',
                isActive ? 'text-[var(--brass)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
              style={isActive ? { background: 'var(--brass-dim)' } : undefined}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
        <div className="mt-auto pt-2 border-t mx-2" style={{ borderColor: 'var(--rail-border)' }}>
          <button
            type="button"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="flex items-center gap-3 w-full min-h-11 px-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
            {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Collapse</span>}
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="flex lg:hidden items-center justify-around h-16 border-t flex-shrink-0"
      style={{
        background: 'var(--rail-bg)',
        borderColor: 'var(--rail-border)',
      }}
      aria-label="Primary"
    >
      {NAV_ITEMS.map(item => {
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-11',
              'transition-colors duration-200',
              isActive ? 'text-[var(--brass)]' : 'text-[var(--text-muted)]'
            )}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={cn('transition-transform', isActive && 'scale-110')}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function EstateTopBar({
  theme,
  onToggleTheme,
  workspace,
  onWorkspaceChange,
}: {
  theme: string;
  onToggleTheme: () => void;
  workspace: string;
  onWorkspaceChange: (w: string) => void;
}) {
  const WORKSPACES = [
    { id: 'all', label: 'All Estate', icon: <MapIcon className="w-3.5 h-3.5" /> },
    { id: 'farm', label: 'Farm & Land', icon: <Leaf className="w-3.5 h-3.5" /> },
    { id: 'property', label: 'Property & Grounds', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'hospitality', label: 'Hospitality', icon: <Hotel className="w-3.5 h-3.5" /> },
  ];

  return (
    <header
      className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
      style={{
        background: 'var(--rail-bg)',
        borderColor: 'var(--rail-border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--brass-dim)',
            border: '1px solid var(--brass-dim)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
            Raynham Estate
          </p>
          <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'var(--brass)' }}>
            Estate OS
          </p>
        </div>
      </div>

      {/* Workspace tabs — hidden on small screens */}
      <div className="hidden md:flex items-center gap-1">
        {WORKSPACES.map(ws => {
          const isActive = workspace === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => onWorkspaceChange(ws.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'transition-colors duration-200',
                isActive ? 'text-[var(--brass)]' : 'text-[var(--text-muted)]'
              )}
              style={isActive ? {
                background: 'var(--brass-dim)',
              } : undefined}
            >
              {ws.icon}
              <span className="hidden lg:inline">{ws.label}</span>
            </button>
          );
        })}
      </div>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-2)] flex-shrink-0"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-[var(--text-muted)]" /> : <Moon className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
    </header>
  );
}
