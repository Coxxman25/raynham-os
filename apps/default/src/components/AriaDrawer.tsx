import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ArrowUp, Zap, Radio, ChevronRight, CornerDownRight } from 'lucide-react';
import { useAgentChat, createConversation } from '@/lib/agent-chat';
import { cn } from '@/lib/utils';
import { AriaMarkdown } from './AriaMarkdown';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_ID = '01KRYKE3TVFYXGG1BDJ9JR1PP0';

interface AriaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  /** When true, renders inline (no backdrop, no slide animation) for use inside ContextPanel */
  inline?: boolean;
}

const STARTER_PROMPTS = [
  { label: 'Review all open incident cases', icon: '📋' },
  { label: 'Draft a Safety Lead alert message', icon: '🛡' },
  { label: 'Identify highest-risk zones on the map', icon: '📍' },
  { label: 'Summarise this week\'s incidents', icon: '⚡' },
  { label: 'What should I do in a lone worker emergency?', icon: '🆘' },
  { label: 'UK legal brief — use of reasonable force', icon: '⚖️' },
];

/* ─── Typing indicator ─────────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]/60"
          style={{ animation: `aria-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ─── Quick Reply Chips ────────────────────────────────────────────────────── */

interface QuickReply {
  label: string;
  prompt: string;
  icon?: string;
}

function detectQuickReplies(content: string): QuickReply[] {
  const replies: QuickReply[] = [];
  const lower = content.toLowerCase();

  // After incident summaries → offer deeper analysis
  if (lower.includes('incident') || lower.includes('case') || lower.includes('concern')) {
    if (lower.includes('critical') || lower.includes('high')) {
      replies.push({ label: 'Escalate highest priority', prompt: 'Draft an escalation message for the highest-priority unacknowledged incident', icon: '🚨' });
    }
    if (lower.includes('zone') || lower.includes('location')) {
      replies.push({ label: 'Show risk clusters', prompt: 'Analyse spatial clustering — which zones have the highest incident concentration?', icon: '📍' });
    }
    replies.push({ label: 'Export summary', prompt: 'Format a comprehensive incident summary report suitable for a compliance audit', icon: '📊' });
  }

  // After legal/policy content → offer practical application
  if (lower.includes('legal') || lower.includes('law') || lower.includes('legislation') || lower.includes('policy')) {
    replies.push({ label: 'Practical example', prompt: 'Give me a practical scenario-based example of how to apply this guidance on-site', icon: '💡' });
  }

  // After alert drafts → offer customisation
  if (lower.includes('alert') || lower.includes('draft') || lower.includes('message') || lower.includes('subject:')) {
    replies.push({ label: 'Customise for live incident', prompt: 'Now customise this alert for the most critical live incident with all fields pre-filled', icon: '✏️' });
    replies.push({ label: 'Send protocol', prompt: 'What is the send protocol? Who gets this message first, second, and third?', icon: '📨' });
  }

  // After SOS / emergency content
  if (lower.includes('sos') || lower.includes('emergency') || lower.includes('lone worker')) {
    replies.push({ label: 'Emergency checklist', prompt: 'Give me a step-by-step emergency response checklist I can follow right now', icon: '✅' });
  }

  // Generic follow-ups (always available as fallback)
  if (replies.length === 0) {
    replies.push({ label: 'Dig deeper', prompt: 'Tell me more about this — provide additional detail and context', icon: '🔍' });
    replies.push({ label: 'Summarise key points', prompt: 'Summarise the key actionable points from your response in a numbered list', icon: '📋' });
  }

  // Cap at 3
  return replies.slice(0, 3);
}

function QuickReplyChips({
  content,
  onSend,
  disabled,
}: {
  content: string;
  onSend: (prompt: string) => void;
  disabled: boolean;
}) {
  const replies = useMemo(() => detectQuickReplies(content), [content]);

  if (replies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap gap-2 mt-3 pl-10"
    >
      {replies.map((r, i) => (
        <button
          key={i}
          onClick={() => onSend(r.prompt)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all',
            'bg-white/[0.03] border border-white/[0.06]',
            'hover:bg-[#00E5FF]/[0.06] hover:border-[#00E5FF]/20 hover:text-[#00E5FF]',
            'text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed',
            'active:scale-95'
          )}
        >
          <span className="text-xs leading-none">{r.icon}</span>
          <span>{r.label}</span>
          <CornerDownRight size={10} className="text-slate-600 ml-0.5" />
        </button>
      ))}
    </motion.div>
  );
}

/* ─── Main Drawer ──────────────────────────────────────────────────────────── */

