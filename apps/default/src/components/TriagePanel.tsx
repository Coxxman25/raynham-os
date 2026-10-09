import React from 'react';
import { Radar, X } from 'lucide-react';
import { Incident } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TriagePanelProps {
  incidents: Incident[];
  onOpenAria: (context?: string) => void;
  onClose: () => void;
  darkTheme?: boolean;
}

export function TriagePanel({ incidents: incidentsProp, onOpenAria, onClose, darkTheme }: TriagePanelProps) {
  const incidents = incidentsProp ?? [];
  const critical = incidents.filter(i => (i.severity === 'critical' || i.severity === 'high') && i.status === 'pending');
  const criticalCount = critical.length;

  // Pick the top incident to highlight
  const top = critical[0];
  const topContext = top
    ? `You are the AI safeguarding assistant for Greenfield Academy. A high-priority safeguarding concern has been reported at ${top.locationCode ?? 'unknown location'}. The report states: "${top.description.replace(/^\[[A-Z_]+\]\s*/, '')}". Please help the Designated Safeguarding Lead draft an appropriate, trauma-informed response and next steps.`
    : undefined;

  return (
    <div className="space-y-4">
      {top ? (
        <div className="bg-white/50 dark:bg-[#1A1C23]/50 border border-slate-200/50 dark:border-white/5 p-6 rounded-[1.5rem] group cursor-pointer hover:bg-white dark:hover:bg-[#1A1C23] transition-colors relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rose-500">
              <Radar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Urgent Safeguarding Concern
              </span>
            </div>
          </div>
          <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            {top.locationCode ?? 'Unknown Node'}
          </h5>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
            {top.description}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenAria(topContext); onClose(); }}
            className="w-full py-4 bg-slate-900 dark:bg-[#00E5FF] text-white dark:text-[#0F1117] rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-transform"
          >
            Open ARIA Case Review
          </button>
        </div>
      ) : (
        <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.5rem] text-center">
          <div className="w-12 h-12 rounded-full bg-[#00E5FF]/10 flex items-center justify-center mx-auto mb-4">
            <span className="w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.6)]" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest block mb-2">No Urgent Cases</span>
          <p className="text-xs text-slate-500 dark:text-white/50 font-medium leading-relaxed">
            No high-priority concerns at this time. ARIA is monitoring all campus areas.
          </p>
        </div>
      )}

      {/* Secondary incidents */}
      {critical.slice(1, 4).map(inc => (
        <div key={inc.id} className="p-4 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 font-mono">
              {inc.locationCode ?? 'Unknown'}
            </p>
            <p className="text-xs text-slate-700 dark:text-white/70 font-medium line-clamp-2">{inc.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
