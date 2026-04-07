"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";

type Department = {
  id: number;
  name: string;
  code: string;
  office?: string | null;
  department_head?: string | null;
};

const DOCUMENT_TYPES = [
  "LETTER REQUEST",
  "PURCHASE REQUEST",
  "PURCHASE ORDER",
  "PO ATTACHMENTS",
  "OBR",
  "VOUCHER",
  "CHEQUE",
  "MOA",
  "DEED OF DONATION",
  "DEED OF SALE",
  "CONTRACT OF LEASE",
  "CONTRACT OF SERVICE",
  "CONTRACT OF SERVICE (SUPPLIER)",
  "HR",
  "HR RELATED",
  "CERTIFICATION",
  "INVITATION/COURTESY",
  "POW",
  "SWA",
  "BPLO DOCS",
  "BPMP",
  "LEGAL DOCS",
] as const;

export type DocumentPayload = {
  date: string;
  type_of_document: string;
  document_number?: string | null;
  pay_claimant: string;
  contact_number?: string | null;
  name_of_business?: string | null;
  reason?: string | null;
  particular: string;
  amount: number;
  routed_department_id: number;
  status: string;
  remarks?: string | null;
  date_out?: string | null;
};

type Props = {
  title: string;
  initial?: Partial<DocumentPayload> & { document_code?: string };
  departments: Department[];
  onSubmit: (payload: DocumentPayload) => Promise<void>;
  submitLabel: string;
};

type DepartmentSelectProps = {
  label: string;
  value: number;
  departments: Department[];
  onChange: (id: number) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  showDetails?: boolean;
};

