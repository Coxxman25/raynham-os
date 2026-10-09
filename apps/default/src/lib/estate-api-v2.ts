import { getNodes, createNode, updateNode, getFieldValue, getFieldNumber, getTitle, type GenesisNode } from '@/lib/genesis-data';

// ─── Project IDs ─────────────────────────────────────────────────────────────
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
    const rows = await getNodes(ESTATE_LOCATIONS_PID);
    return rows.map((n: GenesisNode) => ({
      id: n.id,
      name: getTitle(n, 'Location Name') ?? 'Unknown',
      what3words: getFieldValue(n, 'What3Words') ?? '',
      lat: getFieldNumber(n, 'Latitude') ?? 0,
      lng: getFieldNumber(n, 'Longitude') ?? 0,
      area: getFieldValue(n, 'Estate Area') ?? '',
      assetType: getFieldValue(n, 'Asset Type') ?? '',
      status: getFieldValue(n, 'Status') ?? '',
    }));
  } catch {
    return [];
  }
}

export async function createLocation(values: {
  name: string; what3words: string; lat: number; lng: number;
  area: string; assetType: string; status: string;
}): Promise<void> {
  await createNode(ESTATE_LOCATIONS_PID, {
    'Location Name': values.name,
    'What3Words': values.what3words,
    'Latitude': String(values.lat),
    'Longitude': String(values.lng),
    'Estate Area': values.area,
    'Asset Type': values.assetType,
    'Status': values.status,
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(): Promise<EstateReport[]> {
  try {
    const rows = await getNodes(ESTATE_REPORTS_PID);
    return rows.map((n: GenesisNode) => ({
      id: n.id,
      title: getTitle(n) ?? 'Untitled Report',
      reportType: getFieldValue(n, 'Report Type') ?? '',
      location: getFieldValue(n, 'Location') ?? '',
      what3words: getFieldValue(n, 'What3Words') ?? '',
      lat: getFieldNumber(n, 'Latitude') ?? 0,
      lng: getFieldNumber(n, 'Longitude') ?? 0,
      status: getFieldValue(n, 'Status') ?? '',
      priority: getFieldValue(n, 'Priority') ?? '',
      reporter: getFieldValue(n, 'Reporter') ?? '',
      description: getFieldValue(n, 'Description') ?? '',
    }));
  } catch {
    return [];
  }
}

export async function createReport(values: {
  title: string; reportType: string; location: string; what3words: string;
  lat: number; lng: number; status: string; priority: string;
  reporter: string; description: string;
}): Promise<void> {
  await createNode(ESTATE_REPORTS_PID, {
    [values.title]: values.title,
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
  await updateNode(ESTATE_REPORTS_PID, id, { 'Status': status });
}

// ─── Safety Check-ins ─────────────────────────────────────────────────────────

export async function getCheckIns(): Promise<SafetyCheckIn[]> {
  try {
    const rows = await getNodes(SAFETY_CHECKINS_PID);
    return rows.map((n: GenesisNode) => ({
      id: n.id,
      workerName: getFieldValue(n, 'Worker Name') ?? '',
      location: getFieldValue(n, 'Location') ?? '',
      what3words: getFieldValue(n, 'What3Words') ?? '',
      lat: getFieldNumber(n, 'Latitude') ?? 0,
      lng: getFieldNumber(n, 'Longitude') ?? 0,
      status: getFieldValue(n, 'Status') ?? '',
    }));
  } catch {
    return [];
  }
}

export async function createCheckIn(values: {
  workerName: string; location: string; what3words: string;
  lat: number; lng: number; status: string;
}): Promise<void> {
  await createNode(SAFETY_CHECKINS_PID, {
    [`${values.workerName} - ${values.location}`]: `${values.workerName} - ${values.location}`,
    'Worker Name': values.workerName,
    'Location': values.location,
    'What3Words': values.what3words,
    'Latitude': String(values.lat),
    'Longitude': String(values.lng),
    'Status': values.status,
  });
}

export async function updateCheckInStatus(id: string, status: string): Promise<void> {
  await updateNode(SAFETY_CHECKINS_PID, id, { 'Status': status });
}

// ─── Notices ──────────────────────────────────────────────────────────────────

export async function getNotices(): Promise<EstateNotice[]> {
  try {
    const rows = await getNodes(ESTATE_NOTICES_PID);
    return rows.map((n: GenesisNode) => ({
      id: n.id,
      title: getTitle(n) ?? 'Untitled Notice',
      category: getFieldValue(n, 'Category') ?? '',
      urgency: getFieldValue(n, 'Urgency') ?? '',
      status: getFieldValue(n, 'Status') ?? '',
      location: getFieldValue(n, 'Location') ?? '',
      publishedBy: getFieldValue(n, 'Published By') ?? '',
    }));
  } catch {
    return [];
  }
}

export async function createNotice(values: {
  title: string; category: string; urgency: string;
  status: string; location: string; publishedBy: string;
}): Promise<void> {
  await createNode(ESTATE_NOTICES_PID, {
    [values.title]: values.title,
    'Category': values.category,
    'Urgency': values.urgency,
    'Status': values.status,
    'Location': values.location,
    'Published By': values.publishedBy,
  });
}

export async function updateNoticeStatus(id: string, status: string): Promise<void> {
  await updateNode(ESTATE_NOTICES_PID, id, { 'Status': status });
}
