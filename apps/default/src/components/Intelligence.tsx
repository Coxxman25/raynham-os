/**
 * Intelligence — Unified signals and knowledge console.
 *
 * Consolidates two previously separate views into one operator destination:
 *   SIGNALS  → flagged voice journals, pattern alerts, wellbeing monitoring
 *   KNOWLEDGE → reference documents, guides, ARIA training materials
 *
 * Phase 1: wrapper-only consolidation. Each tab renders its legacy component
 * with zero internal changes. Visual polish comes in Phase 2+.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

import { VoiceJournalMonitor } from './VoiceJournalMonitor';
import { KnowledgeVault } from './KnowledgeVault';
import { VoiceJournal } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntelTab = 'signals' | 'knowledge';

interface IntelligenceProps {
  journals: VoiceJournal[];
  search: string;
  onRefresh: () => void;
  onOpenAria?: (ctx?: string) => void;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: IntelTab; label: string; icon: React.ElementType }[] = [
  { id: 'signals',   label: 'SIGNALS',   icon: Mic },
  { id: 'knowledge', label: 'KNOWLEDGE', icon: Library },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Intelligence({
  journals,
  search,
  onRefresh,
  onOpenAria,
}: IntelligenceProps) {
  const [activeTab, setActiveTab] = useState<IntelTab>('signals');

  return (
    <div className="h-full flex flex-col bg-[#F4F7F9] dark:bg-[#12141A]">
      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-200',
                  isActive
                    ? 'text-[#00E5FF] bg-[#00E5FF]/5'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon size={14} className={cn('transition-transform duration-200', isActive && 'scale-110')} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="intel-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#00E5FF]"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="h-px bg-slate-200 dark:bg-white/5" />
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'signals' && (
            <motion.div
              key="signals"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <VoiceJournalMonitor
                journals={journals}
                search={search}
                onRefresh={onRefresh}
                onOpenAria={onOpenAria}
              />
            </motion.div>
          )}
          {activeTab === 'knowledge' && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <KnowledgeVault search={search} onOpenAria={onOpenAria} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
