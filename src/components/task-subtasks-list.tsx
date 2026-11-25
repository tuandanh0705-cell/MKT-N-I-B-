"use client";

import { useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  createSubtaskId,
  normalizeSubtasks,
  type TaskSubtaskItem,
} from "@/lib/subtasks";
import { taskRequiresLeaderApproval } from "@/lib/constants";
import { useToast } from "@/components/toast-provider";
import type { SimpleUser, TaskItem } from "@/types/crm";

interface TaskSubtasksListProps {
  task: TaskItem;
  users: SimpleUser[];
  currentUserRole?: "LEADER" | "MEMBER";
  onTaskUpdated: (updated: TaskItem) => void;
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
  compact?: boolean;
}

export function TaskSubtasksList({
  task,
  users,
  currentUserRole,
  onTaskUpdated,
  composerOpen: controlledComposerOpen,
  onComposerOpenChange,
  compact = true,
}: TaskSubtasksListProps) {
  const { showToast } = useToast();
  const subtasks = normalizeSubtasks(task.subtasksJson);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isComposerOpen =
    controlledComposerOpen !== undefined ? controlledComposerOpen : uncontrolledOpen;
  const setComposerOpen = onComposerOpenChange ?? setUncontrolledOpen;

  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);

  // Remind popover cho từng task nhỏ
  const [remindTargetId, setRemindTargetId] = useState<string | null>(null);
  const [remindRecipientId, setRemindRecipientId] = useState<string>("");
  const [reminding, setReminding] = useState(false);

  async function saveSubtasks(
    nextSubtasks: TaskSubtaskItem[],
    successMsg?: string,
    extraPayload?: Record<string, unknown>
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtasksJson: nextSubtasks,
          ...(extraPayload ?? {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được chi tiết đầu việc.", "error");
        return;
      }
      onTaskUpdated(data.task);
      if (successMsg) showToast(successMsg);
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSubtask(subtaskId: string) {
    const next = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const allCompleted = next.length > 0 && next.every((st) => st.done);
    if (allCompleted && task.status === "IN_PROGRESS") {
      const requiresLeaderQc =
        currentUserRole !== "LEADER" && taskRequiresLeaderApproval(task);

      if (requiresLeaderQc) {
        await saveSubtasks(
          next,
          "Đã xong toàn bộ checklist nhỏ — hãy bấm 'Gửi duyệt' để Leader kiểm tra thành phẩm!"
        );
        return;
      }

      await saveSubtasks(
        next,
        "Đã xong hết đầu việc nhỏ — Hoàn thành task!",
        { action: "MARK_DONE" }
      );
      return;
    }
    await saveSubtasks(next);
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const next = subtasks.filter((st) => st.id !== subtaskId);
    await saveSubtasks(next, "Đã xóa chi tiết đầu việc.");
  }

  async function handleAddSubtask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleaned = newTitle.trim();
    if (!cleaned) return;
    const pickedUser = users.find((u) => u.id === newAssigneeId);
    const next: TaskSubtaskItem[] = [
      ...subtasks,
      {
        id: createSubtaskId(),
        title: cleaned,
        done: false,
        dueDate: newDueDate || null,
        assigneeId: pickedUser?.id || null,
        assigneeName: pickedUser?.name || null,
      },
    ];
    setNewTitle("");
    setNewDueDate("");
    setNewAssigneeId("");
    await saveSubtasks(next, "Đã thêm chi tiết đầu việc.");
  }

  async function handleSendRemind(st: TaskSubtaskItem) {
    setReminding(true);
    try {
      const targetId = remindRecipientId || st.assigneeId || "";
      const res = await fetch(`/api/tasks/${task.id}/subtasks/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtaskId: st.id,
          subtaskTitle: st.title,
          recipientUserId: targetId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Chưa gửi được nhắc nhở.", "error");
        return;
      }
      if (data.task) onTaskUpdated(data.task);
      const who =
        Array.isArray(data.remindedTo) && data.remindedTo.length > 0
          ? data.remindedTo.join(", ")
          : "đồng đội liên quan";
      showToast(`Đã gửi nhắc "${st.title}" tới ${who}!`);
      setRemindTargetId(null);
      setRemindRecipientId("");
    } catch {
      showToast("Lỗi kết nối khi gửi nhắc.", "error");
    } finally {
      setReminding(false);
    }
  }

  return (
    <div className={compact ? "pl-7 sm:pl-9 pt-1 pb-2 space-y-1" : "space-y-2"}>
      {subtasks.map((st) => {
        const isRemindOpen = remindTargetId === st.id;
        return (
          <div key={st.id} className="border-b border-slate-100 last:border-b-0">
            <div className="group flex items-center justify-between gap-2 py-1.5 px-1 rounded-lg hover:bg-slate-50/80 transition">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleToggleSubtask(st.id)}
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                    st.done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-400 hover:border-emerald-500 bg-white"
                  }`}
                  title={st.done ? "Bỏ đánh dấu" : "Hoàn thành chi tiết đầu việc"}
                >
                  {st.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                <span
                  className={`text-[13px] leading-snug truncate ${
                    st.done
                      ? "line-through text-slate-400"
                      : "text-slate-700 font-medium"
                  }`}
                >
                  {st.title}
                </span>

                {st.assigneeName && (
                  <span className="rounded-full bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                    @{st.assigneeName}
                  </span>
                )}

                {st.dueDate && (
                  <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-emerald-700 shrink-0">
                    <Calendar className="w-2.5 h-2.5" />
                    {st.dueDate.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                )}

                {st.remindedAt && (
                  <span className="text-[10px] font-semibold text-amber-600 shrink-0">
                    • Đã nhắc
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isRemindOpen) {
                      setRemindTargetId(null);
                    } else {
                      setRemindTargetId(st.id);
                      setRemindRecipientId(st.assigneeId || "");
                    }
                  }}
                  className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    isRemindOpen
                      ? "bg-amber-100 text-amber-800"
                      : "text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                  title="Remind người liên quan"
                >
                  <Bell className="w-3 h-3" />
                  Nhắc
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDeleteSubtask(st.id)}
                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  title="Xóa chi tiết đầu việc"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {isRemindOpen && (
              <div className="ml-6 mb-1.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-amber-900">Nhắc ai:</span>
                <select
                  value={remindRecipientId}
                  onChange={(e) => setRemindRecipientId(e.target.value)}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-slate-800"
                >
                  <option value="">Người liên quan trong việc</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={reminding}
                  onClick={() => handleSendRemind(st)}
                  className="rounded-md bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  {reminding ? "Đang gửi..." : "Gửi nhắc"}
                </button>
                <button
                  type="button"
                  onClick={() => setRemindTargetId(null)}
                  className="rounded-md px-1.5 py-1 text-[11px] text-slate-500 hover:bg-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Form inline tự điền Chi tiết đầu việc */}
      {isComposerOpen ? (
        <form
          onSubmit={handleAddSubtask}
          className="mt-1.5 rounded-xl border border-slate-300 bg-white p-2.5 shadow-xs space-y-2"
        >
          <input
            type="text"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nhập chi tiết đầu việc..."
            className="w-full text-xs sm:text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer">
                <Calendar className="w-3 h-3 text-slate-400" />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-transparent text-[11px] focus:outline-none w-[96px]"
                />
              </label>

              <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
                <User className="w-3 h-3 text-slate-400" />
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="bg-transparent text-[11px] focus:outline-none max-w-[110px]"
                >
                  <option value="">Phối hợp</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setNewTitle("");
                }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={saving || !newTitle.trim()}
                className="rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-45 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                Thêm
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="inline-flex items-center gap-1.5 py-1 px-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm chi tiết đầu việc
        </button>
      )}
    </div>
  );
}
