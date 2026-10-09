/**
 * AppContext — Global state for Absolute Defence OS operator dashboard.
 *
 * Lifts all shared state out of Layout.tsx so components further down
 * the tree can consume it without prop-drilling, and so Layout.tsx can
 * be slimmed from a 645-line god component to a lean shell.
 *
 * Data polling: fetches locations, incidents, risk zones, and voice
 * journals every 30 seconds. Surfaces loading / refreshing flags.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { toast } from 'sonner';

import {
  Location,
  Incident,
  RiskZone,
  VoiceJournal,
  SlaCase,
  getLocations,
  getIncidents,
  getRiskZones,
  getVoiceJournals,
  getCases,
  bulkDeleteIncidents,
} from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Operator console modes — intent-based, not feature-based.
 * One mode. One intent. One clear next action.
 */
export type View = 'monitor' | 'respond' | 'publish' | 'configure' | 'site-structure' | 'demo';

export interface MapFocus {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface AppState {
  // ── Data ──────────────────────────────────────────────────────────────
  locations: Location[];
  incidents: Incident[];
  cases: SlaCase[];
  riskZones: RiskZone[];
  voiceJournals: VoiceJournal[];
  loading: boolean;
  refreshing: boolean;
  fetchData: (silent?: boolean) => Promise<void>;

  // ── Navigation ────────────────────────────────────────────────────────
  activeView: View;
  setActiveView: (v: View) => void;

  // ── Map ───────────────────────────────────────────────────────────────
  mapFocus: MapFocus | null;
  setMapFocus: (f: MapFocus | null) => void;
  /** Location code of the currently selected map pin. Drives ContextPanel. */
  selectedLocationCode: string | null;
  setSelectedLocationCode: (code: string | null) => void;

  // ── Search ────────────────────────────────────────────────────────────
  globalSearch: string;
  setGlobalSearch: (s: string) => void;

  // ── ARIA overlay ──────────────────────────────────────────────────────
  ariaOpen: boolean;
  ariaContext: string | undefined;
  openAria: (context?: string) => void;
  closeAria: () => void;

  // ── Context Panel ─────────────────────────────────────────────────────
  /** When true, the ContextPanel renders its ARIA chat mode instead of location detail. */
  contextPanelAriaMode: boolean;
  setContextPanelAriaMode: (b: boolean) => void;

  // ── Demo Mode ─────────────────────────────────────────────────────────
  /** When true, the console is in Demo Mode — banner shows, data isolated with DEMO- prefix. */
  demoMode: boolean;
  setDemoMode: (b: boolean) => void;
  /** Clear all DEMO-prefixed incidents from the backend. */
  resetDemoData: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState | null>(null);

const POLL_INTERVAL_MS = 30_000;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Data state ──────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cases, setCases] = useState<SlaCase[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [voiceJournals, setVoiceJournals] = useState<VoiceJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Navigation state ────────────────────────────────────────────────
  const [activeView, setActiveViewRaw] = useState<View>('monitor');

  // ── Map state ───────────────────────────────────────────────────────
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);

  // ── Search state ────────────────────────────────────────────────────
  const [globalSearch, setGlobalSearch] = useState('');

  // ── ARIA overlay state ──────────────────────────────────────────────
  const [ariaOpen, setAriaOpen] = useState(false);
  const [ariaContext, setAriaContext] = useState<string | undefined>(undefined);

  // ── Context panel state ─────────────────────────────────────────────
  const [contextPanelAriaMode, setContextPanelAriaMode] = useState(false);

  // ── Demo Mode ───────────────────────────────────────────────────────
  const [demoMode, setDemoModeRaw] = useState(() => {
    try { return localStorage.getItem('ados_demo_mode') === 'true'; }
    catch { return false; }
  });
  const setDemoMode = useCallback((b: boolean) => {
    setDemoModeRaw(b);
    try { localStorage.setItem('ados_demo_mode', String(b)); } catch {}
  }, []);

  // ── Demo seed data (local dev — shown when API returns empty) ────────
  const DEMO_LOCATIONS: Location[] = [
    { id: 'd1', code: 'ZONE-A1', name: 'Main Entrance', type: 'entry', risk: 'critical', lat: 51.5081, lng: -0.1285, incidentCount: 3, anchorTypes: ['red'],   zoneId: 'z1' },
    { id: 'd2', code: 'ZONE-B2', name: 'East Corridor',  type: 'corridor', risk: 'high',     lat: 51.5074, lng: -0.1270, incidentCount: 2, anchorTypes: ['red'],   zoneId: 'z2' },
    { id: 'd3', code: 'ZONE-C3', name: 'West Stairwell', type: 'stairwell', risk: 'medium',   lat: 51.5068, lng: -0.1295, incidentCount: 1, anchorTypes: ['amber'], zoneId: 'z3' },
    { id: 'd4', code: 'ZONE-D4', name: 'Cafeteria',      type: 'common',   risk: 'medium',   lat: 51.5060, lng: -0.1278, incidentCount: 1, anchorTypes: ['amber'], zoneId: 'z4' },
    { id: 'd5', code: 'ZONE-E5', name: 'Staff Office',   type: 'office',   risk: 'low',      lat: 51.5055, lng: -0.1260, incidentCount: 0, anchorTypes: ['green'], zoneId: 'z5' },
    { id: 'd6', code: 'ZONE-F6', name: 'Car Park Level 1', type: 'parking', risk: 'low',     lat: 51.5090, lng: -0.1300, incidentCount: 0, anchorTypes: ['green'], zoneId: 'z6' },
  ];

  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  // Exactly 3 demo incidents — fresh timestamps so they don't immediately trigger SLA breaches
  const DEMO_INCIDENTS: Incident[] = [
    { id: 'ef1e503e-3bcf-48df-b463-dccb9739f61b', incidentId: 'INC-DEMO-001', locationCode: 'DEMO-Z1-ENTRANCE', severity: 'medium', status: 'pending', description: '[BULLYING] Hi, sunny today!', reporter: 'Anonymous Student Report', createdAt: minsAgo(2), lat: 52.6560, lng: 1.3041 },
    { id: 'f24f9661-c2a3-430b-a26a-3c86970b9802', incidentId: 'INC-DEMO-002', locationCode: 'DEMO-Z1-ENTRANCE', severity: 'high',   status: 'pending', description: '[BULLYING] Green', reporter: 'Anonymous Student Report', createdAt: minsAgo(4), lat: 51.8422, lng: -2.1803 },
    { id: '7410387b-cb75-4b84-b018-0adaef6d719a', incidentId: 'INC-DEMO-003', locationCode: 'DEMO-Z1-ENTRANCE', severity: 'high',   status: 'pending', description: '[PHYSICAL_THREAT] Geoff', reporter: 'Anonymous Student Report', createdAt: minsAgo(6), lat: 51.8421, lng: -2.1805 },
  ];

