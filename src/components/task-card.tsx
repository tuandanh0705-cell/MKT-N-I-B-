"use client";

import { Calendar, ExternalLink, RotateCcw } from "lucide-react";
import { TaskStatusBadge } from "@/components/status-badge";
import { PirateAvatar } from "@/components/pirate-art";
import { PlatformLogo } from "@/components/platform-logo";
import { TASK_TYPE_META, isTaskOverdue } from "@/lib/constants";
import { getPlatformChannelMeta } from "@/lib/platform-meta";
import { formatVnDateTime } from "@/lib/dates";
import type { TaskItem } from "@/types/crm";

interface TaskCardProps {
  task: TaskItem;
  showProjectBadge?: boolean;
  onSelect: (task: TaskItem) => void;
}

export function TaskCard({
  task,
  showProjectBadge = true,
  onSelect,
}: TaskCardProps) {
  const latestAsset = task.assets[0];
  const overdue = isTaskOverdue(task);
  const typeLabel = TASK_TYPE_META[task.taskType]?.label || "Nhiệm vụ";

  return (
    <div
      onClick={() => onSelect(task)}
      className={`group rounded-2xl border-2 p-4 transition duration-150 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between gap-3 ${
        overdue
          ? "bg-rose-50/40 border-rose-300 hover:border-rose-500"
          : "bg-white border-amber-200/80 hover:border-sky-400 hover:shadow-md"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500">
            <span className="font-mono font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-md shrink-0">
              {task.code}
            </span>
            {showProjectBadge && (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: task.project.color }}
                />
                <span className="truncate font-medium text-slate-600">
                  {task.project.name}
                </span>
              </>
            )}
          </div>
          <div className="shrink-0">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition leading-snug line-clamp-2">
          {task.title}
        </h3>

        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <PlatformLogo platform={task.platform} size="xs" />
            <span>
              {typeLabel}
              {task.publishChannel
                ? ` • ${task.publishChannel}`
                : ` • ${getPlatformChannelMeta(task.platform).displayLabel}`}
              {task.isMediaOrder
                ? ` • ${task.quantity} ${task.taskType === "MEDIA_VIDEO" ? "video" : "ảnh"}`
                : ""}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            {overdue && (
              <span className="rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-bold">
                🌊 Trễ hạn
              </span>
            )}
            {!overdue && (task.isRushOrder || task.priority === "URGENT") && (
              <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                ⚡ Gấp
              </span>
            )}
            {task.revisionCount > 0 && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  task.revisionCount >= task.maxRevisions
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                {task.revisionCount}/{task.maxRevisions}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2.5 border-t border-amber-100 flex items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2 min-w-0">
          {task.assignee ? (
            <>
              <PirateAvatar
                name={task.assignee.name}
                color={task.assignee.avatarColor}
                scope={task.assignee.departmentScope}
                pirateCharacter={task.assignee.pirateCharacter}
                size="sm"
              />
              <span className="truncate font-semibold text-slate-700">
                {task.assignee.name}
              </span>
            </>
          ) : (
            <span className="text-slate-400 italic">Chưa phân công</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {latestAsset && (
            <a
              href={latestAsset.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sky-600 hover:underline font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              Link
            </a>
          )}
          <span
            className={`inline-flex items-center gap-1 ${
              overdue ? "text-rose-600 font-bold" : ""
            }`}
          >
            <Calendar className="w-3 h-3" />
            {formatVnDateTime(task.dueAt ?? task.scheduledPublishAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
