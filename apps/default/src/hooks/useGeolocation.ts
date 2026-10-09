import { useState, useEffect, useCallback } from 'react';

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'acquired'
  | 'reverse-geocoding'
  | 'ready'
  | 'denied'
  | 'error';

export interface GeoState {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  error: string | null;
}

const INITIAL: GeoState = {
  status: 'idle',
  lat: null,
  lng: null,
  accuracy: null,
  address: null,
  city: null,
  country: null,
  error: null,
};

async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string;
  city: string;
  country: string;
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address ?? {};

    // Build a human-readable street-level address
    const road = a.road ?? a.pedestrian ?? a.footway ?? '';
    const suburb = a.suburb ?? a.neighbourhood ?? a.quarter ?? '';
    const city =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';
    const postcode = a.postcode ?? '';
    const country = a.country ?? '';

    const parts = [road, suburb, city, postcode].filter(Boolean);
    const address = parts.join(', ');

    return { address: address || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city, country };
  } catch {
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city: '',
      country: '',
    };
  }
}

/** Attempt to get position with a given options set. Returns a promise. */
function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Core location fetcher — MUST be called from within a user gesture handler
 * (onClick, onTouchEnd, etc.) on Android to guarantee the permission dialog fires.
 * Tries high-accuracy GPS first, falls back to network-based location.
 */
async function fetchLocation(
  setState: (fn: (s: GeoState) => GeoState) => void
): Promise<void> {
  if (!navigator.geolocation) {
    setState(s => ({
      ...s,
      status: 'error',
      error: 'Geolocation is not supported by this browser.',
    }));
    return;
  }

  setState(s => ({ ...s, status: 'requesting', error: null }));

  // Attempt 1: high-accuracy GPS (best on iOS and Android when GPS lock available)
  // Attempt 2: low-accuracy network/cell-tower (reliable fallback, especially on Android)
  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true,  timeout: 12000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 8000,  maximumAge: 0 },
  ];

  let lastError: GeolocationPositionError | null = null;

  for (const opts of attempts) {
    try {
      const pos = await getPosition(opts);
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;

      setState(s => ({ ...s, status: 'reverse-geocoding', lat, lng, accuracy }));

      const { address, city, country } = await reverseGeocode(lat, lng);
      setState(s => ({ ...s, status: 'ready', address, city, country }));
      return; // success
    } catch (err) {
      lastError = err as GeolocationPositionError;
      // Permission denied — no point trying again with lower accuracy
      if (lastError.code === lastError.PERMISSION_DENIED) break;
    }
  }

  // All attempts exhausted
  if (lastError) {
    const isDenied = lastError.code === lastError.PERMISSION_DENIED;
    setState(s => ({
      ...s,
      status: isDenied ? 'denied' : 'error',
      error: isDenied
        ? 'Location access was denied. Please tap "Allow" when your browser asks, or enable it in Settings → Privacy → Location.'
        : 'Could not get your location. Please check GPS is on and try again.',
    }));
  }
}

export function useGeolocation(autoRequest = false) {
  const [state, setState] = useState<GeoState>(INITIAL);

  // request() MUST be called from a user-gesture handler (e.g., onClick).
  // On Android Chrome, calling getCurrentPosition outside a user gesture
  // causes the permission prompt to be silently suppressed.
  const request = useCallback(() => {
    return fetchLocation(setState);
  }, []);

  useEffect(() => {
    // autoRequest is kept for iOS Safari compatibility where the prompt
    // fires correctly on mount. Only enable when explicitly opted-in.
    if (autoRequest) {
      fetchLocation(setState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  return { ...state, request };
}
