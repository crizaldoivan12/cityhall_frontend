const PRODUCTION_API_BASE_URL = "https://cityhall-backend-s1fg.onrender.com/api";

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

function resolveApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    PRODUCTION_API_BASE_URL;

  const candidate = trimTrailingSlash(raw);

  // Safety guard: if a production deployment is accidentally configured to use
  // localhost, keep the app functional by falling back to the hosted backend.
  if (typeof window !== "undefined") {
    const runningLocally = isLoopbackHostname(window.location.hostname);
    if (!runningLocally && isLocalApiBase(candidate)) {
      return PRODUCTION_API_BASE_URL;
    }
  }

  return candidate;
}

export const API_BASE_URL = resolveApiBaseUrl();
