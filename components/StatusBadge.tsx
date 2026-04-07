"use client";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

/**
 * Status badge component with color coding for document statuses.
 * Color scheme designed for government/city hall use - professional and clear.
 */
export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const normalizedStatus = status.trim();
    
    switch (normalizedStatus.toLowerCase()) {
      case "for signature":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "for review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "for initial":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "for schedule":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "signed":
        return "bg-green-100 text-green-800 border-green-200";
      case "filed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "returned":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "hold":
        return "bg-red-100 text-red-800 border-red-200";
      case "in progress":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "released":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const normalizedStatus = status.trim();
  const displayStatus =
    normalizedStatus.toLowerCase() === "pending" ? "For Signature" : status;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium leading-none ${getStatusStyles(
        displayStatus
      )} ${className}`}
    >
      {displayStatus}
    </span>
  );
}
