"use client";

import { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/apiBase";
import Loader from "@/components/Loader";
import { formatDateTimeEncoded } from "@/lib/dateUtils";

export type HistoryEntry = {
  id: number;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  user_name: string | null;
  user_role: string | null;
  department: string | null;
  remarks: string | null;
  created_at: string;
};

export type DocumentHistoryDetails = {
  type_of_document: string;
  document_number?: string | null;
  pay_claimant?: string | null;
  contact_number?: string | null;
  name_of_business?: string | null;
  reason?: string | null;
  particular?: string | null;
  amount?: number | string | null;
  status?: string | null;
  routed_department_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DocumentHistoryTimelineProps = {
  documentId: string;
  token: string | null;
  document?: DocumentHistoryDetails | null;
};


export default function DocumentHistoryTimeline({
  documentId,
  token,
  document,
}: DocumentHistoryTimelineProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const details = useMemo(() => {
    if (!document) return [];
    const type = document.type_of_document?.trim().toUpperCase() ?? "";
    const base: Array<{ label: string; value: string }> = [];

    const addValue = (label: string, value: unknown) => {
      if (value === null || value === undefined || String(value).trim() === "") {
        base.push({ label, value: "N/A" });
        return;
      }
      base.push({ label, value: String(value) });
    };

    const formatAmount = (value: unknown) => {
      const numeric = Number(value);
      if (!value || Number.isNaN(numeric)) return "N/A";
      return `PHP ${numeric.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const addAmount = (label: string, value: unknown) => {
      base.push({ label, value: formatAmount(value) });
    };

    const addDocumentNumber = (label: string) => {
      addValue(label, document.document_number ?? "");
    };

    const addPayClaimant = (label: string) => {
      addValue(label, document.pay_claimant ?? "");
    };

    const addParticular = (label: string) => {
      addValue(label, document.particular ?? "");
    };

    const addDepartment = (label: string) => {
      addValue(label, document.routed_department_name ?? "");
    };

    const typeMap: Record<string, () => void> = {
      "LETTER REQUEST": () => {
        addPayClaimant("Requestor");
        addValue("Contact Number", document.contact_number ?? "");
      },
      "PURCHASE REQUEST": () => {
        addDepartment("Department Out");
        addDocumentNumber("PR Number");
        addAmount("Amount", document.amount);
      },
      "PURCHASE ORDER": () => {
        addDepartment("Department Out");
        addDocumentNumber("PO Number");
        addAmount("Amount", document.amount);
      },
      "PO ATTACHMENTS": () => {
        addAmount("Amount", document.amount);
      },
      OBR: () => {
        addPayClaimant("Payee/Claimant");
        addDocumentNumber("OBR Number");
        addParticular("Particulars");
        addAmount("Amount", document.amount);
      },
      VOUCHER: () => {
        addPayClaimant("Payee/Claimant");
        addDocumentNumber("Voucher Number");
        addParticular("Particulars");
        addAmount("Amount", document.amount);
      },
      CHEQUE: () => {
        addPayClaimant("Payee/Claimant");
        addDocumentNumber("Check Number");
        addParticular("Particulars");
        addAmount("Amount", document.amount);
      },
      MOA: () => {
        addParticular("Particular");
      },
      "DEED OF DONATION": () => {
        addParticular("Particular");
      },
      "DEED OF SALE": () => {
        addParticular("Particular");
      },
      "CONTRACT OF LEASE": () => {
        addParticular("Particular");
      },
      "CONTRACT OF SERVICE (SUPPLIER)": () => {
        addParticular("Particular");
      },
      HR: () => {
        addParticular("Particular");
      },
      CERTIFICATION: () => {
        addParticular("Particular");
      },
      "INVITATION/COURTESY": () => {},
      POW: () => {
        addDocumentNumber("POW Number");
        addParticular("Particulars");
        addAmount("Amount", document.amount);
      },
      SWA: () => {
        addParticular("Particular");
      },
      "BPLO DOCS": () => {
        addValue("Name of Business", document.name_of_business ?? "");
        addValue("Reason", document.reason ?? "");
      },
      BPMP: () => {
        addParticular("Particular");
        addDepartment("Department Out");
      },
      "LEGAL DOCS": () => {
        addParticular("Particular");
      },
    };

    if (typeMap[type]) {
      typeMap[type]();
    } else {
      if (document.pay_claimant) addPayClaimant("Payee/Claimant");
      if (document.contact_number) addValue("Contact Number", document.contact_number);
      if (document.name_of_business) addValue("Name of Business", document.name_of_business);
      if (document.reason) addValue("Reason", document.reason);
      if (document.document_number) addDocumentNumber("Document Number");
      if (document.particular) addParticular("Particular");
      if (document.amount) addAmount("Amount", document.amount);
      if (document.routed_department_name) addDepartment("Department Out");
    }

    addValue("Status", document.status ?? "");
    addValue(
      "Date Created",
      document.created_at ? formatDateTimeEncoded(document.created_at) : ""
    );
    addValue(
      "Date Updated",
      document.updated_at ? formatDateTimeEncoded(document.updated_at) : ""
    );

    return base;
  }, [document]);

  useEffect(() => {
    if (!documentId || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(
          buildApiUrl(`/documents/${documentId}/history`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load history");
        }
        const data = await res.json();
        if (!cancelled) setEntries(data.data ?? []);
      } catch (e: unknown) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, token]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 py-12">
        <Loader size="lg" />
        <p className="text-gray-600">Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {details.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/60 p-5">
          <h3 className="text-base font-semibold text-gray-900">
            Document Details
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Details shown are based on the required fields for this document type.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {details.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="rounded-md border border-gray-200 bg-white px-3 py-2.5"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center">
          <p className="text-gray-600">No history recorded for this document yet.</p>
        </div>
      ) : (
        <>
          {/* Timeline line */}
          <div
            className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"
            aria-hidden
          />
          <ul className="space-y-0">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {/* Dot */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-gray-900">
                      {entry.action_type}
                    </span>
                    {(entry.previous_status != null || entry.new_status != null) && (
                      <span className="text-sm text-gray-600">
                        {entry.previous_status != null && entry.new_status != null
                          ? `${entry.previous_status} -> ${entry.new_status}`
                          : entry.new_status != null
                            ? `-> ${entry.new_status}`
                            : entry.previous_status != null
                              ? `${entry.previous_status} ->`
                              : null}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {entry.user_name != null && (
                      <span>
                        {entry.user_name}
                        {entry.user_role != null && (
                          <span className="text-gray-500"> - {entry.user_role}</span>
                        )}
                      </span>
                    )}
                    {entry.department != null && (
                      <span>{entry.department}</span>
                    )}
                  </div>
                  {entry.remarks != null && entry.remarks.trim() !== "" && (
                    <p className="mt-2 text-sm text-gray-700 border-l-2 border-gray-200 pl-3">
                      {entry.remarks}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDateTimeEncoded(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
