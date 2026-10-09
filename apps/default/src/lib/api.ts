import axios from 'axios';

const api = axios.create({ baseURL: '/api/taskade' });

export const LOCATIONS_PID = 'WNJ5aiqiaYUvoinp';
export const INCIDENTS_PID = 'r7RYBwhZXTAuaaP7';
export const RISK_ZONES_PID = 'W5sUhohHVrBfCnz8';
export const VOICE_JOURNALS_PID = 'D8sHB7epC3VTtBrE';
export const WEBHOOK_ID = '01KRYKE3TVETGQWZVA5MBGWC4A';
export const VJ_WEBHOOK_ID = '01KRYKE3TVTPCQS9RMCPNRWSKV';
export const ARIA_AGENT_ID = '01KRYKE3TVFYXGG1BDJ9JR1PP0';
export const SITE_CONTENT_PID = 'fVM9GUMjrACcbKZL';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The three anchor colors of the Absolute Defence Spatial OS. */
export type AnchorType = 'red' | 'amber' | 'green';

export interface Location {
  id: string;
  code: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  risk: string;
  incidentCount: number;
  /** Which anchor types are physically deployed at this location. Defaults to ['red']. */
  anchorTypes: AnchorType[];
  /** Canonical zone ID used in new ?anchor=&zone= QR URLs. Falls back to code. */
  zoneId: string;
}

export interface Incident {
  id: string;
  incidentId: string;
  locationCode: string;
  severity: string;
  status: string;
  lat: number;
  lng: number;
  reporter: string;
  description: string;
  title?: string;
  location_name?: string;
  createdAt?: string;
}

export interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  incidentCount: number;
  severity: string;
  locationName?: string;
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function getLocations(): Promise<Location[]> {
  try {
    const { data } = await api.get(`/projects/${LOCATIONS_PID}/nodes`);
    return (data.payload?.nodes ?? [])
      .filter((n: any) => n.fieldValues?.[ '/attributes/@locID'])
      .map((n: any) => {
        // Parse anchor types — comma-separated string e.g. "red,amber"
        // Defaults to ['red'] for all existing locations (backward compatible)
        const rawAnchor: string = n.fieldValues['/attributes/@locAN'] ?? '';
        const anchorTypes: AnchorType[] = rawAnchor
          ? rawAnchor.split(',').map((s: string) => s.trim()).filter(
              (s: string): s is AnchorType => ['red', 'amber', 'green'].includes(s)
            )
          : ['red'];

        const code = n.fieldValues['/attributes/@locID'] ?? '';

        return {
          id: n.id,
          code,
          name: n.fieldValues['/attributes/@locNM'] ?? n.fieldValues['/text'] ?? 'Unknown',
          type: n.fieldValues['/attributes/@locTY'] ?? 'other',
          lat: Number(n.fieldValues['/attributes/@locLT'] ?? 0),
          lng: Number(n.fieldValues['/attributes/@locLN'] ?? 0),
          risk: n.fieldValues['/attributes/@locRK'] ?? 'low',
          incidentCount: Number(n.fieldValues['/attributes/@locIC'] ?? 0),
          anchorTypes,
          // @locZN is the canonical zone ID; falls back to the location code
          zoneId: n.fieldValues['/attributes/@locZN'] ?? code,
        };
      });
  } catch (err) {
    console.error('getLocations failed', err);
    return [];
  }
}

export async function createLocation(payload: {
  code: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
}): Promise<void> {
  await api.post(`/projects/${LOCATIONS_PID}/nodes`, {
    '/text': payload.name,
    '/attributes/@locID': payload.code,
    '/attributes/@locNM': payload.name,
    '/attributes/@locTY': payload.type,
    '/attributes/@locLT': payload.lat,
    '/attributes/@locLN': payload.lng,
    '/attributes/@locRK': 'low',
    '/attributes/@locIC': 0,
  });
}

