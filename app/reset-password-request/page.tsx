"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function ResetPasswordRequestPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/password-reset-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const firstError =
          body?.errors && typeof body.errors === "object"
            ? Object.values(body.errors)[0]?.[0]
            : null;
        throw new Error(
          firstError ||
            body.message ||
            `Failed to submit reset request (status ${res.status}).`
        );
      }

      const body = await res.json().catch(() => ({}));
      setSuccess(
        body.message ||
          "Reset request submitted. Please wait for admin approval."
      );
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit reset request.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/cabuyao-cityhall.jpg)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#3a0a0b]/90 via-[#5a0f11]/85 to-[#7b1113]/80"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-white/20 bg-white/15 p-10 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-white">
                Reset Password Request
              </h1>
              <p className="text-base text-white/70">
                Submit a request for admin approval
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200/60 bg-red-50/90 p-4">
                <p className="font-semibold text-red-800">Request Failed</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-6 rounded-xl border border-green-200/60 bg-green-50/90 p-4">
                <p className="font-semibold text-green-800">Submitted</p>
                <p className="mt-1 text-sm text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-base font-semibold text-white/90">
                  Registered Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="your.email@cityhall.local"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-semibold text-white/90">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Create a new password"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-semibold text-white/90">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1113] px-6 py-4 text-base font-semibold text-white shadow-md transition-all duration-300 ease-in-out hover:bg-[#661013] disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader size="sm" variant="light" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Reset Request"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-white/70">
              Remembered your password?{" "}
              <Link
                className="font-semibold text-white hover:text-white/90 hover:underline transition-colors"
                href="/login"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
