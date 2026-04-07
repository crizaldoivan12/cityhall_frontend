"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken, type User } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";
import { formatDisplayDate } from "@/lib/dateUtils";
import StatusCell from "@/components/StatusCell";
import Loader from "@/components/Loader";

type Metrics = {
  total_documents: number;
  by_status: Record<string, number>;
  by_department: {
    department_id: number;
    department_name: string | null;
    total: number;
  }[];
};

type DocumentRow = {
  id: number;
  document_code: string;
  date: string;
  pay_claimant: string;
  status: string;
  department?: { name: string };
  routed_department?: { name: string };
};

type IconProps = {
  className?: string;
};

function PlusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function DocumentIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 2h6l5 5v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function LightbulbIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12c.7.6 1.2 1.5 1.4 2.5h5.2c.2-1 .7-1.9 1.4-2.5A7 7 0 0 0 12 2z" />
    </svg>
  );
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://cityhall-backend-s1fg.onrender.com/api";

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<DocumentRow[]>([]);
  const [myDocuments, setMyDocuments] = useState<DocumentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        if (auth.loading) return;
        if (!auth.user) {
          router.replace("/login");
          return;
        }

        const userData = auth.user;
        setUser(userData);

        if (!token) {
          clearAuthToken();
          router.replace("/login");
          return;
        }

        if (userData.role === "Admin") {
          // Admin: Full system overview
          const headers = { Authorization: `Bearer ${token}` };
          const [metricsRes, recentRes] = await Promise.all([
            cachedJson(
              "dashboard:metrics",
              async () => {
                const r = await fetch(`${API_BASE}/dashboard/metrics`, { headers });
                if (!r.ok) throw new Error("Failed to load metrics");
                return r.json();
              },
              30 * 1000
            ),
            cachedJson(
              "dashboard:recent:10",
              async () => {
                const r = await fetch(`${API_BASE}/documents/recent?limit=0`, {
                  headers,
                });
                if (!r.ok) throw new Error("Failed to load recent documents");
                return r.json();
              },
              10 * 1000
            ),
          ]);
          setMetrics(metricsRes);
          setRecent(recentRes);

        } else if (userData.role === "Encoder") {
          // Encoder: Personal focus
          const headers = { Authorization: `Bearer ${token}` };
          const [myDocsRes, recentRes] = await Promise.all([
          cachedJson(
            `dashboard:encoder-my-docs:${userData.id}`,
            async () => {
              const r = await fetch(
                `${API_BASE}/documents?encoded_by=${userData.id}&per_page=5`,
                {
                  headers,
                }
              );
              if (!r.ok) throw new Error("Failed to load your documents");
              return r.json();
            },
            10 * 1000
          ),
            cachedJson(
              "dashboard:recent:5",
              async () => {
                const r = await fetch(`${API_BASE}/documents/recent?limit=5`, {
                  headers,
                });
                if (!r.ok) throw new Error("Failed to load recent documents");
                return r.json();
              },
              10 * 1000
            ),
          ]);
          setMyDocuments(myDocsRes.data ?? []);
          setRecent(recentRes);
        } else {
          // Viewer: Read-only overview
          const metricsRes = await cachedJson(
            "dashboard:metrics",
            async () => {
              const r = await fetch(`${API_BASE}/dashboard/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!r.ok) throw new Error("Failed to load metrics");
              return r.json();
            },
            30 * 1000
          );
          setMetrics(metricsRes);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token, auth.loading, auth.user]);

  useEffect(() => {
    if (!user || user.role !== "Admin" || !token) return;
    let active = true;
    const headers = { Authorization: `Bearer ${token}` };

    const refreshRecent = async () => {
      try {
        const r = await fetch(`${API_BASE}/documents/recent?limit=0`, {
          headers,
        });
        if (!r.ok) return;
        const data = await r.json();
        if (active) setRecent(data ?? []);
      } catch {
        // Keep silent; dashboard will refresh on next load.
      }
    };

    const intervalId = window.setInterval(refreshRecent, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user, token]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
            <p className="text-lg text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">{error}</p>
        </div>
      </MainLayout>
    );
  }

  // Admin Dashboard
  if (user?.role === "Admin") {
    return (
      <MainLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Cabuyao City Hall Monitoring System
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Admin Dashboard - Complete system overview and management
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600 mb-1">
                  Total Documents
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {metrics?.total_documents ?? 0}
                </p>
              </div>
              <div className="text-4xl"></div>
            </div>
            <Link
              href="/documents"
              className="mt-4 inline-block text-base font-medium text-blue-600 hover:text-blue-700"
            >
              View all documents {"->"}
            </Link>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-base font-medium text-gray-600 mb-3">
              Documents by Status
            </p>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {metrics && Object.keys(metrics.by_status).length > 0 ? (
                Object.entries(metrics.by_status)
                  .filter(([status]) => status !== "Pending")
                  .map(([status, total]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-base text-gray-700">{status}</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {total}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-base text-gray-500">No data</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-base font-medium text-gray-600 mb-4">
              Documents by Department Out
            </p>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-3">
              {metrics && metrics.by_department.length > 0 ? (
                metrics.by_department.map((row) => (
                  <div
                    key={row.department_id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-base text-gray-700">
                      {row.department_name ?? "Unknown"}
                    </span>
                    <span className="text-lg font-semibold text-gray-900 tabular-nums text-right w-10">
                      {row.total}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-base text-gray-500">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Actions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Document Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Pay Claimant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Department Out
                  </th>
                  <th className="w-[180px] px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recent.length > 0 ? (
                  recent.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-mono font-medium text-gray-900">
                          {doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">
                          {formatDisplayDate(doc.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">
                          {doc.pay_claimant}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">
                          {doc.routed_department?.name ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell status={doc.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-base text-gray-500">
                        No documents require action right now
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Password Reset Requests */}
        {/*
          <div className="mt-8 rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Password Reset Requests
            </h2>
            <span className="text-sm text-gray-500">
              {resetRequests.length} pending
            </span>
          </div>
          {resetError && (
            <div className="px-6 py-4 text-sm text-red-700 bg-red-50 border-b border-red-100">
              {resetError}
            </div>
          )}
          {resetLoading ? (
            <div className="px-6 py-10 text-center">
              <Loader size="lg" />
              <p className="mt-3 text-base text-gray-600">
                Loading reset requests...
              </p>
            </div>
          ) : resetRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Encoder Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Requested Password
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date Requested
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {resetRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.encoder_name ?? "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {req.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="font-mono">
                            {revealedPassword[req.id] ??
                              req.requested_password_masked}
                          </span>
                          {!revealedPassword[req.id] && (
                            <button
                              type="button"
                              onClick={() => handleRevealPassword(req.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Reveal
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {req.requested_at
                          ? formatDisplayDate(req.requested_at)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={resetActionId === req.id}
                            onClick={() => handleResetDecision(req.id, "approve")}
                            className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={resetActionId === req.id}
                            onClick={() => handleResetDecision(req.id, "reject")}
                            className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No pending reset requests.
            </div>
          )}
          </div>
        */}
      </MainLayout>
    );
  }

  // Encoder Dashboard
  if (user?.role === "Encoder") {
    return (
      <MainLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Cabuyao City Hall Monitoring System
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            My Dashboard - Quick overview of your work today
          </p>
        </div>
        {/* Quick Actions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <Link
            href="/documents/new"
            className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 p-6 text-white shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                  Quick Action
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Encode Document
                </h3>
                <p className="mt-3 text-sm text-blue-100">
                  Create a new document entry
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white">
                <PlusIcon className="h-6 w-6" />
              </span>
            </div>
          </Link>

          <Link
            href="/documents/my"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Your Workspace
                </p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  My Documents
                </h3>
                <p className="mt-3 text-sm text-gray-600">
                  View documents you encoded ({myDocuments.length})
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <DocumentIcon className="h-6 w-6" />
              </span>
            </div>
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Reminder
                </p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  Quick Tips
                </h3>
                <p className="mt-3 text-sm text-gray-600">
                  Keep document statuses updated for accurate tracking.
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <LightbulbIcon className="h-6 w-6" />
              </span>
            </div>
          </div>
        </div>
        {/* Recent Documents I Encoded */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              My Recent Documents
            </h2>
            <Link
              href="/documents/my"
              className="text-base font-medium text-blue-600 hover:text-blue-700"
            >
              View all {"->"}
            </Link>
          </div>
          {myDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Document Code
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Pay Claimant
                    </th>
                    <th className="w-[200px] px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {myDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-mono font-medium text-gray-900">
                          {doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">
                          {formatDisplayDate(doc.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">
                          {doc.pay_claimant}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell
                          status={doc.status}
                          action={
                            <Link
                              href={`/documents/${doc.id}/edit`}
                              className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            >
                              Edit
                            </Link>
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl"></div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No documents yet
              </p>
              <p className="mb-6 text-base text-gray-600">
                Start by encoding your first document
              </p>
              <Link
                href="/documents/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <span>+</span>
                <span>Encode New Document</span>
              </Link>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Viewer Dashboard (fallback)
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Cabuyao City Hall Monitoring System
        </h1>
        <p className="mt-2 text-lg text-gray-600">Dashboard - System overview</p>
      </div>
      {/* Viewer content similar to admin but read-only */}
    </MainLayout>
  );
}
