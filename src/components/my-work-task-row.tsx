"use client";

import {
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { TaskStatusBadge } from "@/components/status-badge";
import { TaskSubtasksList } from "@/components/task-subtasks-list";
import { isTaskOverdue } from "@/lib/constants";
import { getVnDateString } from "@/lib/dates";
import { parseSavedAiQcResult } from "@/lib/gemini-shared";
import { TASK_NATURE_META } from "@/lib/report-grouping";
import { normalizeSubtasks } from "@/lib/subtasks";
import { canUserDeleteTask } from "@/lib/task-delete";
import type { SimpleUser, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

function getVnTimeShort(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function isCompletedTaskStatus(status: string): boolean {
  return (
    status === "DONE" || status === "PUBLISHED" || status === "APPROVED_FINAL"
  );
}

interface MyWorkTaskRowProps {
  task: TaskItem;
  users: SimpleUser[];
  todayDate: string;
  currentUserId: string;
  currentUserRole: UserRole;
  isRequestedTab: boolean;
  expanded: boolean;
  openSubtaskComposerId: string | null;
  togglingTaskId: string | null;
  allowMoveToday?: boolean;
  onToggleExpand: (task: TaskItem) => void;
  onToggleDone: (task: TaskItem) => void;
  onSubmitForReview?: (task: TaskItem) => void;
  onOpenTask: (taskId: string) => void;
  onOpenSubtaskComposer: (task: TaskItem) => void;
  onComposerOpenChange: (taskId: string, open: boolean) => void;
  onMoveToday: (task: TaskItem) => void;
  onRequestDelete: (task: TaskItem) => void;
  onTaskUpdated: (updated: TaskItem) => void;
}

export function MyWorkTaskRow({
  task: t,
  users,
  todayDate,
  currentUserId,
  currentUserRole,
  isRequestedTab,
  expanded,
  openSubtaskComposerId,
  togglingTaskId,
  allowMoveToday = false,
  onToggleExpand,
  onToggleDone,
  onSubmitForReview,
  onOpenTask,
  onOpenSubtaskComposer,
  onComposerOpenChange,
  onMoveToday,
  onRequestDelete,
  onTaskUpdated,
}: MyWorkTaskRowProps) {
  const subtasks = normalizeSubtasks(t.subtasksJson);
  const doneSubCount = subtasks.filter((s) => s.done).length;
  const isCompleted = isCompletedTaskStatus(t.status);
  const overdue = isTaskOverdue(t);
  const refDate = t.dueAt ?? t.scheduledPublishAt;
  const dateLabel = refDate ? getVnDateString(new Date(refDate)) : null;
  const timeLabel = getVnTimeShort(refDate);
  const savedAi = parseSavedAiQcResult(t.lastAiQcJson);

  return (
    <div className="border-b border-slate-100 last:border-b-0 py-2 transition">
      <div className="group flex items-start gap-2 rounded-xl px-1.5 py-1.5 hover:bg-amber-50/40 transition">
        <button
          type="button"
          onClick={() => onToggleExpand(t)}
          className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer shrink-0"
          title={expanded ? "Thu gọn chi tiết đầu việc" : "Mở chi tiết đầu việc"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          disabled={togglingTaskId === t.id}
          onClick={() => onToggleDone(t)}
          className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : overdue
                ? "border-rose-400 hover:border-rose-600 bg-white"
                : "border-slate-400 hover:border-emerald-500 bg-white"
          }`}
          title={isCompleted ? "Mở lại việc" : "Đánh dấu hoàn tất"}
        >
          {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenTask(t.id)}
              className={`text-left text-sm font-semibold hover:text-sky-700 transition cursor-pointer ${
                isCompleted ? "line-through text-slate-400" : "text-slate-900"
              }`}
            >
              {t.title}
            </button>

            <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
              {onSubmitForReview &&
                currentUserRole !== "LEADER" &&
                (t.status === "IN_PROGRESS" || t.status === "REVISION_NEEDED") &&
                [
                  "CONTENT_SOCIAL",
                  "CONTENT_ADS",
                  "CONTENT_WEB",
                  "MEDIA_IMAGE",
                  "MEDIA_VIDEO",
                ].includes(t.taskType) && (
                  <button
                    type="button"
                    disabled={togglingTaskId === t.id}
                    onClick={() => onSubmitForReview(t)}
                    title="Gửi task lên hàng đợi Leader duyệt QC"
                    className="rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 px-2 py-0.5 text-[11px] font-bold text-sky-700 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    Gửi duyệt
                  </button>
                )}
              <button
                type="button"
                onClick={() => onOpenSubtaskComposer(t)}
                className="rounded-lg border border-slate-200 bg-white hover:border-sky-300 hover:text-sky-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Chi tiết đầu việc
              </button>
              {allowMoveToday && (
                <button
                  type="button"
                  onClick={() => onMoveToday(t)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 cursor-pointer"
                >
                  Về hôm nay
                </button>
              )}
              {canUserDeleteTask(t, currentUserId, currentUserRole) && (
                <button
                  type="button"
                  onClick={() => onRequestDelete(t)}
                  title="Xóa vào thùng rác"
                  className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 inline-flex items-center cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px]">
            {dateLabel && (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  overdue
                    ? "text-rose-600"
                    : dateLabel === todayDate
                      ? "text-emerald-700"
                      : "text-slate-500"
                }`}
              >
                <Calendar className="w-3 h-3" />
                {dateLabel === todayDate
                  ? "Hôm nay"
                  : `${dateLabel.slice(8, 10)}/${dateLabel.slice(5, 7)}`}
                {timeLabel ? ` ${timeLabel}` : ""}
              </span>
            )}

            {subtasks.length > 0 && (
              <button
                type="button"
                onClick={() => onToggleExpand(t)}
                className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <GitBranch className="w-3 h-3" />
                {doneSubCount}/{subtasks.length}
              </button>
            )}

            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: t.project.color }}
              />
              {t.project.name}
            </span>

            {(t.platform || t.publishChannel) && (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-semibold text-slate-700">
                {t.platform && <PlatformLogo platform={t.platform} size="xs" />}
                <span className="truncate max-w-[140px]">
                  {t.publishChannel || t.platform}
                </span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${
                t.isMediaOrder
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-sky-200/80 bg-sky-50/70 text-sky-800"
              }`}
            >
              {t.quantity || 1} {TASK_NATURE_META[t.taskType]?.unit || "việc"}
            </span>

            {savedAi && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-extrabold ${
                  savedAi.result.score >= 80
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : savedAi.result.score >= 60
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <Bot className="w-2.5 h-2.5" />
                {savedAi.result.score}đ
              </span>
            )}

            <TaskStatusBadge status={t.status} />

            {isRequestedTab && t.assignee && (
              <span className="text-[11px] font-semibold text-sky-700">
                → {t.assignee.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <TaskSubtasksList
          task={t}
          users={users}
          currentUserRole={currentUserRole}
          onTaskUpdated={onTaskUpdated}
          composerOpen={openSubtaskComposerId === t.id}
          onComposerOpenChange={(open) => onComposerOpenChange(t.id, open)}
        />
      )}
    </div>
  );
}
