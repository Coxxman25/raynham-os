import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, Copy, Navigation2, Flag, AlertTriangle, Check, UserRound, Radio, Siren } from 'lucide-react';
import type { Anchor } from '@/lib/personnel-api';
import {
  ASSET_PRESETS,
  EXPIRY_QUICK_CHOICES,
  publishNotice,
  clearNotice,
  editNotice,
  listNotices,
  formatExpiryCountdown,
  resolveQuickExpiry,
  subscribeNotices,
  getActiveNoticeForAnchor,
  type Notice,
  type NoticePreset,
} from '@/lib/notices-store';
import { toast } from 'sonner';
import { anchorUrl } from '@/lib/public-url';

export interface AssetForPanel {
  id: string;
  name: string;
  zone: string;
  workspace: 'farm' | 'property' | 'hospitality';
  kind?: 'asset' | 'personnel' | 'incident';
  w3w?: string;
  status?: string;
  detail?: string;
  priority?: string;
  capturedAt?: string;
  source?: string;
  lat: number;
  lng: number;
}

export function AssetDetailPanel({
  asset,
  onClose,
}: {
  asset: AssetForPanel | null;
  onClose: () => void;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeNotices(() => setTick(t => t + 1));
    const iv = setInterval(() => setTick(t => t + 1), 60_000);
    return () => { unsub(); clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (asset == null) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asset, onClose]);

  if (asset == null) return null;

  if (asset.kind === 'personnel' || asset.kind === 'incident') {
    return <EntityDetailPanel asset={asset} onClose={onClose} />;
  }

  const anchorLike: Anchor = {
    id: asset.id,
    assetName: asset.name,
    zoneName: asset.zone,
    workspace: asset.workspace,
    lat: asset.lat,
    lng: asset.lng,
    w3w: asset.w3w ?? '',
    activeNotice: null,
  };
  const activeNotice = getActiveNoticeForAnchor(anchorLike);

  const anchorHistory = listNotices()
    .filter(n => n.scope.kind === 'anchor' && n.scope.anchorId === asset.id)
    .slice(0, 8);

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-[1100] bg-black/30 sm:bg-transparent sm:pointer-events-none"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`${asset.name} details`}
        className={cn(
          'fixed z-[1101] flex flex-col',
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[400px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl',
          'shadow-2xl overflow-hidden',
        )}
        style={{
          background: 'var(--rail-bg)',
          borderLeft: '1px solid var(--rail-border)',
          color: 'var(--text-primary)',
        }}
        // Prevent backdrop click from bubbling
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3" style={{ borderBottom: '1px solid var(--rail-border)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg font-bold truncate tracking-tight">{asset.name}</h2>
              <a
                href={`https://www.google.com/maps?q=${asset.lat},${asset.lng}`}
                target="_blank" rel="noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Navigate to asset"
                style={{ color: 'var(--text-muted)' }}
              >
                <Navigation2 className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{asset.zone}</p>
            {asset.w3w ? (
              <button
                onClick={() => { navigator.clipboard?.writeText(`///${asset.w3w}`); toast.success('Copied'); }}
                className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono"
                style={{ background: 'var(--surface-2)', color: 'var(--brass)' }}
              >
                <span style={{ color: 'var(--status-critical, #C43D2E)' }}>///</span>
                {asset.w3w}
                <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            ) : null}
            {asset.status ? (
              <p className="mt-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide"
                 style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                {asset.status}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
          {/* Active Notice */}
          {activeNotice ? (
            <ActiveNoticeCard notice={activeNotice} onClear={() => clearNotice(activeNotice.id)} />
          ) : null}

          {/* Set Active Notice (Section 22.4) */}
          <SetActiveNotice asset={asset} activeNotice={activeNotice} />

          {/* History */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              History
            </h3>
            {anchorHistory.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No prior notices on this asset.</p>
            ) : (
              <ul className="space-y-2">
                {anchorHistory.map(n => (
                  <li key={n.id} className="flex items-start gap-2.5 text-xs">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                    )} style={{
                      background: n.status === 'expired' ? 'var(--text-muted)'
                                : n.status === 'active' ? 'var(--status-warning-p, #C9821E)'
                                : 'var(--status-info, #3B82A6)',
                    }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate" style={{ color: 'var(--text-primary)' }}>{n.message}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {n.status} · {new Date(n.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}by {n.author}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* QR tag */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              QR tag
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
              <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                   style={{ background: 'var(--rail-bg)', border: '1px solid var(--surface-border)' }}>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>QR</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">/#/a/{asset.id}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Scan URL for this anchor</p>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/#/a/${asset.id}`); toast.success('Link copied'); }}
                className="text-xs px-2 py-1 rounded-md font-medium"
                style={{ background: 'var(--rail-bg)', color: 'var(--brass)', border: '1px solid var(--surface-border)' }}
              >
                Copy link
              </button>
            </div>
          </div>

          {/* Deep-link to scan page */}
          <a
            href={`#/a/${asset.id}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center text-xs py-2 rounded-lg font-medium transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}
          >
            View public scan page →
          </a>
        </div>
      </aside>
    </>
  );
}

function EntityDetailPanel({ asset, onClose }: { asset: AssetForPanel; onClose: () => void }) {
  const personnel = asset.kind === 'personnel';
  const urgent = asset.priority === 'critical' || asset.priority === 'urgent' || asset.status === 'needs_attention';
  const accent = personnel ? 'var(--status-operational, #2F7D4F)' : urgent ? 'var(--status-critical, #C43D2E)' : 'var(--status-warning-p, #C9821E)';
  const soft = personnel ? 'var(--status-success-soft, #E8F3EC)' : urgent ? 'var(--status-danger-soft, #F8E8E6)' : 'var(--status-warning-soft, #F9EEDC)';
  const Icon = personnel ? UserRound : urgent ? Siren : AlertTriangle;
  const label = personnel ? 'Personnel' : urgent ? 'Major incident' : 'Reported incident';
  const softSurfaceInk = personnel ? '#2E3438' : 'var(--text-primary)';
  const softSurfaceMuted = personnel ? '#4E5A63' : 'var(--text-muted)';
  return <>
    <div className="fixed inset-0 z-[1100] bg-black/30 sm:bg-transparent sm:pointer-events-none" onClick={onClose} aria-hidden />
    <aside role="dialog" aria-label={`${asset.name} details`} className={cn('fixed z-[1101] flex flex-col inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[400px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl shadow-2xl overflow-hidden')} style={{ background: 'var(--rail-bg)', borderLeft: `3px solid ${accent}`, color: 'var(--text-primary)' }} onClick={event => event.stopPropagation()}>
      <header className="p-4" style={{ background: soft, borderBottom: `1px solid ${accent}35`, color: softSurfaceInk }}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: accent }}><Icon className="w-4 h-4" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{label}</p><h2 className="text-lg font-bold truncate tracking-tight" style={{ color: softSurfaceInk }}>{asset.name}</h2></div></div></div><button onClick={onClose} className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" aria-label="Close panel" style={{ color: softSurfaceMuted }}><X className="w-4 h-4" /></button></div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <section className="rounded-xl p-4" style={{ background: soft, border: `1px solid ${accent}35`, color: softSurfaceInk }}>
          <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}18`, color: accent }}>{personnel ? <UserRound className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}</span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{personnel ? 'Last known position' : 'Incident location'}</p><p className="mt-1 text-sm leading-relaxed" style={{ color: softSurfaceInk }}>{asset.zone}</p></div></div>
          {personnel && <p className="mt-3 text-xs flex items-center gap-1.5" style={{ color: softSurfaceMuted }}><Radio className="w-3.5 h-3.5" />Explicit check-in, not continuous tracking.</p>}
          {!personnel && asset.detail && <p className="mt-3 text-sm leading-relaxed" style={{ color: softSurfaceMuted }}>{asset.detail}</p>}
        </section>
        <div className="flex flex-wrap gap-2">{asset.status && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: soft, color: accent }}>{asset.status.replaceAll('_', ' ')}</span>}{asset.priority && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: soft, color: accent }}>{asset.priority} priority</span>}</div>
        {asset.w3w && <button onClick={() => { navigator.clipboard?.writeText(`///${asset.w3w}`); toast.success('Copied'); }} className="w-full min-h-11 px-3 rounded-lg text-left text-xs font-mono" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--brass)' }}><span style={{ color: 'var(--status-critical, #C43D2E)' }}>///</span> {asset.w3w}</button>}
        <a href={`https://www.google.com/maps?q=${asset.lat},${asset.lng}`} target="_blank" rel="noreferrer" className="min-h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold" style={{ border: `1px solid ${accent}`, color: accent }}><Navigation2 className="w-4 h-4" />Navigate to {personnel ? 'last check-in' : 'incident'}</a>
      </div>
    </aside>
  </>;
}

function ActiveNoticeCard({ notice, onClear }: { notice: Notice; onClear: () => void }) {
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState(notice.message);

  return (
    <div
      className="rounded-xl p-3.5 space-y-2"
      style={{
        background: 'var(--status-warning-soft, #F9EEDC)',
        border: '1px solid rgba(201, 130, 30, 0.35)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-warning-p, #C9821E)' }} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--status-warning-p, #C9821E)' }}>
          Active Notice
        </p>
      </div>
      {editing ? (
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={3}
          className="w-full text-sm p-2 rounded-md outline-none"
          style={{ background: 'var(--rail-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />
      ) : (
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{notice.message}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] font-medium" style={{ color: 'var(--status-warning-p, #C9821E)' }}>
          Expires in {formatExpiryCountdown(notice.expiresAt)}
        </p>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setMsg(notice.message); }} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button
                onClick={() => { editNotice(notice.id, { message: msg }); setEditing(false); toast.success('Notice updated'); }}
                className="text-xs font-semibold"
                style={{ color: 'var(--brass)' }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Edit
              </button>
              <button onClick={() => { onClear(); toast.success('Notice cleared'); }} className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Clear notice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SetActiveNotice({ asset, activeNotice }: { asset: AssetForPanel; activeNotice: Notice | null }) {
  const [selected, setSelected] = useState<NoticePreset | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [expiryId, setExpiryId] = useState<string>('4h');

  const publish = useCallback(() => {
    const message = selected ? selected.message : customMessage.trim();
    if (!message) { toast.error('Add a message first'); return; }
    publishNotice({
      template: selected?.template ?? 'custom',
      message,
      audience: 'scan',
      scope: { kind: 'anchor', anchorId: asset.id },
      expiresAt: resolveQuickExpiry(expiryId),
      author: 'Estate Office',
      scheduledFor: null,
    });
    toast.success('Notice published');
    setSelected(null);
    setCustomMessage('');
  }, [selected, customMessage, expiryId, asset.id]);

  const disabled = activeNotice != null && selected == null && customMessage.trim().length === 0;

  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        Set Active Notice
      </h3>
      <div className="space-y-2">
        {ASSET_PRESETS.map(p => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setCustomMessage(''); }}
              className={cn(
                'w-full flex items-start gap-2 text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
              )}
              style={{
                background: active ? 'var(--brass-dim)' : 'var(--surface-2)',
                border: `1px solid ${active ? 'var(--brass)' : 'var(--surface-border)'}`,
                color: 'var(--text-primary)',
              }}
            >
              <Flag className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: active ? 'var(--brass)' : 'var(--text-muted)' }} />
              <div className="min-w-0">
                <p className="font-medium">{p.label}</p>
                {active ? <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.message}</p> : null}
              </div>
              {active ? <Check className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: 'var(--brass)' }} /> : null}
            </button>
          );
        })}
        <textarea
          value={customMessage}
          onChange={e => { setCustomMessage(e.target.value); if (e.target.value) setSelected(null); }}
          placeholder="Or type a custom notice…"
          rows={2}
          className="w-full text-sm p-2.5 rounded-lg outline-none resize-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>Expires</span>
          {EXPIRY_QUICK_CHOICES.map(c => {
            const active = expiryId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setExpiryId(c.id)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={{
                  background: active ? 'var(--brass-dim)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--brass)' : 'var(--surface-border)'}`,
                  color: active ? 'var(--brass)' : 'var(--text-muted)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={publish}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold mt-2',
            'transition-opacity disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          style={{ background: 'var(--brass)', color: '#fff' }}
        >
          <Flag className="w-4 h-4" />
          {activeNotice ? 'Replace Active Notice' : 'Publish Notice'}
        </button>
      </div>
    </div>
  );
}

