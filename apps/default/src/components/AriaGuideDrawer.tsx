import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import { useAgentChat, createConversation } from '@/lib/agent-chat';
import { ARIA_AGENT_ID } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AriaGuideDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Situation label, e.g. "Physical Threat" */
  situationLabel: string;
  /** Zone / location code, e.g. "ENT-A" */
  loc: string;
  /** Request to close the drawer */
  onClose: () => void;
  /** Palette accent for the header glow */
  accentClass: string;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Markdown inline renderer ─────────────────────────────────────────────────
// Parses **bold**, *italic*, and `code` within a text segment.

function renderInline(text: string, key: string | number): React.ReactNode {
  // Split on bold (**...**), italic (*...*), or inline code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em key={i} className="italic text-white/80">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="font-mono text-xs bg-white/10 text-amber-300 px-1.5 py-0.5 rounded">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

// ─── Markdown block renderer ──────────────────────────────────────────────────
// Converts raw ARIA markdown into structured, readable React nodes.

function AriaMarkdown({ content }: { content: string }) {
  // Normalise — remove excessive whitespace, convert --- separators
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/---+/g, '---')
    .split('\n');

  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // ── Skip blank lines between blocks ──
    if (line === '') {
      i++;
      continue;
    }

    // ── Horizontal rule ──
    if (line === '---') {
      nodes.push(
        <div key={`hr-${i}`} className="my-3 border-t border-white/10" />
      );
      i++;
      continue;
    }

    // ── H1 : # ──
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={`h1-${i}`} className="text-base font-black text-white mt-4 mb-1 tracking-tight leading-snug">
          {renderInline(line.slice(2), `h1-t-${i}`)}
        </h2>
      );
      i++;
      continue;
    }

    // ── H2 : ## ──
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${i}`} className="text-[13px] font-black text-amber-300 mt-4 mb-1.5 uppercase tracking-widest leading-snug">
          {renderInline(line.slice(3), `h2-t-${i}`)}
        </h3>
      );
      i++;
      continue;
    }

    // ── H3 : ### ──
    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-white/70 mt-3 mb-1 uppercase tracking-wider leading-snug">
          {renderInline(line.slice(4), `h3-t-${i}`)}
        </h4>
      );
      i++;
      continue;
    }

    // ── Numbered list item : "1. …" ──
    if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        nodes.push(
          <div key={`li-${i}`} className="flex gap-3 items-start py-1.5 border-b border-white/5 last:border-0">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black flex items-center justify-center mt-0.5">
              {numMatch[1]}
            </span>
            <p className="text-sm text-white/85 leading-snug flex-1">
              {renderInline(numMatch[2], `li-t-${i}`)}
            </p>
          </div>
        );
      }
      i++;
      continue;
    }

    // ── Bullet : "- …" or "• …" ──
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.startsWith('- ') ? line.slice(2) : line.slice(2);
      // Detect "Do not" / warning bullets
      const isWarning = /^(?:do not|don't|never|avoid)/i.test(text);
      nodes.push(
        <div key={`bullet-${i}`} className="flex gap-2.5 items-start py-1">
          <span className={[
            'flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2',
            isWarning ? 'bg-red-400' : 'bg-amber-400/60',
          ].join(' ')} />
          <p className={[
            'text-sm leading-snug flex-1',
            isWarning ? 'text-red-300' : 'text-white/80',
          ].join(' ')}>
            {renderInline(text, `b-t-${i}`)}
          </p>
        </div>
      );
      i++;
      continue;
    }

    // ── Bold-only paragraph : entire line is **...**  (treat as callout) ──
    if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      nodes.push(
        <p key={`callout-${i}`} className="text-sm font-bold text-amber-300 mt-2 mb-0.5 leading-snug">
          {line.slice(2, -2)}
        </p>
      );
      i++;
      continue;
    }

    // ── Plain paragraph ──
    nodes.push(
      <p key={`p-${i}`} className="text-sm text-white/80 leading-relaxed mt-1.5">
        {renderInline(line, `p-t-${i}`)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function MessageBubble({ role, content, isStreaming }: BubbleProps) {
  const isUser = role === 'user';
  return (
    <motion.div
      className={['flex w-full mb-3', isUser ? 'justify-end' : 'justify-start'].join(' ')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>
      )}

      {isUser ? (
        // ── User bubble: plain pill ──
        <div className="max-w-[78%] bg-white text-black rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-medium leading-snug">
          {content}
        </div>
      ) : (
        // ── ARIA bubble: full markdown render ──
        <div className="flex-1 min-w-0 bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3.5">
          <AriaMarkdown content={content} />
          {isStreaming && (
            <span className="inline-block w-0.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse rounded-full align-middle mt-1" />
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

export function AriaGuideDrawer({
  open,
  situationLabel,
  loc,
  onClose,
  accentClass,
}: AriaGuideDrawerProps) {
  // ── Chat state ──────────────────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [contextSent, setContextSent] = useState(false);

  const { sendMessage, messages, isConnected, error } = useAgentChat(
    ARIA_AGENT_ID,
    conversationId,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Init conversation when drawer opens ─────────────────────────────────────
  useEffect(() => {
    if (!open || conversationId || isCreating) return;

    let cancelled = false;
    setIsCreating(true);
    setInitError(null);

    createConversation(ARIA_AGENT_ID)
      .then(({ conversationId: newId }) => {
        if (cancelled) return;
        setConversationId(newId);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[AriaGuideDrawer] createConversation failed', err);
        setInitError('Could not connect to ARIA. Check your network and try again.');
      })
      .finally(() => {
        if (!cancelled) setIsCreating(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Send pre-fill context once connected ────────────────────────────────────
  useEffect(() => {
    if (!isConnected || contextSent || !conversationId) return;

    const ctx = loc
      ? `I am dealing with: ${situationLabel} at zone ${loc}. Give me immediate guidance.`
      : `I am dealing with: ${situationLabel}. Give me immediate guidance.`;

    sendMessage(ctx).then(() => setContextSent(true)).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, contextSent, conversationId]);

  // ── Focus input when connected ───────────────────────────────────────────────
  useEffect(() => {
    if (isConnected && contextSent) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isConnected, contextSent]);

  // ── Reset when drawer closes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      // Don't reset — keep conversation so it's ready if re-opened
    }
  }, [open]);

  // ── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;
    setInputText('');
    try {
      await sendMessage(text);
    } catch (err) {
      console.error('[AriaGuideDrawer] sendMessage failed', err);
    }
  }, [inputText, conversationId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derive whether ARIA is currently streaming a response
  const lastMsg = messages[messages.length - 1];
  const isStreaming = lastMsg?.role === 'assistant' && lastMsg?.isComplete === false;
  const isWaiting = isConnected && contextSent && !isStreaming &&
    (messages.length === 0 || (messages.length === 1 && messages[0].role === 'user'));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Scrim ── */}
          <motion.div
            key="scrim"
            className="fixed inset-0 bg-black/60 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* ── Drawer panel ── */}
          <motion.div
            key="drawer"
            className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-[#0d0d0d] border-t border-white/10 rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '88dvh', height: '88dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* ── Handle bar ── */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* ARIA avatar */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  {/* Connection dot */}
                  <span className={[
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d0d]',
                    isConnected ? 'bg-emerald-400' : 'bg-white/20',
                  ].join(' ')} />
                </div>

                <div>
                  <p className="text-sm font-bold text-white leading-none">ARIA</p>
                  <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                    {isCreating
                      ? 'Connecting…'
                      : isConnected
                      ? 'Live · Situational Guidance'
                      : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Connection indicator */}
                {isConnected
                  ? <Wifi className="w-4 h-4 text-emerald-400" />
                  : <WifiOff className="w-4 h-4 text-white/20" />
                }
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors"
                  aria-label="Close ARIA chat"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </header>

            {/* ── Context banner ── */}
            <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0 bg-amber-950/20">
              <p className="text-[10px] text-amber-300/70 font-mono leading-snug">
                <span className="font-bold text-amber-300">Context: </span>
                {situationLabel}{loc ? ` · Zone ${loc}` : ''}
              </p>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

              {/* Init error */}
              {initError && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-snug">{initError}</p>
                </div>
              )}

              {/* Loading skeleton while creating conversation */}
              {isCreating && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="h-2.5 w-48 rounded-full bg-white/8 animate-pulse" />
                    <div className="h-2.5 w-32 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Waiting for ARIA to receive context */}
              {isWaiting && !isCreating && (
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {/* Message list — skip the first user message (context pre-fill) */}
              {messages.map((msg, idx) => {
                const isCtxMsg = idx === 0 && msg.role === 'user';
                if (isCtxMsg) return null;
                const isLast = idx === messages.length - 1;
                return (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isLast && isStreaming}
                  />
                );
              })}

              {/* Typing indicator while streaming */}
              {isStreaming && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {/* SDK-level error */}
              {error && !initError && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 rounded-xl p-3 mt-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-snug">{error.message}</p>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="px-4 pb-safe-bottom pb-5 pt-3 border-t border-white/8 flex-shrink-0">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-amber-500/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCreating
                      ? 'Connecting to ARIA…'
                      : !contextSent
                      ? 'Briefing ARIA…'
                      : 'Ask ARIA anything…'
                  }
                  disabled={!isConnected || !contextSent}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none outline-none leading-relaxed max-h-24 disabled:opacity-40"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || !isConnected || !contextSent}
                  className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-400 active:bg-amber-600 transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-center text-[10px] text-white/15 mt-2">
                ARIA · AI guidance · Not a substitute for emergency services
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
