import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronDown, RefreshCw, CheckCircle2, Clock, Info, AlertTriangle, Zap, X, Radio, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Location, PinboardNotice, PinboardUrgency, PinboardCategory, getLocations, getPinboardNotices, publishPinboardNotice, resolvePinboardNotice } from '@/lib/api';

const NOTICE_TYPES: { id: PinboardUrgency; label: string; sublabel: string; color: string; bg: string; border: string; icon: React.ElementType }[] = [
  { id: 'info',     label: 'Information', sublabel: 'Calm update · appears green on anchor',  color: '#16A34A', bg: 'rgba(22,163,74,0.10)',   border: 'rgba(22,163,74,0.30)',   icon: Info          },
  { id: 'guidance', label: 'Guidance',    sublabel: 'Advisory · appears amber on anchor',     color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.28)',   icon: AlertTriangle },
  { id: 'urgent',   label: 'Urgent',      sublabel: 'Action required · appears red on anchor',color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.28)',   icon: Zap           },
];

const CATEGORIES: { id: PinboardCategory; label: string }[] = [
  { id: 'general', label: 'General' }, { id: 'safety', label: 'Safety' }, { id: 'security', label: 'Security' },
  { id: 'facilities', label: 'Facilities' }, { id: 'event', label: 'Event' }, { id: 'weather', label: 'Weather' },
];

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function NoticeRow({ notice, onResolve }: { notice: PinboardNotice; onResolve: (id: string) => void }) {
  const cfg = NOTICE_TYPES.find(t => t.id === notice.urgency) ?? NOTICE_TYPES[0];
  return (
    <motion.div layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl group"
      style={{ background: 'var(--respond-surface)', border: '1px solid var(--respond-border)' }}>
      <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: cfg.color, minHeight: 36 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: cfg.color }}>{cfg.label}</span>
          {notice.zoneLabel && <span className="text-[9px] text-[var(--respond-text-faint)] font-mono">{notice.zoneLabel}</span>}
          <span className="text-[9px] text-[var(--respond-text-faint)] ml-auto font-mono">{timeAgo(notice.publishedAt)}</span>
        </div>
        <p className="text-[12px] text-[var(--respond-text-secondary)] leading-snug line-clamp-2">{notice.text}</p>
        <p className="text-[10px] text-[var(--respond-text-faint)] mt-0.5">By {notice.publishedBy}</p>
      </div>
      <button onClick={() => onResolve(notice.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 p-1 rounded-lg hover:bg-[var(--respond-surface-hover)]" title="Resolve">
        <X size={11} className="text-[var(--respond-text-muted)]" />
      </button>
    </motion.div>
  );
}

interface PublishModeProps { locations?: Location[]; }

