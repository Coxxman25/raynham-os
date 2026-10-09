/**
 * Layout — The operator dashboard shell.
 *
 * Composes:
 *   NavRail (56px)  +  Map Canvas (full-bleed)
 *                       StatusStrip (28px, alert-only)
 *                       ContextPanel (380px overlay, right)
 *                       AriaDrawer  (460px overlay, right, standalone)
 *
 * All shared state lives in AppContext (lib/app-context.tsx).
 * This component is intentionally slim — it wires, not manages.
 */

import React, { useState, useCallback } from 'react';
import { toast, Toaster } from 'sonner';
import { cn } from '@/lib/utils';

import { useApp, selectCriticalPending, selectFlaggedJournals } from '@/lib/app-context';
import { useTheme } from '@/lib/use-theme';

import { motion, AnimatePresence } from 'framer-motion';
import { NavRail } from './NavRail';
import { StatusStrip } from './StatusStrip';
import { ContextPanel } from './ContextPanel';
import { RiskMap } from './RiskMap';
import { IncidentVault } from './IncidentVault';
import { RespondMode } from './respond/RespondMode';
import { AnchorControl } from './AnchorControl';
import { Intelligence } from './Intelligence';
import { AriaDrawer } from './AriaDrawer';
import { IncidentDialog } from './IncidentDialog';
import { IncidentNotification } from './IncidentNotification';
import { UpsellModal } from './UpsellModal';
import { UserSettingsModal } from './UserSettingsModal';
import { PublishMode } from './PublishMode';
import { ZoneCard } from './ZoneCard';
import { DemoModeBanner } from './DemoModeBanner';

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout() {
  const {
    locations, incidents, cases, riskZones, voiceJournals,
    loading, refreshing, fetchData,
    activeView, setActiveView,
    mapFocus, setMapFocus,
    selectedLocationCode, setSelectedLocationCode,
    globalSearch,
    ariaOpen, ariaContext, openAria, closeAria,
    demoMode, setDemoMode,
    resetDemoData,
  } = useApp();

  const { theme, setTheme, cycleTheme } = useTheme();

  // ── Local overlay state ────────────────────────────────────────────
  const [upsellModal, setUpsellModal] = useState<{ open: boolean; title: string; desc: string }>({
    open: false, title: '', desc: '',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertRingActive, setAlertRingActive] = useState(false);

  const openUpsell = (title: string, desc: string) => setUpsellModal({ open: true, title, desc });
  const closeUpsell = () => setUpsellModal(m => ({ ...m, open: false }));

  // ── Map interactions ───────────────────────────────────────────────
  const handleViewInMap = useCallback((lat: number, lng: number) => {
    const valid =
      typeof lat === 'number' && typeof lng === 'number' &&
      !isNaN(lat) && !isNaN(lng) &&
      !(lat === 0 && lng === 0) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

    if (valid) {
      setMapFocus({ lat, lng, zoom: 19 });
      setActiveView('monitor');
    } else {
      toast.error('No GPS data — the reporter may not have had location enabled.', { duration: 4000 });
    }
  }, [setMapFocus, setActiveView]);

  const handleLocationSelect = useCallback((locationCode: string) => {
    setSelectedLocationCode(locationCode);
    // Pan to location on map
    const loc = locations.find(l => l.code === locationCode);
    if (loc && loc.lat && loc.lng) {
      setMapFocus({ lat: loc.lat, lng: loc.lng, zoom: 17 });
    }
  }, [locations, setSelectedLocationCode, setMapFocus]);

  // ── Counts for NavRail badges ──────────────────────────────────────
  const criticalCount = selectCriticalPending(incidents).length;
  const flaggedCount  = selectFlaggedJournals(voiceJournals).length;

  // ── Panel is open when a location is selected ──────────────────────
  const contextPanelOpen = selectedLocationCode !== null;

  return (
    <div
      style={{ background: 'var(--canvas-bg)' }}
      className={cn(
        'h-screen w-full flex overflow-hidden font-sans',
        'text-slate-900 dark:text-slate-100',
        'transition-colors duration-500',
        alertRingActive && 'ring-1 ring-[var(--anchor-red)]/60 ring-inset',
      )}
    >
      <Toaster position="bottom-center" richColors />

      {/* ── 1. Navigation Rail ── */}
      <NavRail
        activeView={activeView}
        onViewChange={setActiveView}
        criticalCount={criticalCount}
        flaggedJournals={flaggedCount}
        onOpenAria={openAria}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onCycleTheme={cycleTheme}
        demoMode={demoMode}
        onToggleDemoMode={() => setDemoMode(!demoMode)}
      />

      {/* ── 2. Main Canvas ── */}
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        {/* ── Demo Mode banner ── */}
        <DemoModeBanner />

        {/* ── Status strip — ambient command header ── */}
        <StatusStrip
          incidents={incidents}
          onAlertChange={setAlertRingActive}
          refreshing={refreshing}
        />

        {/* ── Mode workspace ── */}
        {loading ? (
          // ── Boot screen ──────────────────────────────────────────────
          <div
            className="flex-1 flex items-center justify-center"
            style={{ background: 'var(--canvas-bg)' }}
          >
            <div className="flex flex-col items-center gap-8">
              {/* ADOS mark */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'var(--aria-cyan-glow)',
                    border: '1px solid var(--aria-cyan-dim)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--aria-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                {/* Spin ring */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-transparent animate-spin"
                  style={{ borderTopColor: 'var(--aria-cyan)', opacity: 0.5 }}
                />
              </div>
              <div className="text-center space-y-1">
                <p
                  className="text-[11px] font-black uppercase tracking-[0.22em]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Absolute Defence OS
                </p>
                <p
                  className="text-[9px] uppercase tracking-widest font-semibold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Initialising systems
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ── Active workspace ──────────────────────────────────────────
          <div
            className="flex-1 min-h-0 relative overflow-hidden"
            style={{ background: 'var(--canvas-bg)' }}
          >
            <AnimatePresence mode="wait">
              {activeView === 'monitor' && (
                <motion.div
                  key="monitor"
                  className="mode-workspace"
                  initial={{ opacity: 0, scale: 0.993 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.005 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RiskMap
                    locations={locations}
                    riskZones={riskZones}
                    incidents={incidents}
                    focus={mapFocus}
                    onLocationSelect={(code) => setSelectedLocationCode(code)}
                    panOffset={contextPanelOpen ? 190 : 0}
                  />
                  {/* Floating zone card — shows when a map pin is clicked */}
                  <ZoneCard
                    locationCode={selectedLocationCode}
                    locations={locations}
                    incidents={incidents}
                    onClose={() => setSelectedLocationCode(null)}
                    onRespond={() => { setActiveView('respond'); setSelectedLocationCode(null); }}
                    onPublish={() => { setActiveView('publish'); setSelectedLocationCode(null); }}
                    onDetails={(code) => handleLocationSelect(code)}
                  />
                </motion.div>
              )}

              {activeView === 'respond' && (
                <motion.div
                  key="respond"
                  className="mode-workspace"
                  initial={{ opacity: 0, scale: 0.993 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.005 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RespondMode
                    incidents={incidents}
                    cases={cases}
                    locations={locations}
                    search={globalSearch}
                    onRefresh={() => fetchData(true)}
                    onViewInMap={handleViewInMap}
                    onOpenAria={openAria}
                  />
                </motion.div>
              )}

              {activeView === 'publish' && (
                <motion.div
                  key="publish"
                  className="mode-workspace"
                  initial={{ opacity: 0, scale: 0.993 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.005 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PublishMode locations={locations} />
                </motion.div>
              )}

              {activeView === 'configure' && (
                <motion.div
                  key="configure"
                  className="mode-workspace"
                  initial={{ opacity: 0, scale: 0.993 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.005 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AnchorControl
                    locations={locations}
                    incidents={incidents}
                    riskZones={riskZones}
                    search={globalSearch}
                    onRefresh={() => fetchData(true)}
                    onOpenAria={openAria}
                    demoMode={demoMode}
                    onResetDemo={resetDemoData}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Inspector Panel (right-side overlay) ── */}
            <ContextPanel
              isOpen={contextPanelOpen}
              locationCode={selectedLocationCode}
              locations={locations}
              incidents={incidents}
              voiceJournals={voiceJournals}
              onClose={() => setSelectedLocationCode(null)}
              onViewInMap={handleViewInMap}
              onRefresh={() => fetchData(true)}
              onOpenAria={openAria}
              onLogConcern={() => {}}
            />
          </div>
        )}
      </main>

      {/* ── 4. Global overlays ── */}
      <IncidentNotification
        incidents={incidents}
        onOpenAria={openAria}
        onRefresh={() => fetchData(true)}
        onViewInMap={handleViewInMap}
        onOpenRespond={() => setActiveView('respond')}
      />

      <AriaDrawer
        isOpen={ariaOpen}
        onClose={closeAria}
        context={ariaContext}
      />

      <UpsellModal
        open={upsellModal.open}
        title={upsellModal.title}
        desc={upsellModal.desc}
        onClose={closeUpsell}
      />

      <UserSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onToggleTheme={setTheme}
      />
    </div>
  );
}
