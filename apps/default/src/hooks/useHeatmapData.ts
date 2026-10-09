import { useMemo } from 'react';
import { Incident, Location } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeWindow = '1h' | '24h' | '7d' | '30d' | 'all';

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;       // 0–1 normalised
  rawWeight: number;    // sum of severity weights
  count: number;
}

export interface ClusterZone {
  lat: number;
  lng: number;
  radius: number;       // metres
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  locationCode: string;
  locationName: string;
  riskScore: number;    // 0–100
}

export interface ZoneRiskRow {
  locationCode: string;
  locationName: string;
  riskScore: number;    // 0–100
  trend: 'rising' | 'stable' | 'falling';
  incidentCount: number;
  criticalCount: number;
  highCount: number;
  peakDay: string;      // e.g. "Tuesday"
  peakHour: string;     // e.g. "14:00"
}

export interface TemporalPattern {
  label: string;          // human-readable e.g. "Tuesday afternoons at Zone 2"
  zone: string;
  day: string;
  hour: number;
  count: number;
}

// ─── Severity weight ──────────────────────────────────────────────────────────

const SEV_WEIGHT: Record<string, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeWindowMs(window: TimeWindow): number {
  const now = Date.now();
  switch (window) {
    case '1h':  return now - 60 * 60 * 1000;
    case '24h': return now - 24 * 60 * 60 * 1000;
    case '7d':  return now - 7 * 24 * 60 * 60 * 1000;
    case '30d': return now - 30 * 24 * 60 * 60 * 1000;
    case 'all': return 0;
  }
}

