/**
 * Geofencing Utility - Negros Oriental, Philippines
 *
 * Restricts voting to students physically located within Negros Oriental.
 * Strategy:
 *   1. Browser Geolocation API (GPS) - Primary, most accurate
 *   2. IP geolocation fallback chain  - When GPS is denied/unavailable
 */

// ---------------------------------------------------------------------------
// Negros Oriental Province Boundary Polygon (approximate)
// Lat/Lng pairs (clockwise), covering full extent of the province
// ---------------------------------------------------------------------------
const NEGROS_ORIENTAL_POLYGON: [number, number][] = [
  [10.8000, 122.9800],
  [10.7500, 123.0500],
  [10.7000, 123.1200],
  [10.6000, 123.2000],
  [10.4500, 123.3200],
  [10.3000, 123.4000],
  [10.1500, 123.4500],
  [9.9500,  123.4700],
  [9.8000,  123.4500],
  [9.6500,  123.4000],
  [9.5000,  123.3800],
  [9.4000,  123.3500],  // extended east to cover coastal barangays
  [9.3500,  123.3200],  // covers Dumaguete City northern edge
  [9.2800,  123.3000],  // covers Dumaguete City proper (9.31°N, 123.31°E)
  [9.1500,  123.2000],  // extended east from old 123.1500
  [9.0500,  123.0500],  // extended east from old 123.0200
  [9.1000,  122.8000],
  [9.2000,  122.7200],
  [9.3500,  122.6800],
  [9.5000,  122.6500],
  [9.7000,  122.7000],
  [9.9000,  122.7500],
  [10.1000, 122.7800],
  [10.3000, 122.8000],
  [10.5000, 122.8500],
  [10.6500, 122.9000],
  [10.8000, 122.9800],
];

const BOUNDS = { minLat: 9.0500, maxLat: 10.8000, minLng: 122.6500, maxLng: 123.4700 };

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isWithinNegrosOriental(lat: number, lng: number): boolean {
  return isPointInPolygon(lat, lng, NEGROS_ORIENTAL_POLYGON);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GeofenceStatus =
  | 'allowed'
  | 'blocked'
  | 'permission_denied'
  | 'unavailable'
  | 'ip_allowed'
  | 'ip_blocked'
  | 'unknown';

export interface GeofenceResult {
  status: GeofenceStatus;
  message: string;
  latitude?: number;
  longitude?: number;
  detectedLocation?: string;
  usedGps: boolean;
}

// ---------------------------------------------------------------------------
// IP Geolocation Fallback
// ---------------------------------------------------------------------------
async function getLocationByIp(): Promise<{ lat?: number; lng?: number; country?: string; region?: string; city?: string } | null> {
  const tryFetch = async (url: string): Promise<Record<string, unknown> | null> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
  };

  // Provider 1: ipwho.is
  const d1 = await tryFetch('https://ipwho.is/') as Record<string, unknown> | null;
  if (d1?.success && d1.latitude != null) {
    return { lat: d1.latitude as number, lng: d1.longitude as number, country: d1.country as string, region: (d1.region ?? d1.regionName) as string, city: d1.city as string };
  }

  // Provider 2: ipapi.co
  const d2 = await tryFetch('https://ipapi.co/json/') as Record<string, unknown> | null;
  if (d2 && d2.latitude != null) {
    return { lat: d2.latitude as number, lng: d2.longitude as number, country: (d2.country_name ?? d2.country) as string, region: (d2.region ?? d2.regionName) as string, city: d2.city as string };
  }

  // Provider 3: ipinfo.io (loc = "lat,lng")
  const d3 = await tryFetch('https://ipinfo.io/json') as Record<string, unknown> | null;
  if (d3?.loc) {
    const [lat, lng] = (d3.loc as string).split(',').map(Number);
    return { lat, lng, country: d3.country as string, region: d3.region as string, city: d3.city as string };
  }

  return null;
}

// ---------------------------------------------------------------------------
// GPS Attempt Helper
// ---------------------------------------------------------------------------
async function tryGps(highAccuracy: boolean): Promise<GeofenceResult | null> {
  return new Promise<GeofenceResult | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const inside = isWithinNegrosOriental(latitude, longitude);
        resolve({
          status: inside ? 'allowed' : 'blocked',
          message: inside
            ? 'Location verified. You are within Negros Oriental.'
            : 'Your current location is outside Negros Oriental. Voting is restricted to students within the province.',
          latitude,
          longitude,
          usedGps: true,
        });
      },
      (err) => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          resolve({
            status: 'permission_denied',
            message: 'Location access was denied. Please enable location permissions in your browser settings to verify you are within Negros Oriental.',
            usedGps: false,
          });
        } else {
          resolve(null); // timeout/unavailable - try fallback
        }
      },
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 7000 : 5000, maximumAge: highAccuracy ? 0 : 30000 }
    );
  });
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------
export async function checkGeofence(): Promise<GeofenceResult> {
  // Step 1: High accuracy GPS
  if (navigator.geolocation) {
    const r1 = await tryGps(true);
    if (r1) return r1;
    // Step 2: Low accuracy GPS
    const r2 = await tryGps(false);
    if (r2) return r2;
  }

  // Step 3: IP fallback
  const ipData = await getLocationByIp();
  if (!ipData) {
    return { status: 'unknown', message: 'Unable to verify your location. If you are within Negros Oriental, you may proceed.', usedGps: false };
  }

  const { lat, lng, country, region, city } = ipData;
  const locationLabel = [city, region, country].filter(Boolean).join(', ');
  const countryUpper = (country || '').toUpperCase();
  const isPhilippines = countryUpper === 'PHILIPPINES' || countryUpper === 'PH' || countryUpper.includes('PHILIP');

  if (!isPhilippines) {
    return {
      status: 'ip_blocked',
      message: `Your network location appears to be outside the Philippines (detected: ${locationLabel || 'Unknown'}). Voting is restricted to students within Negros Oriental, Philippines.`,
      detectedLocation: locationLabel,
      usedGps: false,
    };
  }

  if (lat != null && lng != null && !isWithinNegrosOriental(lat, lng)) {
    return {
      status: 'ip_blocked',
      message: `Your network location appears to be outside Negros Oriental (detected: ${locationLabel || 'Philippines'}). Voting is restricted to students within the province.`,
      detectedLocation: locationLabel,
      latitude: lat,
      longitude: lng,
      usedGps: false,
    };
  }

  return {
    status: 'ip_allowed',
    message: `Location verified via network (${locationLabel || 'Philippines'}). You appear to be within the province.`,
    detectedLocation: locationLabel,
    latitude: lat,
    longitude: lng,
    usedGps: false,
  };
}
