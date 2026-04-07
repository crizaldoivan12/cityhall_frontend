"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { cachedJson } from "@/lib/cache";

type EditRequestUser = {
  id: number;
  name: string;
};

type EditRequestDocument = {
  id: number;
  document_code: string;
  document_number?: string | null;
};

type InactivityDocument = {
  id: number;
  document_code: string;
  document_number?: string | null;
  status: string;
};

type EditRequest = {
  id: number;
  document_id: number;
  status: "pending" | "accepted" | "rejected" | "expired" | "used";
  created_at: string;
  accepted_at?: string | null;
  expires_at?: string | null;
  remarks?: string | null;
  updated_at?: string | null;
  requested_by_user_id: number;
  requested_to_user_id: number;
  requested_by?: EditRequestUser;
  requested_to?: EditRequestUser;
  document?: EditRequestDocument;
};

type NotificationItem = {
  id: string;
  kind: "incoming" | "outgoing" | "inactivity" | "password_reset";
  request?: EditRequest;
  document?: InactivityDocument;
  reset_status?: "approved" | "rejected";
  created_at: string;
  unread: boolean;
  inactive_days?: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function EditRequestNotifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    request: EditRequest;
    decision: "accept" | "reject";
  } | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  const loadData = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [editRes, resetRes] = await Promise.all([
        cachedJson(
          `notifications:${user.id}`,
          async () => {
            const r = await fetch(`${API_BASE}/edit-requests/notifications`, {
              headers,
            });
            if (!r.ok) {
              const body = await r.json().catch(() => ({}));
              throw new Error(body.message || "Failed to load notifications");
            }
            return r.json();
          },
          5 * 1000
        ),
        fetch(`${API_BASE}/password-reset-requests/notifications`, { headers })
          .then(async (r) => {
            if (!r.ok) return { data: [], unread_count: 0 };
            return r.json();
          })
          .catch(() => ({ data: [], unread_count: 0 })),
      ]);

      const resetItems: NotificationItem[] = (resetRes.data ?? []).map(
        (item: {
          id: number;
          status: "approved" | "rejected";
          requested_at: string;
          read: boolean;
        }) => ({
          id: `reset-${item.id}`,
          kind: "password_reset",
          reset_status: item.status,
          created_at: item.requested_at,
          unread: !item.read,
        })
      );

      const combined = [...(editRes.data ?? []), ...resetItems].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime;
      });

      const unread =
        (editRes.unread_count ?? 0) + (resetRes.unread_count ?? 0);

      setNotifications(combined);
      setUnreadCount(unread);
      return {
        notifications: combined,
        unreadCount: unread,
      };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load notifications";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, token, loadData]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await Promise.all([
      fetch(`${API_BASE}/edit-requests/notifications/mark-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kind: "all" }),
      }),
      fetch(`${API_BASE}/password-reset-requests/notifications/mark-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);
  }, [token]);

  useEffect(() => {
    if (!open || !user || !token) return;
    void (async () => {
      const result = await loadData();
      if (!result || result.unreadCount === 0) return;
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    })();
  }, [open, user, token, loadData, markAllRead]);

  async function handleDecision(
    request: EditRequest,
    decision: "accept" | "reject"
  ) {
    if (!token) return;
    const actionLabel = decision === "accept" ? "approve" : "reject";
    try {
      const res = await fetch(
        `${API_BASE}/edit-requests/${request.id}/${decision}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to ${actionLabel} request.`);
      }
      const updated: EditRequest = await res.json();
      setNotifications((prev) =>
        prev.map((n) =>
          n.request?.id === updated.id ? { ...n, request: updated } : n
        )
      );
      void loadData();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : `Failed to ${actionLabel} request.`;
      setError(message);
    }
    setConfirmAction(null);
  }

  if (!user) return null;
  const isAdmin = user.role === "Admin";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:border-red-400 hover:text-red-600"
        aria-label="Notifications"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="border-b border-gray-200 px  -4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {loading && (
              <span className="flex items-center gap-2 text-xs text-gray-500">
                <Loader size="sm" />
                Loading…
              </span>
            )}
          </div>
          {error && (
            <div className="px-4 py-3 text-xs text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}
          {notifications.length === 0 && !loading ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const isIncoming = n.kind === "incoming";
                const isInactivity = n.kind === "inactivity";
                const isReset = n.kind === "password_reset";
                const req = n.request;
                const doc = n.document;
                const docRef = isInactivity
                  ? doc?.document_number || doc?.document_code || "Document"
                  : req?.document?.document_number || req?.document?.document_code || "Document";
                const name = req
                  ? req.requested_by?.name ?? `User #${req.requested_by_user_id}`
                  : null;
                const message = isReset
                  ? `Your password reset request was ${n.reset_status === "approved" ? "approved" : "rejected"}.`
                  : isInactivity
                    ? `Document ${docRef} has been inactive for ${n.inactive_days ?? 3} days.`
                    : isIncoming && req
                      ? `User ${name} is requesting to edit Document ${docRef}.`
                      : req?.status === "accepted"
                        ? `Your edit request for Document ${docRef} has been approved. You can edit it within the allowed time.`
                        : req?.status === "rejected"
                          ? `Your edit request for Document ${docRef} has been rejected.`
                          : `Your edit request for Document ${docRef} is no longer active.`;
                return (
                  <li
                    key={`${n.kind}-${n.id}`}
                    className={`px-4 py-3 text-sm ${n.unread ? "bg-red-50/40" : ""}`}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {isReset
                            ? "Password reset"
                            : isInactivity
                              ? "Inactive document"
                              : isIncoming
                                ? "Edit request"
                                : "Request update"}
                        </p>
                        <p className="mt-1 text-gray-700">{message}</p>
                        {isIncoming && req && (
                          <p className="mt-1 text-xs text-gray-500">
                            Document: {docRef}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(n.created_at).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                      {isIncoming &&
                        req &&
                        req.status === "pending" &&
                        (isAdmin || req.requested_to_user_id === user.id) && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ request: req, decision: "accept" })
                            }
                            className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({ request: req, decision: "reject" })
                            }
                            className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    {isIncoming && req && (
                      <div className="mt-2 text-xs">
                        <Link
                          href={`/documents/${req.document_id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          Open document
                        </Link>
                      </div>
                    )}
                    {isInactivity && doc && (
                      <div className="mt-2 text-xs">
                        <Link
                          href={`/documents/${doc.id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          Review document
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <ConfirmActionModal
        open={!!confirmAction}
        title="Confirm Edit Request"
        message={
          confirmAction
            ? `Are you sure you want to ${
                confirmAction.decision === "accept" ? "approve" : "reject"
              } this edit request for document ${
                confirmAction.request.document?.document_number ||
                confirmAction.request.document?.document_code ||
                `#${confirmAction.request.document_id}`
              }?`
            : ""
        }
        confirmLabel={
          confirmAction?.decision === "accept" ? "Approve Request" : "Reject Request"
        }
        loading={false}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          void handleDecision(confirmAction.request, confirmAction.decision);
        }}
      />
    </div>
  );
}