export async function updateLocationIncidentCount(
  nodeId: string,
  newCount: number,
  newRisk: string
): Promise<void> {
  await api.patch(`/projects/${LOCATIONS_PID}/nodes/${nodeId}`, {
    '/attributes/@locIC': newCount,
    '/attributes/@locRK': newRisk,
  });
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export async function getIncidents(): Promise<Incident[]> {
  try {
    const { data } = await api.get(`/projects/${INCIDENTS_PID}/nodes`);
    return (data.payload?.nodes ?? [])
      .filter((n: any) => n.fieldValues?.[ '/attributes/@incLC'])
      .map((n: any) => {
        const incidentId: string = n.fieldValues['/attributes/@incID'] ?? n.id;

        // Derive createdAt: the node API does not return createdAt on nodes,
        // but @incID is always "INC-{Date.now()}" — extract the ms timestamp.
        // Fall back to n.createdAt if the API ever adds it, then to now.
        let createdAt: string | undefined = n.createdAt;
        if (!createdAt) {
          const tsMatch = incidentId.match(/INC-(\d{13,})/);
          if (tsMatch) {
            createdAt = new Date(parseInt(tsMatch[1], 10)).toISOString();
          }
        }

        return {
          id: n.id,
          incidentId,
          locationCode: n.fieldValues['/attributes/@incLC'] ?? '',
          severity: n.fieldValues['/attributes/@incSV'] ?? 'low',
          status: n.fieldValues['/attributes/@incST'] ?? 'pending',
          lat: Number(n.fieldValues['/attributes/@incLT'] ?? 0),
          lng: Number(n.fieldValues['/attributes/@incLN'] ?? 0),
          reporter: n.fieldValues['/attributes/@incRP'] ?? 'Unknown',
          description: n.fieldValues['/text'] ?? '',
          createdAt,
          title: (() => {
            const desc = n.fieldValues['/text'] ?? '';
            const clean = desc.replace(/^\[[A-Z_]+\]\s*/, '');
            return clean.length > 80 ? clean.slice(0, 80) + '…' : clean || 'Concern Reported';
          })(),
          location_name: n.fieldValues['/attributes/@incLC'] ?? '',
        };
      });
  } catch (err) {
    console.error('getIncidents failed', err);
    return [];
  }
}

export async function updateIncidentStatus(
  nodeId: string,
  status: 'pending' | 'reviewing' | 'resolved'
): Promise<void> {
  await api.patch(`/projects/${INCIDENTS_PID}/nodes/${nodeId}`, {
    '/attributes/@incST': status,
  });
}

export async function submitIncident(payload: {
  locationCode: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  reporter: string;
  description: string;
}): Promise<void> {
  await api.post(`/webhooks/${WEBHOOK_ID}/run`, payload);
}

// Direct create (bypasses webhook — used for QR public form submissions)
export async function createIncidentDirect(payload: {
  locationCode: string;
  severity: string;
  latitude: number;
  longitude: number;
  reporter: string;
  description: string;
}): Promise<string> {
  const incidentId = `INC-${Date.now()}`;
  const { data } = await api.post(`/projects/${INCIDENTS_PID}/nodes`, {
    '/text': payload.description,
    '/attributes/@incID': incidentId,
    '/attributes/@incLC': payload.locationCode,
    '/attributes/@incSV': payload.severity,
    '/attributes/@incST': 'pending',
    '/attributes/@incLT': payload.latitude,
    '/attributes/@incLN': payload.longitude,
    '/attributes/@incRP': payload.reporter,
  });
  return incidentId;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────────

export async function deleteIncident(nodeId: string): Promise<void> {
  await api.delete(`/projects/${INCIDENTS_PID}/nodes/${nodeId}`);
}

// Delay utility
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Single request with retry on 429/5xx — exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status ?? 0;
      const isRetryable = status === 429 || (status >= 500 && status < 600);
      if (!isRetryable || attempt === maxRetries) throw err;
      // Exponential backoff: 2s, 4s, 8s
      const waitMs = Math.pow(2, attempt + 1) * 1000;
      await delay(waitMs);
    }
  }
  throw new Error('withRetry exhausted');
}

// Throttle between requests to avoid 429
const THROTTLE_MS = 800;

