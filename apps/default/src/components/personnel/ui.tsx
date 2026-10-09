import React from 'react';
import { WifiOff } from 'lucide-react';

/** Slim white header with R monogram + wordmark and a signal icon slot. */
export function BrandHeader({ trailing }: { trailing?: React.ReactNode }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
      style={{
        background: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="w-8" aria-hidden />
      <div className="flex flex-col items-center gap-0.5">
        <RMonogram />
        <span
          className="text-[10px] font-medium tracking-[0.28em]"
          style={{ color: 'var(--p-text-secondary)' }}
        >
          RAYNHAM
        </span>
      </div>
      <div className="w-8 flex justify-end">
        {trailing ?? <SignalIcon />}
      </div>
    </header>
  );
}

export function RMonogram({ size = 28 }: { size?: number }) {
  const gradientId = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-gold)" />
          <stop offset="100%" stopColor="#5B6770" />
        </linearGradient>
      </defs>
      <text
        x="16" y="24"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="26"
        fill={`url(#${gradientId})`}
      >R</text>
    </svg>
  );
}

function SignalIcon() {
  const [online, setOnline] = React.useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!online) {
    return <WifiOff className="w-4 h-4" style={{ color: 'var(--status-warning-p)' }} aria-label="Offline" />;
  }

  return (
    <div className="flex items-end gap-[2px]" aria-label="Signal" role="img">
      <span className="w-[3px] h-[5px] rounded-[1px]" style={{ background: 'var(--p-text-secondary)' }} />
      <span className="w-[3px] h-[8px] rounded-[1px]" style={{ background: 'var(--p-text-secondary)' }} />
      <span className="w-[3px] h-[11px] rounded-[1px]" style={{ background: 'var(--p-text-secondary)' }} />
      <span className="w-[3px] h-[14px] rounded-[1px]" style={{ background: 'var(--p-text-secondary)' }} />
    </div>
  );
}

/** Full-width offline banner served in place of live data. */
export function OfflineBanner() {
  return (
    <div
      className="px-4 py-2.5 text-sm text-center"
      style={{
        background: 'var(--status-warning-soft)',
        color: 'var(--p-text-primary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
      role="status"
    >
      No signal — showing saved information
    </div>
  );
}

/** Small skeleton block for loading states. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] ${className}`}
      style={{ background: 'var(--surface-sunken)' }}
    />
  );
}

/** Primary button (brand gold, 56px). */
export function PrimaryButton({
  children,
  disabled,
  onClick,
  loading,
  type = 'button',
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className="w-full h-14 rounded-[10px] font-semibold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--brand-gold)',
        color: '#2E3438',
      }}
      onMouseDown={e => { if (!disabled && !loading) e.currentTarget.style.background = 'var(--brand-gold-hover)'; }}
      onMouseUp={e => { e.currentTarget.style.background = 'var(--brand-gold)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-gold)'; }}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

/** Secondary button (white with grey border). */
export function SecondaryButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-full h-14 rounded-[10px] font-semibold text-base transition-colors"
      style={{
        background: 'var(--surface-raised)',
        color: 'var(--p-text-primary)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {children}
    </button>
  );
}
