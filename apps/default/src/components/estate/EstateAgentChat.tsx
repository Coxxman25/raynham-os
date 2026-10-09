import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { ulid } from 'ulidx';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

const AGENT_ID = '01KRYKE3TVFYXGG1BDJ9JR1PP0';

export function FloatingAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<ReturnType<typeof createAgentChat> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(async () => {
    if (chat) {
      setIsOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { conversationId } = await createConversation(AGENT_ID);
      setChat(createAgentChat(AGENT_ID, conversationId));
      setIsOpen(true);
    } catch (err) {
      setError('The assistant is warming up. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [chat]);

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        disabled={loading}
        className={cn(
          // Sits ABOVE the mobile bottom nav (bottom-20) so it never overlaps.
          // On lg+ the nav becomes a left rail so we can hug the bottom-right corner.
          'fixed bottom-20 right-4 sm:bottom-24 sm:right-6 lg:bottom-6 z-40',
          'w-14 h-14 rounded-full flex items-center justify-center',
          'shadow-lg transition-transform hover:scale-105 active:scale-95',
        )}
        style={{
          background: 'var(--brass)',
          color: '#fff',
          boxShadow: '0 4px 16px var(--brass-dim)',
        }}
        aria-label="Chat with estate assistant"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50',
        'flex flex-col',
        'w-full h-full sm:w-[400px] sm:h-[600px]',
        'rounded-none sm:rounded-2xl overflow-hidden',
      )}
      style={{
        background: 'var(--rail-bg)',
        border: '1px solid var(--rail-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      <ChatHeader onClose={() => setIsOpen(false)} />
      {error ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={handleOpen}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white"
              style={{ background: 'var(--brass)' }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : chat ? (
        <ActiveChat chat={chat} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--surface-border)] border-t-[var(--brass)] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
      style={{ borderColor: 'var(--rail-border)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brass-dim)' }}
        >
          <Sparkles className="w-4 h-4" style={{ color: 'var(--brass)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ARIA</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Estate Assistant</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors"
        aria-label="Close chat"
      >
        <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}

function ActiveChat({ chat }: { chat: ReturnType<typeof createAgentChat> }) {
  const { messages, status, error: chatError } = useChat({ chat, id: chat.id });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSending = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending) return;
    setInput('');
    await chat.sendMessage({
      id: ulid(),
      role: 'user',
      parts: [{ type: 'text', text }],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
        style={{ background: 'var(--canvas-bg)' }}
      >
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--brass-dim)' }}
            >
              <Sparkles className="w-6 h-6" style={{ color: 'var(--brass)' }} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Welcome to Raynham Estate OS
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ask about estate locations, reports, or safety
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'flex flex-col gap-1',
              msg.role === 'user' ? 'items-end' : 'items-start',
            )}
          >
            {msg.parts.map((part, i) => {
              if (part.type === 'text') {
                return (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'text-white'
                        : ''
                    )}
                    style={msg.role === 'user' ? {
                      background: 'var(--brass)',
                      color: '#fff',
                    } : {
                      background: 'var(--surface)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words">{part.text}</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

        {isSending && (
          <div className="flex items-start gap-2">
            <div
              className="rounded-2xl px-3.5 py-2.5"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
              }}
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {chatError && (
          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--status-critical)' }}>
              Something went wrong. Please try again.
            </p>
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-2 p-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--rail-border)', background: 'var(--rail-bg)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Ask ARIA..."
          className={cn(
            'flex-1 px-3.5 py-2.5 rounded-xl text-sm',
            'outline-none transition-colors',
            'disabled:opacity-50',
          )}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isSending}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-opacity disabled:opacity-40',
          )}
          style={{
            background: 'var(--brass)',
            color: '#fff',
          }}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
