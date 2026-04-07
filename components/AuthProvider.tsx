"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clearAuthToken, fetchMe, logout as apiLogout, type User } from "@/lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  setUserLocal: (user: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem("auth_user");
    return;
  }
  window.localStorage.setItem("auth_user", JSON.stringify(user));
}

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem("auth_token");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Deduplicate concurrent refresh calls across Sidebar/RoleGuard/pages.
  const refreshPromise = useRef<Promise<User | null> | null>(null);

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setUser(null);
      setStoredUser(null);
      setLoading(false);
      return null;
    }

    if (refreshPromise.current) return refreshPromise.current;

    setLoading(true);
    refreshPromise.current = fetchMe()
      .then((u) => {
        setUser(u);
        setStoredUser(u);
        return u;
      })
      .catch(() => {
        clearAuthToken();
        setUser(null);
        setStoredUser(null);
        return null;
      })
      .finally(() => {
        refreshPromise.current = null;
        setLoading(false);
      });

    return refreshPromise.current;
  }, []);

  const setUserLocal = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    setStoredUser(nextUser);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore network failures; still clear local auth
    } finally {
      clearAuthToken();
      setUser(null);
      setStoredUser(null);
    }
  }, []);

  // Initialize auth state on the client only to avoid hydration mismatches.
  useEffect(() => {
    const storedUser = getStoredUser();
    const tokenExists = hasToken();

    if (storedUser) {
      setUser(storedUser);
      setLoading(false);
      return;
    }

    if (tokenExists) {
      refresh();
      return;
    }

    setLoading(false);
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({ user, loading, refresh, setUserLocal, logout }),
    [user, loading, refresh, setUserLocal, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
