"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { API_BASE_URL } from "@/lib/apiBase";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import Loader from "@/components/Loader";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutToast, setLogoutToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logged_out") === "1") {
      setLogoutToast(true);
      router.replace("/login");
      const t = setTimeout(() => setLogoutToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wake sleeping Render backends early so the login request is less likely
    // to hit a cold start timeout. Image requests do not require CORS access.
    const warmupImage = new window.Image();
    const warmupUrl = API_BASE_URL.replace(/\/api$/, "");
    warmupImage.src = `${warmupUrl}/?warmup=${Date.now()}`;
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      auth.setUserLocal(res.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3a0a0b] via-[#5a0f11] to-[#7b1113]" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#3a0a0b]/90 via-[#5a0f11]/85 to-[#7b1113]/80"
        aria-hidden="true"
      />

      {/* Logout success toast */}
      {logoutToast && (
        <div
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-green-200 bg-green-50 px-6 py-3 shadow-lg animate-modal-overlay"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">
            Successfully logged out.
          </p>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        {/* Login Card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/20 bg-white/15 p-10 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="mb-8 text-center">
              <Image
                src="/cabuyao-seal.png"
                alt="City of Cabuyao Seal"
                width={96}
                height={96}
                className="mx-auto mb-4 h-24 w-24 object-contain"
              />
              <h1 className="mb-2 text-2xl font-bold text-white">
                Cabuyao City Hall Monitoring System
              </h1>
              <p className="text-base text-white/70">Secure Access Portal</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200/60 bg-red-50/90 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{"\u26A0\uFE0F"}</span>
                  <div>
                    <p className="font-semibold text-red-800">Login Failed</p>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-white/90"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Enter your City Hall email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-white/90"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1113] px-6 py-4 text-base font-semibold text-white shadow-md transition-all duration-300 ease-in-out hover:bg-[#661013] disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader size="md" variant="light" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>{"\uD83D\uDD12"}</span>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link
                href="/reset-password-request"
                className="text-sm font-medium text-white/80 hover:text-white hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Create New Account Section */}
            <div className="mt-8 border-t border-white/20 pt-6">
              <p className="mb-3 text-center text-sm text-white/70">
                Don&apos;t have an account?
              </p>
              <Link
                href="/register"
                className="flex w-full items-center justify-center rounded-xl border border-white/60 bg-white/10 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:border-white hover:bg-white/20 active:scale-[0.98]"
              >
                Create New Account
              </Link>
              <p className="mt-3 text-center text-xs text-white/60">
                New account requests require admin approval.
              </p>
            </div>

            {/* Footer Help Section */}
            <div className="mt-6 rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-sm text-white/70">
                <strong className="text-white/90">Need help?</strong> Contact
                your system administrator if you forgot your password or need
                account access.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-white/60">
            {"\u00A9"} City Hall Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
}
