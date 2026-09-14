/**
 * Accurate Voter Location & Network Intelligence Capture Utility
 * Captures precise GPS coordinates with reverse geocoding, multi-tier IP geolocation fallback,
 * and session metadata for audit logs and vote record verification.
 */

export interface LocationResult {
  locationString: string;
  source: "GPS_HIGH" | "GPS_LOW" | "IP_GEOLOCATION" | "TIMEZONE_FALLBACK";
  latitude?: number;
  longitude?: number;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
}

/**
 * Reverse geocode latitude and longitude using free, CORS-friendly API
 */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality || data.city,
        data.principalSubdivision || data.region,
        data.countryName || data.country,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {
    // Ignore and fallback
  }

  // Secondary reverse geocode fallback using Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: { "User-Agent": "CapstoneStudentVotingSystem/1.0" },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.city || addr.town || addr.village || addr.municipality,
        addr.state || addr.region || addr.province,
        addr.country,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Multi-provider IP Geolocation Chain
 */
async function fetchIpLocation(): Promise<{ locationText: string; ip?: string }> {
  // Provider 1: ipwho.is (Highly reliable, CORS allowed, no key required)
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const parts = [data.city, data.region, data.country].filter(Boolean);
        const locStr = parts.length > 0 ? parts.join(", ") : "";
        const ipStr = data.ip ? ` (IP: ${data.ip})` : "";
        if (locStr) {
          return { locationText: `${locStr}${ipStr}`, ip: data.ip };
        }
      }
    }
  } catch {
    // Try next provider
  }

  // Provider 2: ipapi.co
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const parts = [data.city, data.region, data.country_name || data.country].filter(Boolean);
      const locStr = parts.length > 0 ? parts.join(", ") : "";
      const ipStr = data.ip ? ` (IP: ${data.ip})` : "";
      if (locStr) {
        return { locationText: `${locStr}${ipStr}`, ip: data.ip };
      }
    }
  } catch {
    // Try next provider
  }

  // Provider 3: ipinfo.io
  try {
    const res = await fetch("https://ipinfo.io/json", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const parts = [data.city, data.region, data.country].filter(Boolean);
      const locStr = parts.length > 0 ? parts.join(", ") : "";
      const ipStr = data.ip ? ` (IP: ${data.ip})` : "";
      if (locStr) {
        return { locationText: `${locStr}${ipStr}`, ip: data.ip };
      }
    }
  } catch {
    // Try IP address fallback
  }

  // Provider 4: IP Address fallback via ipify
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        return { locationText: `Network Location (IP: ${data.ip})`, ip: data.ip };
      }
    }
  } catch {
    // Ignore
  }

  // Timezone fallback
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown Zone";
  return { locationText: `Local Device Session (${tz})` };
}

/**
 * Main function to capture accurate voter location
 */
export async function captureVoterLocation(): Promise<LocationResult> {
  // Check if browser supports Geolocation API
  if (navigator.geolocation) {
    // Attempt 1: High Accuracy GPS
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = pos.coords;
      const placeName = await reverseGeocode(latitude, longitude);
      const accStr = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
      
      const locStr = placeName
        ? `${placeName} [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]${accStr}`
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accStr}`;

      return {
        locationString: locStr,
        source: "GPS_HIGH",
        latitude,
        longitude,
      };
    } catch {
      // Attempt 2: Low Accuracy / Wi-Fi Geolocation
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 4000,
            maximumAge: 30000,
          });
        });

        const { latitude, longitude, accuracy } = pos.coords;
        const placeName = await reverseGeocode(latitude, longitude);
        const accStr = accuracy ? ` (±${Math.round(accuracy)}m)` : "";

        const locStr = placeName
          ? `${placeName} [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]${accStr}`
          : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accStr}`;

        return {
          locationString: locStr,
          source: "GPS_LOW",
          latitude,
          longitude,
        };
      } catch {
        // Geolocation denied or unavailable, move to IP chain
      }
    }
  }

  // Fallback: Multi-provider IP Geolocation
  const ipData = await fetchIpLocation();
  return {
    locationString: ipData.locationText,
    source: "IP_GEOLOCATION",
    ip: ipData.ip,
  };
}
