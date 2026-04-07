"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const handleRefresh = async () => {
    setMessage(null);
    setError(null);
    setRefreshing(true);
    try {
      const refreshed = await refresh();
      if (!refreshed) {
        setError("Session expired. Please login again.");
        router.replace("/login");
        return;
      }
      setMessage("Session refreshed.");
    } catch {
      setError("Failed to refresh session.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !user) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
            <p className="text-lg text-gray-600">Loading settings...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage your account details and quick actions.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">Account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your signed-in profile details.
          </p>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <dt className="font-medium text-gray-600">Name</dt>
              <dd className="font-semibold text-gray-900">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <dt className="font-medium text-gray-600">Email</dt>
              <dd className="font-semibold text-gray-900">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-gray-600">Role</dt>
              <dd className="font-semibold text-gray-900">{user.role}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh Session"}
            </button>
            <Link
              href="/help"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
            >
              Help Center
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">Admin Tools</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quick links for system management.
          </p>
          {user.role === "Admin" ? (
            <div className="mt-6 grid gap-3">
              <Link
                href="/users"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-blue-500"
              >
                Manage Users
              </Link>
              <Link
                href="/departments"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-blue-500"
              >
                Manage Departments
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Admin tools are only available for system administrators.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
