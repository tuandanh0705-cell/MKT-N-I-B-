import { PRIORITY_META, TASK_STATUS_META, TASK_TYPE_META } from "@/lib/constants";
import type { TaskPriority, TaskStatus, TaskType } from "@/generated/prisma/client";

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = TASK_STATUS_META[status] ?? TASK_STATUS_META.DRAFT;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.NORMAL;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
}

export function TaskTypeBadge({ taskType }: { taskType: TaskType }) {
  const meta = TASK_TYPE_META[taskType] ?? TASK_TYPE_META.OTHER;
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      {meta.label}
    </span>
  );
}
