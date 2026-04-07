"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "./MainLayout";
import Loader from "./Loader";
import { useAuth } from "@/components/AuthProvider";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRoles: ("Admin" | "Encoder" | "Viewer")[];
  fallback?: React.ReactNode;
};

export default function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // Ensure user is loaded once (no duplicate network calls due to provider dedupe).
  useEffect(() => {
    if (!user && !loading) {
      refresh();
    }
  }, [user, loading, refresh]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Redirect unauthorized users
  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, allowedRoles, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
            <p className="text-lg text-gray-600">Checking access...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      fallback || (
        <MainLayout>
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8">
            <div className="text-center">
              <div className="mb-4 text-5xl">🚫</div>
              <h2 className="mb-2 text-2xl font-bold text-red-800">
                Access Denied
              </h2>
              <p className="text-base text-red-700">
                You don&apos;t have permission to access this page.
              </p>
              <button
                onClick={() => router.replace("/dashboard")}
                className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </MainLayout>
      )
    );
  }

  return <>{children}</>;
}
