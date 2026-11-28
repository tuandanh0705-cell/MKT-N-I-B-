"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, X } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { useToast } from "@/components/toast-provider";
import { formatVnDateTime } from "@/lib/dates";
import type { UserRole } from "@/generated/prisma/client";

interface TrashedTask {
  id: string;
  code: string;
  title: string;
  deletedAt: string;
  project: { id: string; name: string; color: string };
  assignee?: { id: string; name: string } | null;
  deletedBy?: { id: string; name: string } | null;
}

export function TrashBinDrawer({
  open,
  onClose,
  userRole,
  toneMode,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
  toneMode?: string | null;
  onRestored?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashedTask[]>([]);
  const [loadedOpenKey, setLoadedOpenKey] = useState(0);
  const [openCounter, setOpenCounter] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setOpenCounter((c) => c + 1);
    }
  }
  const loading = open && loadedOpenKey !== openCounter;
  const [permanentTarget, setPermanentTarget] = useState<TrashedTask | null>(null);
  const [confirmBulkAction, setConfirmBulkAction] = useState<
    "EMPTY_TRASH" | null
  >(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const reqKey = openCounter;
    fetch("/api/tasks/trash")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.tasks) setItems(data.tasks);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadedOpenKey(reqKey);
      });
    return () => {
      active = false;
    };
  }, [open, openCounter]);

  async function handleRestoreAll() {
    if (items.length === 0) return;
    setActing(true);
    try {
      const res = await fetch("/api/tasks/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE_ALL" }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems([]);
        window.dispatchEvent(new Event("reviews-count-updated"));
        showToast(
          `Đã khôi phục toàn bộ ${data.restoredCount ?? items.length} mục từ Thùng rác!`
        );
        router.refresh();
        onRestored?.();
      } else {
        showToast(data.error || "Không khôi phục được tất cả.", "error");
      }
    } finally {
      setActing(false);
    }
  }

  async function handleEmptyTrash() {
    setActing(true);
    try {
      const res = await fetch("/api/tasks/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EMPTY_TRASH" }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems([]);
        setConfirmBulkAction(null);
        showToast(
          `Đã xóa vĩnh viễn ${data.deletedCount ?? items.length} mục khỏi Thùng rác.`
        );
        router.refresh();
      } else {
        showToast(data.error || "Không dọn sạch được thùng rác.", "error");
      }
    } finally {
      setActing(false);
    }
  }

  async function handleRestore(item: TrashedTask) {
    setActing(true);
    try {
      const res = await fetch("/api/tasks/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: item.id, action: "RESTORE" }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        window.dispatchEvent(new Event("reviews-count-updated"));
        showToast(`Đã khôi phục "${item.title}" về danh sách làm việc!`);
        router.refresh();
        onRestored?.();
      } else {
        showToast("Không khôi phục được công việc này.", "error");
      }
    } finally {
      setActing(false);
    }
  }

  async function handlePermanentDelete() {
    if (!permanentTarget) return;
    setActing(true);
    try {
      const res = await fetch("/api/tasks/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: permanentTarget.id,
          action: "PERMANENT_DELETE",
        }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((t) => t.id !== permanentTarget.id));
        showToast("Đã xóa vĩnh viễn khỏi Thùng rác.");
        setPermanentTarget(null);
      }
    } finally {
      setActing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              🗑️ Thùng rác & Khôi phục công việc
            </h2>
            <p className="text-xs text-slate-500">
              Lỡ tay xóa? Bạn vẫn vớt lại nguyên vẹn toàn bộ brief, comment & link ở đây.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700">
              Đang có {items.length} mục trong thùng rác
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={acting}
                onClick={handleRestoreAll}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Khôi phục tất cả
              </button>
              {userRole === "LEADER" && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setConfirmBulkAction("EMPTY_TRASH")}
                  className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Dọn sạch
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Đang kiểm tra thùng rác...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Thùng rác đang trống sạch!
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: item.project.color }}
                      >
                        {item.project.name}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Xóa bởi {item.deletedBy?.name || "Hệ thống"} •{" "}
                      {formatVnDateTime(item.deletedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => handleRestore(item)}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục lại
                  </button>
                  {userRole === "LEADER" && (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => setPermanentTarget(item)}
                      className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa hẳn
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(permanentTarget)}
        itemName={permanentTarget ? `${permanentTarget.code} — ${permanentTarget.title}` : ""}
        toneMode={toneMode}
        permanentWarning
        loading={acting}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermanentTarget(null)}
      />

      <ConfirmDeleteModal
        open={confirmBulkAction === "EMPTY_TRASH"}
        itemName={`toàn bộ ${items.length} mục trong Thùng rác`}
        toneMode={toneMode}
        permanentWarning
        loading={acting}
        onConfirm={handleEmptyTrash}
        onCancel={() => setConfirmBulkAction(null)}
      />
    </div>
  );
}
