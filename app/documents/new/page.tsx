"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentForm, { DocumentPayload } from "@/components/DocumentForm";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import Loader from "@/components/Loader";
import { cachedJson } from "@/lib/cache";

type Department = {
  id: number;
  name: string;
  code: string;
  office?: string | null;
  department_head?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function NewDocumentPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        const depsRes = await cachedJson(
          "departments:per_page=200",
          async () => {
            const r = await fetch(`${API_BASE}/departments?per_page=200`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) throw new Error("Failed to load departments");
            return r.json();
          },
          10 * 60 * 1000
        );
        setDepartments(depsRes.data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load departments";
        setError(message);
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token]);

  async function handleCreate(payload: DocumentPayload) {
    const res = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to create document");
    }
    router.push("/documents");
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader size="lg" />
              <p className="text-lg text-gray-600">Loading form...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder"]}>
        <MainLayout>
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-base text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Encoder"]}>
      <MainLayout>
        <DocumentForm
          title="Create New Document"
          departments={departments}
          onSubmit={handleCreate}
          submitLabel="Create Document"
        />
      </MainLayout>
    </RoleGuard>
  );
}

