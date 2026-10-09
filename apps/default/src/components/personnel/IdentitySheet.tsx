import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  searchStaff, saveProfile, SMS_VERIFICATION_ENABLED, MOCK_SMS_CODE,
  type StaffProfile,
} from '@/lib/personnel-api';
import { PrimaryButton } from './ui.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (profile: StaffProfile) => void;
  /** Subtitle override — e.g. "We need to know who to check on." */
  subtitle?: string;
}

/**
 * Bottom sheet, never a gate. "Not now" and the backdrop always dismiss
 * without blocking anything.
 */
export function IdentitySheet({ open, onClose, onSaved, subtitle }: Props) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [suggestions, setSuggestions] = useState<StaffProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset every time the sheet opens.
  useEffect(() => {
    if (open) {
      setName('');
      setMobile('');
      setSuggestions([]);
      setShowSuggestions(false);
      setStep('form');
      setCode('');
      setSaving(false);
      const t = setTimeout(() => nameRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Debounced type-ahead over the staff list.
  useEffect(() => {
    if (name.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setSuggestions(searchStaff(name));
    }, 200);
    return () => clearTimeout(t);
  }, [name]);

  const mobileValid = useMemo(() => /^(?:\+?\d[\d\s]{7,})$/.test(mobile.trim()), [mobile]);
  const canSubmit = name.trim().length >= 2 && mobileValid;

  const normalizeMobile = (input: string): string => {
    const digits = input.replace(/\s+/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
    return `+44${digits}`;
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    if (SMS_VERIFICATION_ENABLED) {
      setStep('code');
      toast.info(`For this build, the code is ${MOCK_SMS_CODE}`);
      return;
    }
    finalize();
  };

  const handleVerifyCode = () => {
    if (code.trim() !== MOCK_SMS_CODE) {
      toast.error('That code did not match. Try again.');
      return;
    }
    finalize();
  };

  const finalize = () => {
    setSaving(true);
    const profile = saveProfile({
      name: name.trim(),
      mobile: normalizeMobile(mobile),
    });
    toast.success(`Thanks ${profile.name.split(' ')[0]} — you're set`);
    setSaving(false);
    onSaved(profile);
    onClose();
  };

  const applySuggestion = (s: StaffProfile) => {
    setName(s.name);
    setMobile(s.mobile);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[5000] flex items-end justify-center isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/50 animate-in fade-in"
        aria-label="Close"
      />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] p-5 pb-8 animate-in slide-in-from-bottom overscroll-contain"
        style={{
          background: 'var(--surface-raised)',
          maxHeight: 'min(92dvh, 760px)',
          overflowY: 'auto',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.24)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        {/* Close (X) — belt-and-braces so the sheet is never a gate. */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full"
          style={{ color: 'var(--p-text-muted)' }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'form' ? (
          <>
            <h2 id="identity-title" className="text-xl font-semibold" style={{ color: 'var(--p-text-primary)' }}>
              Who are you?
            </h2>
            <p className="mt-1 mb-5 text-sm" style={{ color: 'var(--p-text-secondary)' }}>
              {subtitle ?? "One quick step — so the team knows who's on site."}
            </p>

            {/* Name field with typeahead */}
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--p-text-secondary)' }}>
              Your name
            </label>
            <div className="relative">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="name"
                placeholder="Start typing your name"
                className="w-full h-12 px-3.5 rounded-[10px] text-base outline-none"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--p-text-primary)',
                }}
                onFocusCapture={e => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)')}
                onBlurCapture={e => (e.currentTarget.style.boxShadow = 'none')}
              />

              {showSuggestions && suggestions.length > 0 && (
                <ul
                  className="absolute z-10 left-0 right-0 mt-1 rounded-[10px] overflow-hidden"
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 4px 12px rgba(46,52,56,0.06)',
                  }}
                >
                  {suggestions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="w-full text-left px-3.5 py-3 min-h-11 hover:bg-[var(--surface-sunken)]"
                      >
                        <span className="block text-sm font-medium" style={{ color: 'var(--p-text-primary)' }}>
                          {s.name}
                        </span>
                        <span className="block text-xs" style={{ color: 'var(--p-text-muted)' }}>
                          {s.workspace} · {s.mobile}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showSuggestions && name.trim().length >= 2 && suggestions.length === 0 && (
                <p className="mt-2 text-xs" style={{ color: 'var(--p-text-muted)' }}>
                  No match — you can continue as <span className="font-medium" style={{ color: 'var(--p-text-primary)' }}>{name.trim()}</span>.
                </p>
              )}
            </div>

            {/* Mobile field */}
            <label className="block text-sm font-medium mt-4 mb-1.5" style={{ color: 'var(--p-text-secondary)' }}>
              Mobile number
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              autoComplete="tel"
              placeholder="07700 900101"
              className="w-full h-12 px-3.5 rounded-[10px] text-base outline-none"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-strong)',
                color: 'var(--p-text-primary)',
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              }}
              onFocusCapture={e => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)')}
              onBlurCapture={e => (e.currentTarget.style.boxShadow = 'none')}
            />

            <div className="mt-6 space-y-3">
              <PrimaryButton disabled={!canSubmit} onClick={handleConfirm}>
                Confirm
              </PrimaryButton>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 text-sm font-medium"
                style={{ color: 'var(--p-text-secondary)' }}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--p-text-primary)' }}>
              Enter the code
            </h2>
            <p className="mt-1 mb-5 text-sm" style={{ color: 'var(--p-text-secondary)' }}>
              We sent a 6-digit code to <span className="font-mono">{normalizeMobile(mobile)}</span>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full h-14 px-3.5 rounded-[10px] text-2xl text-center outline-none tracking-[0.4em]"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-strong)',
                color: 'var(--p-text-primary)',
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              }}
              onFocusCapture={e => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)')}
              onBlurCapture={e => (e.currentTarget.style.boxShadow = 'none')}
            />
            <div className="mt-6 space-y-3">
              <PrimaryButton disabled={code.length !== 6} onClick={handleVerifyCode} loading={saving}>
                Verify
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="w-full h-11 text-sm font-medium"
                style={{ color: 'var(--p-text-secondary)' }}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
