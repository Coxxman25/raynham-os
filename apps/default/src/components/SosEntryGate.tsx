import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Siren,
  ShieldAlert,
  MapPin,
  VolumeX,
  Camera,
  Users,
  Mic,
  TriangleAlert,
  Bot,
  FileText,
  X,
  Check,
  ChevronLeft,
  Trash2,
  Lock,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { EmergencyScreen } from './EmergencyScreen';
import { SituationalGuide } from './SituationalGuide';
import { VoiceJournal } from './VoiceJournal';
import { AriaChat } from './AriaChat';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SosEntryGateProps {
  locationCode?: string;
  onOpenAria?: () => void;
}

type Path = 'gate' | 'emergency' | 'guide' | 'journal' | 'report' | 'aria';

// ─── Evidence item ────────────────────────────────────────────────────────────

interface EvidenceItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  timestamp: string;
  size: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  sub?: string;
  color: 'red' | 'amber' | 'blue' | 'green';
}

// ─── Radial action button data ────────────────────────────────────────────────

interface ActionBtn {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: 'red' | 'amber';
  // deg: angle from top-centre, clockwise
  deg: number;
  // side: which half the button belongs to visually
  side: 'red' | 'amber';
  action: 'gps' | 'silent' | 'evidence' | 'alert' | 'journal' | 'zone' | 'aria' | 'report';
}