export type BulkProgressCallback = (progress: {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
}) => void;

export async function bulkUpdateIncidentStatus(
  nodeIds: string[],
  status: 'pending' | 'reviewing' | 'resolved',
  onProgress?: BulkProgressCallback
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  const total = nodeIds.length;

  for (let i = 0; i < total; i++) {
    try {
      await withRetry(() => updateIncidentStatus(nodeIds[i], status));
      succeeded++;
    } catch {
      failed++;
    }
    onProgress?.({ completed: i + 1, total, succeeded, failed });
    // Throttle — don't fire the next request immediately
    if (i < total - 1) await delay(THROTTLE_MS);
  }

  return { succeeded, failed };
}

export async function bulkDeleteIncidents(
  nodeIds: string[],
  onProgress?: BulkProgressCallback
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  const total = nodeIds.length;

  for (let i = 0; i < total; i++) {
    try {
      await withRetry(() => deleteIncident(nodeIds[i]));
      succeeded++;
    } catch {
      failed++;
    }
    onProgress?.({ completed: i + 1, total, succeeded, failed });
    if (i < total - 1) await delay(THROTTLE_MS);
  }

  return { succeeded, failed };
}

// ─── Risk Zones ───────────────────────────────────────────────────────────────

export async function getRiskZones(): Promise<RiskZone[]> {
  try {
    const { data } = await api.get(`/projects/${RISK_ZONES_PID}/nodes`);
    return (data.payload?.nodes ?? [])
      .filter((n: any) => n.fieldValues?.[ '/attributes/@rzLT'])
      .map((n: any) => ({
        id: n.id,
        lat: Number(n.fieldValues['/attributes/@rzLT'] ?? 0),
        lng: Number(n.fieldValues['/attributes/@rzLN'] ?? 0),
        radius: Number(n.fieldValues['/attributes/@rzRD'] ?? 50),
        incidentCount: Number(n.fieldValues['/attributes/@rzIC'] ?? 0),
        severity: n.fieldValues['/attributes/@rzSV'] ?? 'medium',
        locationName: n.fieldValues['/text'],
      }));
  } catch (err) {
    console.error('getRiskZones failed', err);
    return [];
  }
}

export async function createRiskZone(payload: {
  lat: number;
  lng: number;
  radius: number;
  incidentCount: number;
  severity: string;
  label: string;
}): Promise<void> {
  await api.post(`/projects/${RISK_ZONES_PID}/nodes`, {
    '/text': payload.label,
    '/attributes/@rzLT': payload.lat,
    '/attributes/@rzLN': payload.lng,
    '/attributes/@rzRD': payload.radius,
    '/attributes/@rzIC': payload.incidentCount,
    '/attributes/@rzSV': payload.severity,
  });
}

// ─── Voice Journals ───────────────────────────────────────────────────────────

export type VoiceJournalMood = 'great' | 'okay' | 'meh' | 'sad' | 'scared';
export type VoiceJournalFlag = 'none' | 'monitor' | 'concern' | 'urgent';

export interface VoiceJournal {
  id: string;
  journalId: string;
  mood: VoiceJournalMood;
  transcription: string;
  locationCode: string;
  flag: VoiceJournalFlag;
  aiSummary: string;
  lat: number;
  lng: number;
  audioUrl: string;
  createdAt?: string;
}

// Helper: parse the AI JSON blob stored in @vjAI field.
// The flow stores the raw AI result as a JSON string like {"flag":"monitor","summary":"..."}
function parseVjAi(raw: string): { flag: VoiceJournalFlag; summary: string } {
  try {
    // Strip markdown code fences if the AI wrapped the JSON
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const flag = (['none', 'monitor', 'concern', 'urgent'].includes(parsed.flag)
      ? parsed.flag
      : 'none') as VoiceJournalFlag;
    return { flag, summary: parsed.summary ?? '' };
  } catch {
    return { flag: 'none', summary: raw };
  }
}

// Helper: resolve a select field value — Taskade may return { optionId: "..." } or a plain string
function resolveSelectId(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.optionId) return val.optionId;
  return String(val);
}

