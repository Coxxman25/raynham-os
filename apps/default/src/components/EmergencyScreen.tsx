import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { createIncidentDirect, INCIDENTS_PID } from '@/lib/api';

// ─── Silent background emergency log ─────────────────────────────────────────
// Fires the moment the screen mounts — before the user does anything.
// Logs a GPS-stamped emergency event to the incident record.
// The user never has to do anything. The response machine is already running.

async function logEmergencySilently(locationCode: string): Promise<void> {
  try {
    let lat = 0;
    let lng = 0;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: true,
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // GPS unavailable — still log with 0,0
    }

    await createIncidentDirect({
      locationCode: locationCode || 'UNKNOWN',
      severity: 'critical',
      latitude: lat,
      longitude: lng,
      reporter: 'SOS-AUTO',
      description: `🚨 EMERGENCY ALERT — SOS button activated at ${new Date().toISOString()}. Location: ${locationCode || 'Unknown zone'}. GPS: ${lat ? `${lat.toFixed(5)},${lng.toFixed(5)}` : 'unavailable'}. Police (999) called by user.`,
    });
  } catch {
    // Silent — never surface this error to user in an emergency
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmergencyScreenProps {
  locationCode?: string;
  onBack?: () => void; // escape hatch for demo mode only
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmergencyScreen({ locationCode = '', onBack }: EmergencyScreenProps) {
  const [logged, setLogged] = useState(false);
  const [pulse, setPulse] = useState(false);
  const logFired = useRef(false);

  // Fire silent log exactly once on mount
  useEffect(() => {
    if (logFired.current) return;
    logFired.current = true;

    logEmergencySilently(locationCode).then(() => {
      setLogged(true);
    });
  }, [locationCode]);

  // Pulse the 999 button to draw attention
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-red-950 flex flex-col select-none overflow-hidden">

      {/* ── Animated red background pulse ── */}
      <motion.div
        className="absolute inset-0 bg-red-600/20"
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Silent log confirmation — top right, tiny, unobtrusive ── */}
      <AnimatePresence>
        {logged && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 flex items-center gap-1.5 z-10"
          >
            <CheckCircle2 size={12} className="text-red-300/60" />
            <span className="text-[10px] text-red-300/60 font-mono tracking-wide">Alert logged</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zone badge — top left ── */}
      {locationCode && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
          <MapPin size={12} className="text-red-400/70" />
          <span className="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">
            Zone {locationCode}
          </span>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 gap-8">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <p className="text-red-200/80 text-sm font-semibold tracking-[0.25em] uppercase mb-3">
            Emergency
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-black leading-tight tracking-tight font-display">
            CALL 999 NOW
          </h1>
        </motion.div>

        {/* 999 tap-to-dial — the hero element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full max-w-xs"
        >
          {/* Outer pulse ring */}
          <motion.div
            className="relative rounded-3xl"
            animate={{ boxShadow: pulse
              ? '0 0 0 16px rgba(239,68,68,0.25), 0 0 0 32px rgba(239,68,68,0.10)'
              : '0 0 0 0px rgba(239,68,68,0), 0 0 0 0px rgba(239,68,68,0)'
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <a
              href="tel:999"
              className="flex flex-col items-center justify-center gap-3 w-full bg-red-500 hover:bg-red-400 active:bg-red-300 rounded-3xl py-9 px-6 transition-colors"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Phone size={44} className="text-white" strokeWidth={2.5} />
              <span className="text-white text-6xl font-black tracking-tighter leading-none">
                999
              </span>
              <span className="text-red-100 text-sm font-semibold tracking-wide">
                Tap to call police now
              </span>
            </a>
          </motion.div>
        </motion.div>

        {/* Leave the area instruction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-red-200 text-lg font-semibold leading-relaxed">
            Leave the area
          </p>
          <p className="text-red-300/70 text-sm mt-1">
            if it is safe to do so
          </p>
        </motion.div>

        {/* Additional emergency numbers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          <a
            href="tel:101"
            className="flex flex-col items-center gap-1 bg-red-900/50 border border-red-800/50 rounded-2xl px-5 py-3.5"
          >
            <span className="text-white text-2xl font-black">101</span>
            <span className="text-red-300/70 text-[11px] font-medium">Non-emergency</span>
          </a>
          <a
            href="tel:112"
            className="flex flex-col items-center gap-1 bg-red-900/50 border border-red-800/50 rounded-2xl px-5 py-3.5"
          >
            <span className="text-white text-2xl font-black">112</span>
            <span className="text-red-300/70 text-[11px] font-medium">EU emergency</span>
          </a>
          <a
            href="tel:55"
            className="flex flex-col items-center gap-1 bg-red-900/50 border border-red-800/50 rounded-2xl px-5 py-3.5"
          >
            <span className="text-white text-2xl font-black">55</span>
            <span className="text-red-300/70 text-[11px] font-medium">Silent 999</span>
          </a>
        </motion.div>

        {/* Silent 55 tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-red-400/60 text-[11px] max-w-[280px] leading-relaxed"
        >
          If you cannot speak safely, call 999 and press 5 twice when prompted to alert police silently.
        </motion.p>
      </div>

      {/* ── Footer — demo back button (only rendered when onBack is provided) ── */}
      {onBack && (
        <div className="relative z-10 pb-8 flex justify-center">
          <button
            onClick={onBack}
            className="text-red-500/40 text-xs underline underline-offset-4"
          >
            ← Back (demo only)
          </button>
        </div>
      )}
    </div>
  );
}
