import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy, Check, ChevronDown, ChevronRight,
  AlertTriangle, ShieldAlert, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Copy Button ──────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-200',
        copied
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-[#00E5FF] hover:border-[#00E5FF]/25 hover:bg-[#00E5FF]/[0.06]'
      )}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ─── Collapsible Section ──────────────────────────────────────────────────── */

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-3 mb-2 first:mt-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <div className={cn(
          'w-4 h-4 rounded flex items-center justify-center transition-all duration-200',
          'bg-white/[0.04] border border-white/[0.06] group-hover:border-[#00E5FF]/25'
        )}>
          {open
            ? <ChevronDown size={10} className="text-[#00E5FF]" />
            : <ChevronRight size={10} className="text-slate-500 group-hover:text-[#00E5FF]" />
          }
        </div>
        <span className="text-[12px] font-black text-white uppercase tracking-[0.08em] leading-tight group-hover:text-[#00E5FF] transition-colors">
          {title}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-6 pt-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Callout / Alert Box ──────────────────────────────────────────────────── */

type CalloutType = 'warning' | 'critical' | 'info';

function detectCalloutType(text: string): CalloutType {
  const lower = text.toLowerCase();
  if (lower.includes('breach') || lower.includes('critical') || lower.includes('emergency') || lower.includes('🔴')) return 'critical';
  if (lower.includes('warning') || lower.includes('caution') || lower.includes('⚠')) return 'warning';
  return 'info';
}

const calloutStyles: Record<CalloutType, { bg: string; border: string; icon: React.ReactNode; label: string; labelColor: string }> = {
  critical: {
    bg: 'bg-rose-500/[0.06]',
    border: 'border-rose-500/20',
    icon: <ShieldAlert size={11} className="text-rose-400" />,
    label: 'CRITICAL',
    labelColor: 'text-rose-400',
  },
  warning: {
    bg: 'bg-amber-400/[0.06]',
    border: 'border-amber-400/20',
    icon: <AlertTriangle size={11} className="text-amber-400" />,
    label: 'WARNING',
    labelColor: 'text-amber-400',
  },
  info: {
    bg: 'bg-[#00E5FF]/[0.05]',
    border: 'border-[#00E5FF]/15',
    icon: <Info size={11} className="text-[#00E5FF]" />,
    label: 'NOTE',
    labelColor: 'text-[#00E5FF]',
  },
};

/* ─── Stat Pill (for summary headers) ──────────────────────────────────────── */

function StatPill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl border',
      color
    )}>
      <span className="text-sm font-black tabular-nums leading-none">{value}</span>
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] opacity-70">{label}</span>
    </div>
  );
}

/* ─── Markdown Components ──────────────────────────────────────────────────── */

// Track section count to auto-collapse after the 2nd
let sectionCount = 0;

function createMarkdownComponents() {
  // Reset counter per render
  sectionCount = 0;

  const components: Record<string, React.FC<any>> = {
    // ── Headings ─────────────────────────────────────────────────────────
    h1: ({ children }) => {
      const text = typeof children === 'string' ? children : extractText(children);
      sectionCount++;
      // First 2 sections open, rest collapsed
      const shouldBeOpen = sectionCount <= 2;
      return (
        <CollapsibleSection title={text} defaultOpen={shouldBeOpen}>
          <span />
        </CollapsibleSection>
      );
    },

    h2: ({ children }) => {
      const text = typeof children === 'string' ? children : extractText(children);
      sectionCount++;
      const shouldBeOpen = sectionCount <= 2;
      return (
        <CollapsibleSection title={text} defaultOpen={shouldBeOpen}>
          <span />
        </CollapsibleSection>
      );
    },

    h3: ({ children }) => (
      <div className="mt-3 mb-1.5 first:mt-0">
        <h3 className="text-[11px] font-bold text-[#00E5FF] uppercase tracking-[0.1em] leading-tight flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#00E5FF]/60 shrink-0" />
          {children}
        </h3>
      </div>
    ),

    // ── Paragraphs ───────────────────────────────────────────────────────
    p: ({ children }) => (
      <p className="text-[12.5px] text-slate-300 leading-[1.75] mb-2 last:mb-0">{children}</p>
    ),

    // ── Emphasis ──────────────────────────────────────────────────────────
    strong: ({ children }) => (
      <strong className="text-[#00E5FF] font-bold">{children}</strong>
    ),

    em: ({ children }) => (
      <em className="text-amber-300/90 not-italic font-semibold">{children}</em>
    ),

    // ── Lists ────────────────────────────────────────────────────────────
    ul: ({ children }) => (
      <ul className="my-2 space-y-1.5 pl-0">{children}</ul>
    ),

    ol: ({ children }) => (
      <ol className="my-2 space-y-2 pl-0">{children}</ol>
    ),

    li: ({ children, ordered, index }: any) => (
      <li className="flex gap-2.5 text-[12px] text-slate-300 leading-[1.7]">
        <span className="shrink-0 mt-[4px]">
          {ordered ? (
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-md bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[9px] font-black text-[#00E5FF]">
              {(index ?? 0) + 1}
            </span>
          ) : (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00E5FF]/50 mt-[2px]" />
          )}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
      </li>
    ),

    // ── Code ─────────────────────────────────────────────────────────────
    code: ({ children, className }: any) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        const content = typeof children === 'string' ? children : extractText(children);
        return (
          <div className="my-2.5 rounded-xl bg-[#0A0B0F] border border-white/[0.06] overflow-hidden group relative">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <CopyButton text={content} />
            </div>
            <div className="px-4 py-3 overflow-x-auto">
              <code className="text-[11px] text-[#00E5FF] font-mono leading-relaxed whitespace-pre-wrap break-words">
                {children}
              </code>
            </div>
          </div>
        );
      }
      return (
        <code className="text-[11px] font-mono text-[#00E5FF] bg-[#00E5FF]/[0.08] border border-[#00E5FF]/10 px-1.5 py-0.5 rounded-md">
          {children}
        </code>
      );
    },

    pre: ({ children }) => <>{children}</>,

    // ── Blockquote → Callout Box ─────────────────────────────────────────
    blockquote: ({ children }) => {
      const text = extractText(children);
      const type = detectCalloutType(text);
      const style = calloutStyles[type];

      return (
        <div className={cn('my-3 rounded-xl border overflow-hidden', style.bg, style.border)}>
          <div className="flex items-center gap-2 px-3.5 py-2 border-b border-white/[0.04]">
            {style.icon}
            <span className={cn('text-[9px] font-black uppercase tracking-[0.15em]', style.labelColor)}>
              {style.label}
            </span>
          </div>
          <div className="px-3.5 py-2.5 text-[12px] leading-[1.7] [&>p]:mb-1 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      );
    },

    // ── Horizontal rule → Section divider ────────────────────────────────
    hr: () => (
      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <span className="w-1 h-1 rounded-full bg-white/[0.08]" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>
    ),

    // ── Table ────────────────────────────────────────────────────────────
    table: ({ children }) => (
      <div className="my-3 rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">{children}</table>
        </div>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[#00E5FF]/[0.06] border-b border-white/[0.04]">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-white/[0.04]">{children}</tbody>
    ),
    tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
    th: ({ children }) => (
      <th className="px-3 py-2.5 text-left text-[9px] font-black text-[#00E5FF] uppercase tracking-[0.12em] whitespace-nowrap">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{children}</td>
    ),

    // ── Links ────────────────────────────────────────────────────────────
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#00E5FF] underline underline-offset-2 decoration-[#00E5FF]/30 hover:decoration-[#00E5FF] transition-colors font-semibold"
      >
        {children}
      </a>
    ),
  };

  return components;
}

