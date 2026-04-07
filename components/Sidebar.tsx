"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMenuItemsForRole, type MenuItem } from "@/config/menus";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Ensure the first client render matches the server output to avoid
  // hydration mismatches. We only show role-specific header text after
  // hydration has completed on the client.
  useEffect(() => {
    setHydrated(true);
  }, []);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!hydrated || !user) return [];
    return getMenuItemsForRole(user.role);
  }, [hydrated, user]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.replace("/login?logged_out=1");
    } finally {
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    if (!logoutLoading) setShowLogoutModal(false);
  };

  // Don't show sidebar on login page
  if (pathname === "/login") return null;

  // Role-based header text. To keep SSR and first client render identical,
  // we default to a static label until the component has hydrated.
  const workspaceLabel = hydrated && user ? user.name : "Cabuyao City Hall";

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 text-white shadow-2xl"
      style={{ background: "linear-gradient(180deg, #7B1113 0%, #5A0C0E 100%)" }}
    >
      <div className="flex h-full flex-col">
        {/* Logo / system title */}
        <div className="flex items-center gap-3 border-b border-white/15 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Image
              src="/cabuyao-seal.png"
              alt="City of Cabuyao Seal"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              Cabuyao City Hall
            </p>
            <p className="text-sm font-semibold">Monitoring System</p>
          </div>
        </div>

        {/* Role context */}
        <div className="border-b border-white/10 px-5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-medium text-white" title={workspaceLabel}>
            {workspaceLabel}
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-2">
            {loading && (
              <li className="flex items-center gap-2 px-4 py-2 text-sm text-white/70">
                <Loader size="sm" variant="light" />
                Loading menu...
              </li>
            )}
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/10 text-white shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                    title={item.description}
                  >
                    <span className="text-white" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings + user profile + logout */}
        <div className="border-t border-white/15 px-5 py-4 space-y-3">
          <Link
            href="/settings"
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/15"
          >
            <span className="text-white" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19 12a7 7 0 0 0-.1-1l2-1.2-2-3.4-2.2.7a7.2 7.2 0 0 0-1.7-1l-.3-2.3H9.3L9 6.1a7.2 7.2 0 0 0-1.7 1L5.1 6.4l-2 3.4 2 1.2a7 7 0 0 0 0 2l-2 1.2 2 3.4 2.2-.7a7.2 7.2 0 0 0 1.7 1l.3 2.3h5.4l.3-2.3a7.2 7.2 0 0 0 1.7-1l2.2.7 2-3.4-2-1.2c.1-.3.1-.7.1-1z" />
              </svg>
            </span>
            <span>Settings</span>
          </Link>

          {hydrated && user && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-white/70">{user.role} - Signed in</p>
                </div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white/90 transition hover:bg-white/20 hover:text-white"
                aria-label="Logout"
              >
                <span aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        loading={logoutLoading}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </aside>
  );
}