export function AriaDrawer({ isOpen, onClose, context, inline = false }: AriaDrawerProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [contextSent, setContextSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isConnected, sendMessage } = useAgentChat(AGENT_ID, conversationId);

  // Create / reset conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      createConversation(AGENT_ID)
        .then(res => {
          setConversationId(res.conversationId);
          setContextSent(false);
        })
        .catch(err => console.error('ARIA: failed to create conversation', err));
    }
    if (!isOpen) {
      setConversationId(null);
      setContextSent(false);
    }
  }, [isOpen]);

  // Auto-send context message
  useEffect(() => {
    if (isConnected && conversationId && context && typeof context === 'string' && !contextSent) {
      sendMessage(context);
      setContextSent(true);
    }
  }, [isConnected, conversationId, context, contextSent]);

  // Scroll to latest
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && isConnected) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, isConnected]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = inputValue.trim();
    if (!val || !conversationId) return;
    sendMessage(val);
    setInputValue('');
  };

  const handleQuickSend = (prompt: string) => {
    if (!conversationId || !isConnected) return;
    sendMessage(prompt);
  };

  const handleStarter = (prompt: string) => {
    if (!conversationId || !isConnected) return;
    sendMessage(prompt);
  };

  const isThinking = messages.length > 0 && messages[messages.length - 1].role === 'user';
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

  // In inline mode, render just the panel content — no backdrop, no slide
  if (inline) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#0F1117' }}>
        <style>{`
          @keyframes aria-dot-bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
            30% { transform: translateY(-5px); opacity: 1; }
          }
          @keyframes aria-scan {
            0% { transform: translateX(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(400px); opacity: 0; }
          }
          .aria-scan-line { animation: aria-scan 3s ease-in-out infinite; }
        `}</style>
        {/* Inline shares the same inner structure without the outer backdrop/positioning */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar scroll-smooth">
          {/* (inline ARIA message list — same content, compact) */}
          {!isConnected && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <div className="w-8 h-8 rounded-full border-2 border-[#00E5FF]/20 border-t-[#00E5FF] animate-spin" />
              <p className="text-[10px] font-semibold uppercase tracking-widest">Connecting to ARIA…</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
                  <div className="shrink-0 mt-0.5">
                    {isUser
                      ? <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600/40 to-slate-700 border border-slate-500/20 flex items-center justify-center text-[8px] font-black text-white">SJ</div>
                      : <div className="w-6 h-6 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center"><Zap size={10} className="text-[#00E5FF]" /></div>
                    }
                  </div>
                  <div className={cn('min-w-0', isUser ? 'max-w-[80%] flex flex-col items-end' : 'max-w-[90%]')}>
                    {isUser
                      ? <div className="px-3 py-2 rounded-xl rounded-tr-sm bg-[#1A1C23] border border-white/[0.06] text-[12px] text-white font-medium leading-relaxed">{msg.content}</div>
                      : <div className="rounded-xl rounded-tl-sm bg-[#13151C] border border-white/[0.06] px-3 py-3"><AriaMarkdown content={msg.content} /></div>
                    }
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isThinking && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0"><Zap size={10} className="text-[#00E5FF]" /></div>
              <div className="px-2 py-2 rounded-xl rounded-tl-sm bg-[#13151C] border border-white/[0.06]"><TypingIndicator /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Inline input */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-white/[0.06]">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={isConnected ? 'Ask ARIA…' : 'Connecting…'}
              disabled={!isConnected}
              className="w-full text-[12px] font-medium text-white placeholder:text-slate-600 bg-[#1A1C23] border border-white/[0.07] rounded-xl pl-4 pr-11 py-3 focus:outline-none focus:border-[#00E5FF]/40 transition-all disabled:opacity-40"
            />
            <button type="submit" disabled={!inputValue.trim() || !isConnected} className={cn('absolute right-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all', inputValue.trim() && isConnected ? 'bg-[#00E5FF] text-[#0F1117] hover:scale-105' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed')}>
              <ArrowUp size={13} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes aria-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes aria-scan {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(400px); opacity: 0; }
        }
        .aria-scan-line {
          animation: aria-scan 3s ease-in-out infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-all duration-500',
          isOpen
            ? 'bg-black/40 backdrop-blur-[2px] pointer-events-auto'
            : 'bg-transparent backdrop-blur-none pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'w-[460px] max-w-full',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ background: '#0F1117' }}
      >
        {/* Top border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent" />

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="relative shrink-0 px-7 pt-7 pb-6 border-b border-white/[0.06] overflow-hidden">
          <div
            className="aria-scan-line absolute top-0 left-0 h-full w-12 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.04), transparent)' }}
          />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00E5FF]/20 to-[#00E5FF]/5 border border-[#00E5FF]/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.15)]">
                  <Zap className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <span
                  className={cn(
                    'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0F1117] transition-colors duration-500',
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  )}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white tracking-tight leading-none">ARIA</h2>
                  <span className="text-[9px] font-bold text-[#00E5FF]/80 bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-2 py-0.5 rounded-full uppercase tracking-[0.15em]">
                    Defence Intelligence
                  </span>
                </div>
                <p className="text-[10px] mt-1.5 font-semibold uppercase tracking-[0.18em] flex items-center gap-1.5">
                  {isConnected ? (
                    <>
                      <Radio size={8} className="text-emerald-400" />
                      <span className="text-emerald-400">Defence Intelligence Active</span>
                    </>
                  ) : (
                    <span className="text-slate-600">Establishing Link…</span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 text-slate-500 hover:text-white transition-all flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* Context banner */}
          <AnimatePresence>
            {context && typeof context === 'string' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="bg-[#00E5FF]/[0.06] border border-[#00E5FF]/20 rounded-xl px-4 py-3">
                  <p className="text-[9px] font-bold text-[#00E5FF]/60 uppercase tracking-[0.2em] mb-1">Active Context</p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 font-medium">{context}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── MESSAGES ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 no-scrollbar scroll-smooth">

          {/* Empty / welcome state */}
          {messages.length === 0 && isConnected && !context && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center justify-center h-full text-center pb-8"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#00E5FF]/15 to-transparent border border-[#00E5FF]/15 flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(0,229,255,0.08)]">
                <Zap className="w-7 h-7 text-[#00E5FF]/70" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">ARIA is ready.</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Review incidents, draft Safety Lead alerts, analyse risk patterns, or get instant UK legal guidance.
              </p>

              <div className="mt-8 w-full space-y-2.5 max-w-[320px]">
                {STARTER_PROMPTS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => handleStarter(p.label)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-[#00E5FF]/20 rounded-xl text-left transition-all group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base leading-none">{p.icon}</span>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">{p.label}</span>
                    </span>
                    <ChevronRight size={13} className="text-slate-700 group-hover:text-[#00E5FF] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Connecting state */}
          {!isConnected && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
              <div className="w-10 h-10 rounded-full border-2 border-[#00E5FF]/20 border-t-[#00E5FF] animate-spin" />
              <p className="text-xs font-semibold uppercase tracking-widest">Connecting to ARIA…</p>
            </div>
          )}

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map((msg, msgIndex) => {
              const isUser = msg.role === 'user';
              const isLastAssistant = !isUser && msg.id === lastAssistantMessage?.id;

              return (
                <React.Fragment key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-1">
                      {isUser ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600/40 to-slate-700 border border-slate-500/20 flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                          SJ
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
                          <Zap size={12} className="text-[#00E5FF]" />
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={cn('min-w-0', isUser ? 'max-w-[80%] flex flex-col items-end' : 'max-w-[90%]')}>
                      {/* Role label */}
                      <p className={cn(
                        'text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5 px-0.5',
                        isUser ? 'text-slate-500/70' : 'text-[#00E5FF]/40'
                      )}>
                        {isUser ? 'You' : 'ARIA'}
                      </p>

                      {isUser ? (
                        /* ── User message ── */
                        <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#1A1C23] to-[#1E2029] border border-white/[0.06] text-[13px] text-white font-medium leading-relaxed shadow-sm">
                          {msg.content}
                        </div>
                      ) : (
                        /* ── ARIA message — rich formatting ── */
                        <div className="rounded-2xl rounded-tl-sm bg-[#13151C] border border-white/[0.06] overflow-hidden shadow-sm">
                          <div className="px-4 py-4">
                            <AriaMarkdown content={msg.content} />
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-[8px] text-slate-700 mt-1.5 px-0.5 font-mono tabular-nums">
                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>

                  {/* Quick reply chips — only after the LAST assistant message and not thinking */}
                  {isLastAssistant && !isThinking && (
                    <QuickReplyChips
                      content={msg.content}
                      onSend={handleQuickSend}
                      disabled={!isConnected}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </AnimatePresence>

          {/* ARIA thinking indicator */}
          <AnimatePresence>
            {isThinking && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0 mt-1">
                  <Zap size={12} className="text-[#00E5FF]" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5 px-0.5 text-[#00E5FF]/40">ARIA</p>
                  <div className="px-1 py-2 rounded-2xl rounded-tl-sm bg-[#13151C] border border-white/[0.06]">
                    <TypingIndicator />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-7 pt-4 border-t border-white/[0.06]">
          <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/20 to-transparent mb-4" />

          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={isConnected ? 'Ask ARIA…' : 'Connecting…'}
              disabled={!isConnected}
              className={cn(
                'w-full text-sm font-medium text-white placeholder:text-slate-600',
                'bg-[#1A1C23] border border-white/[0.07]',
                'rounded-2xl pl-5 pr-14 py-4',
                'focus:outline-none focus:border-[#00E5FF]/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]',
                'transition-all duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || !isConnected}
              className={cn(
                'absolute right-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                inputValue.trim() && isConnected
                  ? 'bg-[#00E5FF] text-[#0F1117] hover:bg-[#33EEFF] shadow-[0_0_16px_rgba(0,229,255,0.3)] hover:scale-105 active:scale-95'
                  : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
              )}
            >
              <ArrowUp size={15} />
            </button>
          </form>

          <p className="text-[9px] text-slate-700 text-center mt-3 uppercase tracking-[0.15em] font-semibold">
            ARIA · SafeGuard Absolute Defence OS
          </p>
        </div>
      </div>
    </>
  );
}
