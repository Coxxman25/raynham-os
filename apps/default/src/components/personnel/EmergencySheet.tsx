import React from 'react';
import { AlertOctagon, X } from 'lucide-react';
import { SecondaryButton } from './ui.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  /** True while location is being resolved by the parent. */
}

/**
 * TODO(safety-build): replace this stub with the real Get Help Now flow —
 * dispatch to the on-call manager with location + (if known) staff name +
 * current task. Attribution must NEVER be required to trigger.
 */
export function EmergencySheet({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />
      <div
        className="relative w-full max-w-md rounded-t-[20px] p-5 pb-8"
        style={{ background: 'var(--surface-raised)' }}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full"
          style={{ color: 'var(--p-text-muted)' }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--status-danger-soft)' }}
        >
          <AlertOctagon className="w-7 h-7" style={{ color: 'var(--status-danger)' }} />
        </div>

        <h2 id="emergency-title" className="text-xl font-semibold text-center" style={{ color: 'var(--p-text-primary)' }}>
          Alert the on-call manager?
        </h2>
        <p className="mt-2 mb-5 text-sm text-center" style={{ color: 'var(--p-text-secondary)' }}>
          This would alert the on-call manager with your location.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-14 rounded-[10px] font-semibold text-base"
            style={{ background: 'var(--status-danger)', color: '#FFFFFF' }}
          >
            Get Help Now
          </button>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
