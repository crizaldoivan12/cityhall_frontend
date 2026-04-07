"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DocumentForm, { DocumentPayload } from "@/components/DocumentForm";
import DocumentHistoryTimeline, {
  DocumentHistoryDetails,
} from "@/components/DocumentHistoryTimeline";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";

type Department = {
  id: number;
  name: string;
  code: string;
  office?: string | null;
  department_head?: string | null;
};

type DocumentApi = DocumentPayload & {
  id: number;
  document_code: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://cityhall-backend-s1fg.onrender.com/api";

type TabId = "details" | "history";

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const documentId = params?.id;
  const auth = useAuth();
  const isAdmin = auth.user?.role === "Admin";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doc, setDoc] = useState<DocumentApi | null>(null);
  const [documentDetails, setDocumentDetails] =
    useState<DocumentHistoryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        if (!documentId) {
          setError("Document not found");
          setLoading(false);
          return;
        }
        if (!token) {
          clearAuthToken();
          router.replace("/login");
          return;
        }
        const [depsRes, docRes] = await Promise.all([
          cachedJson(
            "departments:per_page=200",
            async () => {
              const r = await fetch(`${API_BASE}/departments?per_page=200`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!r.ok) throw new Error("Failed to load departments");
              return r.json();
            },
            10 * 60 * 1000
          ),
          fetch(`${API_BASE}/documents/${documentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (r) => {
            if (!r.ok) throw new Error("Failed to load document");
            return r.json();
          }),
        ]);

        setDepartments(depsRes.data ?? []);
        const routedDepartmentName =
          docRes.routed_department?.name ?? docRes.routedDepartment?.name ?? "";
        setDoc({
          id: docRes.id,
          document_code: docRes.document_code,
          date: docRes.date,
          type_of_document: docRes.type_of_document,
          document_number: docRes.document_number ?? "",
          pay_claimant: docRes.pay_claimant,
          contact_number: docRes.contact_number ?? "",
          name_of_business: docRes.name_of_business ?? "",
          reason: docRes.reason ?? "",
          particular: docRes.particular,
          amount: Number(docRes.amount ?? 0),
          routed_department_id: Number(docRes.routed_department_id),
          status: docRes.status === "Pending" ? "For Signature" : docRes.status,
          remarks: docRes.remarks ?? "",
          date_out: docRes.date_out ?? "",
        });
        setDocumentDetails({
          type_of_document: docRes.type_of_document,
          document_number: docRes.document_number ?? "",
          pay_claimant: docRes.pay_claimant ?? "",
          contact_number: docRes.contact_number ?? "",
          name_of_business: docRes.name_of_business ?? "",
          reason: docRes.reason ?? "",
          particular: docRes.particular ?? "",
          amount: docRes.amount ?? null,
          status: docRes.status === "Pending" ? "For Signature" : docRes.status,
          routed_department_name: routedDepartmentName,
          created_at: docRes.created_at ?? null,
          updated_at: docRes.updated_at ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token, documentId]);

  async function handleUpdate(payload: DocumentPayload) {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Show a clearer message when user is blocked by permissions.
      if (res.status === 403) {
        throw new Error(
          body.message ||
            "You are not allowed to edit this document. Please send an Edit Request to the document owner."
        );
      }
      throw new Error(body.message || "Failed to update document");
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
              <p className="text-lg text-gray-600">Loading document...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  if (error || !doc) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder"]}>
        <MainLayout>
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-base text-red-700">
                  {error ?? "Document not found"}
                </p>
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
        {isAdmin && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex gap-1" aria-label="Document sections">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "details"
                    ? "border-gray-300 bg-white text-gray-900 shadow-sm"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "border-gray-300 bg-white text-gray-900 shadow-sm"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                History
              </button>
            </nav>
          </div>
        )}
        {activeTab === "details" && (
          <DocumentForm
            title="Edit Document"
            initial={doc}
            departments={departments}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
          />
        )}
        {activeTab === "history" && documentId && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Document History
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              Read-only timeline of actions on this document, from encoding to completion or release.
            </p>
            <DocumentHistoryTimeline
              documentId={documentId}
              token={token}
              document={documentDetails}
            />
          </div>
        )}
      </MainLayout>
    </RoleGuard>
  );
}