export async function getVoiceJournals(): Promise<VoiceJournal[]> {
  try {
    const { data } = await api.get(`/projects/${VOICE_JOURNALS_PID}/nodes`);
    const nodes: any[] = data.payload?.nodes ?? [];

    // Accept any node that has at least one vj-specific attribute.
    // Exclude root node (which has /text but no vj attributes).
    const voiceNodes = nodes.filter((n: any) => {
      const fv = n.fieldValues ?? {};
      return (
        fv['/attributes/@vjMD'] ||
        fv['/attributes/@vjTR'] ||
        fv['/attributes/@vjID'] ||
        fv['/attributes/@vjLC'] ||
        fv['/attributes/@vjAU']
      );
    });

    return voiceNodes.map((n: any) => {
      const fv = n.fieldValues ?? {};

      // Parse AI result — the flow stores a JSON string in @vjAI
      const rawAi = fv['/attributes/@vjAI'] ?? '';
      const { flag: aiFlag, summary: aiSummary } = rawAi ? parseVjAi(rawAi) : { flag: 'none' as VoiceJournalFlag, summary: '' };

      // @vjFL may be written explicitly, otherwise fall back to AI-derived flag
      const storedFlag = resolveSelectId(fv['/attributes/@vjFL']);
      const flag: VoiceJournalFlag = (['none', 'monitor', 'concern', 'urgent'].includes(storedFlag)
        ? storedFlag as VoiceJournalFlag
        : aiFlag);

      // @vjMD is a select field — resolve optionId or plain string
      const moodRaw = resolveSelectId(fv['/attributes/@vjMD']);
      const mood: VoiceJournalMood = (['great', 'okay', 'meh', 'sad', 'scared'].includes(moodRaw)
        ? moodRaw as VoiceJournalMood
        : 'okay');

      return {
        id: n.id,
        journalId: fv['/attributes/@vjID'] ?? n.id,
        mood,
        transcription: fv['/attributes/@vjTR'] ?? fv['/text'] ?? '',
        locationCode: fv['/attributes/@vjLC'] ?? '',
        flag,
        aiSummary,
        lat: Number(fv['/attributes/@vjLT'] ?? 0),
        lng: Number(fv['/attributes/@vjLN'] ?? 0),
        audioUrl: fv['/attributes/@vjAU'] ?? '',
        createdAt: n.createdAt,
      };
    });
  } catch (err) {
    console.error('getVoiceJournals failed', err);
    return [];
  }
}

export async function submitVoiceJournal(payload: {
  transcription: string;
  mood: string;
  locationCode: string;
  latitude: number;
  longitude: number;
  audioUrl?: string;
}): Promise<void> {
  const res = await fetch(`/api/taskade/webhooks/${VJ_WEBHOOK_ID}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voice journal webhook failed ${res.status}: ${text}`);
  }
}

export async function updateVoiceJournalFlag(
  nodeId: string,
  flag: VoiceJournalFlag
): Promise<void> {
  await api.patch(`/projects/${VOICE_JOURNALS_PID}/nodes/${nodeId}`, {
    '/attributes/@vjFL': flag,
  });
}

// ─── Pinboard ─────────────────────────────────────────────────────────────────

export const PINBOARD_PID = 'ycBaiSmGysYSQfbz';

export type PinboardUrgency = 'info' | 'guidance' | 'urgent';
export type PinboardCategory = 'safety' | 'facilities' | 'security' | 'event' | 'weather' | 'general';
export type PinboardStatus = 'active' | 'resolved' | 'scheduled';

export interface PinboardNotice {
  id: string;
  text: string;
  zoneCode: string;
  zoneLabel: string;
  urgency: PinboardUrgency;
  category: PinboardCategory;
  status: PinboardStatus;
  publishedBy: string;
  publishedAt: string;
}

function resolveOptionId(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.optionId) return val.optionId;
  return String(val);
}

