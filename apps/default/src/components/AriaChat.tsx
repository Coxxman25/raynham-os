import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, Database, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function AriaChat({ context }: { context?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // Handle incoming context from triage
  useEffect(() => {
    if (context) {
      setMessages([
        { id: '1', role: 'user', content: context },
        { 
          id: '2', 
          role: 'assistant', 
          content: 'I am analyzing the recent cluster at **Terminal 1 — Departures Hall**. I\'ve cross-referenced this with the _Airport_Security_Protocol_2025.pdf_ in your Knowledge Vault.',
          isStreaming: false
        }
      ]);
    }
  }, [context]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '1', role: 'assistant', content: 'Processing request...', isStreaming: true }
      ]);

      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.isStreaming 
            ? { ...m, content: 'Based on the policy guidelines, I recommend immediate isolation of the affected zone and dispatching the maintenance team for surface inspection. Would you like me to draft the maintenance ticket?', isStreaming: false }
            : m
        ));
      }, 1500);
    }, 500);
  };

  return (
    <div className="absolute inset-0 pt-24 flex-col bg-slate-50 dark:bg-[#0A0B0E] flex animate-in fade-in duration-500 z-10">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full border-x border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-[#12141A]/50 backdrop-blur-xl relative shadow-2xl overflow-hidden">
        
        {/* Chat Header */}
        <div className="h-20 px-8 border-b border-slate-200/50 dark:border-white/5 flex items-center gap-4 bg-white/80 dark:bg-[#1A1C23]/80 backdrop-blur-2xl shrink-0 z-20">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF] flex items-center justify-center text-white shadow-lg shadow-[#00E5FF]/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">ARIA Intelligence</h3>
            <p className="text-[9px] text-[#00E5FF] uppercase tracking-widest mt-0.5 font-bold">RAG Systems Online</p>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Sparkles className="w-12 h-12 text-[#00E5FF] mb-4" />
              <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">How can I assist your operations today?</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-4 max-w-2xl", msg.role === 'user' ? "ml-auto justify-end" : "")}>
              {msg.role === 'user' ? (
                <>
                  <div className="bg-slate-900 dark:bg-[#00E5FF] text-white dark:text-[#12141A] p-5 rounded-3xl rounded-tr-none shadow-md">
                    <p className="text-sm leading-relaxed font-bold">{msg.content}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold border border-slate-300 dark:border-white/10 shrink-0 mt-1 text-slate-700 dark:text-white">
                    SJ
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shrink-0 mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="space-y-3">
                    <div className="glass-panel p-6 rounded-3xl rounded-tl-none">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {msg.content}
                      </p>
                    </div>
                    {msg.isStreaming ? (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pl-3 animate-pulse">
                        <Database className="w-3 h-3" /> Querying Vault Vectors...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pl-3">
                        <Database className="w-3 h-3" /> Querying Vault Vectors... <span className="text-[#00E5FF] font-bold">Done</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/80 dark:bg-[#1A1C23]/80 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/5 mt-auto shrink-0 z-20">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask ARIA to analyze risk or draft protocols..."
              className="w-full bg-slate-100 dark:bg-[#12141A] border border-slate-200 dark:border-white/10 rounded-full py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:border-[#00E5FF] text-slate-900 dark:text-white transition-colors"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 w-10 h-10 rounded-full bg-[#00E5FF] text-[#0F1117] flex items-center justify-center hover:scale-105 transition-transform shadow-md disabled:opacity-50 disabled:hover:scale-100"
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}