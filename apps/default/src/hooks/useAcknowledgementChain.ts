import { useState, useEffect, useCallback, useRef } from 'react';
import { createIncidentDirect, getCases, acknowledgeCase, SlaCase } from '@/lib/api';

// ─── SLA Windows ──────────────────────────────────────────────────────────────
//
// Each urgency tier defines two deadlines measured from the observation's
// server-authoritative start time (case.createdAt):
//   t1     — operator must acknowledge by this point
//   breach — compliance failure threshold
//
// These match the Cases project field definitions and Martyn's Law thresholds.

export const SLA_WINDOWS: Record<string, { t1: number; breach: number; label: string }> = {
  critical: { t1: 15 * 60_000,    breach: 60 * 60_000,    label: '15 min ack window' },
  high:     { t1: 30 * 60_000,    breach: 120 * 60_000,   label: '30 min ack window' },
  medium:   { t1: 4 * 3_600_000,  breach: 24 * 3_600_000, label: '4 hr ack window'   },
  low:      { t1: 24 * 3_600_000, breach: 72 * 3_600_000, label: '24 hr ack window'  },
};

// Legacy compat exports — kept so existing imports don't break
export const TIER1_WINDOW_MS = 15 * 60 * 1000;
export const TIER2_WINDOW_MS = 10 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AckTier = 1 | 2 | 3;

export interface AckState {
  incidentId:   string;
  nodeId:       string;
  locationCode: string;
  severity:     string;
  description:  string;
  /** Client-observed start — fallback only when no server time is available. */
  startedAt: number;
  /**
   * Server-authoritative epoch ms from Cases project node.createdAt.
   * Set by Taskade server at the moment the case node is written — not
   * writable by clients. When set, ALL SLA calculations use this.
   * null = no matching case found yet; re-evaluated on each cases refresh.
   */
  serverStartedAt: number | null;
  /** Effective urgency from Cases project (respects operator overrides). */
  effectiveUrgency: string;
  /** Cases project nodeId — used to write acknowledgement back to server. */
  caseNodeId: string | null;
  tier:         AckTier;
  acknowledged: boolean;
  breached:     boolean;
  escalatedAt?: number;
  breachedAt?:  number;
}

export interface CountdownResult {
  remainingMs:      number;
  totalMs:          number;
  tier:             AckTier;
  phase:            'tier1' | 'tier2' | 'breached';
  percentLeft:      number;
  /** true = timer is anchored to the server-written case.createdAt */
  isServerAnchored: boolean;
  /** Human-readable window label for this urgency tier */
  windowLabel:      string;
}

type AckMap = Record<string, AckState>;

// v2 storage key — new schema includes serverStartedAt; v1 entries discarded
const STORAGE_KEY       = 'ados_ack_chain_v2';
const LOGGED_EVENTS_KEY = 'ados_ack_logged_events_v1';

