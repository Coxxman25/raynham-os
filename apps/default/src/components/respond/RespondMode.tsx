/**
 * RespondMode — "What needs action?"
 *
 * Three-column layout:
 *   Col 1 (320px)  — CaseQueue: filterable, urgency-sorted case list
 *   Col 2 (flex)   — CaseTimeline: case header, action buttons, timeline, notes
 *   Col 3 (288px)  — ZoneDetailPanel: zone map, anchor info, escalation route
 *
 * This mode should feel focused, action-oriented, evidence-led,
 * time-sensitive, and structured.
 */

import React, { useState, useMemo } from 'react';
import { type Incident, type Location, type SlaCase } from '@/lib/api';
import { CaseQueue } from './CaseQueue';
import { CaseTimeline } from './CaseTimeline';
import { ZoneDetailPanel } from './ZoneDetailPanel';

interface RespondModeProps {
  incidents: Incident[];
  cases?: SlaCase[];
  locations?: Location[];
  search?: string;
  onRefresh: () => void;
  onViewInMap: (lat: number, lng: number) => void;
  onOpenAria?: (context: string) => void;
}

export function RespondMode({
  incidents,
  cases = [],
  locations = [],
  search: externalSearch = '',
  onRefresh,
  onViewInMap,
  onOpenAria,
}: RespondModeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(externalSearch);

  // Build a lookup map: incidentId → SlaCase so CaseTimeline can show SLA data
  const caseByIncidentId = useMemo(() => {
    const map = new Map<string, SlaCase>();
    cases.forEach(c => {
      if (c.obsId) map.set(c.obsId, c);
    });
    return map;
  }, [cases]);

  // Enrich incidents with their matched SLA case data (ref code, deadlines, etc.)
  // Incidents that have no matching case are still shown — they just lack SLA fields.
  const enrichedIncidents = useMemo(() => {
    return incidents.map(inc => {
      const slaCase = caseByIncidentId.get(inc.incidentId);
      if (!slaCase) return inc;
      return {
        ...inc,
        // Attach SLA case fields so CaseTimeline can render them
        _slaCase: slaCase,
        // Use the case's ref code as a display hint
        refCode: slaCase.refCode,
        // Use the SLA case's effective urgency if it overrides the incident severity
        severity: slaCase.effectiveUrgency !== 'medium' ? slaCase.effectiveUrgency : inc.severity,
      };
    });
  }, [incidents, caseByIncidentId]);

  const selectedIncident = useMemo(
    () => enrichedIncidents.find(i => i.id === selectedId) ?? null,
    [enrichedIncidents, selectedId],
  );

  // Auto-select first critical case if nothing is selected
  React.useEffect(() => {
    if (!selectedId && enrichedIncidents.length > 0) {
      const firstCritical = enrichedIncidents.find(
        i => i.severity === 'critical' && i.status === 'pending'
      );
      if (firstCritical) {
        setSelectedId(firstCritical.id);
      }
    }
  }, [enrichedIncidents, selectedId]);

  return (
    <div className="h-full w-full flex min-w-0 overflow-hidden">
      {/* Col 1 — Cases queue */}
      <CaseQueue
        incidents={enrichedIncidents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        search={localSearch}
        onSearchChange={setLocalSearch}
      />

      {/* Col 2 — Case timeline (flex, scrollable) */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden border-x" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <CaseTimeline
          incident={selectedIncident}
          onViewInMap={onViewInMap}
          onOpenAria={onOpenAria ?? (() => {})}
          onRefresh={onRefresh}
        />
      </div>

      {/* Col 3 — Zone details */}
      <ZoneDetailPanel
        incident={selectedIncident}
        allIncidents={incidents}
        locations={locations}
      />
    </div>
  );
}
