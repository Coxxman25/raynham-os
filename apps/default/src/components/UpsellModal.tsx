import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UpsellModalProps {
  open: boolean;
  title: string;
  desc: string;
  onClose: () => void;
}

export function UpsellModal({ open, title, desc, onClose }: UpsellModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.35)] max-w-md w-full mx-4 p-12 text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Amber lock icon — centered */}
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-white shadow-xl mx-auto flex items-center justify-center mb-8">
              <Lock size={28} className="text-amber-500" />
            </div>

            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-4 block">
              Premium Feature
            </span>

            <h3 className="text-2xl font-black italic text-slate-900 mb-4 tracking-tight font-display">
              Unlock {title}.
            </h3>

            <p className="text-sm text-slate-500 leading-relaxed mb-8 font-medium">{desc}</p>

            <div className="space-y-3">
              <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all">
                View Intelligence Tiers
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 bg-white text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
