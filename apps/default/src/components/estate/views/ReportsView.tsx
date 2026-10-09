import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getReports, createReport, getLocations, EstateReport, EstateLocation } from '@/lib/estate-api';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Wrench, Bird, Hammer, FileText, QrCode } from 'lucide-react';
import { QRScanner } from '../QRScanner.tsx';

const REPORT_TYPE_ICONS: Record<string, React.ReactNode> = {
  'maintenance': <Wrench className="w-4 h-4" />,
  'hazard': <AlertTriangle className="w-4 h-4" />,
  'wildlife': <Bird className="w-4 h-4" />,
  'damage': <Hammer className="w-4 h-4" />,
  'other': <FileText className="w-4 h-4" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  'low': 'var(--status-low)',
  'medium': 'var(--status-medium)',
  'high': 'var(--status-high)',
  'urgent': 'var(--status-urgent)',
};

const STATUS_COLORS: Record<string, string> = {
  'open': 'var(--status-urgent)',
  'in_progress': 'var(--status-maintenance)',
  'resolved': 'var(--status-operational)',
};

export function Reports() {
  const [reports, setReports] = useState<EstateReport[]>([]);
  const [locations, setLocations] = useState<EstateLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<EstateLocation | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    const [data, locs] = await Promise.all([getReports(), getLocations()]);
    setReports(data);
    setLocations(locs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const openCount = reports.filter(r => r.status === 'open').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  const handleCreate = async (values: any) => {
    try {
      await createReport({
        ...values,
        status: 'open',
        lat: values.lat || 52.8355,
        lng: values.lng || 0.7410,
      });
      toast.success('Report submitted');
      setShowForm(false);
      setPrefilledLocation(null);
      fetchData();
    } catch {
      toast.error('Could not submit report');
    }
  };

  const handleQRLocation = (loc: EstateLocation) => {
    setShowQR(false);
    setPrefilledLocation(loc);
    setShowForm(true);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Reports
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {openCount} open | {inProgressCount} in progress | {resolvedCount} resolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-transform active:scale-95"
            style={{
              background: 'var(--brass-dim)',
              border: '1px solid var(--brass-dim)',
              color: 'var(--brass)',
            }}
            aria-label="Scan QR code"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setPrefilledLocation(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-transform active:scale-95"
            style={{ background: 'var(--brass)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Report</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'open', label: 'Open' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'resolved', label: 'Resolved' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f.id ? 'text-white' : 'text-[var(--text-muted)]',
            )}
            style={filter === f.id ? {
              background: 'var(--brass)',
            } : {
              background: 'var(--surface-2)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="px-4 pb-4 space-y-2.5">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="shimmer rounded-2xl h-28" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reports yet</p>
          </div>
        ) : (
          filtered.map(rep => (
            <ReportCard key={rep.id} report={rep} />
          ))
        )}
      </div>

      {showQR && (
        <QRScanner
          locations={locations}
          onLocationFound={handleQRLocation}
          onClose={() => setShowQR(false)}
        />
      )}

      {showForm && (
        <ReportForm
          onSubmit={handleCreate}
          onClose={() => { setShowForm(false); setPrefilledLocation(null); }}
          prefilledLocation={prefilledLocation}
        />
      )}
    </div>
  );
}

function ReportCard({ report }: { report: EstateReport }) {
  const priorityColor = PRIORITY_COLORS[report.priority] ?? 'var(--status-low)';
  const statusColor = STATUS_COLORS[report.status] ?? 'var(--text-muted)';

  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${priorityColor}22` }}
          >
            <span style={{ color: priorityColor }}>
              {REPORT_TYPE_ICONS[report.reportType] ?? <FileText className="w-4 h-4" />}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {report.title}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {report.reportType} | {report.location}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
          style={{ color: priorityColor, background: `${priorityColor}22` }}
        >
          {report.priority}
        </span>
      </div>

      {report.description && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {report.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
          /// {report.what3words}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>By {report.reporter}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ color: statusColor, background: `${statusColor}22` }}
          >
            {report.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReportForm({
  onSubmit,
  onClose,
  prefilledLocation,
}: {
  onSubmit: (v: any) => void;
  onClose: () => void;
  prefilledLocation: EstateLocation | null;
}) {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('maintenance');
  const [location, setLocation] = useState('');
  const [what3words, setWhat3words] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [reporter, setReporter] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  useEffect(() => {
    if (prefilledLocation) {
      setLocation(prefilledLocation.name);
      setWhat3words(prefilledLocation.what3words);
      setLat(prefilledLocation.lat);
      setLng(prefilledLocation.lng);
    }
  }, [prefilledLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reporter.trim()) return;
    onSubmit({
      title: title.trim(),
      reportType,
      location: location.trim() || 'Unknown',
      what3words: what3words.trim() || 'unknown.location.tags',
      priority,
      description: description.trim(),
      reporter: reporter.trim(),
      lat,
      lng,
    });
  };

  const isPrefilled = !!prefilledLocation;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto slide-up"
        style={{ background: 'var(--rail-bg)', border: '1px solid var(--rail-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Report</h2>
            {isPrefilled && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ color: 'var(--brass)', background: 'var(--brass-dim)' }}
              >
                QR Location
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </div>

        {isPrefilled && (
          <div
            className="rounded-xl p-3 flex items-center gap-2.5"
            style={{ background: 'var(--brass-dim)', border: '1px solid var(--brass-dim)' }}
          >
            <QrCode className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brass)' }} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {prefilledLocation!.name}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                /// {prefilledLocation!.what3words}
              </p>
            </div>
          </div>
        )}

        <Field label="Title">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brief title for this report"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={inputStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
              <option value="maintenance">Maintenance</option>
              <option value="hazard">Hazard</option>
              <option value="wildlife">Wildlife</option>
              <option value="damage">Damage</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>

        <Field label="Location">
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Where on the estate?"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={inputStyle}
          />
        </Field>

        <Field label="What3Words">
          <input
            value={what3words}
            onChange={e => setWhat3words(e.target.value)}
            placeholder="dimes.helped.curls"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
            style={inputStyle}
          />
        </Field>

        <Field label="Your Name">
          <input
            value={reporter}
            onChange={e => setReporter(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={inputStyle}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you found..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
            style={inputStyle}
          />
        </Field>

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--brass)' }}
        >
          Submit Report
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