// Auto-generated reporters that must never be tracked (infinite-loop guard)
const AUTO_REPORTERS = new Set(['BREACH-AUTO', 'ESCALATION-AUTO', 'SOS-AUTO']);

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadAckMap(): AckMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}
function saveAckMap(m: AckMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch {}
}
function loadLoggedEvents(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LOGGED_EVENTS_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveLoggedEvents(s: Set<string>) {
  try {
    const arr = [...s];
    localStorage.setItem(LOGGED_EVENTS_KEY, JSON.stringify(arr.slice(-500)));
  } catch {}
}

// ─── Case-to-incident matching ────────────────────────────────────────────────

function findCaseForIncident(
  incidentId:   string,
  locationCode: string,
  cases:        SlaCase[],
): SlaCase | null {
  // Primary: exact observation ID match
  if (incidentId) {
    const exact = cases.find(c => c.obsId && c.obsId === incidentId && c.status !== 'resolved');
    if (exact) return exact;
  }
  // Secondary: newest open/acknowledged case in the same zone
  const byZone = cases
    .filter(c => c.zoneId === locationCode && c.status !== 'resolved')
    .sort((a, b) => {
      const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bMs - aMs;
    });
  return byZone[0] ?? null;
}

/** Best available server-authoritative epoch ms from a case. */
function serverStartMs(c: SlaCase): number | null {
  const raw = c.submittedAt ?? c.createdAt;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? null : ms;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAcknowledgementChain(
  incidents: Array<{
    id:           string;
    incidentId:   string;
    locationCode: string;
    severity:     string;
    status:       string;
    description:  string;
    reporter?:    string;
    createdAt?:   string;
  }>,
) {
  const [ackMap, setAckMap] = useState<AckMap>(loadAckMap);
  const [cases,  setCases]  = useState<SlaCase[]>([]);

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const casesRef        = useRef<SlaCase[]>([]);
  const loggedEventsRef = useRef<Set<string>>(loadLoggedEvents());

  // Keep casesRef current so the 1s tick can read the latest cases without
  // re-registering the interval on every fetch.
  useEffect(() => { casesRef.current = cases; }, [cases]);

  // ── Fetch cases on mount + every 60 s ─────────────────────────────────────
  useEffect(() => {
    const fetch = async () => setCases(await getCases());
    fetch();
    const iv = setInterval(fetch, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Sync incidents → ack map ───────────────────────────────────────────────
  // Runs when incidents OR cases change.
  // Cases typically arrive after the first render, so the second run
  // back-fills serverStartedAt for already-registered AckState entries.
  useEffect(() => {
    const current = loadAckMap();
    let dirty = false;

    for (const inc of incidents) {
      if (inc.reporter && AUTO_REPORTERS.has(inc.reporter)) continue;

      const isCriticalOrHigh = inc.severity === 'critical' || inc.severity === 'high';
      const isPending        = inc.status === 'pending';

      const matched          = findCaseForIncident(inc.incidentId, inc.locationCode, casesRef.current);
      const svrStart         = matched ? serverStartMs(matched) : null;
      const effectiveUrgency = matched?.effectiveUrgency ?? inc.severity ?? 'high';
      const caseNodeId       = matched?.id ?? null;

      if (isCriticalOrHigh && isPending && !current[inc.id]) {
        const startedAt = inc.createdAt
          ? new Date(inc.createdAt).getTime() || Date.now()
          : Date.now();
        current[inc.id] = {
          incidentId: inc.incidentId, nodeId: inc.id,
          locationCode: inc.locationCode, severity: inc.severity,
          description: inc.description,
          startedAt,
          serverStartedAt:  svrStart,
          effectiveUrgency,
          caseNodeId,
          tier: 1, acknowledged: false, breached: false,
        };
        dirty = true;
      } else if (current[inc.id]) {
        const ex = current[inc.id];
        // Back-fill server fields when cases arrive, or update if urgency changed
        if (!ex.acknowledged && !ex.breached) {
          const needsUpdate =
            (svrStart !== null && ex.serverStartedAt === null) ||
            (caseNodeId !== null && ex.caseNodeId === null) ||
            effectiveUrgency !== ex.effectiveUrgency;
          if (needsUpdate) {
            current[inc.id] = { ...ex, serverStartedAt: svrStart, effectiveUrgency, caseNodeId };
            dirty = true;
          }
        }
        // Mark acknowledged if resolved externally
        if (!ex.acknowledged && inc.status !== 'pending') {
          current[inc.id] = { ...ex, acknowledged: true };
          dirty = true;
        }
      }
    }

    if (dirty) { saveAckMap(current); setAckMap({ ...current }); }
  }, [incidents, cases]);

  // ── Tick — 1 s interval, drives countdown display and fires escalations ────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const current = loadAckMap();
      const now = Date.now();
      let dirty = false;

      for (const nodeId of Object.keys(current)) {
        const state = current[nodeId];
        if (state.acknowledged || state.breached) continue;

        const effectiveStart = state.serverStartedAt ?? state.startedAt;
        const windows        = SLA_WINDOWS[state.effectiveUrgency] ?? SLA_WINDOWS.high;
        const t1Deadline     = effectiveStart + windows.t1;
        const breachDeadline = effectiveStart + windows.breach;

        // T1 window expired — escalate to tier 2
        if (state.tier === 1 && now >= t1Deadline) {
          current[nodeId] = { ...state, tier: 2, escalatedAt: now };
          dirty = true;
          const key = `${nodeId}-t2`;
          if (!loggedEventsRef.current.has(key)) {
            loggedEventsRef.current.add(key);
            saveLoggedEvents(loggedEventsRef.current);
            logEscalationEvent(state, 'TIER2_ESCALATION', now, effectiveStart);
          }
        }

        // Breach deadline passed — compliance failure
        if (state.tier >= 2 && now >= breachDeadline) {
          current[nodeId] = { ...state, tier: 3, breached: true, breachedAt: now };
          dirty = true;
          const key = `${nodeId}-t3`;
          if (!loggedEventsRef.current.has(key)) {
            loggedEventsRef.current.add(key);
            saveLoggedEvents(loggedEventsRef.current);
            logEscalationEvent(state, 'COMPLIANCE_BREACH', now, effectiveStart);
          }
        }
      }

      if (dirty) { saveAckMap(current); setAckMap({ ...current }); }
      else        { setAckMap(m => ({ ...m })); }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Acknowledge ───────────────────────────────────────────────────────────
  const acknowledge = useCallback((nodeId: string) => {
    const current = loadAckMap();
    if (!current[nodeId]) return;
    current[nodeId] = { ...current[nodeId], acknowledged: true };
    saveAckMap(current);
    setAckMap({ ...current });
    const caseNodeId = current[nodeId].caseNodeId;
    if (caseNodeId) acknowledgeCase(caseNodeId).catch(() => {});
  }, []);

  // ── Clear resolved ────────────────────────────────────────────────────────
  const clearResolved = useCallback((nodeId: string) => {
    const current = loadAckMap();
    delete current[nodeId];
    saveAckMap(current);
    setAckMap({ ...current });
  }, []);

  // ── Countdown computation ─────────────────────────────────────────────────
  // Anchors to serverStartedAt when available, falls back to startedAt.
  const getCountdown = useCallback((nodeId: string): CountdownResult | null => {
    const state = ackMap[nodeId];
    if (!state || state.acknowledged) return null;

    const now            = Date.now();
    const effectiveStart = state.serverStartedAt ?? state.startedAt;
    const windows        = SLA_WINDOWS[state.effectiveUrgency] ?? SLA_WINDOWS.high;
    const t1Deadline     = effectiveStart + windows.t1;
    const breachDeadline = effectiveStart + windows.breach;
    const tier2Window    = breachDeadline - t1Deadline;
    const isServerAnchored = state.serverStartedAt !== null;
    const windowLabel    = windows.label;

    if (state.breached || now >= breachDeadline) {
      return { remainingMs: 0, totalMs: windows.breach, tier: 3, phase: 'breached', percentLeft: 0, isServerAnchored, windowLabel };
    }
    if (now < t1Deadline) {
      const remaining = t1Deadline - now;
      return { remainingMs: remaining, totalMs: windows.t1, tier: 1, phase: 'tier1', percentLeft: (remaining / windows.t1) * 100, isServerAnchored, windowLabel };
    }
    const remaining = breachDeadline - now;
    return { remainingMs: remaining, totalMs: tier2Window, tier: 2, phase: 'tier2', percentLeft: (remaining / tier2Window) * 100, isServerAnchored, windowLabel };
  }, [ackMap]);

  return { ackMap, acknowledge, clearResolved, getCountdown };
}

// ─── Escalation event logger ──────────────────────────────────────────────────
// DISABLED: Frontend no longer creates auto-generated incidents.
// The server-side workflows (Reflex C / Reflex C2) handle SLA escalation
// logging. Creating incidents from the frontend caused an exponential
// accumulation loop where each reload generated new BREACH-AUTO and
// ESCALATION-AUTO incidents for old unacknowledged cases.

async function logEscalationEvent(
  _state:         AckState,
  _eventType:     'TIER2_ESCALATION' | 'COMPLIANCE_BREACH',
  _now:           number,
  _effectiveStart:number,
): Promise<void> {
  // No-op — local timer state only. Server workflows handle compliance logging.
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
