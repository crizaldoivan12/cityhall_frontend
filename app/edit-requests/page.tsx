"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL as API_BASE } from "@/lib/apiBase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import Loader from "@/components/Loader";
import { clearAuthToken } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";
import ConfirmActionModal from "@/components/ConfirmActionModal";

type User = { id: number; name: string };

type Document = {
  id: number;
  document_code: string;
  document_number?: string | null;
};

type EditRequest = {
  id: number;
  document_id: number;
  status: "pending" | "accepted" | "rejected" | "expired" | "used";
  created_at: string;
  requested_by_user_id: number;
  requested_by?: User;
  requested_to_user_id: number;
  requested_to?: User;
  document?: Document;
};


export default function EditRequestsPage() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<EditRequest[]>([]);
  const [outgoing, setOutgoing] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    request: EditRequest;
    decision: "accept" | "reject";
  } | null>(null);
  const auth = useAuth();
  const isAdmin = auth.user?.role === "Admin";

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      if (auth.loading) return;
      if (!auth.user || !token) {
        router.replace("/login");
        return;
      }

      const controller = new AbortController();
      try {
        setError(null);
        const headers = { Authorization: `Bearer ${token}` };
        const [inRes, outRes] = await Promise.all([
          cachedJson(
            "edit-requests:incoming",
            async () => {
              const r = await fetch(`${API_BASE}/edit-requests/incoming`, {
                headers,
                signal: controller.signal,
              });
              if (!r.ok) {
                const body = await r.json().catch(() => ({}));
                throw new Error(
                  body.message || "Failed to load incoming edit requests"
                );
              }
              return r.json();
            },
            10 * 1000
          ),
          cachedJson(
            "edit-requests:outgoing",
            async () => {
              const r = await fetch(`${API_BASE}/edit-requests/outgoing`, {
                headers,
                signal: controller.signal,
              });
              if (!r.ok) {
                const body = await r.json().catch(() => ({}));
                throw new Error(
                  body.message || "Failed to load outgoing edit requests"
                );
              }
              return r.json();
            },
            10 * 1000
          ),
        ]);
        setIncoming(inRes.data ?? []);
        setOutgoing(outRes.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load edit requests";
        setError(message);
        clearAuthToken();
      } finally {
        setLoading(false);
      }

      return () => controller.abort();
    }
    void init();
  }, [auth.loading, auth.user, token, router]);

  async function handleDecision(
    request: EditRequest,
    decision: "accept" | "reject"
  ) {
    const isOwner = auth.user?.id === request.requested_to_user_id;
    if (!isAdmin && !isOwner) return;
    if (!token) return;
    const label = decision === "accept" ? "approve" : "reject";
    try {
      setActingId(request.id);
      setError(null);
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
        throw new Error(body.message || `Failed to ${label} request.`);
      }
      const updated: EditRequest = await res.json();
      setIncoming((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      // Reload outgoing so requester sees new status when they visit this page.
      const outRes = await fetch(`${API_BASE}/edit-requests/outgoing`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      setOutgoing(outRes.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${label} request.`;
      setError(message);
    } finally {
      setActingId(null);
      setConfirmAction(null);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder", "Viewer"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader size="lg" />
              <p className="text-lg text-gray-600">Loading edit requests...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Encoder", "Viewer"]}>
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Requests</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage edit requests for your documents and view requests you have
            submitted.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">{error}</p>
          </div>
        )}

        {/* Incoming requests (for documents I own) */}
        <div className="mb-8 rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAdmin
                ? `All Encoder Edit Requests (${incoming.length})`
                : `Requests for My Documents (${incoming.length})`}
            </h2>
          </div>
          {incoming.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500">
              {isAdmin
                ? "No edit requests submitted by encoders."
                : "No edit requests for your documents."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Requesting User
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Owner
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Requested At
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {incoming.map((r) => {
                    const requester =
                      r.requested_by?.name ??
                      `User #${r.requested_by_user_id}`;
                    const owner =
                      r.requested_to?.name ?? `User #${r.requested_to_user_id}`;
                    const docRef =
                      r.document?.document_number || r.document?.document_code;
                    const created = new Date(r.created_at).toLocaleString(
                      "en-PH",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }
                    );
                    return (
                      <tr key={r.id}>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {requester}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {owner}
                          </td>
                        )}
                        <td className="px-6 py-3 text-sm text-gray-700">
                          <Link
                            href={`/documents/${r.document_id}/edit`}
                            className="text-blue-600 hover:underline"
                          >
                            {docRef}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {created}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              r.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : r.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : r.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.status.charAt(0).toUpperCase() +
                              r.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {r.status === "pending" &&
                          (isAdmin || auth.user?.id === r.requested_to_user_id) ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={actingId === r.id}
                                onClick={() =>
                                  setConfirmAction({ request: r, decision: "accept" })
                                }
                                className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                disabled={actingId === r.id}
                                onClick={() =>
                                  setConfirmAction({ request: r, decision: "reject" })
                                }
                                className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No actions available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Outgoing requests (requests I submitted) */}
        {!isAdmin && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Requests I Submitted ({outgoing.length})
              </h2>
            </div>
            {outgoing.length === 0 ? (
              <div className="px-6 py-8 text-sm text-gray-500">
                You have not submitted any edit requests.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Requested At
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {outgoing.map((r) => {
                      const owner =
                        r.requested_to?.name ??
                        `User #${r.requested_to_user_id}`;
                      const docRef =
                        r.document?.document_number ||
                        r.document?.document_code;
                      const created = new Date(r.created_at).toLocaleString(
                        "en-PH",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }
                      );
                      return (
                        <tr key={r.id}>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {docRef}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {owner}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {created}
                          </td>
                          <td className="px-6 py-3 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                r.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : r.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : r.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {r.status.charAt(0).toUpperCase() +
                                r.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </MainLayout>
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
        loading={!!confirmAction && actingId === confirmAction.request.id}
        onClose={() => {
          if (actingId) return;
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction) return;
          void handleDecision(confirmAction.request, confirmAction.decision);
        }}
      />
    </RoleGuard>
  );
}

