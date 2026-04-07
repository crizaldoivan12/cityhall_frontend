"use client";

import StatusBadge from "@/components/StatusBadge";

type StatusCellProps = {
  status: string;
  action?: React.ReactNode;
};

/**
 * Status column cell with badge + optional action link.
 * Uses flexbox for consistent alignment: [ Status Badge ] [ Action ]
 */
export default function StatusCell({ status, action }: StatusCellProps) {
  return (
    <div className="grid min-w-[200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1">
      <div className="min-w-0">
        <StatusBadge status={status} />
      </div>
      {action != null && (
        <span className="w-28 justify-self-end">{action}</span>
      )}
    </div>
  );
}
