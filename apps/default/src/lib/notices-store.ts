/**
 * Notices store — Section 22 (Bi-Directional Publishing) authoritative data layer.
 *
 * Two channels:
 *   A — QR layer (pull): rendered on scan page as Active Notice banner / green info.
 *   B — Staff devices (push): notifications to identified staff (stub — no push infra yet).
 *
 * Scope: whole estate → workspace → zone → anchor.
 * Every notice has a mandatory expiry. Nothing lives forever.
 *
 * localStorage-backed so the manager app AND the personnel scan page (same origin)
 * read from the same source of truth. Swap for a real backend by replacing bodies.
 */

export type NoticeTemplate = 'facilities' | 'closure' | 'safety' | 'machinery' | 'custom';
export type NoticeAudience = 'scan' | 'push' | 'both';
export type NoticeScopeKind = 'estate' | 'workspace' | 'zone' | 'anchor';

export interface NoticeScope {
  kind: NoticeScopeKind;
  workspace?: 'farm' | 'property' | 'hospitality';
  zone?: string;
  anchorId?: string;
}

export interface Notice {
  id: string;
  template: NoticeTemplate;
  message: string;
  audience: NoticeAudience;
  scope: NoticeScope;
  createdAt: string;
  expiresAt: string;
  scheduledFor?: string | null;
  author: string;
  status: 'active' | 'scheduled' | 'expired';
}

export interface NoticePreset {
  id: string;
  label: string;
  message: string;
  template: NoticeTemplate;
  clearsMachineryReports?: boolean;
}

/**
 * Asset-panel presets (Section 22.4).
 * Two taps to publish: pick preset + expiry.
 */
export const ASSET_PRESETS: NoticePreset[] = [
  {
    id: 'do-not-use',
    label: 'Do not use — under maintenance',
    message: 'This asset is under maintenance. Please do not use until further notice.',
    template: 'machinery',
  },
  {
    id: 'awaiting-inspection',
    label: 'Awaiting inspection',
    message: 'This asset is awaiting inspection. Please do not use until it has been verified.',
    template: 'safety',
  },
  {
    id: 'back-in-service',
    label: 'Checked — back in service',
    message: 'This asset has been checked and is back in service.',
    template: 'facilities',
    clearsMachineryReports: true,
  },
];

export const TEMPLATE_LABEL: Record<NoticeTemplate, string> = {
  facilities: 'Facilities',
  closure: 'Closure',
  safety: 'Safety',
  machinery: 'Machinery',
  custom: 'Custom',
};

export const AUDIENCE_LABEL: Record<NoticeAudience, string> = {
  scan: 'Scan page',
  push: 'Staff push',
  both: 'Both',
};

// ─── Expiry helpers ────────────────────────────────────────────────────────
export const EXPIRY_QUICK_CHOICES = [
  { id: '4h', label: '4 hours', ms: 4 * 60 * 60 * 1000 },
  { id: 'today', label: 'End of today', ms: -1 },
  { id: '3d', label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
] as const;

export function resolveQuickExpiry(id: string): string {
  const now = Date.now();
  if (id === 'today') {
    const eod = new Date();
    eod.setHours(23, 59, 0, 0);
    return eod.toISOString();
  }
  const found = EXPIRY_QUICK_CHOICES.find(c => c.id === id);
  const ms = found ? found.ms : 24 * 60 * 60 * 1000;
  return new Date(now + ms).toISOString();
}

export function formatExpiryCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Storage ───────────────────────────────────────────────────────────────
const K_NOTICES = 'raynham.notices.v1';

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota */ }
}

function reconcileStatus(list: Notice[]): Notice[] {
  const now = Date.now();
  return list.map(n => {
    if (n.status === 'expired') return n;
    if (new Date(n.expiresAt).getTime() <= now) return { ...n, status: 'expired' as const };
    if (n.scheduledFor != null && new Date(n.scheduledFor).getTime() > now) {
      return { ...n, status: 'scheduled' as const };
    }
    return { ...n, status: 'active' as const };
  });
}

// ─── Seed ──────────────────────────────────────────────────────────────────
const SEED_NOTICES: Notice[] = [
  {
    id: 'nt-seed-1',
    template: 'machinery',
    message: 'Martin is due to check this machinery at 4 p.m. Please do not use until it has been verified.',
    audience: 'scan',
    scope: { kind: 'anchor', anchorId: 'tractor-3' },
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
    author: 'Sarah Chen',
    status: 'active',
  },
];

function seedIfEmpty(): Notice[] {
  const existing = safeRead<Notice[]>(K_NOTICES, []);
  if (existing.length > 0) return existing;
  safeWrite(K_NOTICES, SEED_NOTICES);
  return SEED_NOTICES;
}

// ─── Broadcast (cross-tab + same-tab subscribe) ────────────────────────────
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === K_NOTICES) listeners.forEach(fn => fn());
  });
}
function fire(): void { listeners.forEach(fn => fn()); }

export function subscribeNotices(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Public API ────────────────────────────────────────────────────────────
export function listNotices(): Notice[] {
  const list = reconcileStatus(seedIfEmpty());
  safeWrite(K_NOTICES, list);
  return list;
}

export function getActiveNoticeForAnchor(anchor: {
  id: string;
  workspace: 'farm' | 'property' | 'hospitality';
  zoneName: string;
}): Notice | null {
  const list = listNotices().filter(n => n.status === 'active');
  // Anchor-specific wins first, then zone, workspace, estate-wide.
  const anchorMatch = list.find(n => n.scope.kind === 'anchor' && n.scope.anchorId === anchor.id);
  if (anchorMatch) return anchorMatch;
  const zoneMatch = list.find(n => n.scope.kind === 'zone' && n.scope.zone === anchor.zoneName);
  if (zoneMatch) return zoneMatch;
  const wsMatch = list.find(n => n.scope.kind === 'workspace' && n.scope.workspace === anchor.workspace);
  if (wsMatch) return wsMatch;
  return list.find(n => n.scope.kind === 'estate') ?? null;
}

export function publishNotice(input: Omit<Notice, 'id' | 'createdAt' | 'status'>): Notice {
  const now = Date.now();
  const isScheduled = input.scheduledFor != null && new Date(input.scheduledFor).getTime() > now;
  const notice: Notice = {
    ...input,
    id: `nt-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date(now).toISOString(),
    status: isScheduled ? 'scheduled' : 'active',
  };
  const list = seedIfEmpty();
  safeWrite(K_NOTICES, [notice, ...list]);
  fire();
  return notice;
}

export function clearNotice(id: string): void {
  const list = seedIfEmpty();
  const next = list.map(n => n.id === id ? { ...n, status: 'expired' as const, expiresAt: new Date().toISOString() } : n);
  safeWrite(K_NOTICES, next);
  fire();
}

export function editNotice(id: string, patch: Partial<Pick<Notice, 'message' | 'expiresAt' | 'audience'>>): void {
  const list = seedIfEmpty();
  const next = list.map(n => n.id === id ? { ...n, ...patch } : n);
  safeWrite(K_NOTICES, next);
  fire();
}

/**
 * Anchor-scoped active notice count — used by the map pin to know whether to
 * carry the amber warning glyph (Section 22.4).
 */
export function anchorHasActiveNotice(anchorId: string): boolean {
  return listNotices().some(n =>
    n.status === 'active' && n.scope.kind === 'anchor' && n.scope.anchorId === anchorId
  );
}
