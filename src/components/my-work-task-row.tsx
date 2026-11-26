"use client";

import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  MessageSquare,
  Pin,
  Plus,
  Rocket,
  Send,
  Trash2,
} from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { TaskStatusBadge } from "@/components/status-badge";
import { TaskSubtasksList } from "@/components/task-subtasks-list";
import { getTaskSourceLabel } from "@/components/my-work-action-tray";
import {
  isTaskOverdue,
  taskRequiresLeaderApproval,
} from "@/lib/constants";
import { getVnDateString } from "@/lib/dates";
import { parseSavedAiQcResult } from "@/lib/gemini-shared";
import { TASK_NATURE_META } from "@/lib/report-grouping";
import { normalizeSubtasks } from "@/lib/subtasks";
import { formatTaskAssigneesLabel, getTaskAssignees } from "@/lib/task-assignees";
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

/**
 * Chỉ đánh dấu hoàn thành (gạch ngang) khi công việc thực sự đã xong (DONE / PUBLISHED).
 * APPROVED_FINAL vẫn hiển thị nổi để nhân sự bấm Đã đăng / Hoàn tất nốt bước cuối.
 */
export function isCompletedTaskStatus(status: string): boolean {
  return status === "DONE" || status === "PUBLISHED";
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
  allowMoveTomorrow?: boolean;
  onToggleExpand: (task: TaskItem) => void;
  onToggleDone: (task: TaskItem) => void;
  onMarkPublished?: (task: TaskItem) => void;
  onSubmitForReview?: (task: TaskItem) => void;
  onOpenTask: (taskId: string, openChat?: boolean) => void;
  onOpenSubtaskComposer: (task: TaskItem) => void;
  onComposerOpenChange: (taskId: string, open: boolean) => void;
  onMoveToday: (task: TaskItem) => void;
  onMoveTomorrow?: (task: TaskItem) => void;
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
  allowMoveTomorrow = false,
  onToggleExpand,
  onToggleDone,
  onMarkPublished,
  onSubmitForReview,
  onOpenTask,
  onOpenSubtaskComposer,
  onComposerOpenChange,
  onMoveToday,
  onMoveTomorrow,
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
  const sourceBadge = !isRequestedTab
    ? getTaskSourceLabel(t, currentUserId)
    : null;
  const commentCount = t._count?.comments ?? t.comments?.length ?? 0;

  // A4: Bài Content / Ảnh / Video / Order Media của Member phải gửi Leader duyệt trước khi Done
  const requiresApproval =
    currentUserRole !== "LEADER" && taskRequiresLeaderApproval(t);
  const canDirectComplete =
    !requiresApproval || t.status === "APPROVED_FINAL" || isCompleted;
  const isWaitingApproval = t.status === "WAITING_APPROVAL";
  const canSubmitReview =
    Boolean(onSubmitForReview) &&
    currentUserRole !== "LEADER" &&
    requiresApproval &&
    (t.status === "IN_PROGRESS" ||
      t.status === "REVISION_NEEDED" ||
      t.status === "DRAFT" ||
      t.status === "BRIEF_REVIEW");

  const plannedDifferentFromDue =
    Boolean(t.plannedDate) && Boolean(dateLabel) && t.plannedDate !== dateLabel;

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

        {/* Cột trái: Checkbox Done (chỉ cho task nội bộ / Leader / đã duyệt Final) HOẶC nút Gửi duyệt / Chờ duyệt */}
        {canDirectComplete ? (
          <button
            type="button"
            disabled={togglingTaskId === t.id}
            onClick={() => onToggleDone(t)}
            className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
              isCompleted
                ? "bg-emerald-500 border-emerald-500 text-white"
                : t.status === "APPROVED_FINAL"
                  ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                  : overdue
                    ? "border-rose-400 hover:border-rose-600 bg-white"
                    : "border-slate-400 hover:border-emerald-500 bg-white"
            }`}
            title={
              isCompleted
                ? "Mở lại việc"
                : t.status === "APPROVED_FINAL"
                  ? "Đã được Leader duyệt Final — bấm để đánh dấu Hoàn tất"
                  : "Đánh dấu hoàn tất"
            }
          >
            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        ) : isWaitingApproval ? (
          <span
            title="Đã gửi Leader duyệt — đang chờ phản hồi"
            className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-violet-400 bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"
          >
            <Clock className="w-2.5 h-2.5" />
          </span>
        ) : (
          <button
            type="button"
            disabled={togglingTaskId === t.id}
            onClick={() => onSubmitForReview?.(t)}
            title="Bài Content / Ấn phẩm cần gửi Leader duyệt — bấm để Gửi duyệt"
            className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
              t.status === "REVISION_NEEDED"
                ? "border-rose-500 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border-sky-400 bg-sky-50 text-sky-600 hover:bg-sky-100"
            }`}
          >
            <Send className="w-2.5 h-2.5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {sourceBadge && (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${sourceBadge.badgeClass}`}
                >
                  {sourceBadge.label}
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpenTask(t.id)}
                className={`text-left text-sm font-semibold hover:text-sky-700 transition cursor-pointer ${
                  isCompleted ? "line-through text-slate-400" : "text-slate-900"
                }`}
              >
                {t.title}
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Nút hành động chính luôn hiển thị rõ cho bài cần duyệt / đã duyệt Final */}
              {canSubmitReview && (
                <button
                  type="button"
                  disabled={togglingTaskId === t.id}
                  onClick={() => onSubmitForReview?.(t)}
                  title="Nộp thành phẩm lên hàng đợi Leader duyệt QC"
                  className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  {t.status === "REVISION_NEEDED" ? "Gửi duyệt lại" : "Gửi duyệt"}
                </button>
              )}

              {t.status === "APPROVED_FINAL" && onMarkPublished && (
                <button
                  type="button"
                  disabled={togglingTaskId === t.id}
                  onClick={() => onMarkPublished(t)}
                  title="Đánh dấu bài đã đăng / hoàn tất phát hành"
                  className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Rocket className="w-3 h-3" />
                  Đã đăng
                </button>
              )}

              {/* Chat & Feedback trực tiếp trong task */}
              <button
                type="button"
                onClick={() => onOpenTask(t.id, true)}
                title="Mở Chat & Feedback trực tiếp trong công việc này"
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                  commentCount > 0
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-800 sm:opacity-0 sm:group-hover:opacity-100"
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                {commentCount > 0 ? commentCount : "Chat"}
              </button>

              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => onOpenSubtaskComposer(t)}
                  className="rounded-lg border border-slate-200 bg-white hover:border-sky-300 hover:text-sky-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Việc nhỏ
                </button>

                {allowMoveToday && (
                  <button
                    type="button"
                    disabled={togglingTaskId === t.id}
                    onClick={() => onMoveToday(t)}
                    title="Đưa vào kế hoạch làm Hôm nay (giữ nguyên hạn gốc)"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pin className="w-3 h-3" />
                    Làm hôm nay
                  </button>
                )}

                {allowMoveTomorrow && !isCompleted && onMoveTomorrow && (
                  <button
                    type="button"
                    disabled={togglingTaskId === t.id}
                    onClick={() => onMoveTomorrow(t)}
                    title="Chuyển kế hoạch làm sang Ngày mai (không đổi Deadline gốc)"
                    className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Mai
                    <ArrowRight className="w-3 h-3" />
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
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            {plannedDifferentFromDue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-bold text-indigo-700">
                <Pin className="w-2.5 h-2.5" />
                Kế hoạch làm
              </span>
            )}

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
                {plannedDifferentFromDue ? "Hạn: " : ""}
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

            {isRequestedTab && getTaskAssignees(t).length > 0 && (
              <span className="text-[11px] font-semibold text-sky-700">
                → {formatTaskAssigneesLabel(t)}
              </span>
            )}
            {!isRequestedTab && getTaskAssignees(t).length > 1 && (
              <span
                title={`Cùng thực hiện: ${formatTaskAssigneesLabel(t)}`}
                className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800"
              >
                👥 {getTaskAssignees(t).length} người
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
