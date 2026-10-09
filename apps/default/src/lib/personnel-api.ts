/**
 * Personnel-flow mock API layer.
 *
 * Per the spec: "Mock API layer: implement the data contracts as a local mock
 * (in-memory + IndexedDB persistence). Keep every call behind a small /lib/api
 * module so a real backend can replace it without touching UI code."
 *
 * We use localStorage instead of IndexedDB because idb-keyval / dexie are not
 * available in this scaffold; the surface area is identical from the UI's
 * point of view. Swap for a real backend by replacing the function bodies.
 */

// ─── Data contracts (from the spec) ────────────────────────────────────────
export interface Anchor {
  id: string;
  assetName: string;
  zoneName: string;
  workspace: 'farm' | 'property' | 'hospitality';
  lat: number;
  lng: number;
  w3w: string;
  activeNotice?: { body: string; expiresAt: string; author: string } | null;
}

export interface StaffProfile {
  id: string;
  name: string;
  mobile: string;
  workspace: 'farm' | 'property' | 'hospitality';
  verified: boolean;
  enrolledBy: 'manager' | 'self';
  deviceBoundAt: string;
}

export type Category =
  | 'Machinery' | 'Fence & Gates' | 'Livestock' | 'Tree / Forestry'
  | 'Water & Pumps' | 'Building' | 'Grounds' | 'Other';

export const CATEGORIES: Category[] = [
  'Machinery', 'Fence & Gates', 'Livestock', 'Tree / Forestry',
  'Water & Pumps', 'Building', 'Grounds', 'Other',
];

export interface Report {
  id: string;
  anchorId: string | null;
  category: Category;
  note?: string;
  photoUrl: string;
  lat: number;
  lng: number;
  w3w: string;
  reportedBy: { name: string; mobile: string } | null;
  routedTo: { workspace: string; team: string };
  status: 'new' | 'assigned' | 'in_progress' | 'resolved';
  createdAt: string;
  queued?: boolean;
}

// ─── Config ────────────────────────────────────────────────────────────────
export const SMS_VERIFICATION_ENABLED = false;
export const MOCK_SMS_CODE = '123456';

/**
 * PLACEHOLDER for the future server-side classification step.
 * Static category-to-team routing table.
 */
export const CATEGORY_ROUTING: Record<Category, { workspace: string; team: string }> = {
  'Machinery':      { workspace: 'Farm & Land',       team: 'Farm Team' },
  'Fence & Gates':  { workspace: 'Farm & Land',       team: 'Farm Team' },
  'Livestock':      { workspace: 'Farm & Land',       team: 'Farm Team' },
  'Tree / Forestry':{ workspace: 'Farm & Land',       team: 'Farm Team' },
  'Water & Pumps':  { workspace: 'Farm & Land',       team: 'Farm Team' },
  'Building':       { workspace: 'Property & Grounds', team: 'Maintenance Team' },
  'Grounds':        { workspace: 'Property & Grounds', team: 'Maintenance Team' },
  'Other':          { workspace: 'Unassigned',        team: 'Estate Office' },
};

// ─── Seed data ─────────────────────────────────────────────────────────────
const SEED_ANCHORS: Anchor[] = [
  {
    id: 'tractor-3',
    assetName: 'Tractor 3',
    zoneName: 'Home Farm',
    workspace: 'farm',
    lat: 52.8362, lng: 0.7418,
    w3w: 'filled.count.soap',
    activeNotice: {
      body: 'Martin is due to check this machinery at 4 p.m. Please do not use until verified.',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      author: 'Sarah Chen',
    },
  },
  {
    id: 'yurt-4',
    assetName: 'Yurt 4',
    zoneName: 'Glamping Meadow',
    workspace: 'hospitality',
    lat: 52.8348, lng: 0.7395,
    w3w: 'garden.brave.willow',
    activeNotice: null,
  },
  {
    id: 'cottage-12',
    assetName: '12 Estate Cottages',
    zoneName: 'Residential',
    workspace: 'property',
    lat: 52.8371, lng: 0.7433,
    w3w: 'estate.arch.brook',
    activeNotice: null,
  },
];

const SEED_STAFF: StaffProfile[] = [
  { id: 'staff-1', name: 'Martin Clarke',  mobile: '+447700900101', workspace: 'farm',        verified: true, enrolledBy: 'manager', deviceBoundAt: '' },
  { id: 'staff-2', name: 'Dan Reeves',     mobile: '+447700900102', workspace: 'property',    verified: true, enrolledBy: 'manager', deviceBoundAt: '' },
  { id: 'staff-3', name: 'Eleanor Hughes', mobile: '+447700900103', workspace: 'hospitality', verified: true, enrolledBy: 'manager', deviceBoundAt: '' },
  { id: 'staff-4', name: 'Tom Whitaker',   mobile: '+447700900104', workspace: 'farm',        verified: true, enrolledBy: 'manager', deviceBoundAt: '' },
  { id: 'staff-5', name: 'Priya Sharma',   mobile: '+447700900105', workspace: 'property',    verified: true, enrolledBy: 'manager', deviceBoundAt: '' },
];

// ─── Storage keys ──────────────────────────────────────────────────────────
const K_PROFILE = 'raynham.staffProfile';
const K_STAFF_LIST = 'raynham.staffList';
const K_REPORTS = 'raynham.reports';
const K_OUTBOX = 'raynham.outbox';
const K_REPORT_SEQ = 'raynham.reportSeq';

