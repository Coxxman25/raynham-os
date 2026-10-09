// Raynham Estate OS — data layer (raw fetch against gateway)
const BASE = '/api/taskade';
export const MAP_DATA_CHANGED_EVENT = 'raynham:map-data-changed';

function notifyMapDataChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MAP_DATA_CHANGED_EVENT));
}

async function fetchNodes(pid: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/projects/${pid}/nodes`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.payload?.nodes ?? [];
  } catch {
    return [];
  }
}

async function writeNode(pid: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${BASE}/projects/${pid}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('The record could not be saved');
}

async function patchNode(pid: string, id: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${BASE}/projects/${pid}/nodes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('The record could not be updated');
}

function fv(node: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = node.fieldValues?.[k];
    if (v != null && v !== '') return typeof v === 'string' ? v : String(v);
  }
  return '';
}

function fn(node: any, ...keys: string[]): number {
  const raw = fv(node, ...keys);
  if (!raw) return 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

function ft(node: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = node.fieldValues?.[k];
    if (v != null && v.trim().length > 0) return v;
  }
  if (node.content && node.content.trim().length > 0) return node.content;
  return '';
}

export const ESTATE_LOCATIONS_PID = 'faZhQHJMB1xbcrae';
export const ESTATE_REPORTS_PID = 'Lzg68CH4N1QdeJgV';
export const SAFETY_CHECKINS_PID = 'TczEiyoKNHfgT7sf';
export const ESTATE_NOTICES_PID = 'WiY9hV2MdmjPkBvx';
export const ARIA_AGENT_ID = '01KRYKE3TVFYXGG1BDJ9JR1PP0';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EstateLocation {
  id: string;
  name: string;
  what3words: string;
  lat: number;
  lng: number;
  area: string;
  assetType: string;
  status: string;
  source?: string;
  accuracyMeters?: number;
  createdAt?: string;
  createdBy?: string;
}

export interface EstateReport {
  id: string;
  title: string;
  reportType: string;
  location: string;
  what3words: string;
  lat: number;
  lng: number;
  status: string;
  priority: string;
  reporter: string;
  description: string;
}

export interface SafetyCheckIn {
  id: string;
  workerName: string;
  location: string;
  what3words: string;
  lat: number;
  lng: number;
  status: string;
  workMode: string;
  capturedAt: string;
  accuracyMeters: number;
  locationSource: string;
  nextCheckIn: string;
  intervalMinutes: number;
  sessionId: string;
}

export interface EstateNotice {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  publishedBy: string;
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function getLocations(): Promise<EstateLocation[]> {
  try {
    const rows = await fetchNodes(ESTATE_LOCATIONS_PID);
    return rows.map((n: any) => ({
      id: n.id,
      name: ft(n, 'Location Name') || 'Unknown',
      what3words: fv(n, 'What3Words'),
      lat: fn(n, 'Latitude'),
      lng: fn(n, 'Longitude'),
      area: fv(n, 'Estate Area'),
      assetType: fv(n, 'Asset Type'),
      status: fv(n, 'Status'),
      source: fv(n, 'Location Source'),
      accuracyMeters: fn(n, 'Accuracy Meters'),
      createdAt: fv(n, 'Created At'),
      createdBy: fv(n, 'Created By'),
    }));
  } catch {
    return [];
  }
}

export async function createLocation(values: {
  name: string;
  what3words: string;
  lat: number;
  lng: number;
  area: string;
  assetType: string;
  status: string;
  source?: 'device' | 'qr' | 'manager';
  accuracyMeters?: number;
  createdAt?: string;
  createdBy?: string;
}): Promise<EstateLocation> {
  await writeNode(ESTATE_LOCATIONS_PID, {
    '/text': values.name,
    'Location Name': values.name,
    'What3Words': values.what3words,
    'Latitude': values.lat,
    'Longitude': values.lng,
    'Estate Area': values.area,
    'Asset Type': values.assetType,
    'Status': values.status,
    ...(values.source ? { 'Location Source': values.source } : {}),
    ...(values.accuracyMeters != null ? { 'Accuracy Meters': values.accuracyMeters } : {}),
    ...(values.createdAt ? { 'Created At': values.createdAt } : {}),
    ...(values.createdBy ? { 'Created By': values.createdBy } : {}),
  });
  notifyMapDataChanged();
  const rows = await getLocations();
  const match = rows.find(row => row.name === values.name && Math.abs(row.lat - values.lat) < 0.000001 && Math.abs(row.lng - values.lng) < 0.000001);
  if (!match) throw new Error('The location was saved but could not be reopened');
  return match;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(): Promise<EstateReport[]> {
  try {
    const rows = await fetchNodes(ESTATE_REPORTS_PID);
    return rows.map((n: any) => ({
      id: n.id,
      title: ft(n) || 'Untitled Report',
      reportType: fv(n, 'Report Type'),
      location: fv(n, 'Location'),
      what3words: fv(n, 'What3Words'),
      lat: fn(n, 'Latitude'),
      lng: fn(n, 'Longitude'),
      status: fv(n, 'Status'),
      priority: fv(n, 'Priority'),
      reporter: fv(n, 'Reporter'),
      description: fv(n, 'Description'),
    }));
  } catch {
    return [];
  }
}

export async function createReport(values: {
  title: string;
  reportType: string;
  location: string;
  what3words: string;
  lat: number;
  lng: number;
  status: string;
  priority: string;
  reporter: string;
  description: string;
}): Promise<void> {
  await writeNode(ESTATE_REPORTS_PID, {
    'Report Type': values.reportType,
    'Location': values.location,
    'What3Words': values.what3words,
    'Latitude': String(values.lat),
    'Longitude': String(values.lng),
    'Status': values.status,
    'Priority': values.priority,
    'Reporter': values.reporter,
    'Description': values.description,
  });
}

export async function updateReportStatus(id: string, status: string): Promise<void> {
  await patchNode(ESTATE_REPORTS_PID, id, { 'Status': status });
}

// ─── Safety Check-ins ─────────────────────────────────────────────────────────

export async function getCheckIns(): Promise<SafetyCheckIn[]> {
  try {
    const rows = await fetchNodes(SAFETY_CHECKINS_PID);
    return rows.map((n: any) => ({
      id: n.id,
      workerName: fv(n, 'Worker Name'),
      location: fv(n, 'Location'),
      what3words: fv(n, 'What3Words'),
      lat: fn(n, 'Latitude'),
      lng: fn(n, 'Longitude'),
      status: fv(n, 'Status'),
      workMode: fv(n, 'Work Mode'),
      capturedAt: fv(n, 'Captured At'),
      accuracyMeters: fn(n, 'Accuracy Meters'),
      locationSource: fv(n, 'Location Source'),
      nextCheckIn: fv(n, 'Next Check-in'),
      intervalMinutes: fn(n, 'Interval Minutes'),
      sessionId: fv(n, 'Session ID'),
    }));
  } catch {
    return [];
  }
}

export async function createCheckIn(values: {
  workerName: string;
  location: string;
  what3words: string;
  lat: number;
  lng: number;
  status: string;
  workMode?: string;
  capturedAt?: string;
  accuracyMeters?: number;
  locationSource?: string;
  nextCheckIn?: string;
  intervalMinutes?: number;
  sessionId?: string;
}): Promise<SafetyCheckIn> {
  await writeNode(SAFETY_CHECKINS_PID, {
    '/text': `${values.workerName} - ${values.location}`,
    'Worker Name': values.workerName,
    'Location': values.location,
    'What3Words': values.what3words,
    'Latitude': values.lat,
    'Longitude': values.lng,
    'Status': values.status,
    ...(values.workMode ? { 'Work Mode': values.workMode } : {}),
    ...(values.capturedAt ? { 'Captured At': values.capturedAt } : {}),
    ...(values.accuracyMeters != null ? { 'Accuracy Meters': values.accuracyMeters } : {}),
    ...(values.locationSource ? { 'Location Source': values.locationSource } : {}),
    ...(values.nextCheckIn ? { 'Next Check-in': values.nextCheckIn } : {}),
    ...(values.intervalMinutes != null ? { 'Interval Minutes': values.intervalMinutes } : {}),
    ...(values.sessionId ? { 'Session ID': values.sessionId } : {}),
  });
  notifyMapDataChanged();
  const rows = await getCheckIns();
  const match = rows.find(row => row.sessionId === values.sessionId && row.capturedAt === values.capturedAt);
  if (!match) throw new Error('The check-in was saved but could not be reopened');
  return match;
}

export async function updateCheckInStatus(id: string, status: string): Promise<void> {
  await patchNode(SAFETY_CHECKINS_PID, id, { 'Status': status });
}

export async function endSafetySession(id: string, capturedAt: string): Promise<void> {
  await patchNode(SAFETY_CHECKINS_PID, id, {
    'Work Mode': 'off_duty',
    'Status': 'checked_in',
    'Captured At': capturedAt,
  });
}

// ─── Notices ──────────────────────────────────────────────────────────────────

export async function getNotices(): Promise<EstateNotice[]> {
  try {
    const rows = await fetchNodes(ESTATE_NOTICES_PID);
    return rows.map((n: any) => ({
      id: n.id,
      title: ft(n) || 'Untitled Notice',
      category: fv(n, 'Category'),
      urgency: fv(n, 'Urgency'),
      status: fv(n, 'Status'),
      location: fv(n, 'Location'),
      publishedBy: fv(n, 'Published By'),
    }));
  } catch {
    return [];
  }
}

export async function createNotice(values: {
  title: string;
  category: string;
  urgency: string;
  status: string;
  location: string;
  publishedBy: string;
}): Promise<void> {
  await writeNode(ESTATE_NOTICES_PID, {
    'Category': values.category,
    'Urgency': values.urgency,
    'Status': values.status,
    'Location': values.location,
    'Published By': values.publishedBy,
  });
}

export async function updateNoticeStatus(id: string, status: string): Promise<void> {
  await patchNode(ESTATE_NOTICES_PID, id, { 'Status': status });
}
