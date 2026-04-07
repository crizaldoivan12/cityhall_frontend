"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import { cachedJson } from "@/lib/cache";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import Loader from "@/components/Loader";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { formatDisplayDate } from "@/lib/dateUtils";

type User = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Encoder" | "Viewer";
  is_active?: boolean;
};

type ResetRequestRow = {
  id: number;
  encoder_name: string | null;
  email: string;
  requested_password_masked: string;
  requested_at: string | null;
  status: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pendingRole, setPendingRole] = useState<Record<number, "Admin" | "Encoder">>({});
  const [confirmAction, setConfirmAction] = useState<{
    type: "reset_password" | "reject_user";
    user: User;
  } | null>(null);
  const [resetRequests, setResetRequests] = useState<ResetRequestRow[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetActionId, setResetActionId] = useState<number | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<Record<number, string>>(
    {}
  );

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        const res = await cachedJson(
          "users:per_page=100",
          async () => {
            const r = await fetch(`${API_BASE}/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) {
              const body = await r.json().catch(() => ({}));
              throw new Error(body.message || "Failed to load users");
            }
            return r.json();
          },
          30 * 1000
        );
        setUsers(res.data ?? []);
        setResetError(null);
        setResetLoading(true);
        const resetRes = await fetch(`${API_BASE}/password-reset-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resetRes.ok) {
          const body = await resetRes.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load password reset requests");
        }
        const resetBody = await resetRes.json();
        setResetRequests(resetBody.data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load users";
        setError(message);
        clearAuthToken();
        router.push("/login");
      } finally {
        setResetLoading(false);
        setLoading(false);
      }
    }
    init();
  }, [router, token]);

  async function handleResetDecision(id: number, decision: "approve" | "reject") {
    if (!token) return;
    setResetActionId(id);
    setResetError(null);
    try {
      const res = await fetch(
        `${API_BASE}/password-reset-requests/${id}/${decision}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to ${decision} request`);
      }
      setResetRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${decision} request`;
      setResetError(message);
    } finally {
      setResetActionId(null);
    }
  }

  async function handleRevealPassword(id: number) {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE}/password-reset-requests/${id}/reveal`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to reveal password");
      }
      const body = await res.json();
      setRevealedPassword((prev) => ({ ...prev, [id]: body.password }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reveal password";
      setResetError(message);
    }
  }

  async function toggleActive(user: User) {
    try {
      setSavingId(user.id);
      setError(null);
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: !user.is_active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update user");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update user";
      setError(message);
    } finally {
      setSavingId(null);
    }
  }

  async function resetPassword(user: User) {
    try {
      setSavingId(user.id);
      setError(null);
      const res = await fetch(`${API_BASE}/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to reset password");
      }
      // We don't expose the default password in UI for security; admin can communicate it separately.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setSavingId(null);
      setConfirmAction(null);
    }
  }

  async function approveUser(user: User) {
    try {
      setSavingId(user.id);
      setError(null);
      const role = pendingRole[user.id] ?? "Encoder";
      const res = await fetch(`${API_BASE}/users/${user.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to approve user");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve user";
      setError(message);
    } finally {
      setSavingId(null);
    }
  }

  async function rejectUser(user: User) {
    try {
      setSavingId(user.id);
      setError(null);
      const res = await fetch(`${API_BASE}/users/${user.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to reject user");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject user";
      setError(message);
    } finally {
      setSavingId(null);
      setConfirmAction(null);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader size="lg" />
              <p className="text-lg text-gray-600">Loading users...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <MainLayout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage system users and their access levels
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="font-semibold text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              All Users ({users.length})
            </h2>
          </div>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-900">{user.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            user.is_active ?? true
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {user.is_active ?? true
                            ? "Active"
                            : user.role === "Viewer"
                              ? "Pending"
                              : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3">
                        {/* Pending self-registrations (role Viewer + inactive) */}
                        {!(user.is_active ?? true) && user.role === "Viewer" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={pendingRole[user.id] ?? "Encoder"}
                              onChange={(e) =>
                                setPendingRole((prev) => ({
                                  ...prev,
                                  [user.id]: e.target.value as "Admin" | "Encoder",
                                }))
                              }
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="Encoder">Approve as Encoder</option>
                              <option value="Admin">Approve as Admin</option>
                            </select>
                            <button
                              type="button"
                              disabled={savingId === user.id}
                              onClick={() => approveUser(user)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={savingId === user.id}
                              onClick={() =>
                                setConfirmAction({ type: "reject_user", user })
                              }
                              className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() => toggleActive(user)}
                          className="text-base font-medium text-blue-600 hover:text-blue-800 disabled:opacity-60"
                        >
                          {user.is_active ?? true ? "Deactivate" : "Activate"}
                        </button>
                        )}
                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() =>
                            setConfirmAction({ type: "reset_password", user })
                          }
                          className="text-base font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">👥</div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No users found
              </p>
            </div>
          )}
        </div>

        {/* Password Reset Requests */}
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
                          : "—"}
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
      </MainLayout>
      <ConfirmActionModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "reset_password"
            ? "Confirm Password Reset"
            : "Confirm Rejection"
        }
        message={
          confirmAction?.type === "reset_password"
            ? `Reset password for ${confirmAction.user.name}? The password will be set to a default value.`
            : confirmAction
            ? `Reject registration for ${confirmAction.user.name}?`
            : ""
        }
        confirmLabel={
          confirmAction?.type === "reset_password"
            ? "Reset Password"
            : "Reject Registration"
        }
        loading={!!confirmAction && savingId === confirmAction.user.id}
        onClose={() => {
          if (savingId) return;
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "reset_password") {
            void resetPassword(confirmAction.user);
          } else {
            void rejectUser(confirmAction.user);
          }
        }}
      />
    </RoleGuard>
  );
}