// ─── Helpers ───────────────────────────────────────────────────────────────
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
  } catch { /* ignore quota errors */ }
}

function seedStaffIfEmpty(): StaffProfile[] {
  const existing = safeRead<StaffProfile[]>(K_STAFF_LIST, []);
  if (existing.length > 0) return existing;
  safeWrite(K_STAFF_LIST, SEED_STAFF);
  return SEED_STAFF;
}

function nextReportRef(): string {
  const current = safeRead<number>(K_REPORT_SEQ, 426);
  const next = current + 1;
  safeWrite(K_REPORT_SEQ, next);
  return `RN-${String(next).padStart(4, '0')}`;
}

// ─── Public API ────────────────────────────────────────────────────────────
export async function getAnchor(id: string): Promise<Anchor | null> {
  const seeded = SEED_ANCHORS.find(anchor => anchor.id === id);
  if (seeded) return seeded;
  const { getLocations } = await import('./estate-api');
  const live = (await getLocations()).find(location => location.id === id);
  if (!live) return null;
  return {
    id: live.id,
    assetName: live.name,
    zoneName: live.area || 'Estate',
    workspace: normalizeWorkspace(live.area),
    lat: live.lat,
    lng: live.lng,
    w3w: live.what3words,
    activeNotice: null,
  };
}

function normalizeWorkspace(area: string): Anchor['workspace'] {
  const normalized = area.toLowerCase();
  if (normalized === 'farm' || normalized.includes('farm')) return 'farm';
  if (normalized === 'hospitality') return 'hospitality';
  return 'property';
}

export function listAnchors(): Anchor[] {
  return SEED_ANCHORS;
}

export function getStoredProfile(): StaffProfile | null {
  return safeRead<StaffProfile | null>(K_PROFILE, null);
}

export function clearStoredProfile(): void {
  try { localStorage.removeItem(K_PROFILE); } catch { /* ignore */ }
}

export function searchStaff(query: string): StaffProfile[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const list = seedStaffIfEmpty();
  return list.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6);
}

export function saveProfile(input: {
  name: string;
  mobile: string;
  workspace?: 'farm' | 'property' | 'hospitality';
}): StaffProfile {
  const list = seedStaffIfEmpty();

  // Duplicate-guard: if mobile matches an existing profile, reuse it.
  const byMobile = list.find(s => s.mobile === input.mobile);
  const existing = byMobile ?? list.find(s => s.name.toLowerCase() === input.name.toLowerCase());

  const profile: StaffProfile = existing != null
    ? {
        ...existing,
        // Update device-bound timestamp on re-claim
        deviceBoundAt: new Date().toISOString(),
        // If verification is enabled, saveProfile is only called AFTER the SMS step,
        // so it is safe to mark verified here.
        verified: SMS_VERIFICATION_ENABLED ? true : existing.verified,
      }
    : {
        id: `staff-${Date.now()}`,
        name: input.name,
        mobile: input.mobile,
        workspace: input.workspace ?? 'farm',
        verified: SMS_VERIFICATION_ENABLED,
        enrolledBy: 'self',
        deviceBoundAt: new Date().toISOString(),
      };

  if (existing == null) {
    safeWrite(K_STAFF_LIST, [...list, profile]);
  }
  safeWrite(K_PROFILE, profile);
  return profile;
}

// ─── Reports ───────────────────────────────────────────────────────────────
export interface DraftReport {
  anchorId: string | null;
  category: Category;
  note?: string;
  photoUrl: string;
  lat: number;
  lng: number;
  w3w: string;
  reportedBy: { name: string; mobile: string } | null;
}

export async function submitReport(draft: DraftReport): Promise<Report> {
  const routedTo = CATEGORY_ROUTING[draft.category];
  const report: Report = {
    id: nextReportRef(),
    anchorId: draft.anchorId,
    category: draft.category,
    note: draft.note,
    photoUrl: draft.photoUrl,
    lat: draft.lat,
    lng: draft.lng,
    w3w: draft.w3w,
    reportedBy: draft.reportedBy,
    routedTo,
    status: 'assigned',
    createdAt: new Date().toISOString(),
    queued: !navigator.onLine,
  };

  const list = safeRead<Report[]>(K_REPORTS, []);
  safeWrite(K_REPORTS, [report, ...list]);

  if (!navigator.onLine) {
    const outbox = safeRead<Report[]>(K_OUTBOX, []);
    safeWrite(K_OUTBOX, [report, ...outbox]);
  }

  // 200ms simulated round-trip when online.
  if (navigator.onLine) {
    await new Promise(r => setTimeout(r, 200));
  }

  return report;
}

export function flushOutbox(): number {
  const outbox = safeRead<Report[]>(K_OUTBOX, []);
  if (outbox.length === 0) return 0;
  const reports = safeRead<Report[]>(K_REPORTS, []);
  const updated = reports.map(r => (r.queued ? { ...r, queued: false } : r));
  safeWrite(K_REPORTS, updated);
  safeWrite(K_OUTBOX, []);
  return outbox.length;
}

export function getReport(id: string): Report | null {
  const list = safeRead<Report[]>(K_REPORTS, []);
  return list.find(r => r.id === id) ?? null;
}
