// Simple API client using Fetch for the City Hall Monitoring System.
// Stores and reuses the Sanctum API token from localStorage.

import {
  getApiBaseCandidates,
  rememberWorkingApiBaseUrl,
  getApiBaseUrl,
  API_BASE_URL,
} from "@/lib/apiBase";

const API_REQUEST_TIMEOUT_MS = 75000;
const API_RETRY_DELAY_MS = 3000;

export type User = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Encoder" | "Viewer";
};

export type LoginResponse = {
  token: string;
  user: User;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("auth_token", token);
}

export function setAuthUser(user: User) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("auth_user", JSON.stringify(user));
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("auth_token");
  window.localStorage.removeItem("auth_user");
  window.sessionStorage.clear();
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const executeRequest = async (apiBaseUrl: string): Promise<Response> => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

    if (auth) {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    try {
      return await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const clientSideProxy = typeof window !== "undefined";
  const apiBaseCandidates = clientSideProxy
    ? [API_BASE_URL]
    : getApiBaseCandidates();
  const initialApiBaseUrl = clientSideProxy ? API_BASE_URL : getApiBaseUrl();
  const orderedApiBases = Array.from(
    new Set([initialApiBaseUrl, ...apiBaseCandidates])
  );

  let lastAttemptedApiBaseUrl = initialApiBaseUrl;
  let sawTimeout = false;
  let res: Response | null = null;

  for (let index = 0; index < orderedApiBases.length; index += 1) {
    const apiBaseUrl = orderedApiBases[index];
    const isLastCandidate = index === orderedApiBases.length - 1;

    try {
      res = await executeRequest(apiBaseUrl);
      if (!clientSideProxy) {
        rememberWorkingApiBaseUrl(apiBaseUrl);
      }
      break;
    } catch (error) {
      lastAttemptedApiBaseUrl = apiBaseUrl;
      if (error instanceof DOMException && error.name === "AbortError") {
        sawTimeout = true;
        await new Promise((resolve) => setTimeout(resolve, API_RETRY_DELAY_MS));

        try {
          res = await executeRequest(apiBaseUrl);
          if (!clientSideProxy) {
            rememberWorkingApiBaseUrl(apiBaseUrl);
          }
          break;
        } catch (retryError) {
          if (
            retryError instanceof DOMException &&
            retryError.name === "AbortError"
          ) {
            sawTimeout = true;
          }

          if (isLastCandidate) {
            if (sawTimeout) {
              throw new Error(
                `The backend is taking too long to respond (${lastAttemptedApiBaseUrl}). If Render is waking up, please wait a moment and try again.`
              );
            }

            throw new Error(
              `Cannot reach backend API (${lastAttemptedApiBaseUrl}). Check frontend API URL and backend CORS settings.`
            );
          }

          continue;
        }
      }

      if (isLastCandidate) {
        throw new Error(
          `Cannot reach backend API (${lastAttemptedApiBaseUrl}). Check frontend API URL and backend CORS settings.`
        );
      }
    }
  }

  if (!res) {
    throw new Error(
      `Cannot reach backend API (${lastAttemptedApiBaseUrl}). Check frontend API URL and backend CORS settings.`
    );
  }

  if (!res.ok) {
    const responseText = await res.text();
    let message = `API request failed (${res.status} ${res.statusText})`;

    if (responseText) {
      try {
        const errorBody = JSON.parse(responseText) as { message?: string };
        if (errorBody.message) {
          message = errorBody.message;
        }
      } catch {
        // Keep the status-based fallback when upstream returns HTML/plain text.
      }
    }

    throw new Error(message);
  }

  return res.json();
}

// Auth endpoints
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false
  );
  // Cache user locally to avoid refetching /auth/me on every page
  setAuthToken(res.token);
  setAuthUser(res.user);
  return res;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false
  );
}

export async function fetchMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  clearAuthToken();
}
