"use client";

import { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/apiBase";
import Loader from "@/components/Loader";
import { formatDateTimeEncoded } from "@/lib/dateUtils";

type DepartmentRef = { id: number; name: string; code: string };

export type RoutingEntry = {
  id: number;
  document_id: number;
  document_code: string | null;
  document_number: string | null;
  document_title: string | null;
  created_by: string | null;
  document_created_at: string | null;
  from_department: DepartmentRef | null;
  to_department: DepartmentRef | null;
  routed_by: string | null;
  routed_at: string | null;
  reviewed_at: string | null;
  signed_at: string | null;
  action_taken: string | null;
  action_at: string | null;
  action_by: string | null;
  status: string | null;
  remarks: string | null;
};

type RoutingTimelineProps = {
  documentId: string;
  token: string | null;
};


type TimelineEvent = {
  id: string;
  label: string;
  timestamp: string;
  meta?: string;
  remarks?: string | null;
};

export default function DocumentRoutingTimeline({
  documentId,
  token,
}: RoutingTimelineProps) {
  const [entries, setEntries] = useState<RoutingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          buildApiUrl(`/documents/${documentId}/routing-history`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load routing timeline");
        }
        const data = await res.json();
        if (!cancelled) setEntries(data.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load routing timeline"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, token]);

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    if (entries.length === 0) return events;

    const first = entries[0];
    if (first.document_created_at && first.created_by) {
      events.push({
        id: `created-${first.document_id}`,
        label: `Created by ${first.created_by}`,
        timestamp: first.document_created_at,
      });
    }

    entries.forEach((entry) => {
      if (entry.routed_at && entry.to_department) {
        events.push({
          id: `routed-${entry.id}`,
          label: `Routed to ${entry.to_department.name}`,
          timestamp: entry.routed_at,
          meta: entry.routed_by ? `Routed by ${entry.routed_by}` : undefined,
          remarks: entry.remarks,
        });
      }

      if (entry.reviewed_at) {
        events.push({
          id: `reviewed-${entry.id}`,
          label: "Reviewed",
          timestamp: entry.reviewed_at,
          meta: entry.action_by
            ? `Reviewed by ${entry.action_by}`
            : entry.to_department
              ? `Reviewed by ${entry.to_department.name}`
              : undefined,
        });
      }

      if (entry.signed_at) {
        events.push({
          id: `signed-${entry.id}`,
          label: "Signed",
          timestamp: entry.signed_at,
          meta: entry.action_by
            ? `Signed by ${entry.action_by}`
            : entry.to_department
              ? `Signed by ${entry.to_department.name}`
              : undefined,
        });
      }

      if (
        entry.action_taken &&
        entry.action_at &&
        !["Reviewed", "Signed"].includes(entry.action_taken)
      ) {
        events.push({
          id: `action-${entry.id}`,
          label: entry.action_taken,
          timestamp: entry.action_at,
          meta: entry.action_by ? `By ${entry.action_by}` : undefined,
        });
      }
    });

    return events.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
  }, [entries]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 py-12">
        <Loader size="lg" />
        <p className="text-gray-600">Loading routing timeline...</p>
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

  if (timelineEvents.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center">
        <p className="text-gray-600">No routing activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"
        aria-hidden
      />
      <ul className="space-y-0">
        {timelineEvents.map((event) => (
          <li
            key={event.id}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-gray-900">{event.label}</span>
                {event.meta && (
                  <span className="text-sm text-gray-600">{event.meta}</span>
                )}
              </div>
              {event.remarks && event.remarks.trim() !== "" && (
                <p className="mt-2 text-sm text-gray-700 border-l-2 border-gray-200 pl-3">
                  {event.remarks}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {formatDateTimeEncoded(event.timestamp)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
