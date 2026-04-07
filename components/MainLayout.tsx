"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import EditRequestNotifications from "./EditRequestNotifications";
import { useAuth } from "@/components/AuthProvider";

type IconProps = {
  className?: string;
};

function CalendarIcon({ className }: IconProps) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const hideSearch = user?.role === "Admin" || user?.role === "Encoder";
  const todayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "short",
      year: "numeric",
      day: "numeric",
    });
  }, []);
  const [timeLabel, setTimeLabel] = useState(() =>
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );

  useEffect(() => {
    const tick = () =>
      setTimeLabel(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    tick();
    const timerId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        {/* Top bar with search + date + notifications */}
        <header className="sticky top-0 z-30 flex items-center border-b border-gray-200 bg-gray-100/90 px-8 py-4 backdrop-blur">
          {!hideSearch && (
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                  <span className="text-lg" aria-hidden="true">
                    🔍
                  </span>
                </span>
                <input
                  type="search"
                  placeholder="Search…"
                  className="w-full rounded-full border border-gray-300 bg-white/90 px-4 py-2.5 pl-11 text-sm shadow-sm outline-none ring-0 transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-5 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span>{todayLabel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                </span>
                <span>{timeLabel}</span>
              </div>
            </div>
            <EditRequestNotifications />
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}






