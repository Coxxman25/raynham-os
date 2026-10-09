import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getNotices, EstateNotice } from '@/lib/estate-api';
import { Bell, Shield, Wrench, Cloud, Calendar, Info, AlertTriangle } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'safety': <Shield className="w-4 h-4" />,
  'maintenance': <Wrench className="w-4 h-4" />,
  'weather': <Cloud className="w-4 h-4" />,
  'event': <Calendar className="w-4 h-4" />,
  'general': <Info className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'safety': 'var(--status-info)',
  'maintenance': 'var(--status-maintenance)',
  'weather': 'var(--status-info)',
  'event': 'var(--area-hospitality)',
  'general': 'var(--text-muted)',
};

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  'info': { color: 'var(--status-low)', label: 'Info' },
  'guidance': { color: 'var(--status-high)', label: 'Guidance' },
  'urgent': { color: 'var(--status-urgent)', label: 'Urgent' },
};

export function Notices() {
  const [notices, setNotices] = useState<EstateNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');

  const fetchData = useCallback(async () => {
    const data = await getNotices();
    setNotices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filter === 'all' ? notices : notices.filter(n => n.status === filter);

  const activeCount = notices.filter(n => n.status === 'active').length;
  const scheduledCount = notices.filter(n => n.status === 'scheduled').length;

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--canvas-bg)' }}>
      {/* Header */}
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Notices
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {activeCount} active | {scheduledCount} scheduled
        </p>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { id: 'active', label: 'Active' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'resolved', label: 'Resolved' },
          { id: 'all', label: 'All' },
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

      {/* Notice cards */}
      <div className="px-4 pb-4 space-y-2.5">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="shimmer rounded-2xl h-24" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notices</p>
          </div>
        ) : (
          filtered.map(notice => <NoticeCard key={notice.id} notice={notice} />)
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice }: { notice: EstateNotice }) {
  const catColor = CATEGORY_COLORS[notice.category] ?? 'var(--text-muted)';
  const urgConfig = URGENCY_CONFIG[notice.urgency] ?? URGENCY_CONFIG['info'];
  const isActive = notice.status === 'active';

  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderLeft: `3px solid ${urgConfig.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${catColor}22` }}
        >
          <span style={{ color: catColor }}>
            {CATEGORY_ICONS[notice.category] ?? <Info className="w-4 h-4" />}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {notice.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {notice.location}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
          style={{ color: urgConfig.color, background: `${urgConfig.color}22` }}
        >
          {urgConfig.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          By {notice.publishedBy}
        </p>
        <span
          className="text-[10px] font-medium uppercase tracking-wide"
          style={{ color: isActive ? 'var(--status-operational)' : 'var(--text-muted)' }}
        >
          {notice.status}
        </span>
      </div>
    </div>
  );
}
