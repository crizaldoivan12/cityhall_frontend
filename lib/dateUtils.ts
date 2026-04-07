/**
 * Utility functions for formatting dates and times
 */

/**
 * Format a date value for display (e.g., "Feb 8, 2026")
 */
export function formatDisplayDate(value?: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Format date and time for encoding timestamp display
 * Format: "Feb 8, 2026 - 10:45 PM"
 */
export function formatDateTimeEncoded(value?: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  return `${dateStr} - ${timeStr}`;
}

/**
 * Format time encoded for display under encoder name
 * Format: "10:45 PM" or "10:45 PM - Feb 8, 2026"
 */
export function formatTimeEncoded(value?: string | null, includeDate = true): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!includeDate) return timeStr;
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${timeStr} - ${dateStr}`;
}
