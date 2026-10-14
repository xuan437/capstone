/**
 * GUSELA Smart Cache & Local Storage Manager
 * Handles user consent, client-side caching for candidates, election settings,
 * images, and partylists with TTL and offline fallback.
 */

const CACHE_CONSENT_KEY = "gusela_cache_consent";
const CACHE_PREFIX = "gusela_cache_";
const DEFAULT_TTL_MINUTES = 30;

// In-memory volatile cache for session or when persistent storage is declined
const memoryCache = new Map<string, { data: any; expiry: number }>();

export type CacheConsentStatus = "allowed" | "declined" | null;

/**
 * Check if the user has allowed persistent cache storage
 */
export const getCacheConsent = (): CacheConsentStatus => {
  try {
    const val = localStorage.getItem(CACHE_CONSENT_KEY);
    if (val === "allowed" || val === "declined") return val;
    return null;
  } catch {
    return null;
  }
};

/**
 * Check if caching is currently enabled
 */
export const isCacheAllowed = (): boolean => {
  return getCacheConsent() === "allowed";
};

/**
 * Set user consent for cache storage
 */
export const setCacheConsent = (allowed: boolean): void => {
  try {
    const status: CacheConsentStatus = allowed ? "allowed" : "declined";
    localStorage.setItem(CACHE_CONSENT_KEY, status);

    if (!allowed) {
      clearPersistentCache();
    }
  } catch (e) {
    console.warn("Unable to save cache consent to localStorage", e);
  }
};

/**
 * Save an item to cache (localStorage if allowed, fallback to memory)
 */
export const setCacheItem = <T>(key: string, data: T, ttlMinutes = DEFAULT_TTL_MINUTES): void => {
  const expiry = Date.now() + ttlMinutes * 60 * 1000;
  memoryCache.set(key, { data, expiry });

  if (!isCacheAllowed()) return;

  try {
    const payload = JSON.stringify({ data, expiry });
    localStorage.setItem(`${CACHE_PREFIX}${key}`, payload);
  } catch (e) {
    console.warn(`Failed to write cache for key: ${key}`, e);
  }
};

/**
 * Retrieve an item from cache
 */
export const getCacheItem = <T>(key: string): T | null => {
  const now = Date.now();

  // Check in-memory first
  if (memoryCache.has(key)) {
    const item = memoryCache.get(key)!;
    if (item.expiry > now) {
      return item.data as T;
    }
    memoryCache.delete(key);
  }

  // Check localStorage if permitted
  if (!isCacheAllowed()) return null;

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.expiry && parsed.expiry < now) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    // Refresh memory cache
    memoryCache.set(key, { data: parsed.data, expiry: parsed.expiry });
    return parsed.data as T;
  } catch {
    return null;
  }
};

/**
 * Remove an item from cache
 */
export const removeCacheItem = (key: string): void => {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // ignore
  }
};

/**
 * Clear all persistent cache entries created by GUSELA
 */
export const clearPersistentCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Failed to clear persistent cache", e);
  }
};

/**
 * Clear all cache (both in-memory and persistent)
 */
export const clearAllCache = (): void => {
  memoryCache.clear();
  clearPersistentCache();
};

/**
 * Specialized helpers for common entities
 */
export const cacheCandidates = (candidates: any[]): void => {
  setCacheItem("candidates_list", candidates, 20);
};

export const getCachedCandidates = <T = any[]>(): T | null => {
  return getCacheItem<T>("candidates_list");
};

export const cachePartyLists = (partyLists: any[]): void => {
  setCacheItem("partylists_list", partyLists, 30);
};

export const getCachedPartyLists = <T = any[]>(): T | null => {
  return getCacheItem<T>("partylists_list");
};

export const cacheElectionSettings = (settings: any): void => {
  setCacheItem("election_settings", settings, 15);
};

export const getCachedElectionSettings = <T = any>(): T | null => {
  return getCacheItem<T>("election_settings");
};