// ─── Haversine distance (metres) ──────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHeatmapData(
  incidents: Incident[],
  locations: Location[],
  timeWindow: TimeWindow
) {
  return useMemo(() => {
    const cutoff = timeWindowMs(timeWindow);

    // ── Filter incidents to the time window ──────────────────────────────────
    // Note: Taskade API doesn't always return createdAt; for those without one
    // we treat them as "now" so they always appear in any window.
    const filtered = incidents.filter(inc => {
      if (!inc.createdAt) return true;
      const ts = new Date(inc.createdAt).getTime();
      if (isNaN(ts)) return true;
      return ts >= cutoff;
    });

    // ── Build a location lookup by code ──────────────────────────────────────
    const locByCode = new Map<string, Location>();
    for (const loc of locations) locByCode.set(loc.code, loc);

    // ── Group incidents by locationCode ──────────────────────────────────────
    const byZone = new Map<string, Incident[]>();
    for (const inc of filtered) {
      const key = inc.locationCode || 'UNKNOWN';
      if (!byZone.has(key)) byZone.set(key, []);
      byZone.get(key)!.push(inc);
    }

    // ── Zone risk scores ─────────────────────────────────────────────────────
    // Score = Σ(sev_weight × recency_decay) × 10, capped at 100
    const now = Date.now();

    const zoneRiskRows: ZoneRiskRow[] = [];
    const clusterZones: ClusterZone[] = [];

    for (const [code, incs] of byZone.entries()) {
      const loc = locByCode.get(code);
      if (!loc && incs[0].lat === 0) continue; // skip ghost entries

      const lat = loc?.lat ?? incs[0].lat;
      const lng = loc?.lng ?? incs[0].lng;
      const name = loc?.name ?? code;

      // Recency-weighted score
      let score = 0;
      let critCount = 0;
      let highCount = 0;
      const dayBuckets: Record<number, number> = {};
      const hourBuckets: Record<number, number> = {};

      for (const inc of incs) {
        const ts = inc.createdAt ? new Date(inc.createdAt).getTime() : now;
        const ageMs = now - ts;
        // Decay: full weight within 24h, 50% at 7d, 25% at 30d
        const decayDays = ageMs / (24 * 60 * 60 * 1000);
        const decay = Math.exp(-0.1 * decayDays);

        const w = (SEV_WEIGHT[inc.severity] ?? 1) * decay;
        score += w;

        if (inc.severity === 'critical') critCount++;
        if (inc.severity === 'high') highCount++;

        if (inc.createdAt) {
          const d = new Date(inc.createdAt);
          dayBuckets[d.getDay()] = (dayBuckets[d.getDay()] ?? 0) + 1;
          hourBuckets[d.getHours()] = (hourBuckets[d.getHours()] ?? 0) + 1;
        }
      }

      const riskScore = Math.min(100, Math.round(score * 10));

      // Peak day/hour
      const peakDayIdx = Object.entries(dayBuckets).sort((a, b) => b[1] - a[1])[0];
      const peakHourIdx = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
      const peakDay = peakDayIdx ? DAYS[Number(peakDayIdx[0])] : '—';
      const peakHour = peakHourIdx
        ? `${String(Number(peakHourIdx[0])).padStart(2, '0')}:00`
        : '—';

      // Trend: compare first half vs second half incident count (needs createdAt)
      const sorted = incs
        .filter(i => i.createdAt)
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      const midpoint = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, midpoint).length;
      const secondHalf = sorted.slice(midpoint).length;
      const trend: ZoneRiskRow['trend'] =
        secondHalf > firstHalf ? 'rising' :
        secondHalf < firstHalf ? 'falling' :
        'stable';

      // Max severity for cluster ring
      const maxSev: ClusterZone['severity'] =
        critCount > 0 ? 'critical' :
        highCount > 0 ? 'high' :
        incs.some(i => i.severity === 'medium') ? 'medium' : 'low';

      zoneRiskRows.push({
        locationCode: code,
        locationName: name,
        riskScore,
        trend,
        incidentCount: incs.length,
        criticalCount: critCount,
        highCount: highCount,
        peakDay,
        peakHour,
      });

      // Cluster radius: 40m base + 15m per incident, max 200m
      const radius = Math.min(200, 40 + incs.length * 15);
      clusterZones.push({ lat, lng, radius, count: incs.length, severity: maxSev, locationCode: code, locationName: name, riskScore });
    }

    // Sort zones by risk score descending
    zoneRiskRows.sort((a, b) => b.riskScore - a.riskScore);
    clusterZones.sort((a, b) => b.riskScore - a.riskScore);

    // ── Heat points (one per incident for smooth gradients) ──────────────────
    const rawPoints = filtered.map(inc => ({
      lat: inc.lat,
      lng: inc.lng,
      rawWeight: SEV_WEIGHT[inc.severity] ?? 1,
    })).filter(p => p.lat !== 0 || p.lng !== 0);

    // Normalise weights
    const maxRaw = rawPoints.reduce((m, p) => Math.max(m, p.rawWeight), 1);
    const heatPoints: HeatPoint[] = rawPoints.map(p => ({
      lat: p.lat,
      lng: p.lng,
      weight: p.rawWeight / maxRaw,
      rawWeight: p.rawWeight,
      count: 1,
    }));

    // ── Temporal patterns — find top recurring slot ──────────────────────────
    // Build (locationCode, dayOfWeek, hourBand) → count
    const patternMap = new Map<string, { count: number; zone: string; day: string; hour: number }>();
    for (const inc of filtered) {
      if (!inc.createdAt) continue;
      const d = new Date(inc.createdAt);
      const day = DAYS[d.getDay()];
      const hour = Math.floor(d.getHours() / 4) * 4; // 4-hour bands
      const key = `${inc.locationCode}|${day}|${hour}`;
      if (!patternMap.has(key)) patternMap.set(key, { count: 0, zone: inc.locationCode, day, hour });
      patternMap.get(key)!.count++;
    }

    const patterns: TemporalPattern[] = Array.from(patternMap.values())
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(p => {
        const loc = locByCode.get(p.zone);
        const zoneName = loc?.name ?? p.zone;
        const hourStr = `${String(p.hour).padStart(2, '0')}:00–${String(p.hour + 4).padStart(2, '0')}:00`;
        return {
          label: `${p.day} ${hourStr} · ${zoneName}`,
          zone: p.zone,
          day: p.day,
          hour: p.hour,
          count: p.count,
        };
      });

    const totalFiltered = filtered.length;
    const criticalCount = filtered.filter(i => i.severity === 'critical').length;
    const highCount = filtered.filter(i => i.severity === 'high').length;

    return {
      heatPoints,
      clusterZones,
      zoneRiskRows,
      patterns,
      totalFiltered,
      criticalCount,
      highCount,
    };
  }, [incidents, locations, timeWindow]);
}