export async function getPinboardNotices(zoneCode?: string): Promise<PinboardNotice[]> {
  try {
    const { data } = await api.get(`/projects/${PINBOARD_PID}/nodes`);
    const nodes: any[] = data.payload?.nodes ?? [];
    const notices: PinboardNotice[] = nodes
      .filter((n: any) => n.fieldValues?.['/attributes/@pbZN'])
      .map((n: any) => {
        const fv = n.fieldValues ?? {};
        return {
          id: n.id,
          text: fv['/text'] ?? '',
          zoneCode: fv['/attributes/@pbZN'] ?? '',
          zoneLabel: fv['/attributes/@pbZL'] ?? fv['/attributes/@pbZN'] ?? '',
          urgency: (resolveOptionId(fv['/attributes/@pbUR']) as PinboardUrgency) || 'info',
          category: (resolveOptionId(fv['/attributes/@pbCT']) as PinboardCategory) || 'general',
          status: (resolveOptionId(fv['/attributes/@pbST']) as PinboardStatus) || 'active',
          publishedBy: fv['/attributes/@pbPB'] ?? 'Security',
          publishedAt: n.createdAt ?? new Date().toISOString(),
        };
      })
      .filter(n => n.status !== 'resolved');

    if (zoneCode) {
      // Return notices for this specific zone OR site-wide notices (empty zoneCode)
      return notices.filter(n => !n.zoneCode || n.zoneCode === zoneCode);
    }
    return notices;
  } catch (err) {
    console.error('getPinboardNotices failed', err);
    return [];
  }
}

export async function publishPinboardNotice(payload: {
  text: string;
  zoneCode: string;
  zoneLabel: string;
  urgency: PinboardUrgency;
  category: PinboardCategory;
  publishedBy: string;
}): Promise<PinboardNotice> {
  const { data } = await api.post(`/projects/${PINBOARD_PID}/nodes`, {
    '/text': payload.text,
    '/attributes/@pbZN': payload.zoneCode,
    '/attributes/@pbZL': payload.zoneLabel,
    '/attributes/@pbUR': payload.urgency,
    '/attributes/@pbCT': payload.category,
    '/attributes/@pbST': 'active',
    '/attributes/@pbPB': payload.publishedBy,
  });
  return {
    id: data.payload?.node?.id ?? Math.random().toString(),
    text: payload.text,
    zoneCode: payload.zoneCode,
    zoneLabel: payload.zoneLabel,
    urgency: payload.urgency,
    category: payload.category,
    status: 'active',
    publishedBy: payload.publishedBy,
    publishedAt: new Date().toISOString(),
  };
}

export async function resolvePinboardNotice(nodeId: string): Promise<void> {
  await api.patch(`/projects/${PINBOARD_PID}/nodes/${nodeId}`, {
    '/attributes/@pbST': 'resolved',
  });
}

export async function publishResolutionNotice(payload: {
  text: string;
  zoneCode: string;
  zoneLabel: string;
  publishedBy: string;
}): Promise<void> {
  await publishPinboardNotice({
    text: `✓ Resolved: ${payload.text}`,
    zoneCode: payload.zoneCode,
    zoneLabel: payload.zoneLabel,
    urgency: 'info',
    category: 'general',
    publishedBy: payload.publishedBy,
  });
}

// ─── Cases — SLA Tracker ──────────────────────────────────────────────────────

export const CASES_PID = 'MNXitRw4WKLaDdGC';

export interface SlaCase {
  /** Taskade node ID */
  id: string;
  /** @csOI — observation ID reference (matches Incident @incID when set) */
  obsId: string;
  /** @csRC — 4-char reference code shown to submitter */
  refCode: string;
  /** @csZN — zone / location code */
  zoneId: string;
  /** @csST — open | acknowledged | escalated | breach | resolved */
  status: string;
  /** @csAU — AI-assigned urgency */
  aiUrgency: string;
  /** @csHU — human override (unset | low | medium | high | critical) */
  humanUrgency: string;
  /** @csEU — effective urgency (human if set, else AI) */
  effectiveUrgency: string;
  /** @csSA — explicitly stored submission datetime */
  submittedAt: string | null;
  /** @csT1 — server-written T1 deadline (ISO) */
  t1Deadline: string | null;
  /** @csT2 — server-written T2 deadline (ISO) */
  t2Deadline: string | null;
  /** @csBR — server-written breach deadline (ISO) */
  breachDeadline: string | null;
  /** @csAA — when acknowledged */
  acknowledgedAt: string | null;
  /** @csAB — who acknowledged */
  acknowledgedBy: string;
  /**
   * Taskade node creation timestamp — set by the server at the exact moment
   * the case node was written. This is the authoritative SLA clock start.
   * Cannot be spoofed by client. Used when @csSA is not explicitly set.
   */
  createdAt: string | null;
}

