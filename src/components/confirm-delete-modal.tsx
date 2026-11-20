"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { getToneCopy } from "@/lib/tone";

interface ConfirmDeleteModalProps {
  open: boolean;
  itemName: string;
  description?: string;
  toneMode?: string | null;
  confirmLabel?: string;
  permanentWarning?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  open,
  itemName,
  description,
  toneMode,
  confirmLabel,
  permanentWarning = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!open) return null;
  const tone = getToneCopy(toneMode);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border-2 border-rose-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-rose-600 to-orange-600 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{tone.deleteConfirmTitle}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm sm:text-base font-bold text-slate-900">
            {tone.deleteConfirmQuestion(itemName)}
          </p>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600">{description}</p>
          )}
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              permanentWarning
                ? "bg-rose-50 border-rose-200 text-rose-800 font-semibold"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {permanentWarning
              ? "Cảnh báo: Thao tác này xóa vĩnh viễn khỏi cơ sở dữ liệu và không thể hoàn tác!"
              : tone.restoreNote}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Thôi giữ lại
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading
              ? "Đang xóa..."
              : confirmLabel || tone.deleteConfirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
