"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  AlarmClockPlus,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Repeat,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type {
  ChatMessageItem,
  ChatReminderItem,
  ChatReminderRepeatRule,
} from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ChatRemindersModalProps {
  open: boolean;
  roomId: string;
  roomTitle: string;
  initialView: "LIST" | "CREATE";
  prefillTitle?: string;
  reminders: ChatReminderItem[];
  currentUserRole: UserRole;
  isRoomAdmin: boolean;
  onClose: () => void;
  onReminderCreated: (
    reminder: ChatReminderItem,
    message: ChatMessageItem
  ) => void;
  onReminderUpdated: (reminder: ChatReminderItem) => void;
  onReminderDeleted: (reminderId: string) => void;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatReminderVnDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const REPEAT_LABELS: Record<ChatReminderRepeatRule, string> = {
  NONE: "Không lặp lại",
  DAILY: "Lặp hàng ngày",
  WEEKLY: "Lặp hàng tuần",
};

export function ChatRemindersModal(props: ChatRemindersModalProps) {
  if (!props.open) return null;
  const resetKey = `${props.roomId}::${props.initialView}::${props.prefillTitle ?? ""}`;
  return <ChatRemindersModalInner key={resetKey} {...props} />;
}

function getDefaultRemindAtLocal(): string {
  const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
  defaultDate.setSeconds(0, 0);
  return toLocalDateTimeInputValue(defaultDate);
}

function ChatRemindersModalInner({
  roomId,
  roomTitle,
  initialView,
  prefillTitle,
  reminders,
  currentUserRole,
  isRoomAdmin,
  onClose,
  onReminderCreated,
  onReminderUpdated,
  onReminderDeleted,
}: ChatRemindersModalProps) {
  const { showToast } = useToast();
  const [view, setView] = useState<"CREATE" | "LIST">(initialView);
  const [title, setTitle] = useState(prefillTitle || "");
  const [remindAtLocal, setRemindAtLocal] = useState<string>(
    getDefaultRemindAtLocal
  );
  const [repeatRule, setRepeatRule] = useState<ChatReminderRepeatRule>("NONE");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const activeReminders = useMemo(
    () =>
      reminders
        .filter((r) => !r.isCompleted)
        .sort(
          (a, b) =>
            new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
        ),
    [reminders]
  );

  const completedReminders = useMemo(
    () =>
      reminders
        .filter((r) => r.isCompleted)
        .sort(
          (a, b) =>
            new Date(b.completedAt || b.remindAt).getTime() -
            new Date(a.completedAt || a.remindAt).getTime()
        ),
    [reminders]
  );

  function applyQuickPreset(preset: "15M" | "1H" | "TODAY_16" | "TOMORROW_09") {
    const now = new Date();
    const target = new Date(now);
    target.setSeconds(0, 0);

    if (preset === "15M") {
      target.setMinutes(target.getMinutes() + 15);
    } else if (preset === "1H") {
      target.setHours(target.getHours() + 1);
    } else if (preset === "TODAY_16") {
      target.setHours(16, 0, 0, 0);
      if (target.getTime() <= now.getTime() + 60_000) {
        target.setDate(target.getDate() + 1);
      }
    } else if (preset === "TOMORROW_09") {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    }
    setRemindAtLocal(toLocalDateTimeInputValue(target));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast("Vui lòng nhập nội dung nhắc hẹn.", "error");
      return;
    }
    const parsedDate = new Date(remindAtLocal);
    if (!remindAtLocal || Number.isNaN(parsedDate.getTime())) {
      showToast("Vui lòng chọn thời gian nhắc hẹn hợp lệ.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          remindAt: parsedDate.toISOString(),
          repeatRule,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể tạo nhắc hẹn.", "error");
        return;
      }
      onReminderCreated(data.reminder, data.message);
      showToast("⏰ Đã tạo nhắc hẹn và ghim vào phòng chat!", "success");
      setTitle("");
      onClose();
    } catch {
      showToast("Lỗi kết nối khi tạo nhắc hẹn.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleComplete(rem: ChatReminderItem) {
    if (busyId) return;
    setBusyId(rem.id);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/reminders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderId: rem.id,
          isCompleted: !rem.isCompleted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được nhắc hẹn.", "error");
        return;
      }
      onReminderUpdated(data.reminder);
      showToast(
        !rem.isCompleted
          ? "Đã đánh dấu hoàn thành nhắc hẹn."
          : "Đã mở lại nhắc hẹn.",
        "info"
      );
    } catch {
      showToast("Lỗi kết nối khi cập nhật nhắc hẹn.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(rem: ChatReminderItem) {
    if (busyId) return;
    setBusyId(rem.id);
    try {
      const res = await fetch(
        `/api/chat/rooms/${roomId}/reminders?reminderId=${encodeURIComponent(
          rem.id
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không xóa được nhắc hẹn.", "error");
        return;
      }
      onReminderDeleted(rem.id);
      showToast("Đã xóa nhắc hẹn.", "info");
    } catch {
      showToast("Lỗi kết nối khi xóa nhắc hẹn.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] rounded-2xl bg-white border-2 border-amber-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-amber-100 bg-[#FFFDF7] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlarmClock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Nhắc hẹn trong cuộc trò chuyện
              </h3>
              <p className="text-[11px] text-slate-500 truncate">{roomTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-amber-100/70 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView("CREATE")}
            className={`flex-1 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
              view === "CREATE"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "bg-amber-50/70 text-slate-600 hover:bg-amber-100"
            }`}
          >
            <AlarmClockPlus className="w-4 h-4" />
            <span>Tạo nhắc hẹn</span>
          </button>
          <button
            type="button"
            onClick={() => setView("LIST")}
            className={`flex-1 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
              view === "LIST"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "bg-amber-50/70 text-slate-600 hover:bg-amber-100"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Danh sách ({activeReminders.length})</span>
          </button>
        </div>

        {/* Body */}
        {view === "CREATE" ? (
          <form
            onSubmit={handleCreate}
            className="p-4 space-y-4 overflow-y-auto flex-1"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">
                Nội dung nhắc hẹn <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={240}
                placeholder="Ví dụ: Họp chốt plan content tuần tới, gửi link ảnh final cho Leader duyệt..."
                autoFocus
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">
                Chọn nhanh thời gian
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "15M", label: "+15 phút" },
                  { id: "1H", label: "+1 giờ" },
                  { id: "TODAY_16", label: "16:00 hôm nay" },
                  { id: "TOMORROW_09", label: "09:00 ngày mai" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() =>
                      applyQuickPreset(
                        chip.id as "15M" | "1H" | "TODAY_16" | "TOMORROW_09"
                      )
                    }
                    className="rounded-full border border-amber-200 bg-amber-50/80 hover:bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 transition cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  Ngày & giờ nhắc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={remindAtLocal}
                  onChange={(e) => setRemindAtLocal(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  Lặp lại
                </label>
                <select
                  value={repeatRule}
                  onChange={(e) =>
                    setRepeatRule(e.target.value as ChatReminderRepeatRule)
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-sky-400 focus:outline-none"
                >
                  <option value="NONE">Không lặp lại</option>
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-sky-50/80 border border-sky-200/80 px-3 py-2 text-[11px] text-sky-900">
              Hệ thống sẽ gửi thẻ nhắc hẹn vào phòng chat, ghim đầu cuộc trò
              chuyện và tự động bắn thông báo tới mọi thành viên trong phòng khi
              đến giờ.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <AlarmClockPlus className="w-4 h-4" />
                <span>{submitting ? "Đang tạo..." : "Tạo nhắc hẹn"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {activeReminders.length === 0 && completedReminders.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CalendarClock className="w-10 h-10 text-amber-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  Chưa có nhắc hẹn nào trong phòng này
                </p>
                <p className="text-xs text-slate-500">
                  Tạo nhắc hẹn để không bỏ lỡ giờ họp, deadline hay lịch duyệt bài.
                </p>
                <button
                  type="button"
                  onClick={() => setView("CREATE")}
                  className="mt-2 rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <AlarmClockPlus className="w-3.5 h-3.5" />
                  Tạo nhắc hẹn đầu tiên
                </button>
              </div>
            ) : (
              <>
                {activeReminders.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                      Sắp tới ({activeReminders.length})
                    </div>
                    {activeReminders.map((rem) => {
                      const isDue =
                        new Date(rem.remindAt).getTime() <= nowMs;
                      const canDelete =
                        rem.isMine ||
                        isRoomAdmin ||
                        currentUserRole === "LEADER";
                      return (
                        <div
                          key={rem.id}
                          className={`rounded-xl border p-3 flex items-start gap-3 ${
                            isDue
                              ? "border-rose-200 bg-rose-50/50"
                              : "border-amber-200 bg-amber-50/40"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isDue
                                ? "bg-rose-100 text-rose-600"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <AlarmClock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 break-words">
                              {rem.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                              <span
                                className={`font-bold ${
                                  isDue ? "text-rose-600" : "text-amber-800"
                                }`}
                              >
                                {formatReminderVnDateTime(rem.remindAt)}
                              </span>
                              {isDue && (
                                <span className="rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold">
                                  Đã đến giờ
                                </span>
                              )}
                              {rem.repeatRule !== "NONE" && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[10px] font-bold">
                                  <Repeat className="w-2.5 h-2.5" />
                                  {REPEAT_LABELS[rem.repeatRule]}
                                </span>
                              )}
                              {rem.createdBy && (
                                <span className="text-slate-400">
                                  • Tạo bởi {rem.createdBy.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                disabled={busyId === rem.id}
                                onClick={() => handleToggleComplete(rem)}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Đánh dấu xong
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  disabled={busyId === rem.id}
                                  onClick={() => handleDelete(rem)}
                                  className="rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {completedReminders.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Đã hoàn thành ({completedReminders.length})
                    </div>
                    {completedReminders.map((rem) => {
                      const canDelete =
                        rem.isMine ||
                        isRoomAdmin ||
                        currentUserRole === "LEADER";
                      return (
                        <div
                          key={rem.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-500 line-through break-words">
                              {rem.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatReminderVnDateTime(rem.remindAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === rem.id}
                              onClick={() => handleToggleComplete(rem)}
                              title="Mở lại nhắc hẹn"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-sky-600 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                disabled={busyId === rem.id}
                                onClick={() => handleDelete(rem)}
                                title="Xóa nhắc hẹn"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