export async function getCases(): Promise<SlaCase[]> {
  try {
    const { data } = await api.get(`/projects/${CASES_PID}/nodes`);
    return (data.payload?.nodes ?? [])
      .filter((n: any) => n.fieldValues?.['/attributes/@csZN'])
      .map((n: any) => ({
        id: n.id,
        obsId: n.fieldValues?.['/attributes/@csOI'] ?? '',
        refCode: n.fieldValues?.['/attributes/@csRC'] ?? '',
        zoneId: n.fieldValues?.['/attributes/@csZN'] ?? '',
        status:           resolveOptionId(n.fieldValues?.['/attributes/@csST']) || 'open',
        aiUrgency:        resolveOptionId(n.fieldValues?.['/attributes/@csAU']) || 'medium',
        humanUrgency:     resolveOptionId(n.fieldValues?.['/attributes/@csHU']) || 'unset',
        effectiveUrgency: resolveOptionId(n.fieldValues?.['/attributes/@csEU']) || 'medium',
        submittedAt:   n.fieldValues?.['/attributes/@csSA']  ?? null,
        t1Deadline:    n.fieldValues?.['/attributes/@csT1']  ?? null,
        t2Deadline:    n.fieldValues?.['/attributes/@csT2']  ?? null,
        breachDeadline:n.fieldValues?.['/attributes/@csBR']  ?? null,
        acknowledgedAt:n.fieldValues?.['/attributes/@csAA']  ?? null,
        acknowledgedBy:n.fieldValues?.['/attributes/@csAB']  ?? '',
        createdAt: n.createdAt ?? null,
      }));
  } catch (err) {
    console.error('getCases failed', err);
    return [];
  }
}

