"use client";

import { useEffect } from "react";
import Loader from "@/components/Loader";

type ConfirmEditRequestModalProps = {
  open: boolean;
  documentCode: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmEditRequestModal({
  open,
  documentCode,
  loading,
  onClose,
  onConfirm,
}: ConfirmEditRequestModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-request-modal-title"
      aria-describedby="edit-request-modal-desc"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="edit-request-modal-title"
          className="text-xl font-bold text-gray-900"
        >
          Confirm Edit Request
        </h2>
        <p id="edit-request-modal-desc" className="mt-3 text-base text-gray-600">
          Are you sure you want to send an edit request for document{" "}
          <span className="font-semibold text-gray-800">{documentCode}</span>?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-4 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:from-[#6b2433] hover:to-[#8b3545] disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size="sm" variant="light" />
                Sending...
              </span>
            ) : (
              "Send Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
