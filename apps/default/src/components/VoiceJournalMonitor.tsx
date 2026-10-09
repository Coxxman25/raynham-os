import React, { useState, useMemo } from 'react';
import { VoiceJournal, VoiceJournalFlag, VoiceJournalMood, updateVoiceJournalFlag } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Eye, ShieldAlert, CheckCircle,
  Mic, TrendingUp, BarChart3, Filter, Zap,
  Play, Pause, Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceJournalMonitorProps {
  journals: VoiceJournal[];
  search?: string;
  onRefresh: () => void;
  onOpenAria: (context?: string) => void;
}

const MOOD_META: Record<VoiceJournalMood, { emoji: string; label: string; color: string; bg: string }> = {
  great:  { emoji: '😊', label: 'Great',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  okay:   { emoji: '🙂', label: 'Okay',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  meh:    { emoji: '😐', label: 'Meh',     color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  sad:    { emoji: '😢', label: 'Sad',     color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  scared: { emoji: '😰', label: 'Scared',  color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
};

const FLAG_META: Record<VoiceJournalFlag, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  none:    { label: 'No Concern',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle, dot: 'bg-emerald-500' },
  monitor: { label: 'Monitor',          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       icon: Eye,          dot: 'bg-amber-500' },
  concern: { label: 'Concern Detected', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',         icon: AlertTriangle, dot: 'bg-rose-500' },
  urgent:  { label: 'Urgent',           color: 'text-red-300 bg-red-500/10 border-red-500/20',            icon: ShieldAlert,  dot: 'bg-red-500' },
};

type FilterFlag = 'all' | VoiceJournalFlag;

export function VoiceJournalMonitor({ journals, search = '', onRefresh, onOpenAria }: VoiceJournalMonitorProps) {
  const [filterFlag, setFilterFlag] = useState<FilterFlag>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Mood distribution
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = { great: 0, okay: 0, meh: 0, sad: 0, scared: 0 };
    journals.forEach(j => { counts[j.mood] = (counts[j.mood] || 0) + 1; });
    return counts;
  }, [journals]);

  const totalJournals = journals.length;

  // Flag counts
  const flagCounts = useMemo(() => {
    const counts: Record<string, number> = { none: 0, monitor: 0, concern: 0, urgent: 0 };
    journals.forEach(j => { counts[j.flag] = (counts[j.flag] || 0) + 1; });
    return counts;
  }, [journals]);

  const hasConcerns = flagCounts.concern > 0 || flagCounts.urgent > 0;
  const concernTotal = flagCounts.concern + flagCounts.urgent;

  // Filtered journals
  const filtered = useMemo(() => {
    let list = journals;
    if (filterFlag !== 'all') list = list.filter(j => j.flag === filterFlag);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.transcription?.toLowerCase().includes(q) ||
        j.aiSummary?.toLowerCase().includes(q) ||
        j.locationCode?.toLowerCase().includes(q) ||
        j.mood?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [journals, filterFlag, search]);

  const handleUpdateFlag = async (journal: VoiceJournal, newFlag: VoiceJournalFlag) => {
    setUpdatingId(journal.id);
    try {
      await updateVoiceJournalFlag(journal.id, newFlag);
      toast.success(`Journal flagged as "${FLAG_META[newFlag].label}"`);
      onRefresh();
    } catch {
      toast.error('Failed to update flag');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAriaAnalysis = (journal: VoiceJournal) => {
    const context = `You are ARIA, the safeguarding AI for Absolute Defence OS. An anonymous voice journal entry was submitted. The person's reported mood was "${journal.mood}" and they said: "${journal.transcription}". The system flagged this entry as "${journal.flag}". AI summary: "${journal.aiSummary}". Please provide the Safety Lead with:\n1. A trauma-informed interpretation of what this person may be experiencing\n2. Recommended immediate next steps\n3. Whether this warrants escalation to external services or emergency contact`;
    onOpenAria(context);
  };

  return (
    <div className="h-full w-full bg-[#F4F7F9] dark:bg-transparent flex flex-col overflow-auto z-10 animate-in fade-in duration-500">
      <div className="p-8 pt-10 max-w-[1400px] mx-auto w-full">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Journals */}
          <div className="bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Mic size={14} className="text-violet-400" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Entries</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalJournals}</p>
          </div>

          {/* Mood Distribution */}
          <div className="bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-blue-400" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mood Spread</span>
            </div>
            <div className="flex items-end gap-1 h-8">
              {Object.entries(moodCounts).map(([mood, count]) => {
                const maxCount = Math.max(...Object.values(moodCounts), 1);
                const heightPct = (count / maxCount) * 100;
                const meta = MOOD_META[mood as VoiceJournalMood];
                return (
                  <div key={mood} className="flex-1 flex flex-col items-center gap-1" title={`${meta?.label}: ${count}`}>
                    <div
                      className={cn('w-full rounded-sm transition-all', meta?.bg?.split(' ')[0] || 'bg-neutral-500/10')}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                    <span className="text-[9px]">{meta?.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flagged Concerns */}
          <div className={cn(
            'border rounded-2xl p-5',
            hasConcerns
              ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'
              : 'bg-white dark:bg-[#1A1C23] border-slate-200 dark:border-white/5'
          )}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className={hasConcerns ? 'text-rose-400' : 'text-slate-400'} />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Flagged</span>
            </div>
            <p className={cn('text-3xl font-bold', hasConcerns ? 'text-rose-500' : 'text-slate-900 dark:text-white')}>
              {concernTotal}
            </p>
            {hasConcerns && (
              <p className="text-[10px] text-rose-400 mt-1 font-semibold">Requires Safety Lead review</p>
            )}
          </div>

          {/* Wellbeing Score */}
          <div className="bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Wellbeing</span>
            </div>
            {(() => {
              const safeTotal = totalJournals || 1;
              const score = Math.round(((moodCounts.great * 5 + moodCounts.okay * 4 + moodCounts.meh * 3 + moodCounts.sad * 2 + moodCounts.scared * 1) / safeTotal / 5) * 100);
              const isGood = score >= 60;
              return (
                <>
                  <p className={cn('text-3xl font-bold', isGood ? 'text-emerald-500' : 'text-amber-500')}>{score}%</p>
                  <p className="text-[10px] text-slate-500 mt-1">{isGood ? 'Healthy range' : 'Needs attention'}</p>
                </>
              );
            })()}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={12} className="text-slate-400 mr-1" />
          {(['all', 'urgent', 'concern', 'monitor', 'none'] as FilterFlag[]).map(f => {
            const isAll = f === 'all';
            const meta = !isAll ? FLAG_META[f as VoiceJournalFlag] : null;
            const count = isAll ? journals.length : flagCounts[f] || 0;
            return (
              <button
                key={f}
                onClick={() => setFilterFlag(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                  filterFlag === f
                    ? isAll
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : meta?.color || ''
                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                {isAll ? 'All' : meta?.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Journal entries */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1A1C23]/50 border border-slate-200 dark:border-white/5 rounded-2xl">
            <Mic size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No voice journals yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Anonymous submissions will appear here as they're received</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((j, idx) => {
                const moodMeta = MOOD_META[j.mood] || MOOD_META.okay;
                const flagMeta = FLAG_META[j.flag] || FLAG_META.none;
                const FlagIcon = flagMeta.icon;
                const isExpanded = expandedId === j.id;

                return (
                  <motion.div
                    key={j.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      'bg-white dark:bg-[#1A1C23] border rounded-2xl overflow-hidden transition-all cursor-pointer group',
                      j.flag === 'urgent' ? 'border-rose-300 dark:border-rose-500/30' :
                      j.flag === 'concern' ? 'border-rose-200 dark:border-rose-500/20' :
                      'border-slate-200 dark:border-white/5'
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : j.id)}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-4 p-5">
                      {/* Mood emoji */}
                      <div className={cn('w-12 h-12 rounded-2xl border flex items-center justify-center text-xl shrink-0', moodMeta.bg)}>
                        {moodMeta.emoji}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-[9px] font-bold uppercase tracking-widest', moodMeta.color)}>
                            {moodMeta.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {j.locationCode || 'Unknown Area'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-white font-medium line-clamp-1">
                          {j.transcription || '(Voice recording)'}
                        </p>
                      </div>

                      {/* Flag badge */}
                      <div className={cn('px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0', flagMeta.color)}>
                        <FlagIcon size={10} />
                        {flagMeta.label}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-white/5 space-y-4">

                            {/* ── Audio playback ── */}
                            {j.audioUrl ? (
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <Volume2 size={10} />
                                  Voice Recording
                                </p>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/8">
                                  <audio
                                    controls
                                    src={j.audioUrl}
                                    preload="metadata"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full h-10"
                                    style={{ accentColor: '#8b5cf6' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-white/8">
                                <Mic size={13} className="text-slate-400 shrink-0" />
                                <p className="text-xs text-slate-400">No audio file — text-only entry</p>
                              </div>
                            )}

                            {/* Full transcription */}
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Transcription</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                                {j.transcription || '(Audio-only entry — no transcription available)'}
                              </p>
                            </div>

                            {/* AI Summary */}
                            {j.aiSummary && (
                              <div>
                                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">🤖 ARIA Analysis</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-violet-50 dark:bg-violet-500/5 p-3 rounded-xl border border-violet-100 dark:border-violet-500/10">
                                  {j.aiSummary}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap pt-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-2">Set Flag:</span>
                              {(['none', 'monitor', 'concern', 'urgent'] as VoiceJournalFlag[]).map(f => {
                                const meta = FLAG_META[f];
                                const isCurrent = j.flag === f;
                                return (
                                  <button
                                    key={f}
                                    disabled={isCurrent || updatingId === j.id}
                                    onClick={(e) => { e.stopPropagation(); handleUpdateFlag(j, f); }}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                                      isCurrent
                                        ? meta.color + ' cursor-default'
                                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20 disabled:opacity-50'
                                    )}
                                  >
                                    {meta.label}
                                  </button>
                                );
                              })}

                              <div className="flex-1" />

                              {/* Ask ARIA */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAriaAnalysis(j); }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-black rounded-xl hover:bg-[#00E5FF]/20 hover:border-[#00E5FF]/50 hover:scale-105 transition-all uppercase tracking-widest"
                              >
                                <Zap size={11} />
                                Ask ARIA
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