  // ── Data fetching ────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [locs, incs, zones, journals, slaCases] = await Promise.all([
        getLocations(),
        getIncidents(),
        getRiskZones(),
        getVoiceJournals(),
        getCases(),
      ]);
      // Fall back to demo data if API returns empty (local dev without Taskade credentials)
      setLocations(locs.length > 0 ? locs : DEMO_LOCATIONS);
      setIncidents(incs.length > 0 ? incs : DEMO_INCIDENTS);
      setCases(slaCases);
      setRiskZones(zones);
      setVoiceJournals(journals);
    } catch {
      // On hard API failure, show demo data so the UI is always testable
      setLocations(DEMO_LOCATIONS);
      setIncidents(DEMO_INCIDENTS);
      setCases([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset Demo Data ─────────────────────────────────────────────────
  const resetDemoData = useCallback(async () => {
    const demoIncidents = incidents.filter(i => i.locationCode?.startsWith('DEMO-'));
    if (demoIncidents.length === 0) {
      toast.info('No demo data to clear');
      return;
    }
    const nodeIds = demoIncidents.map(i => i.id);
    const result = await bulkDeleteIncidents(nodeIds, ({ completed, total }) => {
      if (completed % 5 === 0 || completed === total) {
        toast.loading(`Clearing demo data… ${completed}/${total}`, { id: 'reset-demo' });
      }
    });
    toast.dismiss('reset-demo');
    if (result.failed > 0) {
      toast.warning(`Cleared ${result.succeeded} demo items. ${result.failed} failed.`);
    } else {
      toast.success(`Cleared ${result.succeeded} demo items`);
    }
    // Refresh data
    await fetchData(true);
  }, [incidents, fetchData]);

  // Clear stale frontend-side ack chain state on boot — prevents old entries
  // from referencing deleted incidents and triggering phantom SLA timers.
  useEffect(() => {
    try {
      localStorage.removeItem('ados_ack_chain_v2');
      localStorage.removeItem('ados_ack_logged_events_v1');
    } catch {}
  }, []);

  // Initial fetch
  useEffect(() => { fetchData(false); }, [fetchData]);

  // 30-second polling
  useEffect(() => {
    const id = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Refresh immediately when switching to journals tab
  const prevView = useRef<View>(activeView);
  const setActiveView = useCallback((v: View) => {
    setActiveViewRaw(v);
    setGlobalSearch(''); // clear search on view change
    if (v === 'respond' && prevView.current !== 'respond') {
      fetchData(true); // refresh cases when entering Respond mode
    }
    prevView.current = v;
  }, [fetchData]);

  // ── ARIA helpers ─────────────────────────────────────────────────────
  const openAria = useCallback((context?: string) => {
    setAriaContext(context);
    setAriaOpen(true);
  }, []);

  const closeAria = useCallback(() => {
    setAriaOpen(false);
    setAriaContext(undefined);
  }, []);

  // ── Context value ────────────────────────────────────────────────────
  const value: AppState = {
    locations, incidents, cases, riskZones, voiceJournals,
    loading, refreshing, fetchData,
    activeView, setActiveView,
    mapFocus, setMapFocus,
    selectedLocationCode, setSelectedLocationCode,
    globalSearch, setGlobalSearch,
    ariaOpen, ariaContext, openAria, closeAria,
    contextPanelAriaMode, setContextPanelAriaMode,
    demoMode, setDemoMode,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

// ─── Derived selectors (memoisation-friendly) ─────────────────────────────────

/** Incidents that are critical + pending. */
export function selectCriticalPending(incidents: Incident[]): Incident[] {
  return incidents.filter(i => i.severity === 'critical' && i.status === 'pending');
}

/** Incidents that are high + pending. */
export function selectHighPending(incidents: Incident[]): Incident[] {
  return incidents.filter(i => i.severity === 'high' && i.status === 'pending');
}

/** SOS incidents (reporter === 'SOS-AUTO') that are pending. */
export function selectSosPending(incidents: Incident[]): Incident[] {
  return incidents.filter(i => i.reporter === 'SOS-AUTO' && i.status === 'pending');
}

/** Voice journals that are flagged concern or urgent. */
export function selectFlaggedJournals(journals: VoiceJournal[]): VoiceJournal[] {
  return journals.filter(j => j.flag === 'concern' || j.flag === 'urgent');
}