const ACTION_BUTTONS: ActionBtn[] = [
  // ── Red side (left arc) ──
  {
    id: 'gps',
    icon: <MapPin size={18} />,
    label: 'GPS Pin',
    sub: 'Stamps live location',
    color: 'red',
    deg: -125,
    side: 'red',
    action: 'gps',
  },
  {
    id: 'silent',
    icon: <VolumeX size={18} />,
    label: 'Silent Mode',
    sub: 'Kills screen light',
    color: 'red',
    deg: -70,
    side: 'red',
    action: 'silent',
  },
  {
    id: 'evidence',
    icon: <Camera size={18} />,
    label: 'Evidence',
    sub: 'Start recording',
    color: 'red',
    deg: -25,
    side: 'red',
    action: 'evidence',
  },
  {
    id: 'alert',
    icon: <Users size={18} />,
    label: 'Alert Team',
    sub: 'Silent push alert',
    color: 'red',
    deg: 25,
    side: 'red',
    action: 'alert',
  },
  // ── Amber side (right arc) ──
  {
    id: 'journal',
    icon: <Mic size={18} />,
    label: 'Voice Log',
    sub: 'Anonymous note',
    color: 'amber',
    deg: -25,
    side: 'amber',
    action: 'journal',
  },
  {
    id: 'zone',
    icon: <TriangleAlert size={18} />,
    label: 'Mark Zone',
    sub: 'Flag this location',
    color: 'amber',
    deg: 25,
    side: 'amber',
    action: 'zone',
  },
  {
    id: 'aria',
    icon: <Bot size={18} />,
    label: 'Ask ARIA',
    sub: 'AI triage now',
    color: 'amber',
    deg: 70,
    side: 'amber',
    action: 'aria',
  },
  {
    id: 'report',
    icon: <FileText size={18} />,
    label: 'Report',
    sub: 'Anonymous report',
    color: 'amber',
    deg: 125,
    side: 'amber',
    action: 'report',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SosEntryGate({ locationCode = '', onOpenAria }: SosEntryGateProps) {
  const [path, setPath] = useState<Path>('gate');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [silentActive, setSilentActive] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [zoneFlagged, setZoneFlagged] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [showEvidenceVault, setShowEvidenceVault] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hidden file input for camera capture
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Show transient toast
  function showToast(t: ToastState, ms = 2800) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }

  // Format bytes to human readable
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  // Handle camera capture file selection
  function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const item: EvidenceItem = {
      id: `ev-${Date.now()}`,
      url,
      type: isVideo ? 'video' : 'image',
      name: file.name || `evidence-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      size: formatSize(file.size),
    };
    setEvidenceItems(prev => [item, ...prev]);
    showToast({
      message: isVideo ? 'Video captured' : 'Photo captured',
      sub: `Saved to Evidence Vault · ${item.size}`,
      color: 'red',
    });
    // Reset so same file can be captured again
    e.target.value = '';
    // Show vault briefly after capture
    setTimeout(() => setShowEvidenceVault(true), 800);
  }

  // Handle quick-action button presses
  function handleAction(action: ActionBtn['action']) {
    switch (action) {
      case 'gps':
        setGpsActive(true);
        if (navigator.geolocation) {
          // Try high accuracy first, fall back to low accuracy for Android
          const tryGps = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                showToast({
                  message: 'Location pinned',
                  sub: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                  color: 'red',
                });
              },
              (err) => {
                if (highAccuracy && err.code !== err.PERMISSION_DENIED) {
                  // Retry with low accuracy (network-based) — works better on Android
                  tryGps(false);
                } else {
                  showToast({ message: 'Location stamped', sub: 'GPS saved to incident log', color: 'red' });
                }
              },
              { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 8000, maximumAge: highAccuracy ? 0 : 30000 }
            );
          };
          tryGps(true);
        } else {
          showToast({ message: 'Location stamped', sub: 'GPS saved to incident log', color: 'red' });
        }
        break;

      case 'silent':
        setSilentActive((prev) => !prev);
        showToast({
          message: silentActive ? 'Silent mode OFF' : 'Silent mode ON',
          sub: silentActive ? 'Screen restored' : 'Screen dimmed — mic still active',
          color: 'red',
        });
        break;

      case 'evidence':
        // Trigger the hidden camera input — opens native camera on mobile
        cameraInputRef.current?.click();
        break;

      case 'alert':
        if (!alertSent) {
          setAlertSent(true);
          showToast({ message: 'Team alerted', sub: 'Silent push sent to safety team', color: 'red' });
        } else {
          showToast({ message: 'Alert already sent', sub: 'Team has been notified', color: 'red' });
        }
        break;

      case 'journal':
        setPath('journal');
        break;

      case 'zone':
        setZoneFlagged(true);
        if (navigator.geolocation) {
          const tryZoneGps = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                showToast({
                  message: 'Zone flagged',
                  sub: `Risk zone marked at ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
                  color: 'amber',
                });
              },
              (err) => {
                if (highAccuracy && err.code !== err.PERMISSION_DENIED) {
                  tryZoneGps(false);
                } else {
                  showToast({ message: 'Zone flagged', sub: 'Risk zone added to map', color: 'amber' });
                }
              },
              { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 8000, maximumAge: highAccuracy ? 0 : 30000 }
            );
          };
          tryZoneGps(true);
        } else {
          showToast({ message: 'Zone flagged', sub: 'Risk zone added to map', color: 'amber' });
        }
        break;

      case 'aria':
        if (onOpenAria) {
          onOpenAria();
        } else {
          setPath('aria');
        }
        break;

      case 'report':
        setPath('report');
        break;
    }
  }

  // Silent mode screen dimming
  useEffect(() => {
    if (silentActive) {
      document.documentElement.style.filter = 'brightness(0.06)';
    } else {
      document.documentElement.style.filter = '';
    }
    return () => {
      document.documentElement.style.filter = '';
    };
  }, [silentActive]);

  // ── Sub-screens ─────────────────────────────────────────────────────────────

  if (path === 'emergency') {
    return <EmergencyScreen locationCode={locationCode} onBack={() => setPath('gate')} />;
  }
  if (path === 'guide') {
    return <SituationalGuide onBack={() => setPath('gate')} />;
  }
  if (path === 'journal') {
    return <VoiceJournal onBack={() => setPath('gate')} />;
  }
  if (path === 'aria') {
    return (
      <div className="fixed inset-0 bg-[#080808] flex flex-col">
        {/* Back bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
          <button
            onClick={() => setPath('gate')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors min-h-[44px] pr-3"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-semibold">Back</span>
          </button>
          <div className="flex-1" />
          <span className="text-amber-400 text-xs font-bold tracking-wider uppercase">ARIA · AI Triage</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <AriaChat />
        </div>
      </div>
    );
  }
  if (path === 'report') {
    window.location.href = '/?view=report';
    return null;
  }

  // ── Dial geometry ─────────────────────────────────────────────────────────────
  // Simple: the dial fits within the screen width with padding.
  // Action buttons live in a grid BELOW the dial — no polar maths needed.
  const DIAL_SIZE = 260;

  // Split action buttons into red (left) and amber (right) groups
  const redBtns = ACTION_BUTTONS.filter((b) => b.side === 'red');
  const amberBtns = ACTION_BUTTONS.filter((b) => b.side === 'amber');

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col overflow-hidden select-none">

      {/* ── Dot grid ── */}
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Top colour bar ── */}
      <div className="absolute top-0 left-0 right-0 h-[2px] flex">
        <div className="flex-1 bg-red-500" />
        <div className="flex-1 bg-amber-500" />
      </div>

      {/* ── Ambient glow pools ── */}
      <div className="absolute top-1/3 left-0 w-72 h-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-72 h-72 translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 flex flex-col items-center pt-8 pb-0 px-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <ShieldAlert size={12} className="text-white/60" />
          </div>
          <span className="text-white/40 text-[10px] font-bold tracking-[0.22em] uppercase">
            Absolute Defence OS
          </span>
        </div>
        <h1 className="text-white text-[24px] font-black tracking-tight text-center leading-tight font-display">
          Are you in danger?
        </h1>
        <p className="text-white/35 text-xs mt-1 text-center tracking-wide">
          Select the option that matches your situation
        </p>
      </motion.div>

      {/* ── Dial ── */}
      <div className="relative z-10 flex justify-center mt-5">
        {/* Outer pulse ring — red side only */}
        <motion.div
          className="absolute rounded-full border border-red-500/30"
          style={{ width: DIAL_SIZE + 20, height: DIAL_SIZE + 20, top: -10, left: '50%', transform: 'translateX(-50%)' }}
          animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 1.025, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The dial itself */}
        <div
          className="relative overflow-hidden rounded-full"
          style={{ width: DIAL_SIZE, height: DIAL_SIZE, flexShrink: 0 }}
        >
          {/* SVG background */}
          <svg
            className="absolute inset-0"
            width={DIAL_SIZE}
            height={DIAL_SIZE}
            viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          >
            <defs>
              <radialGradient id="redGrad" cx="25%" cy="25%" r="85%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </radialGradient>
              <radialGradient id="amberGrad" cx="75%" cy="25%" r="85%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#451a03" />
              </radialGradient>
            </defs>

            {/* Outer ring */}
            <circle cx={DIAL_SIZE / 2} cy={DIAL_SIZE / 2} r={DIAL_SIZE / 2 - 1}
              fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="2" />

            {/* Left (red) half */}
            <path
              d={`M${DIAL_SIZE / 2},${DIAL_SIZE / 2} L${DIAL_SIZE / 2},0 A${DIAL_SIZE / 2},${DIAL_SIZE / 2} 0 0,0 ${DIAL_SIZE / 2},${DIAL_SIZE} Z`}
              fill="url(#redGrad)"
            />
            {/* Right (amber) half */}
            <path
              d={`M${DIAL_SIZE / 2},${DIAL_SIZE / 2} L${DIAL_SIZE / 2},0 A${DIAL_SIZE / 2},${DIAL_SIZE / 2} 0 0,1 ${DIAL_SIZE / 2},${DIAL_SIZE} Z`}
              fill="url(#amberGrad)"
            />

            {/* Centre divider */}
            <line x1={DIAL_SIZE / 2} y1="0" x2={DIAL_SIZE / 2} y2={DIAL_SIZE}
              stroke="black" strokeOpacity="0.35" strokeWidth="2" />
          </svg>

          {/* LEFT clickable half — IMMEDIATE DANGER */}
          <button
            onClick={() => setPath('emergency')}
            className="absolute inset-y-0 left-0 flex flex-col items-center justify-center text-center"
            style={{ width: '50%', WebkitTapHighlightColor: 'transparent' }}
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Siren size={30} className="text-white mx-auto" />
            </motion.div>
            <p className="text-white/60 text-[8px] font-bold tracking-[0.16em] uppercase mt-2 leading-tight">
              Emergency
            </p>
            <p className="text-white text-[13px] font-black leading-tight tracking-tight mt-1">
              IMMEDIATE
            </p>
            <p className="text-white text-[13px] font-black leading-tight tracking-tight">
              DANGER
            </p>
          </button>

          {/* RIGHT clickable half — POTENTIAL DANGER */}
          <button
            onClick={() => setPath('guide')}
            className="absolute inset-y-0 right-0 flex flex-col items-center justify-center text-center"
            style={{ width: '50%', WebkitTapHighlightColor: 'transparent' }}
          >
            <ShieldAlert size={28} className="text-amber-200 mx-auto" />
            <p className="text-amber-200/70 text-[8px] font-bold tracking-[0.16em] uppercase mt-2 leading-tight">
              Guidance
            </p>
            <p className="text-white text-[13px] font-black leading-tight tracking-tight mt-1">
              POTENTIAL
            </p>
            <p className="text-white text-[13px] font-black leading-tight tracking-tight">
              DANGER
            </p>
          </button>

          {/* Centre pip */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <div className="w-9 h-9 rounded-full bg-[#080808] border-2 border-white/10 flex items-center justify-center">
              <ShieldAlert size={14} className="text-white/40" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-label row under dial ── */}
      <div className="relative z-10 flex justify-between px-8 mt-2">
        <span className="text-red-400/50 text-[9px] font-bold tracking-widest uppercase">Calls 999</span>
        <span className="text-amber-400/50 text-[9px] font-bold tracking-widest uppercase">Guidance · ARIA</span>
      </div>

      {/* ── Quick-action grid ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 mt-3 mb-2">
        <div className="grid grid-cols-4 gap-2">
          {/* Red side — left 4 */}
          {redBtns.map((btn, i) => {
            const hasEvidence = evidenceItems.length > 0;
            const isActive =
              (btn.action === 'gps' && gpsActive) ||
              (btn.action === 'silent' && silentActive) ||
              (btn.action === 'evidence' && hasEvidence) ||
              (btn.action === 'alert' && alertSent);
            return (
              <motion.button
                key={btn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * i }}
                onClick={() => {
                  if (btn.action === 'evidence' && hasEvidence) {
                    setShowEvidenceVault(true);
                  } else {
                    handleAction(btn.action);
                  }
                }}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-1.5 group relative"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500 border-2 border-red-300'
                    : 'bg-red-950/80 border border-red-700/40 group-active:bg-red-800/80'
                }`}>
                  <span className={isActive ? 'text-white' : 'text-red-400'}>
                    {isActive && (btn.action === 'gps' || btn.action === 'alert') ? <Check size={18} /> : btn.icon}
                  </span>
                </div>
                {/* Evidence count badge */}
                {btn.action === 'evidence' && evidenceItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg">
                    {evidenceItems.length}
                  </span>
                )}
                <span className="text-red-400/70 text-[9px] font-bold tracking-wide text-center leading-tight">
                  {btn.action === 'evidence' && evidenceItems.length > 0 ? 'View Vault' : btn.label}
                </span>
              </motion.button>
            );
          })}
          {/* Amber side — right 4 */}
          {amberBtns.map((btn, i) => {
            const isActive = btn.action === 'zone' && zoneFlagged;
            return (
              <motion.button
                key={btn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * (i + 4) }}
                onClick={() => handleAction(btn.action)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-1.5 group"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 border-2 border-amber-300'
                    : 'bg-amber-950/80 border border-amber-700/40 group-active:bg-amber-800/80'
                }`}>
                  <span className={isActive ? 'text-white' : 'text-amber-400'}>
                    {isActive ? <Check size={18} /> : btn.icon}
                  </span>
                </div>
                <span className="text-amber-400/70 text-[9px] font-bold tracking-wide text-center leading-tight">
                  {btn.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── 999 footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex items-center justify-center gap-3 pb-6 px-6"
      >
        <div className="flex-1 h-px bg-white/[0.04]" />
        <a
          href="tel:999"
          className="flex items-center gap-2 bg-red-950/70 border border-red-800/40 rounded-full px-5 py-2.5"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-red-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-red-300/90 text-xs font-bold tracking-[0.18em]">
            999 — Always available
          </span>
        </a>
        <div className="flex-1 h-px bg-white/[0.04]" />
      </motion.div>

      {/* ── Hidden camera file input ── */}
      {/* accept="image/*,video/*" capture="environment" opens rear camera on mobile */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore — capture is a valid HTML attribute but not in all TS DOM typings */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
        aria-hidden="true"
      />

      {/* ── Evidence Vault Modal ── */}
      <AnimatePresence>
        {showEvidenceVault && (
          <motion.div
            key="vault"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <Lock size={14} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none">Evidence Vault</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{evidenceItems.length} item{evidenceItems.length !== 1 ? 's' : ''} · Session only</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-red-950/80 border border-red-700/50 rounded-xl px-3 py-2 text-red-300 text-xs font-bold"
                >
                  <Camera size={13} />
                  Add More
                </button>
                <button
                  onClick={() => setShowEvidenceVault(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notice */}
            <div className="mx-4 mt-3 bg-amber-950/50 border border-amber-700/40 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
              <Lock size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-300/80 text-[11px] leading-snug">
                Evidence is stored locally on your device for this session only. Screenshot or share immediately to preserve it permanently.
              </p>
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {evidenceItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Camera size={32} className="text-white/15" />
                  <p className="text-white/30 text-sm">No evidence captured yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {evidenceItems.map((item) => (
                    <div key={item.id} className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                      {/* Preview */}
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-neutral-900 flex flex-col items-center justify-center gap-2">
                          <Video size={28} className="text-red-400" />
                          <span className="text-white/40 text-[10px]">Video</span>
                        </div>
                      )}
                      {/* Overlay info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'video' ? (
                            <Video size={10} className="text-red-400 flex-shrink-0" />
                          ) : (
                            <ImageIcon size={10} className="text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-white/70 text-[9px] font-bold">{item.timestamp}</span>
                          <span className="text-white/35 text-[9px] ml-auto">{item.size}</span>
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => setEvidenceItems(prev => prev.filter(e => e.id !== item.id))}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 min-w-[220px] max-w-[320px] ${
              toast.color === 'red'
                ? 'bg-red-950 border border-red-700/50'
                : toast.color === 'amber'
                ? 'bg-amber-950 border border-amber-700/50'
                : 'bg-neutral-900 border border-white/10'
            }`}
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              toast.color === 'red' ? 'bg-red-400' : toast.color === 'amber' ? 'bg-amber-400' : 'bg-blue-400'
            }`} />
            <div>
              <p className="text-white text-sm font-bold leading-tight">{toast.message}</p>
              {toast.sub && <p className="text-white/50 text-xs mt-0.5">{toast.sub}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
