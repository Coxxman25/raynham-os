import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

import { FieldHome } from './FieldHome.tsx';
import { ReportConcern } from './ReportConcern.tsx';
import { ReportSent } from './ReportSent.tsx';
import { flushOutbox } from '@/lib/personnel-api';

/**
 * Mobile personnel PWA shell.
 *
 * A fixed light-mode surface — the field flow is not themed. We forcibly
 * REMOVE the .dark class while this shell is mounted so the manager app's
 * theme choice does not leak in.
 */
export function PersonnelApp() {
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.remove('dark');
    document.title = 'Raynham Estate';
    return () => {
      if (wasDark) html.classList.add('dark');
    };
  }, []);

  // Auto-flush outbox on reconnect (per spec section 5.8).
  useEffect(() => {
    const onOnline = () => {
      const n = flushOutbox();
      if (n > 0) toast.success(`${n} report${n === 1 ? '' : 's'} sent.`);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <div
      className="min-h-screen w-full flex flex-col personnel-scope"
      style={{
        background: 'var(--surface-base)',
        color: 'var(--p-text-primary)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <Toaster position="top-center" richColors closeButton={false} />
      <Routes>
        <Route index element={<FieldHome />} />
        <Route path="report" element={<ReportConcern />} />
        <Route path="report/sent" element={<ReportSent />} />
      </Routes>
    </div>
  );
}
