import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoQRProps {
  className?: string;
  compact?: boolean;
}

// Build the QR image URL via qrserver.com
// color = plain 6-char hex, no # (qrserver requirement)
function qrUrl(text: string, size = 200, color = 'ffffff', bgcolor = '0A0A0A') {
  const p = new URLSearchParams({ size: `${size}x${size}`, data: text, color, bgcolor, margin: '2', format: 'svg', ecc: 'M' });
  return `https://api.qrserver.com/v1/create-qr-code/?${p.toString()}`;
}

export function DemoQR({ className, compact = false }: DemoQRProps) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use the live origin so QR codes work on any deployment domain
  const [baseUrl, setBaseUrl] = useState(() => {
    const stored = localStorage.getItem('guardlink_public_url');
    return stored || window.location.origin;
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  // Canonical ?a= unified anchor URL — matches App.tsx routing and AnchorShell
  const cleanBaseUrl = baseUrl.trim().replace(/\/$/, '');
  const reportUrl = `${cleanBaseUrl}?a=DEMO`;

  const handleSaveUrl = () => {
    localStorage.setItem('guardlink_public_url', baseUrl);
    setIsEditingUrl(false);
    setImgLoaded(false); // trigger QR refresh
  };

  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reportUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reportUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const open = () => window.open(reportUrl, '_blank');

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#0A0A0A] border border-white/10 flex items-center justify-center shrink-0">
          {imgLoaded ? null : (
            <QrCode size={24} className="text-slate-600 animate-pulse absolute" />
          )}
          <img
            key={refreshKey}
            src={qrUrl(reportUrl, 64)}
            alt="QR Code"
            className={cn('w-full h-full object-contain transition-opacity duration-300', imgLoaded ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setImgLoaded(true)}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white">Live Report QR</p>
          <p className="text-[10px] text-slate-500 truncate">{reportUrl}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={copy}
              className="text-[10px] text-green-400 hover:text-green-300 font-semibold flex items-center gap-1 transition-colors"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={open}
              className="text-[10px] text-slate-400 hover:text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={10} /> Open
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* QR Panel */}
      <div className="relative group">
        <div className="w-48 h-48 rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-green-500 rounded-full animate-spin" />
            </div>
          )}
          <img
            key={refreshKey}
            src={qrUrl(reportUrl, 192)}
            alt="Report QR Code"
            className={cn(
              'w-full h-full object-contain transition-opacity duration-500',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImgLoaded(true)}
          />
        </div>
        {/* Refresh overlay */}
        <button
          onClick={() => { setImgLoaded(false); setRefreshKey(k => k + 1); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          title="Refresh QR"
        >
          <RefreshCw size={12} className="text-slate-400" />
        </button>
      </div>

      {/* Pulse indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Live — Anonymous · No Login Required</span>
      </div>

      {/* URL bar */}
      <div className="w-full flex flex-col gap-2">
        {isEditingUrl ? (
          <div className="flex items-center gap-2 w-full">
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g., https://guardlink.taskade.app"
              className="flex-1 bg-black/50 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleSaveUrl}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="w-full bg-[#111] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3 group/url">
            <span className="text-xs text-slate-500 truncate flex-1 font-mono" onDoubleClick={() => setIsEditingUrl(true)} title="Double click to edit base URL">
              {reportUrl}
            </span>
            <button
              onClick={() => setIsEditingUrl(true)}
              className="text-[10px] text-slate-500 hover:text-white underline decoration-dotted opacity-0 group-hover/url:opacity-100 transition-opacity"
            >
              Edit Domain
            </button>
            <button
              onClick={copy}
              className={cn(
                'shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                copied
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        {!isEditingUrl && baseUrl.includes('taskade.com/spaces') && (
          <p className="text-[10px] text-amber-500/80 leading-tight">
            ⚠️ <b>Note:</b> This looks like a Taskade dashboard URL. Use your public <span className="font-mono">.taskade.app</span> domain so QR codes open the public-facing form, not the admin dashboard. <button onClick={() => setIsEditingUrl(true)} className="underline text-amber-400">Edit domain</button>
          </p>
        )}
      </div>

      {/* Open buttons */}
      <div className="w-full space-y-2">
        <button
          onClick={open}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
        >
          <ExternalLink size={14} />
          Open on Phone
        </button>
      </div>

      {/* Help text */}
      <p className="text-[11px] text-slate-600 text-center leading-relaxed max-w-[200px]">
        Print and deploy at any location. Anyone scans anonymously — no app needed. GPS is captured silently and the concern appears live on the platform map.
      </p>
    </div>
  );
}
