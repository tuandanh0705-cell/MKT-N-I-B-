"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Inbox,
  MessageSquare,
  Pin,
  Wrench,
} from "lucide-react";
import { TaskAssigneesBadges } from "@/components/task-assignees-badges";
import { TaskStatusBadge } from "@/components/status-badge";
import { isCompletedTaskStatus } from "@/components/my-work-task-row";
import { isTaskOverdue } from "@/lib/constants";
import { getVnDateString } from "@/lib/dates";
import { TASK_NATURE_META } from "@/lib/report-grouping";
import { normalizeSubtasks } from "@/lib/subtasks";
import { formatTaskAssigneesLabel, getTaskAssignees } from "@/lib/task-assignees";
import type { TaskItem } from "@/types/crm";

function formatShortDue(input: string | Date | null | undefined, todayDate: string): string {
  if (!input) return "Chưa đặt hạn";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "Chưa đặt hạn";
  const ymd = getVnDateString(d);
  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  if (ymd === todayDate) return `Hôm nay ${time}`;
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)} ${time}`;
}

export function getTaskSourceLabel(
  task: TaskItem,
  currentUserId: string
): { label: string; badgeClass: string } | null {
  if (task.requester.id === currentUserId) return null;
  if (task.isOutsideDepartment) {
    return {
      label: `📋 Ngoài team${task.externalSenderName ? `: ${task.externalSenderName}` : ""}`,
      badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
    };
  }
  if (task.isMediaOrder) {
    return {
      label: `📦 Order từ ${task.requester.name}`,
      badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
    };
  }
  if (task.requester.role === "LEADER") {
    return {
      label: `👑 Leader giao`,
      badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
    };
  }
  return {
    label: `🤝 ${task.requester.name} giao`,
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
  };
}

interface MyWorkActionTrayProps {
  todayDate: string;
  currentUserId: string;
  revisionTasks: TaskItem[];
  overdueOrCarryoverTasks: TaskItem[];
  incomingTasks: TaskItem[];
  busyTaskId: string | null;
  bringingAll: boolean;
  onPlanForToday: (task: TaskItem) => void;
  onBringAllOverdueToToday: () => void;
  onOpenTask: (taskId: string, openChat?: boolean) => void;
}

type TrayFilter = "ALL" | "REVISION" | "OVERDUE" | "INCOMING";

export function MyWorkActionTray({
  todayDate,
  currentUserId,
  revisionTasks,
  overdueOrCarryoverTasks,
  incomingTasks,
  busyTaskId,
  bringingAll,
  onPlanForToday,
  onBringAllOverdueToToday,
  onOpenTask,
}: MyWorkActionTrayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<TrayFilter>("ALL");
  const [showAllItems, setShowAllItems] = useState(false);

  const totalCount =
    revisionTasks.length + overdueOrCarryoverTasks.length + incomingTasks.length;

  const combinedItems = useMemo(() => {
    const rev = revisionTasks.map((t) => ({ task: t, kind: "REVISION" as const }));
    const ov = overdueOrCarryoverTasks.map((t) => ({
      task: t,
      kind: "OVERDUE" as const,
    }));
    const inc = incomingTasks.map((t) => ({ task: t, kind: "INCOMING" as const }));

    if (filter === "REVISION") return rev;
    if (filter === "OVERDUE") return ov;
    if (filter === "INCOMING") return inc;
    return [...rev, ...ov, ...inc];
  }, [revisionTasks, overdueOrCarryoverTasks, incomingTasks, filter]);

  if (totalCount === 0) return null;

  const visibleItems = showAllItems ? combinedItems : combinedItems.slice(0, 5);
  const hiddenCount = combinedItems.length - visibleItems.length;

  return (
    <div className="rounded-2xl border-2 border-sky-200/90 bg-gradient-to-br from-sky-50/60 via-white to-amber-50/40 p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-2 text-left cursor-pointer"
        >
          <span className="w-7 h-7 rounded-lg bg-[#0B2545] text-amber-300 inline-flex items-center justify-center shrink-0">
            <Inbox className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                Việc mới nhận &amp; Cần xử lý ({totalCount})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  collapsed ? "-rotate-90" : ""
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Order mới (kể cả hạn vài ngày tới), bài cần sửa &amp; việc tồn — bấm{" "}
              <strong>Làm hôm nay</strong> để đưa vào To-Do mà vẫn giữ nguyên Deadline gốc.
            </p>
          </div>
        </button>

        {overdueOrCarryoverTasks.length > 0 && (
          <button
            type="button"
            disabled={bringingAll}
            onClick={onBringAllOverdueToToday}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-3 py-1.5 text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Pin className="w-3.5 h-3.5" />
            {bringingAll
              ? "Đang chuyển..."
              : `Đưa ${overdueOrCarryoverTasks.length} việc tồn về Hôm nay`}
          </button>
        )}
      </div>

      {/* Bộ lọc nhanh theo mức ưu tiên */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setFilter("ALL");
            setCollapsed(false);
          }}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer ${
            filter === "ALL"
              ? "bg-[#0B2545] text-amber-300 border-[#0B2545]"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Tất cả ({totalCount})
        </button>

        {revisionTasks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilter("REVISION");
              setCollapsed(false);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border inline-flex items-center gap-1 transition cursor-pointer ${
              filter === "REVISION"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            <Wrench className="w-3 h-3" />
            Cần sửa ({revisionTasks.length})
          </button>
        )}

        {overdueOrCarryoverTasks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilter("OVERDUE");
              setCollapsed(false);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border inline-flex items-center gap-1 transition cursor-pointer ${
              filter === "OVERDUE"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Quá hạn / Tồn ({overdueOrCarryoverTasks.length})
          </button>
        )}

        {incomingTasks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilter("INCOMING");
              setCollapsed(false);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border inline-flex items-center gap-1 transition cursor-pointer ${
              filter === "INCOMING"
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
            }`}
          >
            <CalendarClock className="w-3 h-3" />
            Việc mới / Order sắp tới ({incomingTasks.length})
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {visibleItems.map(({ task: t, kind }) => {
            const source = getTaskSourceLabel(t, currentUserId);
            const alreadyPlannedToday = t.plannedDate === todayDate;
            const dueText = formatShortDue(t.dueAt ?? t.scheduledPublishAt, todayDate);
            const overdue = isTaskOverdue(t);
            const commentCount = t._count?.comments ?? t.comments?.length ?? 0;

            return (
              <div
                key={`${kind}-${t.id}`}
                className={`rounded-xl border bg-white px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5 transition ${
                  kind === "REVISION"
                    ? "border-rose-200 bg-rose-50/35"
                    : kind === "OVERDUE"
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-slate-200 hover:border-sky-300"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {kind === "REVISION" && (
                      <span className="rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-extrabold">
                        🔧 Cần sửa
                      </span>
                    )}
                    {kind === "OVERDUE" && (
                      <span className="rounded-md bg-amber-600 text-white px-1.5 py-0.5 text-[10px] font-extrabold">
                        {overdue ? "🔥 Quá hạn" : "⏳ Tồn từ hôm trước"}
                      </span>
                    )}
                    {source && (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${source.badgeClass}`}
                      >
                        {source.label}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenTask(t.id)}
                      className="text-left text-xs sm:text-sm font-bold text-slate-900 hover:text-sky-700 truncate cursor-pointer"
                    >
                      {t.title}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: t.project.color }}
                      />
                      {t.project.name}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                      {t.quantity || 1} {TASK_NATURE_META[t.taskType]?.unit || "việc"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        overdue ? "text-rose-600" : "text-slate-600"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      Hạn: {dueText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenTask(t.id, true)}
                    title="Mở Chat & Feedback ngay trong task"
                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                      commentCount > 0
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {commentCount > 0 ? commentCount : "Chat"}
                  </button>

                  {!alreadyPlannedToday && (
                    <button
                      type="button"
                      disabled={busyTaskId === t.id}
                      onClick={() => onPlanForToday(t)}
                      className="rounded-lg bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-50 text-amber-300 px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Pin className="w-3 h-3" />
                      Làm hôm nay
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllItems(true)}
              className="w-full rounded-xl border border-dashed border-sky-300 bg-white/70 hover:bg-white py-1.5 text-xs font-bold text-sky-700 cursor-pointer"
            >
              Xem thêm {hiddenCount} đầu việc khác...
            </button>
          )}
          {showAllItems && combinedItems.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllItems(false)}
              className="w-full py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Thu gọn bớt
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface MyWorkDelegatedTrackerProps {
  tasks: TaskItem[];
  todayDate: string;
  remindingTaskId: string | null;
  onRemindTask: (task: TaskItem) => void;
  onOpenTask: (taskId: string, openChat?: boolean) => void;
}

type DelegatedFilter = "ACTIVE" | "ATTENTION" | "WAITING" | "DONE" | "ALL";

export function MyWorkDelegatedTracker({
  tasks,
  todayDate,
  remindingTaskId,
  onRemindTask,
  onOpenTask,
}: MyWorkDelegatedTrackerProps) {
  const [filter, setFilter] = useState<DelegatedFilter>("ACTIVE");

  const counts = useMemo(() => {
    let active = 0;
    let attention = 0;
    let waiting = 0;
    let done = 0;
    for (const t of tasks) {
      if (isCompletedTaskStatus(t.status)) {
        done += 1;
      } else {
        active += 1;
        if (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") {
          waiting += 1;
        }
        if (t.status === "REVISION_NEEDED" || isTaskOverdue(t)) {
          attention += 1;
        }
      }
    }
    return { active, attention, waiting, done, all: tasks.length };
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        const done = isCompletedTaskStatus(t.status);
        if (filter === "ACTIVE") return !done;
        if (filter === "ATTENTION") {
          return !done && (t.status === "REVISION_NEEDED" || isTaskOverdue(t));
        }
        if (filter === "WAITING") {
          return t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW";
        }
        if (filter === "DONE") return done;
        return true;
      })
      .sort((a, b) => {
        const aDone = isCompletedTaskStatus(a.status) ? 1 : 0;
        const bDone = isCompletedTaskStatus(b.status) ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
  }, [tasks, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["ACTIVE", `Đang theo dõi (${counts.active})`],
              ["ATTENTION", `Cần sửa / Quá hạn (${counts.attention})`],
              ["WAITING", `Chờ Leader duyệt (${counts.waiting})`],
              ["DONE", `Đã xong (${counts.done})`],
              ["ALL", `Tất cả (${counts.all})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer ${
                filter === key
                  ? "bg-[#0B2545] text-amber-300 border-[#0B2545]"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-xs text-slate-500">
          Chưa có đầu việc / Order nào bạn đã giao ở trạng thái này.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filtered.map((t) => {
            const overdue = isTaskOverdue(t);
            const done = isCompletedTaskStatus(t.status);
            const subtasks = normalizeSubtasks(t.subtasksJson);
            const doneSubs = subtasks.filter((s) => s.done).length;
            const commentCount = t._count?.comments ?? t.comments?.length ?? 0;

            return (
              <div
                key={t.id}
                className={`p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50/30 transition ${
                  overdue ? "bg-rose-50/25" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {t.code}
                    </span>
                    {t.isMediaOrder && (
                      <span className="rounded-md bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-800">
                        📦 Order Media
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenTask(t.id)}
                      className={`text-left text-sm font-bold hover:text-sky-700 cursor-pointer ${
                        done ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {t.title}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600">
                    {getTaskAssignees(t).length > 0 ? (
                      <TaskAssigneesBadges
                        task={t}
                        size="sm"
                        prefix="Giao cho:"
                      />
                    ) : (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-bold text-amber-800">
                        ⚠️ Chưa gán người làm
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-semibold">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: t.project.color }}
                      />
                      {t.project.name}
                    </span>

                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                      {t.quantity || 1} {TASK_NATURE_META[t.taskType]?.unit || "việc"}
                    </span>

                    {subtasks.length > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {doneSubs}/{subtasks.length} mục nhỏ
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        overdue ? "text-rose-600" : "text-slate-600"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      Hạn: {formatShortDue(t.dueAt ?? t.scheduledPublishAt, todayDate)}
                    </span>

                    <TaskStatusBadge status={t.status} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenTask(t.id, true)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                      commentCount > 0
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Feedback {commentCount > 0 ? `(${commentCount})` : ""}
                  </button>

                  {!done && getTaskAssignees(t).length > 0 && (
                    <button
                      type="button"
                      disabled={remindingTaskId === t.id}
                      onClick={() => onRemindTask(t)}
                      title={`Nhắc ${formatTaskAssigneesLabel(t)} cập nhật tiến độ`}
                      className="rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-sky-800 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {remindingTaskId === t.id ? "Đang nhắc..." : "Nhắc"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
