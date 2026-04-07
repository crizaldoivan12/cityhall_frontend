// Simple API client using Fetch for the City Hall Monitoring System.
// Stores and reuses the Sanctum API token from localStorage.

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://cityhall-backend-s1fg.onrender.com/api";

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
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `Cannot reach backend API (${API_BASE_URL}). Check frontend API URL and backend CORS settings.`
    );
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || "API request failed");
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
