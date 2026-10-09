/**
 * DemoModeBanner — Amber warning strip shown when Demo Mode is active.
 *
 * Appears at the top of the console, above the StatusStrip.
 * Uses CSS custom properties for theme-aware contrast.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '@/lib/app-context';

export function DemoModeBanner() {
  const { demoMode, setDemoMode } = useApp();

  return (
    <AnimatePresence>
      {demoMode && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-50 flex items-center justify-center gap-3 px-4 py-1.5"
          style={{
            background: 'repeating-linear-gradient(45deg, var(--anchor-amber), var(--anchor-amber) 10px, #B45309 10px, #B45309 20px)',
          }}
        >
          <AlertTriangle size={13} className="text-white shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
            Demo Mode Active
          </span>
          <span className="hidden sm:inline text-[10px] text-white/80">
            · Data is isolated from live operations
          </span>
          <button
            onClick={() => setDemoMode(false)}
            className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                       bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={10} />
            Exit
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
