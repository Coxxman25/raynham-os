/**
 * incident-utils.ts
 *
 * Shared utilities for the ADOS incident / case model.
 *
 * 1. summariseIncident  — parses raw descriptions into clean summaries
 * 2. getAnchorType      — derives which anchor layer (Red/Amber/Green) triggered a case
 * 3. getReporterLabel   — humanises the reporter field
 */

// ─── Tag → readable label map ─────────────────────────────────────────────────

const TAG_LABELS: Record<string, string> = {
  PHYSICAL_THREAT: 'Physical Threat',
  PHYSICAL_HARM:   'Assault',
  VERBAL_ABUSE:    'Verbal Abuse',
  WEAPONS:         'Weapon Threat',
  SUBSTANCE:       'Substance',
  SELF_HARM:       'Welfare Concern',
  LONE_WORKER:     'Lone Worker',
  THEFT:           'Theft',
  BULLYING:        'Harassment',
  CYBER:           'Cyber Incident',
  OTHER:           'Incident',
};

// ─── Patterns ─────────────────────────────────────────────────────────────────

// "COMPLIANCE BREACH — INC-xxx unacknowledged after 26 minutes. Duty Manager…"
const BREACH_RE   = /COMPLIANCE BREACH.*?unacknowledged after (\d+) minutes/is;

// "ESCALATION — INC-xxx unacknowledged after 15 minutes. Auto-escalated to Facilities Manager at …"
const ESCALATION_RE = /ESCALATION.*?unacknowledged after (\d+) minutes(?:.*?Auto-escalated to ([^.@\n]+))?/is;

// "[PHYSICAL_THREAT] Someone is…"
const TAG_RE = /^\[([A-Z_]+)\]\s*([\s\S]*)/;

// Remove internal INC references, ISO timestamps, "Zone: XXX." boilerplate
function strip(text: string): string {
  return text
    .replace(/INC-\d+/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.Z]+\b/g, '')
    .replace(/Zone:\s*[A-Z0-9-]+\.?/gi, '')
    .replace(/Original severity:[^.]+\./gi, '')
    .replace(/This is a recorded failure[^.]+\./gi, '')
    .replace(/Immediate escalation[^.]+\./gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IncidentSummary {
  /** Short category label, e.g. "Compliance Breach", "Escalation", "Assault" */
  type: string;
  /** One-liner for the case list card (≤ ~55 chars) */
  cardLine: string;
  /** Readable prose for the case detail view */
  detail: string;
}

// ─── Anchor layer type ────────────────────────────────────────────────────────

export type AnchorLayer = 'red' | 'amber' | 'green' | 'system';

export const ANCHOR_LAYER_CONFIG: Record<AnchorLayer, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
}> = {
  red: {
    label:    'ACT',
    sublabel: 'SOS · Emergency',
    color:    '#FF6B6B',
    bg:       'rgba(192,57,43,0.12)',
    border:   'rgba(192,57,43,0.30)',
  },
  amber: {
    label:    'KNOW',
    sublabel: 'Observation · Info',
    color:    '#FFB800',
    bg:       'rgba(255,184,0,0.10)',
    border:   'rgba(255,184,0,0.25)',
  },
  green: {
    label:    'GO',
    sublabel: 'Wayfinding · Utility',
    color:    '#00C853',
    bg:       'rgba(0,200,83,0.10)',
    border:   'rgba(0,200,83,0.22)',
  },
  system: {
    label:    'SYS',
    sublabel: 'Automated monitor',
    color:    'rgba(255,255,255,0.40)',
    bg:       'rgba(255,255,255,0.04)',
    border:   'rgba(255,255,255,0.08)',
  },
};

/**
 * Derives which anchor layer triggered an incident from its reporter and description.
 *
 * Logic:
 *   SOS-AUTO       → red   (SOS button pressed)
 *   BREACH-AUTO / escalation boilerplate → system (automated SLA monitor)
 *   [TAG] prefix   → amber (amber anchor observation form)
 *   default        → red   (red anchor report form)
 */
export function getAnchorType(
  reporter?: string,
  description?: string,
): AnchorLayer {
  if (!reporter) return 'red';
  if (reporter === 'SOS-AUTO') return 'red';
  if (
    reporter === 'BREACH-AUTO' ||
    reporter === 'ESCALATION-AUTO' ||
    /COMPLIANCE BREACH|ESCALATION/i.test(description ?? '')
  ) return 'system';
  if (/^\[([A-Z_]+)\]/.test(description ?? '')) return 'amber';
  return 'red';
}

/**
 * Humanises the raw reporter field for display.
 */
export function getReporterLabel(reporter?: string): string {
  if (!reporter || reporter === 'Anonymous') return 'Anonymous report';
  if (reporter === 'SOS-AUTO')       return 'SOS activation';
  if (reporter === 'BREACH-AUTO')    return 'Automated SLA monitor';
  if (reporter === 'ESCALATION-AUTO')return 'Auto-escalation';
  if (reporter.startsWith('OP-'))    return `Operator ${reporter.slice(3)}`;
  return reporter;
}

export function summariseIncident(desc?: string): IncidentSummary {
  if (!desc) {
    return { type: 'Incident', cardLine: 'No details available', detail: 'No description provided.' };
  }

  // ── COMPLIANCE BREACH ─────────────────────────────────────────────────────
  const breach = desc.match(BREACH_RE);
  if (breach) {
    const mins = breach[1];
    return {
      type:     'Compliance Breach',
      cardLine: `SLA exceeded — unacknowledged ${mins}m`,
      detail:   `Case unacknowledged for ${mins} minutes, exceeding SLA. Duty Manager has been notified.`,
    };
  }

  // ── ESCALATION ────────────────────────────────────────────────────────────
  const esc = desc.match(ESCALATION_RE);
  if (esc) {
    const mins = esc[1];
    const to   = esc[2]?.replace(/\bat\b.*/i, '').trim() ?? 'duty team';
    return {
      type:     'Escalation',
      cardLine: `Escalated to ${to} · ${mins}m`,
      detail:   `Unacknowledged for ${mins} minutes. Auto-escalated to ${to}.`,
    };
  }

  // ── [TAG] pattern ─────────────────────────────────────────────────────────
  const tag = desc.match(TAG_RE);
  if (tag) {
    const label = TAG_LABELS[tag[1]] ?? tag[1];
    const body  = tag[2].replace(/\s+/g, ' ').trim();
    return {
      type:     label,
      cardLine: body.slice(0, 60),
      detail:   body,
    };
  }

  // ── Generic: strip boilerplate then use what's left ───────────────────────
  const cleaned = strip(desc);
  return {
    type:     'Incident',
    cardLine: cleaned.slice(0, 60),
    detail:   cleaned || desc,
  };
}
