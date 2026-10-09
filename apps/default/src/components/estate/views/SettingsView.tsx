import React from 'react';
import { cn } from '@/lib/utils';
import { Moon, Sun, Bell, Shield, Info, Leaf, Building, Hotel, Smartphone, ExternalLink } from 'lucide-react';
import { ESTATE_LOCATIONS_PID, ESTATE_REPORTS_PID, SAFETY_CHECKINS_PID, ESTATE_NOTICES_PID } from '@/lib/estate-api';
import { listAnchors } from '@/lib/personnel-api';

export function Settings({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  const projectLinks = [
    { id: ESTATE_LOCATIONS_PID, label: 'Estate Locations', icon: <Building className="w-4 h-4" /> },
    { id: ESTATE_REPORTS_PID, label: 'Estate Reports', icon: <Info className="w-4 h-4" /> },
    { id: SAFETY_CHECKINS_PID, label: 'Safety Check-ins', icon: <Shield className="w-4 h-4" /> },
    { id: ESTATE_NOTICES_PID, label: 'Estate Notices', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </div>

      {/* Appearance */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Appearance
        </p>
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-5 h-5" style={{ color: 'var(--brass)' }} /> : <Sun className="w-5 h-5" style={{ color: 'var(--brass)' }} />}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Theme</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Heritage Dark' : 'Heritage Light'}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleTheme}
            className="w-12 h-7 rounded-full flex items-center transition-colors relative"
            style={{
              background: theme === 'dark' ? 'var(--brass)' : 'var(--surface-3)',
            }}
          >
            <span
              className={cn(
                'absolute w-5 h-5 rounded-full bg-white transition-transform',
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>

      {/* Workspace Areas */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Estate Workspaces
        </p>
        <div className="space-y-2">
          {[
            { label: 'Farm & Land', icon: <Leaf className="w-4 h-4" />, color: 'var(--area-farm)' },
            { label: 'Property & Grounds', icon: <Building className="w-4 h-4" />, color: 'var(--area-property)' },
            { label: 'Hospitality', icon: <Hotel className="w-4 h-4" />, color: 'var(--area-hospitality)' },
          ].map(area => (
            <div
              key={area.label}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${area.color}22` }}
              >
                <span style={{ color: area.color }}>{area.icon}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{area.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data sources */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Data Sources
        </p>
        <div className="space-y-2">
          {projectLinks.map(p => (
            <a
              key={p.id}
              href={`https://www.taskade.com/d/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
            >
              <span style={{ color: 'var(--brass)' }}>{p.icon}</span>
              <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{p.label}</span>
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Open</span>
            </a>
          ))}
        </div>
      </div>

      {/* Personnel QR simulator */}
      <div className="px-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Personnel Scan Preview
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          What field staff, tenants, and contractors see when they scan a physical QR tag on the estate. No login, no app - opens straight to the three-choice panel.
        </p>
        <div className="space-y-2">
          {listAnchors().map(a => (
            <a
              key={a.id}
              href={`#/a/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--brass-dim)' }}
              >
                <Smartphone className="w-4 h-4" style={{ color: 'var(--brass)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {a.assetName} — {a.zoneName}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  /a/{a.id} · {a.workspace}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
            </a>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="px-4 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          About
        </p>
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Raynham Estate OS
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Heritage estate operations platform. Three jobs: lone-worker safety, QR/map-pin reporting, and live spatial map. Built on the Taskade platform.
          </p>
        </div>
      </div>
    </div>
  );
}