export function PublishMode({ locations: propLocations }: PublishModeProps) {
  const [locations, setLocations] = useState<Location[]>(propLocations ?? []);
  const [zone, setZone] = useState('');
  const [noticeType, setNoticeType] = useState<PinboardUrgency>('info');
  const [category, setCategory] = useState<PinboardCategory>('general');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notices, setNotices] = useState<PinboardNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propLocations?.length) { setLocations(propLocations); if (!zone && propLocations[0]) setZone(propLocations[0].code); return; }
    getLocations().then(locs => { setLocations(locs); if (!zone && locs[0]) setZone(locs[0].code); }).catch(() => {});
  }, [propLocations]);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try { const d = await getPinboardNotices(zone || undefined); setNotices(d); }
    catch { setNotices([]); } finally { setLoading(false); }
  }, [zone]);

  useEffect(() => { loadNotices(); }, [zone]);

  const handlePublish = async () => {
    if (!message.trim()) { toast.error('Please write a message.'); return; }
    const loc = locations.find(l => l.code === zone);
    setPublishing(true);
    try {
      await publishPinboardNotice({ text: message.trim(), urgency: noticeType, category, zoneCode: zone, zoneLabel: loc?.name ?? zone, publishedBy: 'Operator', duration: 480 });
      toast.success('Notice published'); setMessage(''); await loadNotices();
    } catch { toast.error('Could not publish.'); } finally { setPublishing(false); }
  };

  const handleResolve = async (id: string) => {
    try { await resolvePinboardNotice(id); setNotices(p => p.filter(n => n.id !== id)); toast.success('Notice resolved'); }
    catch { toast.error('Could not resolve.'); }
  };

  const sel = NOTICE_TYPES.find(t => t.id === noticeType) ?? NOTICE_TYPES[0];
  const canPublish = message.trim().length > 3;
  const glass: React.CSSProperties = { background: 'var(--surface)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' };

  return (
    <div className="h-full w-full flex overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>

      {/* ── Left: Composer ── */}
      <div className="w-[380px] shrink-0 flex flex-col h-full overflow-y-auto no-scrollbar" style={{ ...glass, borderRight: '1px solid var(--respond-border)' }}>
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <Radio size={13} style={{ color: 'var(--aria-cyan)' }} />
            <h2 className="text-[13px] font-bold text-[var(--respond-text-primary)] tracking-wide">Publish</h2>
          </div>
          <p className="text-[11px] text-[var(--respond-text-muted)] leading-relaxed">What information needs to go out, and where?</p>
        </div>
        <div className="h-px mx-6" style={{ background: 'var(--respond-border)' }} />
        <div className="px-6 py-5 space-y-5">

          {/* Target zone */}
          <div>
            <label className="block text-[9px] font-black text-[var(--respond-text-muted)] uppercase tracking-[0.18em] mb-2">Target zone</label>
            <div className="relative">
              <select value={zone} onChange={e => setZone(e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-2.5 pr-9 text-[12px] text-[var(--respond-text-primary)] font-mono outline-none cursor-pointer"
                style={{ background: 'var(--respond-border)', border: '1px solid var(--respond-input-border)' }}>
                <option value="" className="bg-[var(--surface)]">All zones (site-wide)</option>
                {locations.map(l => <option key={l.code} value={l.code} className="bg-[var(--surface)]">{l.name} — {l.code}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--respond-text-faint)] pointer-events-none" />
            </div>
          </div>

          {/* Notice type */}
          <div>
            <label className="block text-[9px] font-black text-[var(--respond-text-muted)] uppercase tracking-[0.18em] mb-2">Notice type</label>
            <div className="space-y-1.5">
              {NOTICE_TYPES.map(t => {
                const Icon = t.icon; const active = noticeType === t.id;
                return (
                  <button key={t.id} onClick={() => setNoticeType(t.id)} className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all text-left"
                    style={{ background: active ? t.bg : 'var(--respond-surface)', border: `1px solid ${active ? t.border : 'var(--respond-border)'}` }}>
                    <Icon size={14} style={{ color: active ? t.color : 'var(--respond-text-faint)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black" style={{ color: active ? t.color : 'var(--respond-text-muted)' }}>{t.label}</p>
                      <p className="text-[11px] font-medium" style={{ color: active ? t.color : 'var(--respond-text-faint)' }}>{t.sublabel}</p>
                    </div>
                    {active && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[9px] font-black text-[var(--respond-text-muted)] uppercase tracking-[0.18em] mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: category === c.id ? 'var(--aria-cyan-dim)' : 'var(--respond-surface)', border: `1px solid ${category === c.id ? 'var(--aria-cyan-dim)' : 'var(--respond-border-strong)'}`, color: category === c.id ? 'var(--aria-cyan)' : 'var(--respond-text-faint)' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[9px] font-black text-[var(--respond-text-muted)] uppercase tracking-[0.18em] mb-2">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write a clear, concise notice for people at this location…"
              rows={5} maxLength={280}
              className="w-full rounded-xl px-4 py-3 text-[12px] text-[var(--respond-text-primary)] placeholder:text-[var(--respond-text-faint)] resize-none outline-none leading-relaxed"
              style={{ background: 'var(--respond-surface)', border: '1px solid var(--respond-border-strong)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--aria-cyan-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--respond-border-strong)'; }}
            />
            <div className="flex justify-end mt-1"><span className="text-[9px] text-[var(--respond-text-faint)] font-mono">{message.length}/280</span></div>
          </div>

          {/* Publish */}
          <button onClick={handlePublish} disabled={!canPublish || publishing}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all"
            style={{ background: canPublish ? sel.color : 'var(--respond-border)', color: canPublish ? (noticeType === 'guidance' ? '#000' : '#fff') : 'var(--respond-text-faint)', opacity: publishing ? 0.7 : 1 }}>
            {publishing ? <><RefreshCw size={13} className="animate-spin" /> Publishing…</> : <><Send size={13} /> Publish notice</>}
          </button>
        </div>
      </div>

      {/* ── Right: Active notices ── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--respond-border)' }}>
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={12} style={{ color: 'var(--aria-cyan)' }} />
            <span className="text-[11px] font-black text-[var(--respond-text-secondary)] uppercase tracking-[0.18em]">Active notices</span>
            {notices.length > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--aria-cyan-dim)', color: 'var(--aria-cyan)' }}>{notices.length}</span>}
          </div>
          <button onClick={loadNotices} className="flex items-center gap-1.5 text-[10px] text-[var(--respond-text-faint)] hover:text-[var(--respond-text-muted)] transition-colors">
            <RefreshCw size={10} /> Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--respond-surface)' }} />)}</div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--aria-cyan-glow)', border: '1px solid var(--aria-cyan-dim)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--aria-cyan)' }} />
              </div>
              <p className="text-[11px] text-[var(--respond-text-faint)]">No active notices</p>
              <p className="text-[10px] text-[var(--respond-text-faint)] mt-1">Published notices will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {notices.map(n => <NoticeRow key={n.id} notice={n} onResolve={handleResolve} />)}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--respond-border)' }}>
          <Clock size={10} className="text-[var(--respond-text-faint)]" />
          <p className="text-[10px] text-[var(--respond-text-faint)]">Notices appear on the zone's QR anchor in real time · Resolve when no longer needed</p>
        </div>
      </div>
    </div>
  );
}

