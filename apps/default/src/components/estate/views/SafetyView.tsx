import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getCheckIns, createCheckIn, SafetyCheckIn } from '@/lib/estate-api';
import { toast } from 'sonner';
import { Shield, Plus, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  'checked_in': { color: 'var(--status-operational)', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Checked In' },
  'overdue': { color: 'var(--status-maintenance)', icon: <Clock className="w-4 h-4" />, label: 'Overdue' },
  'escalated': { color: 'var(--status-critical)', icon: <AlertTriangle className="w-4 h-4" />, label: 'Escalated' },
};

export function Safety() {
  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    const data = await getCheckIns();
    setCheckIns(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const safeCount = checkIns.filter(c => c.status === 'checked_in').length;
  const overdueCount = checkIns.filter(c => c.status === 'overdue').length;
  const escalatedCount = checkIns.filter(c => c.status === 'escalated').length;

  const handleCreate = async (values: any) => {
    try {
      const position = await captureCurrentPosition();
      await createCheckIn({
        ...values,
        status: 'checked_in',
        lat: position.lat,
        lng: position.lng,
        capturedAt: position.capturedAt,
        accuracyMeters: position.accuracy,
        locationSource: 'live_gps',
        sessionId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
      });
      toast.success('Check-in pinned on the OS map');
      setShowForm(false);
      fetchData();
    } catch {
      toast.error('A fresh GPS point is required to pin this worker');
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Lone-Worker Safety
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {safeCount} safe | {overdueCount} overdue | {escalatedCount} escalated
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-transform active:scale-95"
          style={{ background: 'var(--brass)' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Check In</span>
        </button>
      </div>

      {/* Status cards */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        <StatusCard label="Safe" value={safeCount} color="var(--status-operational)" icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatusCard label="Overdue" value={overdueCount} color="var(--status-maintenance)" icon={<Clock className="w-5 h-5" />} />
        <StatusCard label="Escalated" value={escalatedCount} color="var(--status-critical)" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Check-in list */}
      <div className="px-4 pb-4 space-y-2.5">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="shimmer rounded-2xl h-20" />)
        ) : checkIns.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active check-ins</p>
          </div>
        ) : (
          checkIns.map(ci => <CheckInCard key={ci.id} checkIn={ci} />)
        )}
      </div>

      {showForm && (
        <CheckInForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function StatusCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col items-center gap-1"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
      }}
    >
      <span style={{ color }}>{icon}</span>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function CheckInCard({ checkIn }: { checkIn: SafetyCheckIn }) {
  const cfg = STATUS_CONFIG[checkIn.status] ?? STATUS_CONFIG['checked_in'];

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
        style={{ background: cfg.color }}
      >
        {checkIn.workerName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {checkIn.workerName}
        </p>
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <MapPin className="w-3 h-3" />
          {checkIn.location}
        </p>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>
          /// {checkIn.what3words}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ color: cfg.color, background: `${cfg.color}22` }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

function CheckInForm({ onSubmit, onClose }: { onSubmit: (v: any) => void; onClose: () => void }) {
  const [workerName, setWorkerName] = useState('');
  const [location, setLocation] = useState('');
  const [what3words, setWhat3words] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim() || !location.trim()) return;
    onSubmit({
      workerName: workerName.trim(),
      location: location.trim(),
      what3words: what3words.trim() || 'unknown.location.tags',
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4 slide-up"
        style={{ background: 'var(--rail-bg)', border: '1px solid var(--rail-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Check In</h2>
          <button type="button" onClick={onClose} className="text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Your Name</label>
          <input
            value={workerName}
            onChange={e => setWorkerName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Where are you working?"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>What3Words</label>
          <input
            value={what3words}
            onChange={e => setWhat3words(e.target.value)}
            placeholder="dimes.helped.curls"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--brass)' }}
        >
          Record Check-in
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--surface-border)',
  color: 'var(--text-primary)',
  outline: 'none',
};

function captureCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number; capturedAt: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS unavailable')); return; }
    navigator.geolocation.getCurrentPosition(
      point => resolve({
        lat: point.coords.latitude,
        lng: point.coords.longitude,
        accuracy: point.coords.accuracy,
        capturedAt: new Date(point.timestamp).toISOString(),
      }),
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
