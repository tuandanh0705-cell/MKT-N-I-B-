"use client";

import { PirateAvatar } from "@/components/pirate-art";
import { getTaskAssignees } from "@/lib/task-assignees";
import type { TaskItem } from "@/types/crm";

interface TaskAssigneesBadgesProps {
  task: Pick<TaskItem, "assignee" | "assignees">;
  size?: "sm" | "md";
  maxVisibleNames?: number;
  emptyLabel?: string;
  prefix?: string;
  className?: string;
}

export function TaskAssigneesBadges({
  task,
  size = "sm",
  maxVisibleNames = 2,
  emptyLabel = "Chưa gán",
  prefix,
  className = "",
}: TaskAssigneesBadgesProps) {
  const assignees = getTaskAssignees(task);

  if (assignees.length === 0) {
    return (
      <span className={`font-semibold text-slate-400 italic ${className}`}>
        {prefix ? `${prefix} ` : ""}
        {emptyLabel}
      </span>
    );
  }

  const allNames = assignees.map((u) => u.name).join(", ");
  const visible = assignees.slice(0, maxVisibleNames);
  const extraCount = assignees.length - visible.length;

  return (
    <div
      title={allNames}
      className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}
    >
      <div className="flex items-center -space-x-1.5 shrink-0">
        {assignees.slice(0, 3).map((u) => (
          <span
            key={u.id}
            className="rounded-full ring-1 ring-white inline-flex"
          >
            <PirateAvatar
              name={u.name}
              color={u.avatarColor}
              scope={u.departmentScope}
              pirateCharacter={u.pirateCharacter}
              size={size}
            />
          </span>
        ))}
      </div>
      <span className="truncate font-semibold text-slate-800">
        {prefix ? `${prefix} ` : ""}
        {visible.map((u) => u.name).join(", ")}
        {extraCount > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-extrabold">
            +{extraCount}
          </span>
        )}
      </span>
    </div>
  );
}