/** Mark a case as acknowledged in the Cases project (fire-and-forget safe). */
export async function acknowledgeCase(caseNodeId: string): Promise<void> {
  await api.patch(`/projects/${CASES_PID}/nodes/${caseNodeId}`, {
    '/attributes/@csST': 'acknowledged',
    '/attributes/@csAA': new Date().toISOString(),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive risk level string from incident count */
export function riskFromCount(count: number): string {
  if (count >= 4) return 'critical';
  if (count >= 3) return 'high';
  if (count >= 2) return 'medium';
  if (count >= 1) return 'low';
  return 'low';
}

/** Generate QR code URL for a given location code.
 *  Uses ?view=report&loc=CODE on the space root — NOT a /report sub-path,
 *  because the Genesis platform only serves the React app at the space root URL.
 *  qrserver.com colour params: plain 6-char hex, no # no dashes.
 */
// ─── Site Content ─────────────────────────────────────────────────────────────

export interface SiteContentItem {
  id: string;
  name: string;
  type: 'cafeteria-item' | 'parking-level' | 'service' | 'quick-tile' | string;
  detail: string;
  tag: string;
  status: string;
  hours: string;
  availability: number;
  total: number;
  zoneCode: string;
}

export async function getSiteContent(): Promise<SiteContentItem[]> {
  try {
    const { data } = await api.get(`/projects/${SITE_CONTENT_PID}/nodes`);
    return (data.payload?.nodes ?? [])
      .filter((n: any) => n.fieldValues?.['/attributes/@type_1'])
      .map((n: any) => ({
        id: n.id,
        name: n.fieldValues['/text'] ?? '',
        type: resolveSelectId(n.fieldValues['/attributes/@type_1']) ?? '',
        detail: n.fieldValues['/attributes/@detail_1'] ?? '',
        tag: n.fieldValues['/attributes/@tag_1'] ?? '',
        status: n.fieldValues['/attributes/@status_1'] ?? '',
        hours: n.fieldValues['/attributes/@hours_1'] ?? '',
        availability: Number(n.fieldValues['/attributes/@avail_1'] ?? 0),
        total: Number(n.fieldValues['/attributes/@total_1'] ?? 0),
        zoneCode: n.fieldValues['/attributes/@zone_1'] ?? '',
      }));
  } catch (err) {
    console.error('getSiteContent failed', err);
    return [];
  }
}

// ─── QR Code URL generators ───────────────────────────────────────────────────
// All QR codes route to ?view=guide — the unified entry point where users
// choose their situation and optionally submit an incident or voice report.

const SPACE_ROOT = 'https://raynham-os.taskade.site';

function buildQrUrl(
  locationCode: string,
  color: string,
  bgcolor: string = '000000',
): string {
  const dest = locationCode
    ? `${SPACE_ROOT}?view=guide&loc=${encodeURIComponent(locationCode)}`
    : `${SPACE_ROOT}?view=guide`;
  const params = new URLSearchParams({
    size: '400x400',
    data: dest,
    color,
    bgcolor,
    format: 'png',
    margin: '12',
    ecc: 'M',
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/** Cyan QR — anonymous witness/bystander poster (legacy) */
export function getQrUrl(locationCode: string = '', color = '00ffff'): string {
  return buildQrUrl(locationCode, color);
}

/** Amber QR — staff response guide poster (legacy) */
export function getGuideQrUrl(locationCode: string = '', color = 'f59e0b'): string {
  return buildQrUrl(locationCode, color);
}

/** Violet QR — voice journal / wellbeing poster (legacy) */
export function getJournalQrUrl(locationCode: string = '', color = 'a855f7'): string {
  return buildQrUrl(locationCode, color);
}

// ─── Anchor-type QR URL generators (Spatial OS) ───────────────────────────────
// These use the new ?anchor=&zone= routing scheme.
// color values are plain 6-char hex, no # (qrserver.com requirement)

function buildAnchorQrUrl(
  anchorType: AnchorType,
  zoneId: string,
  color: string,
  bgcolor: string = '000000',
): string {
  const dest = zoneId
    ? `${SPACE_ROOT}?anchor=${anchorType}&zone=${encodeURIComponent(zoneId)}`
    : `${SPACE_ROOT}?anchor=${anchorType}`;
  const p = new URLSearchParams({ size: '400x400', data: dest, color, bgcolor, format: 'png', margin: '12', ecc: 'M' });
  return `https://api.qrserver.com/v1/create-qr-code/?${p.toString()}`;
}

/** Strategic Red QR — ACT anchor (Emergency / Safety) */
export function getRedAnchorQrUrl(zoneId: string = ''): string {
  return buildAnchorQrUrl('red', zoneId, 'C0392B');
}

/** Warning Gold QR — KNOW anchor (Information / Pinboard) */
export function getAmberAnchorQrUrl(zoneId: string = ''): string {
  return buildAnchorQrUrl('amber', zoneId, 'FFB800');
}

/** Signal Green QR — GO anchor (Utility / Wayfinding) */
export function getGreenAnchorQrUrl(zoneId: string = ''): string {
  return buildAnchorQrUrl('green', zoneId, '00C853');
}

// ─── Unified Anchor QR URL generator (v3 — one QR, all actions) ───────────────

export function getUnifiedAnchorQrUrl(zoneId: string = ''): string {
  const dest = zoneId
    ? `${SPACE_ROOT}?a=${encodeURIComponent(zoneId)}`
    : `${SPACE_ROOT}?a=DEMO`;
  const p = new URLSearchParams({
    size: '400x400',
    data: dest,
    color: '00E5FF',
    bgcolor: '000000',
    format: 'png',
    margin: '12',
    ecc: 'M',
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${p.toString()}`;
}
