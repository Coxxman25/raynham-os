import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Info, Camera, AlertOctagon, Copy, Check, ChevronRight } from 'lucide-react';

import {
  getAnchor, getStoredProfile, clearStoredProfile,
  type Anchor, type StaffProfile,
} from '@/lib/personnel-api';
import { getActiveNoticeForAnchor, subscribeNotices, formatExpiryCountdown, type Notice } from '@/lib/notices-store';
import { BrandHeader, OfflineBanner, Skeleton } from './ui.tsx';
import { IdentitySheet } from './IdentitySheet.tsx';
import { EmergencySheet } from './EmergencySheet.tsx';

export function ScanLanding() {
  const { anchorId } = useParams<{ anchorId: string }>();
  const navigate = useNavigate();

  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [liveNotice, setLiveNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!anchor) { setLiveNotice(null); return; }
    const read = () => setLiveNotice(getActiveNoticeForAnchor(anchor));
    read();
    const unsub = subscribeNotices(read);
    const iv = setInterval(read, 30_000);
    return () => { unsub(); clearInterval(iv); };
  }, [anchor]);

  useEffect(() => {
    let cancelled = false;
    if (!anchorId) return;
    setLoading(true);
    getAnchor(anchorId).then(a => {
      if (cancelled) return;
      if (a == null) setNotFound(true);
      setAnchor(a);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [anchorId]);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const copyW3W = async () => {
    if (!anchor) return;
    try {
      await navigator.clipboard.writeText(`///${anchor.w3w}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(`///${anchor.w3w}`);
    }
  };

  return (
    <>
      <BrandHeader />
      {!online && <OfflineBanner />}

      <main className="flex-1 px-4 pt-4 pb-8 w-full max-w-md mx-auto">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-20" />
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-[72px]" />
          </div>
        ) : notFound || anchor == null ? (
          <NotFoundState onGoHome={() => navigate('/')} />
        ) : (
          <>
            {/* Identity card */}
            <section
              className="rounded-[10px] p-4"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(46,52,56,0.06)',
              }}
            >
              <h1 className="text-[22px] leading-tight font-semibold" style={{ color: 'var(--p-text-primary)' }}>
                {anchor.assetName} <span style={{ color: 'var(--p-text-muted)' }}>—</span> {anchor.zoneName}
              </h1>
              <button
                type="button"
                onClick={copyW3W}
                className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md min-h-11"
                style={{
                  background: 'var(--surface-sunken)',
                  color: 'var(--p-text-primary)',
                  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                }}
                aria-label={`Copy What3Words address ${anchor.w3w}`}
              >
                <span className="text-sm">///{anchor.w3w}</span>
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: 'var(--p-text-muted)' }} />
                )}
              </button>
            </section>

            {/* Identity line — quiet, secondary. */}
            <div className="mt-3 text-center">
              {profile == null ? (
                <button
                  type="button"
                  onClick={() => setIdentityOpen(true)}
                  className="text-sm underline underline-offset-4 min-h-11 px-3"
                  style={{ color: 'var(--p-text-secondary)' }}
                >
                  Site staff? Identify yourself
                </button>
              ) : (
                <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>
                  Signed in as{' '}
                  <span className="font-medium" style={{ color: 'var(--p-text-secondary)' }}>
                    {profile.name}
                  </span>
                  {' · '}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => { clearStoredProfile(); setProfile(null); setIdentityOpen(true); }}
                  >
                    Not you?
                  </button>
                </p>
              )}
            </div>

            {/* Active Notice — pulled from live notices store (Section 22, Channel A) */}
            {liveNotice != null && (
              <section
                className="mt-4 rounded-[10px] p-4"
                style={{
                  background: 'var(--status-warning-soft)',
                  borderLeft: '4px solid var(--status-warning-p)',
                }}
                role="status"
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--status-warning-p)' }}>
                  Active Notice
                </p>
                <p className="mt-1 text-[15px] leading-snug" style={{ color: 'var(--p-text-primary)' }}>
                  {liveNotice.message}
                </p>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--p-text-muted)' }}>
                  Expires in {formatExpiryCountdown(liveNotice.expiresAt)} · {liveNotice.author}
                </p>
              </section>
            )}

            {/* Three choice cards */}
            <div className="mt-5 space-y-3">
              <ChoiceCard
                accent="var(--status-success)"
                iconBg="var(--status-success-soft)"
                icon={<Info className="w-5 h-5" style={{ color: 'var(--status-success)' }} />}
                title="Information & Updates"
                subtitle="Site notices & guidance"
                onClick={() => toast.info('Notices list — placeholder for this build.')}
              />
              <ChoiceCard
                accent="var(--status-warning-p)"
                iconBg="var(--status-warning-soft)"
                icon={<Camera className="w-5 h-5" style={{ color: 'var(--status-warning-p)' }} />}
                title="Report a Concern"
                subtitle="Photo report, 30 seconds"
                onClick={() => navigate(`/a/${anchor.id}/report`)}
              />
              <ChoiceCard
                accent="var(--status-danger)"
                iconBg="var(--status-danger-soft)"
                icon={<AlertOctagon className="w-5 h-5" style={{ color: 'var(--status-danger)' }} />}
                title="Get Help Now"
                subtitle="Alerts the on-call manager"
                onClick={() => setEmergencyOpen(true)}
              />
            </div>

            {/* Footer */}
            <p
              className="mt-8 text-center text-xs"
              style={{ color: 'var(--p-text-muted)' }}
            >
              No app or login needed
            </p>
          </>
        )}
      </main>

      <IdentitySheet
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        onSaved={p => setProfile(p)}
      />
      <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </>
  );
}

function ChoiceCard({
  accent, iconBg, icon, title, subtitle, onClick,
}: {
  accent: string; iconBg: string; icon: React.ReactNode;
  title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-[10px] px-4 py-4 text-left transition-transform active:scale-[0.99]"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `4px solid ${accent}`,
        boxShadow: '0 1px 2px rgba(46,52,56,0.06)',
        minHeight: 72,
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-semibold leading-tight" style={{ color: 'var(--p-text-primary)' }}>
          {title}
        </p>
        <p className="text-sm truncate" style={{ color: 'var(--p-text-secondary)' }}>
          {subtitle}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--p-text-muted)' }} aria-hidden />
    </button>
  );
}

function NotFoundState({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="pt-10 text-center">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--p-text-primary)' }}>
        Tag not recognised
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--p-text-secondary)' }}>
        This QR tag is not registered on the estate yet. If you need help now,
        call the estate office on <span className="font-mono">01328 000 000</span>.
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-6 underline text-sm"
        style={{ color: 'var(--p-text-secondary)' }}
      >
        Go back
      </button>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((then - now) / 60000);
  if (diffMin <= 0) return 'just now';
  if (diffMin < 60) return `in ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `in ${h} hr`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? '' : 's'}`;
}