function DepartmentSearchSelect({
  label,
  value,
  departments,
  onChange,
  placeholder,
  helperText,
  required,
  showDetails,
}: DepartmentSelectProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selected = useMemo(
    () => departments.find((dept) => dept.id === value),
    [departments, value]
  );

  const selectedLabel = selected
    ? `${selected.name} (${selected.code})`
    : "";

  useEffect(() => {
    if (!selectedLabel) return;
    setInputValue(selectedLabel);
  }, [selectedLabel]);

  const filteredDepartments = useMemo(() => {
    if (!departments.length) return [];
    const query = inputValue.trim().toLowerCase();
    if (!query) return departments;
    const tokens = query.split(/\s+/).filter(Boolean);
    return departments.filter((dept) => {
      const haystack = `${dept.name} ${dept.code} ${dept.office ?? ""} ${
        dept.department_head ?? ""
      }`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [departments, inputValue]);

  const visibleDepartments = filteredDepartments.slice(0, 50);

  const handleSelect = (dept: Department) => {
    onChange(dept.id);
    setInputValue(`${dept.name} (${dept.code})`);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      if (selectedLabel) setInputValue(selectedLabel);
    }, 120);
  };

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (selectedLabel && inputValue === selectedLabel) {
              setInputValue("");
            }
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              if (selectedLabel) setInputValue(selectedLabel);
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (visibleDepartments[0]) handleSelect(visibleDepartments[0]);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
          autoComplete="off"
          required={required}
        />
        {open && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {departments.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No departments available.
              </div>
            ) : visibleDepartments.length > 0 ? (
              visibleDepartments.map((dept) => {
                const isSelected = dept.id === value;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(dept);
                    }}
                    className={`flex w-full items-start px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{dept.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({dept.code})
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                No matching departments.
              </div>
            )}
          </div>
        )}
      </div>
      {helperText && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      {showDetails && selected && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-gray-700">
          <div className="flex flex-col gap-1.5">
            <div>
              <span className="font-semibold text-gray-700">Department:</span>{" "}
              <span className="text-gray-800">{selected.name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Office:</span>{" "}
              <span className="text-gray-800">
                {selected.office || "—"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">
                Department Head / Assistant Department Head:
              </span>{" "}
              <span className="text-gray-800">
                {selected.department_head || "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentForm({
  title,
  initial,
  departments,
  onSubmit,
  submitLabel,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const capitalizeFirst = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const [date, setDate] = useState(initial?.date ?? today);
  const [typeOfDocument, setTypeOfDocument] = useState(
    initial?.type_of_document ?? ""
  );
  const [documentNumber, setDocumentNumber] = useState(
    initial?.document_number ?? ""
  );
  const [payClaimant, setPayClaimant] = useState(
    initial?.pay_claimant ?? ""
  );
  const [contactNumber, setContactNumber] = useState(
    initial?.contact_number ?? ""
  );
  const [nameOfBusiness, setNameOfBusiness] = useState(
    initial?.name_of_business ?? ""
  );
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [particular, setParticular] = useState(initial?.particular ?? "");
  const [amount, setAmount] = useState<string>(
    initial?.amount !== undefined && initial?.amount !== null
      ? String(initial.amount)
      : ""
  );
  const [routedDepartmentId, setRoutedDepartmentId] = useState<number>(
    initial?.routed_department_id ?? (departments[0]?.id ?? 0)
  );
  const [status, setStatus] = useState(initial?.status ?? "For Signature");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [dateOut, setDateOut] = useState(initial?.date_out ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const requirements = useMemo(() => {
    const type = typeOfDocument.trim().toUpperCase();
    const map: Record<string, Partial<Record<string, number | boolean>>> = {
      "LETTER REQUEST": { pay_claimant: true, contact_number: true },
      "PURCHASE REQUEST": { document_number: true, amount: 1000000 },
      "PURCHASE ORDER": { document_number: true, amount: 1000000 },
      "PO ATTACHMENTS": { amount: 1000000 },
      OBR: { pay_claimant: true, document_number: true, particular: true, amount: 1000000 },
      VOUCHER: { pay_claimant: true, document_number: true, particular: true, amount: 1000000 },
      CHEQUE: { pay_claimant: true, document_number: true, particular: true, amount: 1000000 },
      MOA: { particular: true },
      "DEED OF DONATION": { particular: true },
      "DEED OF SALE": { particular: true },
      "CONTRACT OF LEASE": { particular: true },
      "CONTRACT OF SERVICE": { particular: true },
      "CONTRACT OF SERVICE (SUPPLIER)": { particular: true },
      HR: { particular: true },
      "HR RELATED": { particular: true },
      CERTIFICATION: { particular: true },
      "INVITATION/COURTESY": {},
      POW: { document_number: true, particular: true, amount: true },
      SWA: { particular: true },
      "BPLO DOCS": { name_of_business: true, reason: true },
      BPMP: { particular: true },
      "LEGAL DOCS": { particular: true },
    };
    return map[type] ?? {};
  }, [typeOfDocument]);

  const documentNumberLabel = useMemo(() => {
    const type = typeOfDocument.trim().toUpperCase();
    if (type === "PURCHASE REQUEST") return "PR Number";
    if (type === "PURCHASE ORDER") return "PO Number";
    if (type === "OBR") return "OBR Number";
    if (type === "VOUCHER") return "Voucher Number";
    if (type === "CHEQUE") return "Check Number";
    if (type === "POW") return "POW Number";
    return "Document Number";
  }, [typeOfDocument]);

  const payClaimantLabel = useMemo(() => {
    const type = typeOfDocument.trim().toUpperCase();
    if (type === "LETTER REQUEST") return "Requestor";
    if (["OBR", "VOUCHER", "CHEQUE"].includes(type)) return "Payee/Claimant";
    return "Pay Claimant";
  }, [typeOfDocument]);

  const amountMin = typeof requirements.amount === "number" ? requirements.amount : 0;

  useEffect(() => {
    if (departments.length === 0) return;
    if (!routedDepartmentId) setRoutedDepartmentId(departments[0].id);
  }, [departments, routedDepartmentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const errors: Record<string, string> = {};

    if (requirements.pay_claimant && !payClaimant.trim()) {
      errors.pay_claimant = `${payClaimantLabel} is required.`;
    }
    if (requirements.contact_number && !contactNumber.trim()) {
      errors.contact_number = "Contact number is required.";
    }
    if (requirements.name_of_business && !nameOfBusiness.trim()) {
      errors.name_of_business = "Name of business is required.";
    }
    if (requirements.reason && !reason.trim()) {
      errors.reason = "Reason is required.";
    }
    if (requirements.document_number && !documentNumber.trim()) {
      errors.document_number = `${documentNumberLabel} is required.`;
    }
    if (requirements.particular && !particular.trim()) {
      errors.particular = "Particular is required.";
    }
    if (requirements.amount) {
      const numericAmount = Number(amount);
      if (!amount || Number.isNaN(numericAmount)) {
        errors.amount = "Amount is required.";
      } else if (amountMin > 0 && numericAmount < amountMin) {
        errors.amount = `Amount must be at least ${amountMin.toLocaleString("en-US")} pesos.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    try {
      await onSubmit({
        date,
        type_of_document: typeOfDocument,
        document_number: documentNumber || null,
        pay_claimant: payClaimant,
        contact_number: contactNumber || null,
        name_of_business: nameOfBusiness || null,
        reason: reason || null,
        particular,
        amount: Number(amount),
        routed_department_id: Number(routedDepartmentId),
        status,
        remarks: remarks || null,
        date_out: dateOut || null,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Save failed. Please check all fields.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-base text-gray-600">
          Fill in all required fields below. The document code will be
          automatically generated.
        </p>
      </div>

      {initial?.document_code && (
        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Document Code (Auto-generated)
          </label>
          <input
            value={initial.document_code}
            readOnly
            className="w-full rounded-lg border-2 border-blue-300 bg-white px-4 py-3 font-mono text-base font-semibold text-gray-900"
          />
          <p className="mt-2 text-sm text-gray-600">
            This code is automatically generated and cannot be changed.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl font-semibold text-red-700">!</span>
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Document Details
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Core information used to identify and track the document.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Document Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Select the date of the document.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Type of Document <span className="text-red-500">*</span>
              </label>
              <select
                value={typeOfDocument}
                onChange={(e) => setTypeOfDocument(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white"
                required
              >
                <option value="">Select document type</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                {!DOCUMENT_TYPES.includes(typeOfDocument as (typeof DOCUMENT_TYPES)[number]) &&
                typeOfDocument ? (
                  <option value={typeOfDocument}>{typeOfDocument}</option>
                ) : null}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose from the approved document types.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {documentNumberLabel}{" "}
                {requirements.document_number && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Enter number"
              />
              {fieldErrors.document_number ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.document_number}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.document_number
                    ? "Required for the selected document type."
                    : "Optional: Enter a manual reference number."}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {payClaimantLabel}{" "}
                {requirements.pay_claimant && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                value={payClaimant}
                onChange={(e) => setPayClaimant(capitalizeFirst(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Name of person or entity"
              />
              {fieldErrors.pay_claimant ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.pay_claimant}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.pay_claimant
                    ? "Required for the selected document type."
                    : "Enter the full name of the person or entity."}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Contact Number{" "}
                {requirements.contact_number && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., 09xx xxx xxxx"
              />
              {fieldErrors.contact_number ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.contact_number}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.contact_number
                    ? "Required for the selected document type."
                    : "Optional: Provide a contact number if applicable."}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Amount (PHP)
                {requirements.amount && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-600">
                  PHP
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 pl-14 pr-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="0.00"
                />
              </div>
              {fieldErrors.amount ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.amount
                    ? amountMin > 0
                      ? `Required. Minimum ${amountMin.toLocaleString("en-US")} pesos.`
                      : "Required for the selected document type."
                    : "Enter the total amount in pesos."}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Particular{" "}
              {requirements.particular && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <textarea
              value={particular}
              onChange={(e) => setParticular(capitalizeFirst(e.target.value))}
              rows={4}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Describe what this document is for..."
            />
              {fieldErrors.particular ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.particular}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.particular
                    ? "Required for the selected document type."
                    : "Provide a clear summary of the request."}
                </p>
              )}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Name of Business{" "}
                {requirements.name_of_business && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                value={nameOfBusiness}
                onChange={(e) => setNameOfBusiness(capitalizeFirst(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Enter business name"
              />
              {fieldErrors.name_of_business ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name_of_business}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.name_of_business
                    ? "Required for the selected document type."
                    : "Optional: Provide business name when applicable."}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Reason{" "}
                {requirements.reason && <span className="text-red-500">*</span>}
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(capitalizeFirst(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Enter reason"
              />
              {fieldErrors.reason ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.reason}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.reason
                    ? "Required for the selected document type."
                    : "Optional: Provide a short reason if applicable."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Routing and Status
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose the destination department and track status.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <DepartmentSearchSelect
              label="Department Out"
              value={routedDepartmentId}
              departments={departments}
              onChange={setRoutedDepartmentId}
              placeholder="Search destination department"
              helperText="Select the department where this document will be routed."
              required
              showDetails
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                required
              >
                <option value="For Signature">For Signature</option>
                <option value="For Review">For Review</option>
                <option value="For Initial">For Initial</option>
                <option value="For Schedule">For Schedule</option>
                <option value="Signed">Signed</option>
                <option value="Filed">Filed</option>
                <option value="Returned">Returned</option>
                <option value="Hold">Hold</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Track where the document is in the process.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Date Out (Returned to Department)
              </label>
              <input
                type="date"
                value={dateOut}
                onChange={(e) => setDateOut(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional: Date when the document was returned.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Additional Notes
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Optional remarks to clarify special instructions or context.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(capitalizeFirst(e.target.value))}
              rows={3}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Any additional notes or comments..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Add any additional notes or comments.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/documents"
          className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !routedDepartmentId}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-8 py-3 text-base font-semibold text-white shadow-md hover:from-[#6b2433] hover:to-[#8b3545] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300 ease-in-out active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader size="sm" variant="light" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </div>
    </form>
  );
}
