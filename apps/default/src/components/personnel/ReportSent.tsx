import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Copy, AlertOctagon } from 'lucide-react';

import { getReport, type Report } from '@/lib/personnel-api';
import { BrandHeader, SecondaryButton } from './ui.tsx';
import { EmergencySheet } from './EmergencySheet.tsx';

export function ReportSent() {
  const { anchorId } = useParams<{ anchorId: string }>();
  const navigate = useNavigate();
  const routerLoc = useLocation();
  const passedReportId = (routerLoc.state as { reportId?: string } | null)?.reportId;

  const [report, setReport] = useState<Report | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  useEffect(() => {
    if (!passedReportId) {
      // Direct navigation — no report to show; send back to landing.
      navigate(`/a/${anchorId ?? ''}`, { replace: true });
      return;
    }
    setReport(getReport(passedReportId));
  }, [passedReportId, anchorId, navigate]);

  if (report == null) return null;

  return (
    <>
      <BrandHeader />

      <main className="flex-1 px-4 pt-6 pb-8 w-full max-w-md mx-auto">
        {/* Success halo */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--status-success-soft)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--status-success)' }}
            >
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </div>
          <h1 className="mt-5 text-[26px] font-bold" style={{ color: 'var(--p-text-primary)' }}>
            Report received
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: 'var(--p-text-secondary)' }}>
            You can get back to work.
          </p>
        </div>

        {/* Sent-to card */}
        <section
          className="mt-6 rounded-[10px] p-4"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(46,52,56,0.06)',
          }}
        >
          <p
            className="text-[10px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'var(--p-text-muted)' }}
          >
            Sent to
          </p>
          <p className="mt-1.5 text-[17px] font-semibold leading-tight" style={{ color: 'var(--p-text-primary)' }}>
            {report.routedTo.workspace} <span style={{ color: 'var(--p-text-muted)' }}>—</span> {report.routedTo.team}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand-gold-soft)', color: 'var(--brand-gold-hover)' }}
            >
              Assigned
            </span>
            <span className="text-xs" style={{ color: 'var(--p-text-muted)' }}>just now</span>
          </div>
          {report.reportedBy != null && (
            <p className="mt-2 text-xs" style={{ color: 'var(--p-text-muted)' }}>
              Reported by <span style={{ color: 'var(--p-text-secondary)' }}>{report.reportedBy.name}</span>
            </p>
          )}
        </section>

        {/* Reference card */}
        <section
          className="mt-3 rounded-[10px] p-4 divide-y"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(46,52,56,0.06)',
            // @ts-ignore CSS custom property for divide colour
            ['--tw-divide-color' as any]: 'var(--border-subtle)',
          }}
        >
          <RefRow label="Ref" value={`#${report.id}`} />
          <RefRow label="Location" value={`///${report.w3w}`} />
        </section>

        {report.queued && (
          <div
            className="mt-3 rounded-[10px] px-3 py-2.5 text-xs text-center"
            style={{
              background: 'var(--surface-sunken)',
              color: 'var(--p-text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            role="status"
          >
            Queued — will send when reconnected.
          </div>
        )}

        {/* What happens next */}
        <section className="mt-5">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--p-text-primary)' }}>
            What happens next
          </p>
          <ol className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--p-text-secondary)' }}>
            <li>1. The team is notified</li>
            <li>2. You'll see updates if you rescan the tag</li>
            <li>3. The tag shows when it's fixed</li>
          </ol>
        </section>

        {/* Done + urgent-help link */}
        <div className="mt-8 space-y-3">
          <SecondaryButton onClick={() => navigate(`/a/${anchorId}`)}>Done</SecondaryButton>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setEmergencyOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs min-h-11 px-3 underline underline-offset-4"
              style={{ color: 'var(--status-danger)' }}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Still need urgent help? Get Help Now
            </button>
          </div>
        </div>
      </main>

      <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </>
  );
}

function RefRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(value);
    }
  };
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--p-text-muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--p-text-primary)', fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="w-11 h-11 -mr-2 flex items-center justify-center"
          aria-label={`Copy ${label}`}
          style={{ color: copied ? 'var(--status-success)' : 'var(--p-text-muted)' }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
