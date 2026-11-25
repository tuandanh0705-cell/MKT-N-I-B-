"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { TaskSubtasksList } from "@/components/task-subtasks-list";
import { formatVnDateTime } from "@/lib/dates";
import { normalizeSubtasks } from "@/lib/subtasks";
import type { SimpleUser, TaskItem } from "@/types/crm";

interface TaskDrawerSubtasksLogProps {
  task: TaskItem;
  users: SimpleUser[];
  onTaskUpdated: (updated: TaskItem) => void;
}

export function TaskDrawerSubtasksLog({
  task,
  users,
  onTaskUpdated,
}: TaskDrawerSubtasksLogProps) {
  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="space-y-4">
      {/* Subtasks */}
      <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Chi tiết đầu việc (
            {normalizeSubtasks(task.subtasksJson).filter((s) => s.done).length}/
            {normalizeSubtasks(task.subtasksJson).length})
          </span>
        </div>
        <TaskSubtasksList
          task={task}
          users={users}
          compact={false}
          onTaskUpdated={onTaskUpdated}
        />
      </div>

      {/* Lịch sử chỉnh sửa (Audit Log) */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
            <History className="w-4 h-4 text-amber-600" />
            Lịch sử chỉnh sửa ({task.activityLogs?.length ?? 0})
          </span>
          <span className="text-xs font-semibold text-blue-600">
            {showHistory ? "Thu gọn" : "Mở xem"}
          </span>
        </button>

        {showHistory && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(task.activityLogs ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Chưa ghi nhận thay đổi nào.
              </p>
            ) : (
              (task.activityLogs ?? []).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl bg-white border border-slate-200 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {log.actor?.name || "Hệ thống"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatVnDateTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="text-slate-700">{log.summary}</div>
                  {Array.isArray(log.changesJson) && log.changesJson.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      {log.changesJson.map((ch, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] bg-slate-50 rounded px-2 py-1 flex flex-wrap items-center gap-1"
                        >
                          <span className="font-semibold text-slate-700">
                            {ch.label}:
                          </span>
                          <span className="line-through text-rose-600">
                            {ch.before}
                          </span>
                          <span>→</span>
                          <span className="font-semibold text-emerald-700">
                            {ch.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
