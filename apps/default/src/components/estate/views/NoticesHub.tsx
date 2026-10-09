import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell, Plus, X, Flag, AlertTriangle, Wrench, Calendar as CalIcon,
  Building, ShieldAlert, MapPin as MapPinIcon, Users, Radio, Globe,
} from 'lucide-react';
import {
  listNotices,
  publishNotice,
  clearNotice,
  subscribeNotices,
  formatExpiryCountdown,
  resolveQuickExpiry,
  EXPIRY_QUICK_CHOICES,
  TEMPLATE_LABEL,
  AUDIENCE_LABEL,
  type Notice,
  type NoticeTemplate,
  type NoticeAudience,
  type NoticeScope,
} from '@/lib/notices-store';
import { listAnchors } from '@/lib/personnel-api';
import { toast } from 'sonner';

type Tab = 'active' | 'scheduled' | 'expired';

export function NoticesHub() {
  const [tab, setTab] = useState<Tab>('active');
  const [notices, setNotices] = useState<Notice[]>(() => listNotices());
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotices(() => setNotices(listNotices()));
    const iv = setInterval(() => setNotices(listNotices()), 60_000);
    return () => { unsub(); clearInterval(iv); };
  }, []);

  const filtered = useMemo(() => notices.filter(n => n.status === tab), [notices, tab]);
  const counts = useMemo(() => ({
    active: notices.filter(n => n.status === 'active').length,
    scheduled: notices.filter(n => n.status === 'scheduled').length,
    expired: notices.filter(n => n.status === 'expired').length,
  }), [notices]);

  return (
    <div className="h-full w-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Notices</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Publish to scan pages, staff devices, or both. Every notice expires.
            </p>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold min-h-11 flex-shrink-0"
            style={{ background: 'var(--brass)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Notice</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--rail-border)' }}>
          {(['active', 'scheduled', 'expired'] as const).map(t => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors relative min-h-11',
                  isActive ? '' : 'hover:opacity-80',
                )}
                style={{ color: isActive ? 'var(--brass)' : 'var(--text-muted)' }}
              >
                <span className="capitalize">{t}</span>
                <span className="ml-1.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {counts[t]}
                </span>
                {isActive ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--brass)' }} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: 'var(--surface-2)' }}>
              <Bell className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No {tab} notices. Publish one from the button above.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(n => <NoticeRow key={n.id} notice={n} onClear={() => { clearNotice(n.id); toast.success('Notice cleared'); }} />)}
          </ul>
        )}
      </div>

      {composerOpen ? <Composer onClose={() => setComposerOpen(false)} /> : null}
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────
function NoticeRow({ notice, onClear }: { notice: Notice; onClear: () => void }) {
  const Icon = templateIcon(notice.template);
  return (
    <li
      className="flex items-start gap-3 p-3.5 rounded-xl transition-colors"
      style={{ background: 'var(--rail-bg)', border: '1px solid var(--rail-border)' }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: 'var(--surface-2)', color: 'var(--brass)' }}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {notice.message}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
          <Chip label={TEMPLATE_LABEL[notice.template]} />
          <Chip label={scopeLabel(notice.scope)} icon={<MapPinIcon className="w-3 h-3" />} />
          <Chip label={AUDIENCE_LABEL[notice.audience]} icon={audienceIcon(notice.audience)} />
          <span style={{ color: 'var(--text-muted)' }}>
            · {notice.status === 'expired'
                ? `Expired ${new Date(notice.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : `Expires ${formatExpiryCountdown(notice.expiresAt)}`}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>· {notice.author}</span>
        </div>
      </div>
      {notice.status === 'active' ? (
        <button
          onClick={onClear}
          className="text-xs font-medium px-2.5 py-1.5 rounded-md flex-shrink-0"
          style={{ color: 'var(--text-primary)', background: 'var(--surface-2)' }}
        >
          Clear
        </button>
      ) : null}
    </li>
  );
}

function Chip({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
      {icon}
      {label}
    </span>
  );
}

function scopeLabel(scope: NoticeScope): string {
  if (scope.kind === 'estate') return 'Whole estate';
  if (scope.kind === 'workspace') return workspaceLabel(scope.workspace);
  if (scope.kind === 'zone') return scope.zone ?? 'Zone';
  if (scope.kind === 'anchor') {
    const a = listAnchors().find(x => x.id === scope.anchorId);
    return a ? a.assetName : scope.anchorId ?? 'Anchor';
  }
  return 'Estate';
}

function workspaceLabel(ws?: string): string {
  if (ws === 'farm') return 'Farm & Land';
  if (ws === 'property') return 'Property & Grounds';
  if (ws === 'hospitality') return 'Hospitality';
  return 'Whole estate';
}

function templateIcon(t: NoticeTemplate) {
  if (t === 'safety') return ShieldAlert;
  if (t === 'closure') return AlertTriangle;
  if (t === 'machinery') return Wrench;
  if (t === 'facilities') return Building;
  return Bell;
}

function audienceIcon(a: NoticeAudience) {
  if (a === 'scan') return <MapPinIcon className="w-3 h-3" />;
  if (a === 'push') return <Radio className="w-3 h-3" />;
  return <Users className="w-3 h-3" />;
}

// ─── Composer (Section 22.3) ───────────────────────────────────────────────
function Composer({ onClose }: { onClose: () => void }) {
  const [template, setTemplate] = useState<NoticeTemplate>('facilities');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<NoticeAudience>('scan');
  const [scopeKind, setScopeKind] = useState<'estate' | 'workspace' | 'zone' | 'anchor'>('estate');
  const [scopeWorkspace, setScopeWorkspace] = useState<'farm' | 'property' | 'hospitality'>('farm');
  const [scopeAnchorId, setScopeAnchorId] = useState<string>('');
  const [expiryId, setExpiryId] = useState<string>('today');

  const anchors = useMemo(() => listAnchors(), []);

  const scope: NoticeScope = useMemo(() => {
    if (scopeKind === 'workspace') return { kind: 'workspace', workspace: scopeWorkspace };
    if (scopeKind === 'anchor') return { kind: 'anchor', anchorId: scopeAnchorId };
    return { kind: scopeKind } as NoticeScope;
  }, [scopeKind, scopeWorkspace, scopeAnchorId]);

  const publish = useCallback(() => {
    if (!message.trim()) { toast.error('Add a message first'); return; }
    if (scopeKind === 'anchor' && !scopeAnchorId) { toast.error('Choose an anchor'); return; }
    publishNotice({
      template, message: message.trim(), audience, scope,
      expiresAt: resolveQuickExpiry(expiryId),
      author: 'Estate Office',
      scheduledFor: null,
    });
    toast.success('Notice published');
    onClose();
  }, [template, message, audience, scope, scopeKind, scopeAnchorId, expiryId, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1200] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={cn(
          'relative ml-auto flex flex-col h-full w-full sm:max-w-[720px]',
          'shadow-2xl',
        )}
        style={{ background: 'var(--rail-bg)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--rail-border)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>New Notice</p>
            <h2 className="text-lg font-bold tracking-tight mt-0.5">Publish to the estate</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Close composer"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Body: form left, preview right (stack on mobile) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Form */}
          <div className="space-y-5">
            <Section title="Template">
              <div className="flex flex-wrap gap-1.5">
                {(['facilities', 'closure', 'safety', 'machinery', 'custom'] as NoticeTemplate[]).map(t => (
                  <Chip2 key={t} active={template === t} onClick={() => setTemplate(t)}>{TEMPLATE_LABEL[t]}</Chip2>
                ))}
              </div>
            </Section>

            <Section title="Audience">
              <div className="grid grid-cols-3 gap-1.5">
                <SegBtn active={audience === 'scan'} onClick={() => setAudience('scan')} icon={<MapPinIcon className="w-3.5 h-3.5" />} label="Anyone who scans" />
                <SegBtn active={audience === 'push'} onClick={() => setAudience('push')} icon={<Radio className="w-3.5 h-3.5" />} label="Staff devices" />
                <SegBtn active={audience === 'both'} onClick={() => setAudience('both')} icon={<Users className="w-3.5 h-3.5" />} label="Both" />
              </div>
              {audience !== 'scan' ? (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Push delivery requires the staff app; the scan-page banner always renders.
                </p>
              ) : null}
            </Section>

            <Section title="Scope">
              <div className="flex flex-wrap gap-1.5">
                <Chip2 active={scopeKind === 'estate'} onClick={() => setScopeKind('estate')} icon={<Globe className="w-3 h-3" />}>Whole estate</Chip2>
                <Chip2 active={scopeKind === 'workspace'} onClick={() => setScopeKind('workspace')}>Workspace</Chip2>
                <Chip2 active={scopeKind === 'anchor'} onClick={() => setScopeKind('anchor')}>Specific anchor</Chip2>
              </div>
              {scopeKind === 'workspace' ? (
                <div className="mt-2 flex gap-1.5">
                  {(['farm', 'property', 'hospitality'] as const).map(w => (
                    <Chip2 key={w} active={scopeWorkspace === w} onClick={() => setScopeWorkspace(w)}>{workspaceLabel(w)}</Chip2>
                  ))}
                </div>
              ) : null}
              {scopeKind === 'anchor' ? (
                <select
                  value={scopeAnchorId}
                  onChange={e => setScopeAnchorId(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                >
                  <option value="">Choose an anchor…</option>
                  {anchors.map(a => (<option key={a.id} value={a.id}>{a.assetName} — {a.zoneName}</option>))}
                </select>
              ) : null}
            </Section>

            <Section title="Message" hint={`${message.length} / 280`}>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 280))}
                rows={4}
                placeholder="Plain language. No formatting."
                className="w-full text-sm p-3 rounded-lg outline-none resize-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </Section>

            <Section title="Expires" hint="Notices always expire — nothing goes stale.">
              <div className="flex gap-1.5 flex-wrap">
                {EXPIRY_QUICK_CHOICES.map(c => (
                  <Chip2 key={c.id} active={expiryId === c.id} onClick={() => setExpiryId(c.id)} icon={<CalIcon className="w-3 h-3" />}>{c.label}</Chip2>
                ))}
              </div>
            </Section>
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Preview — scan page
            </p>
            <div className="rounded-2xl p-3.5 space-y-2"
                 style={{
                   background: 'var(--status-warning-soft, #F9EEDC)',
                   border: '1px solid rgba(201, 130, 30, 0.35)',
                 }}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-warning-p, #C9821E)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--status-warning-p, #C9821E)' }}>
                  Active Notice
                </p>
              </div>
              <p className="text-sm leading-snug" style={{ color: '#2E3438' }}>
                {message.trim() || 'Your notice will appear here.'}
              </p>
              <p className="text-[11px] font-medium pt-1" style={{ color: 'var(--status-warning-p, #C9821E)' }}>
                Expires {formatExpiryCountdown(resolveQuickExpiry(expiryId))}
              </p>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Renders on {scopeLabel(scope)} · {AUDIENCE_LABEL[audience]}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4" style={{ borderTop: '1px solid var(--rail-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium min-h-11"
            style={{ color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={publish}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold min-h-11"
            style={{ background: 'var(--brass)', color: '#fff' }}
          >
            <Flag className="w-4 h-4" />
            Publish Notice
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {hint ? <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Chip2({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-11 sm:min-h-0"
      style={{
        background: active ? 'var(--brass-dim)' : 'var(--surface-2)',
        border: `1px solid ${active ? 'var(--brass)' : 'var(--surface-border)'}`,
        color: active ? 'var(--brass)' : 'var(--text-primary)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function SegBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-colors min-h-11 text-center"
      style={{
        background: active ? 'var(--brass-dim)' : 'var(--surface-2)',
        border: `1px solid ${active ? 'var(--brass)' : 'var(--surface-border)'}`,
        color: active ? 'var(--brass)' : 'var(--text-primary)',
      }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

