"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL as API_BASE } from "@/lib/apiBase";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import Loader from "@/components/Loader";
import { cachedJson } from "@/lib/cache";
import ConfirmActionModal from "@/components/ConfirmActionModal";

type Department = {
  id: number;
  name: string;
  code: string;
  office?: string | null;
  department_head?: string | null;
};


export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [office, setOffice] = useState("");
  const [departmentHead, setDepartmentHead] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const visibleIds = useMemo(
    () => departments.map((d) => d.id),
    [departments]
  );
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someSelected = visibleIds.some((id) => selectedIds.includes(id));

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`${API_BASE}/departments?per_page=100`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    setDepartments(res.data ?? []);
    const nextIds = new Set((res.data ?? []).map((d: Department) => d.id));
    setSelectedIds((prev) => prev.filter((id) => nextIds.has(id)));
  }, [token]);

  useEffect(() => {
    async function init() {
      try {
        await cachedJson(
          "departments:per_page=100",
          async () => {
            await loadDepartments();
            return true;
          },
          5 * 60 * 1000
        );
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
  }, [router, loadDepartments]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allSelected && someSelected;
    }
  }, [allSelected, someSelected]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          code: code.toUpperCase(),
          office,
          department_head: departmentHead,
        }),
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to create department");
      }
      
      setName("");
      setCode("");
      setOffice("");
      setDepartmentHead("");
      setSuccess("Department created successfully!");
      await loadDepartments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create department";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      setError("Please select at least one department to delete.");
      return;
    }

    setDeletingSelected(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/departments/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete departments");
      }
      const body = await res.json().catch(() => ({}));
      const deletedCount = (body.deleted_ids ?? []).length;
      const deactivatedCount = (body.deactivated_ids ?? []).length;
      if (deactivatedCount > 0 && deletedCount > 0) {
        setSuccess(
          `${deletedCount} deleted, ${deactivatedCount} deactivated (in use).`
        );
      } else if (deactivatedCount > 0) {
        setSuccess(`${deactivatedCount} deactivated (in use).`);
      } else {
        setSuccess("Selected departments deleted successfully.");
      }
      setSelectedIds([]);
      await loadDepartments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete departments";
      setError(message);
    } finally {
      setDeletingSelected(false);
      setShowDeleteModal(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader size="lg" />
              <p className="text-lg text-gray-600">Loading departments...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <MainLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage departments and their codes used in document tracking
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Form */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Add New Department
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(capitalizeFirst(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., Budget Office"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the full name of the department
              </p>
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Department Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base font-mono focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., BUDG"
                maxLength={10}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Short code used in document codes (e.g., BUDG, TREAS, ACCT)
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Office <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(capitalizeFirst(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., City Treasurer"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Official office title or unit.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Department Head / Assistant Department Head{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={departmentHead}
                onChange={(e) =>
                  setDepartmentHead(capitalizeFirst(e.target.value))
                }
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., Ms. Jovita Bienes / Mr. Edmund D. Pabale"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the department head (include assistant if applicable).
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-6 py-3 text-base font-semibold text-white shadow-md hover:from-[#6b2433] hover:to-[#8b3545] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 ease-in-out active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader size="sm" variant="light" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>Add Department</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Departments List */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 flex flex-col min-h-[360px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Departments ({departments.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={deletingSelected || selectedIds.length === 0}
            className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingSelected ? (
              <>
                <Loader size="sm" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span>❌</span>
                <span>Delete Selected</span>
              </>
            )}
          </button>
        </div>
        {departments.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="min-w-[900px] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-12 px-6 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label="Select all departments"
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) =>
                            Array.from(new Set([...prev, ...visibleIds]))
                          );
                        } else {
                          setSelectedIds((prev) =>
                            prev.filter((id) => !visibleIds.includes(id))
                          );
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                    Department Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                    Office
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                    Department Head / Assistant Department Head
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                    Code
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Select department ${d.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        checked={selectedIds.includes(d.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, d.id]))
                              : prev.filter((id) => id !== d.id)
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-3 align-middle">
                      <span className="text-sm font-semibold text-gray-900">{d.name}</span>
                    </td>
                    <td className="px-6 py-3 align-middle">
                      <span className="text-sm text-gray-700">{d.office || "—"}</span>
                    </td>
                    <td className="px-6 py-3 align-middle">
                      <span className="text-sm text-gray-700">{d.department_head || "—"}</span>
                    </td>
                    <td className="px-6 py-3 align-middle">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-mono text-sm font-semibold text-blue-800">
                        {d.code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 px-6 py-12 text-center">
            <div className="mb-4 text-5xl">🏢</div>
            <p className="mb-2 text-lg font-medium text-gray-900">
              No departments yet
            </p>
            <p className="text-base text-gray-600">
              Add your first department using the form above
            </p>
          </div>
        )}
      </div>

      <ConfirmActionModal
        open={showDeleteModal}
        title="Delete Departments"
        message="Are you sure you want to delete the selected department(s)? This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingSelected}
        onClose={() => {
          if (deletingSelected) return;
          setShowDeleteModal(false);
        }}
        onConfirm={handleDeleteSelected}
      />

      </MainLayout>
    </RoleGuard>
  );
}
  const capitalizeFirst = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };




