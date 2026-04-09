const PRODUCTION_API_BASE_URLS = [
  "https://cityhall-backend-1.onrender.com",
  "https://cityhall-backend-s1fg.onrender.com",
] as const;

const API_BASE_STORAGE_KEY = "cityhall_api_base_url";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

function isLocalApiBase(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeApiBase(url: string): string {
  return trimTrailingSlash(url);
}

function getConfiguredApiBase(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!configured) {
    return PRODUCTION_API_BASE_URLS[0];
  }

  const normalized = normalizeApiBase(configured);

  if (typeof window !== "undefined") {
    const runningLocally = isLoopbackHostname(window.location.hostname);
    if (!runningLocally && isLocalApiBase(normalized)) {
      return PRODUCTION_API_BASE_URLS[0];
    }
  }

  return normalized;
}

function getStoredApiBase(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  return stored ? normalizeApiBase(stored) : null;
}

function setStoredApiBase(apiBaseUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(API_BASE_STORAGE_KEY, normalizeApiBase(apiBaseUrl));
}

export function getApiBaseCandidates(): string[] {
  const configured = getConfiguredApiBase();
  const stored = getStoredApiBase();

  return Array.from(
    new Set(
      [stored, configured, ...PRODUCTION_API_BASE_URLS]
        .filter((value): value is string => Boolean(value))
        .map(normalizeApiBase)
    )
  );
}

let currentApiBaseUrl = getApiBaseCandidates()[0];

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const [preferred] = getApiBaseCandidates();
    if (preferred && preferred !== currentApiBaseUrl) {
      currentApiBaseUrl = preferred;
    }
  }

  return currentApiBaseUrl;
}

export function setApiBaseUrl(apiBaseUrl: string): string {
  const normalized = normalizeApiBase(apiBaseUrl);
  currentApiBaseUrl = normalized;
  setStoredApiBase(normalized);
  return normalized;
}

export function rememberWorkingApiBaseUrl(apiBaseUrl: string): string {
  return setApiBaseUrl(apiBaseUrl);
}

export function getApiOriginCandidates(): string[] {
  return getApiBaseCandidates().map((apiBaseUrl) => apiBaseUrl.replace(/\/api$/, ""));
}

export async function warmUpApiOrigins(timeoutMs = 12000): Promise<void> {
  if (typeof window === "undefined") return;

  const warmupRequests = getApiOriginCandidates().map(async (origin) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      await fetch(`${origin}/?warmup=${Date.now()}`, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      // Warmup is best-effort only.
    } finally {
      window.clearTimeout(timeoutId);
    }
  });

  await Promise.allSettled(warmupRequests);
}

export const API_BASE_URL = getApiBaseUrl();
