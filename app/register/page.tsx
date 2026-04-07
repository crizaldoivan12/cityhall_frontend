"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import Loader from "@/components/Loader";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const capitalizeFirst = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({ name, email, password });
      setSuccess(res.message || "Registration submitted for admin approval.");
      // Redirect back to login after a short delay
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed.";
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
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/20 bg-white/15 p-10 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 text-center">
              <Image
                src="/cabuyao-seal.png"
                alt="City of Cabuyao Seal"
                width={80}
                height={80}
                className="mx-auto mb-4 h-20 w-20 object-contain"
              />
              <h1 className="mb-2 text-2xl font-bold text-white">
                Create Account
              </h1>
              <p className="text-base text-white/70">
                Submit your details for admin approval
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200/60 bg-red-50/90 p-4">
                <p className="font-semibold text-red-800">Registration Failed</p>
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
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(capitalizeFirst(e.target.value))}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Juan Dela Cruz"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-semibold text-white/90">
                  Email Address
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
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-semibold text-white/90">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-base text-white placeholder-white/60 shadow-sm outline-none transition-all focus:border-white focus:ring-2 focus:ring-[#7b1113]/60"
                  placeholder="Re-enter password"
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
                    <span>Processing...</span>
                  </>
                ) : (
                  "Submit for Approval"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-white/70">
              Already have an account?{" "}
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
