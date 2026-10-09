import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { QrCode, Camera, X, MapPin } from 'lucide-react';

interface EstateLocationLike {
  id: string;
  name: string;
  what3words: string;
  lat: number;
  lng: number;
  area: string;
  assetType: string;
}

interface QRScannerProps {
  locations: EstateLocationLike[];
  onLocationFound: (loc: EstateLocationLike) => void;
  onClose: () => void;
}

export function QRScanner({ locations, onLocationFound, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const init = async () => {
      try {
        if (typeof (window as any).BarcodeDetector !== 'undefined') {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ['qr_code'],
          });
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('Camera not available. Select a location manually.');
        setShowManual(true);
      }
    };

    init();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const detect = useCallback(async () => {
    if (!scanning || !detectorRef.current || !videoRef.current) return;

    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes && codes.length > 0) {
        const raw = codes[0].rawValue as string;
        const loc = locations.find(l => l.id === raw || l.name === raw);
        if (loc) {
          setScanning(false);
          onLocationFound(loc);
        } else {
          const byName = locations.find(l =>
            raw.toLowerCase().includes(l.name.toLowerCase().split(' ')[0]),
          );
          if (byName) {
            setScanning(false);
            onLocationFound(byName);
          }
        }
      }
    } catch {
      // Detection cycle continues
    }

    if (scanning) {
      rafRef.current = requestAnimationFrame(detect);
    }
  }, [scanning, locations, onLocationFound]);

  useEffect(() => {
    if (scanning && detectorRef.current && videoRef.current) {
      rafRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, detect]);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" style={{ background: 'rgba(0,0,0,0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5" style={{ color: 'var(--brass)' }} />
          <span className="text-sm font-medium text-white">Scan Estate QR Tag</span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        {!error && !showManual ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-60 h-60">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'var(--brass)' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: 'var(--brass)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: 'var(--brass)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'var(--brass)' }} />
                {scanning && (
                  <div
                    className="absolute left-0 right-0 h-0.5 animate-pulse"
                    style={{ background: 'var(--brass)', top: '50%' }}
                  />
                )}
              </div>
            </div>
            <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-white/70">
              Point camera at an estate QR tag
            </p>
          </>
        ) : (
          /* Manual fallback */
          <div className="w-full max-w-sm px-6 space-y-4">
            <div className="text-center space-y-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: 'var(--brass-dim)' }}
              >
                <MapPin className="w-6 h-6" style={{ color: 'var(--brass)' }} />
              </div>
              <p className="text-sm font-medium text-white">Select Location</p>
              <p className="text-xs text-white/60">Camera unavailable. Pick a location to report from.</p>
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => onLocationFound(loc)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-sm font-medium text-white truncate">{loc.name}</p>
                  <p className="text-xs text-white/50 font-mono">/// {loc.what3words}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{loc.area} | {loc.assetType}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!showManual && !error && (
        <div className="px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setShowManual(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Select location manually instead
          </button>
        </div>
      )}
    </div>
  );
}
