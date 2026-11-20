"use client";

import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { LEAVE_STATUS_META, LEAVE_TYPE_META } from "@/lib/constants";
import { PirateAvatar } from "@/components/pirate-art";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { useToast } from "@/components/toast-provider";
import type { LeaveRequestItem } from "@/types/crm";
import type { LeaveType } from "@/generated/prisma/client";

export function ScheduleLeavesSection({
  currentUser,
  todayStr,
  leaves,
  onLeavesChange,
}: {
  currentUser: AuthUser;
  todayStr: string;
  leaves: LeaveRequestItem[];
  onLeavesChange: React.Dispatch<React.SetStateAction<LeaveRequestItem[]>>;
}) {
  const { showToast } = useToast();
  const [leaveType, setLeaveType] = useState<LeaveType>("FULL_DAY");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [leaveReason, setLeaveReason] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] =
    useState<LeaveRequestItem | null>(null);

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    setSavingLeave(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không gửi được đơn nghỉ.", "error");
        return;
      }
      onLeavesChange((prev) => [data.leave, ...prev]);
      setLeaveReason("");
      showToast(
        data.leave.status === "APPROVED"
          ? "Đã lưu lịch nghỉ."
          : "Đã gửi lịch nghỉ chờ Leader duyệt!"
      );
    } finally {
      setSavingLeave(false);
    }
  }

  async function reviewLeave(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (res.ok) {
      onLeavesChange((prev) => prev.map((l) => (l.id === id ? data.leave : l)));
      showToast(status === "APPROVED" ? "Đã duyệt lịch nghỉ." : "Đã từ chối.");
    }
  }

  async function confirmDeleteLeave() {
    if (!deleteLeaveTarget) return;
    setSavingLeave(true);
    try {
      const res = await fetch(`/api/leaves?id=${deleteLeaveTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onLeavesChange((prev) =>
          prev.filter((l) => l.id !== deleteLeaveTarget.id)
        );
        setDeleteLeaveTarget(null);
        showToast("Đã hủy lịch nghỉ.");
      }
    } finally {
      setSavingLeave(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSubmitLeave}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-slate-900">
            🏖️ Đăng Ký Lịch Nghỉ / WFH / Công Tác
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hình thức
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              {Object.entries(LEAVE_TYPE_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Từ ngày *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đến ngày *
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do / Người bàn giao tạm thời
            </label>
            <textarea
              rows={2}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="VD: Xin nghỉ buổi sáng thi trên trường, các bài ngày mai đã hẹn giờ đăng sẵn..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={savingLeave}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold cursor-pointer"
          >
            {savingLeave ? "Đang gửi..." : "Gửi Đăng Ký Lịch Nghỉ"}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            📅 Lịch Nghỉ Toàn Team ({leaves.length})
          </h2>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {leaves.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">
                Chưa có ai đăng ký lịch nghỉ.
              </p>
            ) : (
              leaves.map((l) => {
                const typeMeta =
                  LEAVE_TYPE_META[l.leaveType] || LEAVE_TYPE_META.FULL_DAY;
                const statusMeta =
                  LEAVE_STATUS_META[l.status] || LEAVE_STATUS_META.PENDING;
                return (
                  <div
                    key={l.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <PirateAvatar
                        name={l.user.name}
                        color={l.user.avatarColor}
                        scope={l.user.departmentScope}
                        pirateCharacter={l.user.pirateCharacter}
                        size="md"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-slate-900">
                            {l.user.name}
                          </strong>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeMeta.badgeClass}`}
                          >
                            {typeMeta.label}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.colorClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-700">
                          📆 {l.startDate}
                          {l.endDate !== l.startDate ? ` → ${l.endDate}` : ""}
                        </div>
                        {l.reason && <p className="text-slate-600">{l.reason}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentUser.role === "LEADER" &&
                        l.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => reviewLeave(l.id, "APPROVED")}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewLeave(l.id, "REJECTED")}
                              className="rounded-lg border border-rose-200 bg-white text-rose-600 px-2.5 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Từ chối
                            </button>
                          </>
                        )}
                      {(currentUser.role === "LEADER" ||
                        l.userId === currentUser.id) && (
                        <button
                          type="button"
                          onClick={() => setDeleteLeaveTarget(l)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa lịch nghỉ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteLeaveTarget)}
        itemName={
          deleteLeaveTarget
            ? `Lịch nghỉ ${deleteLeaveTarget.startDate} của ${deleteLeaveTarget.user.name}`
            : ""
        }
        toneMode={currentUser.preferredTone}
        permanentWarning
        loading={savingLeave}
        onConfirm={confirmDeleteLeave}
        onCancel={() => setDeleteLeaveTarget(null)}
      />
    </>
  );
}