/* ─── Helper: extract raw text from React children ─────────────────────────── */

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as React.ReactElement).props.children);
  }
  return '';
}

/* ─── Summary Stats Detector ───────────────────────────────────────────────── */

interface DetectedStats {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  total?: number;
  resolved?: number;
}

function detectStats(content: string): DetectedStats | null {
  const stats: DetectedStats = {};
  let found = 0;

  const patterns: [keyof DetectedStats, RegExp][] = [
    ['critical', /(\d+)\s*(?:×|x)?\s*critical/i],
    ['high', /(\d+)\s*(?:×|x)?\s*high/i],
    ['medium', /(\d+)\s*(?:×|x)?\s*medium/i],
    ['low', /(\d+)\s*(?:×|x)?\s*low/i],
    ['total', /(\d+)\s*(?:total|incidents|cases|concerns)/i],
    ['resolved', /(\d+)\s*(?:resolved|closed)/i],
  ];

  for (const [key, regex] of patterns) {
    const match = content.match(regex);
    if (match) {
      stats[key] = parseInt(match[1], 10);
      found++;
    }
  }

  return found >= 2 ? stats : null;
}

/* ─── Main AriaMarkdown Component ──────────────────────────────────────────── */

interface AriaMarkdownProps {
  content: string;
}

export function AriaMarkdown({ content }: AriaMarkdownProps) {
  const components = createMarkdownComponents();
  const stats = detectStats(content);
  const fullTextForCopy = content;

  return (
    <div className="relative group/msg">
      {/* Copy entire message button — top right on hover */}
      <div className="absolute -top-1 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20">
        <CopyButton text={fullTextForCopy} />
      </div>

      {/* Stats summary bar — rendered when stats are detected */}
      {stats && (
        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/[0.05]">
          {stats.critical !== undefined && stats.critical > 0 && (
            <StatPill value={String(stats.critical)} label="Critical" color="bg-rose-500/10 border-rose-500/20 text-rose-400" />
          )}
          {stats.high !== undefined && stats.high > 0 && (
            <StatPill value={String(stats.high)} label="High" color="bg-amber-400/10 border-amber-400/20 text-amber-400" />
          )}
          {stats.medium !== undefined && stats.medium > 0 && (
            <StatPill value={String(stats.medium)} label="Medium" color="bg-yellow-400/10 border-yellow-400/20 text-yellow-400" />
          )}
          {stats.low !== undefined && stats.low > 0 && (
            <StatPill value={String(stats.low)} label="Low" color="bg-[#00E5FF]/10 border-[#00E5FF]/20 text-[#00E5FF]" />
          )}
          {stats.total !== undefined && (
            <StatPill value={String(stats.total)} label="Total" color="bg-white/[0.04] border-white/[0.08] text-slate-300" />
          )}
          {stats.resolved !== undefined && stats.resolved > 0 && (
            <StatPill value={String(stats.resolved)} label="Resolved" color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
          )}
        </div>
      )}

      {/* Markdown body */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
