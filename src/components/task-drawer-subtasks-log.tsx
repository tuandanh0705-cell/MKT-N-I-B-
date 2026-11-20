"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { TaskSubtasksList } from "@/components/task-subtasks-list";
import { formatVnDateTime } from "@/lib/dates";
import { QC_CRITERIA } from "@/lib/qc-standards";
import { normalizeSubtasks } from "@/lib/subtasks";
import type { SimpleUser, TaskItem } from "@/types/crm";

interface TaskDrawerSubtasksLogProps {
  task: TaskItem;
  users: SimpleUser[];
  saving: boolean;
  onTaskUpdated: (updated: TaskItem) => void;
  onSendComment: (content: string) => Promise<void>;
}

export function TaskDrawerSubtasksLog({
  task,
  users,
  saving,
  onTaskUpdated,
  onSendComment,
}: TaskDrawerSubtasksLogProps) {
  const [commentText, setCommentText] = useState("");
  const [showHistory, setShowHistory] = useState(true);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    await onSendComment(text);
  }

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

      {/* Trao đổi & Phản hồi */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Trao đổi &amp; Phản hồi ({task.comments?.length ?? 0})
        </h3>
        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {(task.comments ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Chưa có bình luận nào.
            </p>
          ) : (
            (task.comments ?? []).map((c) => {
              const flags = Array.isArray(c.qcFlagsJson)
                ? (c.qcFlagsJson as string[])
                : [];
              return (
                <div
                  key={c.id}
                  className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                      <PirateAvatar
                        name={c.author.name}
                        color={c.author.avatarColor}
                        scope={c.author.role === "LEADER" ? "LEADER" : "CONTENT"}
                        pirateCharacter={c.author.pirateCharacter}
                        size="sm"
                      />
                      <span>
                        {c.author.name}{" "}
                        {c.author.role === "LEADER" && (
                          <span className="ml-1 rounded bg-[#0B2545] text-amber-300 px-1.5 py-0.5 text-[10px]">
                            👒 Thuyền trưởng
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatVnDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line">{c.content}</p>
                  {flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {flags.map((code) => {
                        const info = QC_CRITERIA.find((q) => q.code === code);
                        return (
                          <span
                            key={code}
                            className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {code}
                            {info ? `: ${info.group}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Nhắn trao đổi trực tiếp trên thẻ công việc..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving || !commentText.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
          >
            Gửi
          </button>
        </form>
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
