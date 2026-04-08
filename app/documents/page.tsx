"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildApiUrl } from "@/lib/apiBase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";
import StatusCell from "@/components/StatusCell";
import Loader from "@/components/Loader";
import { formatDisplayDate, formatTimeEncoded } from "@/lib/dateUtils";
import ConfirmEditRequestModal from "@/components/ConfirmEditRequestModal";
import ConfirmActionModal from "@/components/ConfirmActionModal";

type Department = {
  id: number;
  name: string;
  code: string;
};

type Document = {
  id: number;
  document_code: string;
  document_number?: string | null;
  date: string;
  date_out?: string | null;
  type_of_document: string;
  pay_claimant: string;
  particular: string;
  amount: string;
  status: string;
  remarks?: string | null;
  routed_department?: Department;
  encoded_by_id?: number;
  encoded_by?: {
    name?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  is_inactive?: boolean;
  inactive_days?: number;
  inactive_reason?: string | null;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
};


export default function DocumentsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"date" | "month">("date");
  const [createdDate, setCreatedDate] = useState("");
  const [createdMonth, setCreatedMonth] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedResponse<Document>["meta"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [acceptedDocIds, setAcceptedDocIds] = useState<number[]>([]);
  const [outgoingStatusByDoc, setOutgoingStatusByDoc] = useState<
    Record<number, string>
  >({});
  const [confirmDoc, setConfirmDoc] = useState<Document | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;
  const isAdmin = auth.user?.role === "Admin";
  const isEncoder = auth.user?.role === "Encoder";
  const canBulkSelect = isAdmin || isEncoder;
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const [reasonNotice, setReasonNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [reasonEditorDocId, setReasonEditorDocId] = useState<number | null>(null);
  const [reasonDraft, setReasonDraft] = useState<string>("");
  const [savingReasonDocId, setSavingReasonDocId] = useState<number | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  const searchTerm = useMemo(() => searchInput.trim(), [searchInput]);
  const visibleDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter((doc) => {
      const parts = [
        doc.document_code,
        doc.document_number,
        doc.type_of_document,
        doc.pay_claimant,
        doc.particular,
        doc.remarks,
        doc.status,
        doc.routed_department?.name,
        doc.encoded_by?.name,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return parts.some((v) => v.includes(term));
    });
  }, [documents, searchTerm]);
  const visibleIds = useMemo(
    () => visibleDocuments.map((doc) => doc.id),
    [visibleDocuments]
  );
  const allVisibleSelected =
    canBulkSelect &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    canBulkSelect && visibleIds.some((id) => selectedIds.includes(id));

  const documentsUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("per_page", "20");
    qs.set("page", String(page));
    if (searchTerm) qs.set("search", searchTerm);
    if (statusFilter) qs.set("status", statusFilter);
    if (departmentFilter) qs.set("routed_department_id", departmentFilter);
    if (dateFilterType === "date" && createdDate) qs.set("created_date", createdDate);
    if (dateFilterType === "month" && createdMonth) qs.set("created_month", createdMonth);
    return buildApiUrl(`/documents?${qs.toString()}`);
  }, [page, searchTerm, statusFilter, departmentFilter, createdDate, createdMonth, dateFilterType]);

  const exportQueryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (searchTerm) qs.set("search", searchTerm);
    if (statusFilter) qs.set("status", statusFilter);
    if (departmentFilter) qs.set("routed_department_id", departmentFilter);
    if (dateFilterType === "date" && createdDate) qs.set("created_date", createdDate);
    if (dateFilterType === "month" && createdMonth) qs.set("created_month", createdMonth);
    if (selectedIds.length) qs.set("ids", selectedIds.join(","));
    return qs.toString();
  }, [searchTerm, statusFilter, departmentFilter, createdDate, createdMonth, dateFilterType, selectedIds]);

  const exportFilename = useMemo(() => {
    if (dateFilterType === "date" && createdDate) {
      return `Documents_${createdDate}`;
    }
    if (dateFilterType === "month" && createdMonth) {
      const [y, m] = createdMonth.split("-").map((v) => Number(v));
      if (y && m) {
        const label = new Date(y, m - 1, 1).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        });
        return `Documents_${label.replace(" ", "_")}`;
      }
    }
    return "Documents_All";
  }, [createdDate, createdMonth, dateFilterType]);

  async function downloadExport(kind: "excel" | "pdf") {
    setExportError(null);

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("auth_token")
        : null;

    if (!token) {
      setExportError("You are not logged in. Please login again.");
      return;
    }

    setExporting(kind);
    try {
      const endpoint =
        kind === "excel"
          ? buildApiUrl(`/documents/export/excel?${exportQueryString}`)
          : buildApiUrl(`/documents/export/pdf?${exportQueryString}`);

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body?.error ? ` (${body.error})` : "";
        throw new Error((body.message || "Export failed. Please try again.") + detail);
      }

      const blob = await res.blob();
      const filename = `${exportFilename}.${kind === "excel" ? "xlsx" : "pdf"}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Export failed. Please try again.";
      setExportError(message);
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    // Don’t fetch until auth state is ready
    if (auth.loading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setError(null);
        if (!loading) setFetching(true);

        const headers = { Authorization: `Bearer ${token}` };

        const [depsRes, docsRes] = await Promise.all([
          cachedJson(
            "departments:per_page=100",
            async () => {
              const r = await fetch(buildApiUrl("/departments?per_page=100"), {
                headers,
                signal: controller.signal,
              });
              if (!r.ok) throw new Error("Failed to load departments");
              return r.json();
            },
            10 * 60 * 1000
          ),
          (async () => {
            const r = await fetch(documentsUrl, {
              headers,
              signal: controller.signal,
            });
            if (!r.ok) {
              const body = await r.json().catch(() => ({}));
              throw new Error(body.message || "Failed to load documents");
            }
            return r.json();
          })(),
        ]);

        setDepartments(depsRes.data ?? []);
        setDocuments(docsRes.data ?? []);
        setMeta(docsRes.meta);
        // If user paged/filtered, keep selection only for visible docs.
        const visible = new Set((docsRes.data ?? []).map((d: Document) => d.id));
        setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
      } catch (err) {
        // If request was cancelled due to navigation, ignore
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load documents";
        setError(message);
        // If token is invalid/expired, send user back to login
        if (message.toLowerCase().includes("unauth")) {
          clearAuthToken();
          router.replace("/login");
        }
      } finally {
        setFetching(false);
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.user, documentsUrl]);

  // Load outgoing accepted edit requests for the current user so that
  // documents with temporary edit permission show the Edit action.
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user || !token) return;

    const controller = new AbortController();
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(buildApiUrl("/edit-requests/outgoing"), {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.data ?? []) as {
          document_id: number;
          status: string;
          created_at?: string;
          expires_at?: string | null;
        }[];
        const statusMap: Record<number, string> = {};
        const sorted = [...list].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });
        for (const r of sorted) {
          if (statusMap[r.document_id] === undefined) {
            statusMap[r.document_id] = r.status;
          }
        }
        const now = new Date();
        const ids = list
          .filter((r) => {
            if (r.status !== "accepted") return false;
            if (!r.expires_at) return true;
            const exp = new Date(r.expires_at);
            return !Number.isNaN(exp.getTime()) && exp > now;
          })
          .map((r) => r.document_id);
        setAcceptedDocIds(ids);
        setOutgoingStatusByDoc(statusMap);
      } catch {
        // Silently ignore; documents can still be loaded without this.
      }
    })();

    return () => controller.abort();
  }, [auth.loading, auth.user, token]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    if (!canBulkSelect && selectedIds.length > 0) {
      setSelectedIds([]);
    }
  }, [canBulkSelect, selectedIds.length]);

  async function handleRequestEdit(doc: Document) {
    if (!auth.user) return;
    try {
      setRequestingId(doc.id);
      setRequestNotice(null);
      setReasonNotice(null);
      const res = await fetch(
        buildApiUrl(`/documents/${doc.id}/edit-requests`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            remarks: `Edit request from ${auth.user.name} via All Documents list`,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to send edit request");
      }
      setRequestNotice({
        type: "success",
        message: "Edit request sent to the document owner.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send edit request.";
      setRequestNotice({
        type: "error",
        message,
      });
    } finally {
      setRequestingId(null);
      setConfirmDoc(null);
    }
  }

  async function handleOpenReasonEditor(doc: Document) {
    setReasonError(null);
    setReasonEditorDocId(doc.id);
    setReasonDraft(doc.inactive_reason ?? "");
  }

  function closeReasonEditor() {
    if (savingReasonDocId !== null) return;
    setReasonEditorDocId(null);
    setReasonDraft("");
  }

  async function handleSaveReason(doc: Document) {
    if (!token) {
      setReasonError("You are not logged in. Please login again.");
      return;
    }
    setReasonError(null);
    setReasonNotice(null);
    setSavingReasonDocId(doc.id);
    try {
      const res = await fetch(buildApiUrl(`/documents/${doc.id}/inactivity-reason`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reasonDraft.trim() === "" ? null : reasonDraft.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save reason.");
      }
      const body = await res.json();
      const updatedReason =
        typeof body.inactive_reason === "string" ? body.inactive_reason : null;
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, inactive_reason: updatedReason } : d
        )
      );
      setReasonNotice({
        type: "success",
        message: updatedReason
          ? "Reason for delay saved."
          : "Reason for delay cleared.",
      });
      closeReasonEditor();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to save reason.";
      setReasonError(message);
    } finally {
      setSavingReasonDocId(null);
    }
  }

  function requestBulkStatusUpdate() {
    if (!token) {
      setBulkNotice({
        type: "error",
        message: "You are not logged in. Please login again.",
      });
      return;
    }
    if (!bulkStatus) {
      setBulkNotice({
        type: "error",
        message: "Please select a status to apply.",
      });
      return;
    }
    if (selectedIds.length === 0) {
      setBulkNotice({
        type: "error",
        message: "Select at least one document to update.",
      });
      return;
    }
    setShowBulkConfirm(true);
  }

  async function handleBulkStatusUpdate() {
    setBulkUpdating(true);
    setBulkNotice(null);
    const count = selectedIds.length;

    try {
      const res = await fetch(buildApiUrl("/documents/bulk-status"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update documents.");
      }

      const body = await res.json().catch(() => ({}));

      const refreshed = await fetch(documentsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!refreshed.ok) {
        const body = await refreshed.json().catch(() => ({}));
        throw new Error(body.message || "Failed to refresh documents.");
      }
      const data = await refreshed.json();
      setDocuments(data.data ?? []);
      setMeta(data.meta ?? null);
      setSelectedIds([]);
      setBulkStatus("");
      setBulkNotice({
        type: "success",
        message:
          typeof body?.message === "string"
            ? body.message
            : `Updated ${count} document${count === 1 ? "" : "s"} successfully.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update documents.";
      setBulkNotice({ type: "error", message });
    } finally {
      setBulkUpdating(false);
    }
  }

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage and track all documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetching && (
            <span className="text-sm text-gray-600">Updating list…</span>
          )}
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700"
          >
            <span className="text-lg" aria-hidden="true">
              ＋
            </span>
            <span>New Document</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-md">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        {requestNotice ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              requestNotice.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {requestNotice.message}
          </div>
        ) : null}
        {bulkNotice ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              bulkNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {bulkNotice.message}
          </div>
        ) : null}
        {reasonNotice ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              reasonNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {reasonNotice.message}
          </div>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Search &amp; Filter
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by document code and quickly narrow down by status or
              routed department.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={!!exporting}
              onClick={() => downloadExport("excel")}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === "excel" ? (
                <>
                  <Loader size="sm" variant="light" className="mr-2" />
                  Exporting…
                </>
              ) : (
                <>
                  <span className="mr-2" aria-hidden="true">⬇</span>
                  Export Excel
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!!exporting}
              onClick={() => downloadExport("pdf")}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting === "pdf" ? (
                <>
                  <Loader size="sm" variant="light" className="mr-2" />
                  Exporting…
                </>
              ) : (
                <>
                  <span className="mr-2" aria-hidden="true">⬇</span>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>
        {exportError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {exportError}
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search by Document
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search any word in document details"
              className="h-12 w-full rounded-full border border-gray-300 px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="h-12 w-full rounded-full border border-gray-300 px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">All status</option>
              <option value="For Signature">For Signature</option>
              <option value="For Review">For Review</option>
              <option value="For Initial">For Initial</option>
              <option value="For Schedule">For Schedule</option>
              <option value="Signed">Signed</option>
              <option value="Filed">Filed</option>
              <option value="Returned">Returned</option>
              <option value="Hold">Hold</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by Department Out
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setPage(1);
                setDepartmentFilter(e.target.value);
              }}
              className="h-12 w-full rounded-full border border-gray-300 px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date Filter
            </label>
            <div className="flex h-12 items-center rounded-full border border-gray-300 bg-white px-3 shadow-sm">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="createdDateFilter"
                    checked={dateFilterType === "date"}
                    onChange={() => {
                      setDateFilterType("date");
                      setCreatedMonth("");
                      setPage(1);
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  By Date
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="createdDateFilter"
                    checked={dateFilterType === "month"}
                    onChange={() => {
                      setDateFilterType("month");
                      setCreatedDate("");
                      setPage(1);
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  By Month
                </label>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={createdDate}
                disabled={dateFilterType !== "date"}
                onChange={(e) => {
                  setPage(1);
                  setCreatedDate(e.target.value);
                }}
                className="h-11 w-full rounded-full border border-gray-300 px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
              <input
                type="month"
                value={createdMonth}
                disabled={dateFilterType !== "month"}
                onChange={(e) => {
                  setPage(1);
                  setCreatedMonth(e.target.value);
                }}
                className="h-11 w-full rounded-full border border-gray-300 px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-md">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Document List
              {meta && (
                <span className="ml-2 text-base font-normal text-gray-600">
                  ({meta.total} total)
                </span>
              )}
            </h2>
            {canBulkSelect && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                <span className="text-sm text-gray-600">
                  {selectedIds.length} selected
                </span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="h-10 rounded-full border border-gray-300 bg-white px-4 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Status change to</option>
                  <option value="For Signature">For Signature</option>
                  <option value="For Review">For Review</option>
                  <option value="For Initial">For Initial</option>
                  <option value="For Schedule">For Schedule</option>
                  <option value="Signed">Signed</option>
                  <option value="Filed">Filed</option>
                  <option value="Returned">Returned</option>
                  <option value="Hold">Hold</option>
                </select>
                <button
                  type="button"
                  onClick={requestBulkStatusUpdate}
                  disabled={
                    bulkUpdating || selectedIds.length === 0 || !bulkStatus
                  }
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkUpdating ? "Updatingâ€¦" : "Update Status"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading && documents.length === 0 ? (
            <div className="px-6 py-8">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-4" />
                    <th className="w-40 px-6 py-4" />
                    <th className="w-36 px-6 py-4" />
                    <th className="w-56 px-6 py-4" />
                    <th className="w-40 px-6 py-4" />
                    <th className="w-64 px-6 py-4" />
                    <th className="w-32 px-6 py-4" />
                    <th className="w-40 px-6 py-4" />
                    <th className="w-32 px-6 py-4" />
                    <th className="w-32 px-6 py-4" />
                    <th className="w-56 px-6 py-4" />
                    <th className="w-40 px-6 py-4" />
                    <th className="w-[200px] px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4">
                        <span className="block h-4 w-4 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-32 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-24 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-40 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-32 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-48 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-20 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-28 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-24 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-24 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-40 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-4 w-20 rounded bg-gray-200" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="block h-8 w-24 rounded-full bg-gray-200" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : visibleDocuments.length > 0 ? (
            <>
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      {canBulkSelect ? (
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          aria-label="Select all documents on this page"
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) =>
                                Array.from(new Set([...prev, ...visibleIds]))
                              );
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => !visibleIds.includes(id))
                              );
                            }
                          }}
                        />
                      ) : (
                        <span className="sr-only">Selection</span>
                      )}
                    </th>
                    <th className="w-40 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Document Code
                    </th>
                    <th className="w-36 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Type
                    </th>
                    <th className="w-56 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Payee / Claimant
                    </th>
                    <th className="w-40 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Document No.
                    </th>
                    <th className="w-64 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Particular
                    </th>
                    <th className="w-32 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Amount
                    </th>
                    <th className="w-40 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Encoded By
                    </th>
                    <th className="w-32 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Date Received
                    </th>
                    <th className="w-32 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Date Released
                    </th>
                    <th className="w-56 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Remarks
                    </th>
                    <th className="w-40 px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Dept. Out
                    </th>
                    <th className="w-[200px] px-6 py-4 text-left text-sm font-semibold text-gray-700 align-middle">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {visibleDocuments.map((doc) => {
                    const isInactive = !!doc.is_inactive;
                    const isOwner =
                      auth.user && doc.encoded_by_id === auth.user.id;
                    const highlightInactive = !!(
                      isEncoder &&
                      isOwner &&
                      isInactive
                    );
                    return (
                    <tr
                      key={doc.id}
                      className={`transition-colors ${
                        selectedIds.includes(doc.id)
                          ? "bg-emerald-50 hover:bg-emerald-100"
                          : highlightInactive
                          ? "bg-red-50/60 hover:bg-red-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap align-top ${
                          highlightInactive ? "border-l-4 border-red-400" : ""
                        }`}
                      >
                        {canBulkSelect ? (
                          <input
                            type="checkbox"
                            aria-label={`Select document ${doc.document_code}`}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={selectedIds.includes(doc.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? Array.from(new Set([...prev, doc.id]))
                                  : prev.filter((id) => id !== doc.id)
                              );
                            }}
                          />
                        ) : (
                          <span className="sr-only">Not selectable</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex flex-col">
                          <span className="text-base font-mono font-medium text-gray-900">
                            {doc.document_code}
                          </span>
                          {highlightInactive && (
                            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              <span aria-hidden="true">⚠️</span>
                              <span>
                                Inactive – {doc.inactive_days ?? 3} Days
                              </span>
                            </span>
                          )}
                          {isAdmin && isInactive && (
                            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              Inactive – {doc.inactive_days ?? 3} Days
                            </span>
                          )}
                          {highlightInactive && (
                            <div className="mt-2 space-y-1">
                              {reasonEditorDocId === doc.id ? (
                                <>
                                  <label className="block text-xs font-medium text-gray-700">
                                    Reason for Delay (optional)
                                  </label>
                                  <textarea
                                    value={reasonDraft}
                                    onChange={(e) => setReasonDraft(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                    placeholder="Add a short note to explain why there has been no action."
                                  />
                                  {reasonError && (
                                    <p className="mt-1 text-xs text-red-600">
                                      {reasonError}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleSaveReason(doc)}
                                      disabled={savingReasonDocId === doc.id}
                                      className="inline-flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {savingReasonDocId === doc.id ? (
                                        <>
                                          <Loader
                                            size="sm"
                                            variant="light"
                                            className="mr-1.5"
                                          />
                                          Saving…
                                        </>
                                      ) : (
                                        "Save Reason"
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={closeReasonEditor}
                                      disabled={savingReasonDocId === doc.id}
                                      className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <p className="mt-1 text-[11px] text-gray-500">
                                    This note will be visible to administrators.
                                  </p>
                                </>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {doc.inactive_reason ? (
                                    <p className="text-[11px] text-gray-700">
                                      <span className="font-semibold">
                                        Reason:
                                      </span>{" "}
                                      {doc.inactive_reason}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-gray-500">
                                      You can optionally add a reason for this delay.
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReasonEditor(doc)}
                                    className="inline-flex w-fit items-center rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50"
                                  >
                                    {doc.inactive_reason ? "Edit reason" : "Add reason"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className="text-base text-gray-700">
                          {doc.type_of_document}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="text-base text-gray-700">
                          {doc.pay_claimant}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className="text-base text-gray-700">
                          {doc.document_number || doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs align-top">
                        <span className="line-clamp-2 text-sm text-gray-700">
                          {doc.particular}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className="text-base font-semibold text-gray-900">
                          ₱{parseFloat(doc.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {doc.encoded_by?.name ??
                              (doc.encoded_by_id
                                ? `User #${doc.encoded_by_id}`
                                : "—")}

                          </span>
                          <span className="mt-0.5 text-xs text-gray-500 font-normal">
                            {formatTimeEncoded(doc.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className="text-sm text-gray-700">
                          {formatDisplayDate(doc.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {formatDisplayDate(doc.date_out ?? null)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs align-top">
                        <span className="line-clamp-2 text-sm text-gray-700">
                          {doc.remarks || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className="text-sm text-gray-700">
                          {doc.routed_department?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <StatusCell
                          status={doc.status}
                          action={
                            auth.user &&
                            (isAdmin ||
                              doc.encoded_by_id === auth.user.id ||
                              acceptedDocIds.includes(doc.id)) ? (
                              <Link
                                href={`/documents/${doc.id}/edit`}
                                className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              >
                                Edit
                              </Link>
                            ) : (
                              <div className="flex w-full flex-col gap-2">
                                {isEncoder ? (
                              <button
                                type="button"
                                disabled={
                                  requestingId === doc.id ||
                                  outgoingStatusByDoc[doc.id] === "pending"
                                }
                                onClick={() => setConfirmDoc(doc)}
                                className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {requestingId === doc.id
                                  ? "Requesting..."
                                  : outgoingStatusByDoc[doc.id] === "pending"
                                  ? "Pending"
                                      : "Request Edit"}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    Read-only access
                                  </span>
                                )}
                                {isEncoder && outgoingStatusByDoc[doc.id] ? (
                                  <span className="text-[11px] font-semibold text-gray-500">
                                    Status:{" "}
                                    {outgoingStatusByDoc[doc.id] === "accepted"
                                      ? "Approved"
                                      : outgoingStatusByDoc[doc.id] ===
                                        "rejected"
                                      ? "Rejected"
                                      : outgoingStatusByDoc[doc.id] ===
                                        "pending"
                                      ? "Pending"
                                      : outgoingStatusByDoc[doc.id]}
                                  </span>
                                ) : null}
                              </div>
                            )
                          }
                        />
                        {isAdmin && doc.inactive_reason ? (
                          <p className="mt-2 line-clamp-2 text-xs text-red-700">
                            Reason: {doc.inactive_reason}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              {meta && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base text-gray-600">
                      Showing page {meta.current_page} of{" "}
                      {Math.max(1, Math.ceil(meta.total / meta.per_page))} (
                      {meta.total} total documents)
                    </p>
                    <div className="flex gap-3">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        disabled={
                          meta.current_page * meta.per_page >= meta.total
                        }
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">📄</div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No documents found
              </p>
              <p className="mb-6 text-base text-gray-600">
                {searchTerm
                  ? "No matches found for your search."
                  : searchTerm || statusFilter || departmentFilter || createdDate || createdMonth
                  ? "Try adjusting your filters"
                  : "Get started by creating your first document"}
              </p>
              <Link
                href="/documents/new"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-red-700"
              >
                <span>➕</span>
                <span>Create New Document</span>
              </Link>
            </div>
          )}
        </div>
      </div>
      <ConfirmEditRequestModal
        open={!!confirmDoc}
        documentCode={confirmDoc?.document_code ?? ""}
        loading={!!confirmDoc && requestingId === confirmDoc.id}
        onClose={() => {
          if (requestingId) return;
          setConfirmDoc(null);
        }}
        onConfirm={() => {
          if (!confirmDoc) return;
          void handleRequestEdit(confirmDoc);
        }}
      />
      <ConfirmActionModal
        open={showBulkConfirm}
        title="Confirm Status Update"
        message="Are you sure you want to update the status of the selected documents?"
        confirmLabel="Yes, update"
        loading={bulkUpdating}
        onClose={() => {
          if (bulkUpdating) return;
          setShowBulkConfirm(false);
        }}
        onConfirm={() => {
          if (bulkUpdating) return;
          setShowBulkConfirm(false);
          void handleBulkStatusUpdate();
        }}
      />
    </MainLayout>
  );
}



