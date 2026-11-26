"use client";

import { Bot } from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { TaskAssigneesBadges } from "@/components/task-assignees-badges";
import { TaskStatusBadge } from "@/components/status-badge";
import {
  OUTPUT_CATEGORY_META,
  analyzeTaskOutputs,
} from "@/lib/output-helpers";
import type { GeminiQcCheckResponse } from "@/lib/gemini-shared";
import type { TaskItem } from "@/types/crm";

interface OutputsTableViewProps {
  tasks: TaskItem[];
  isLeader: boolean;
  aiCheckingTaskId: string | null;
  quickApprovingId: string | null;
  getAiResultForTask: (task: TaskItem) => GeminiQcCheckResponse | null;
  onInspect: (taskId: string) => void;
  onRunAiCheck: (taskId: string) => void;
  onQuickApprove: (task: TaskItem) => void;
}

export function OutputsTableView({
  tasks,
  isLeader,
  aiCheckingTaskId,
  quickApprovingId,
  getAiResultForTask,
  onInspect,
  onRunAiCheck,
  onQuickApprove,
}: OutputsTableViewProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-sky-200/80 shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] uppercase">
            <th className="py-3 px-4">Nhân viên</th>
            <th className="py-3 px-4">Đầu việc &amp; Dự án</th>
            <th className="py-3 px-4">Loại / SL</th>
            <th className="py-3 px-4">Kênh</th>
            <th className="py-3 px-4">Nội dung Content</th>
            <th className="py-3 px-4">Ấn phẩm / Link</th>
            <th className="py-3 px-4">Điểm AI / Trạng thái</th>
            <th className="py-3 px-4 text-right">Kiểm tra</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => {
            const a = analyzeTaskOutputs(t);
            const catMeta = OUTPUT_CATEGORY_META[a.category];
            const savedAi = getAiResultForTask(t);
            return (
              <tr key={t.id} className="hover:bg-sky-50/40">
                <td className="py-3 px-4 whitespace-nowrap">
                  <TaskAssigneesBadges task={t} size="sm" />
                </td>
                <td className="py-3 px-4 max-w-xs">
                  <div className="font-bold text-slate-900 line-clamp-1">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="font-mono">{t.code}</span>
                    <span>•</span>
                    <span>{t.project.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${catMeta.badgeClass}`}
                  >
                    {catMeta.shortLabel} • {t.quantity} {a.unitLabel}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <PlatformLogo platform={t.platform} size="xs" />
                    <span className="truncate max-w-[110px]">
                      {t.publishChannel || t.platform}
                    </span>
                  </span>
                </td>
                <td className="py-3 px-4 max-w-xs">
                  {a.hasCaption ? (
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                        {(t.caption || "").trim().length} ký tự
                      </span>
                      <span className="text-xs text-slate-600 truncate max-w-[160px]">
                        {t.caption}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">— Chưa có</span>
                  )}
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-xs">
                  {a.deliverableAssets.length > 0 ? (
                    <span className="font-bold text-blue-700">
                      {a.finalAssets.length} Final • {a.demoAssets.length} Demo •{" "}
                      {a.publishedAssets.length} Đăng
                    </span>
                  ) : (
                    <span className="text-slate-400">0 link</span>
                  )}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {savedAi && (
                      <button
                        type="button"
                        onClick={() => onInspect(t.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                          savedAi.result.score >= 80
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : savedAi.result.score >= 60
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        {savedAi.result.score}đ
                      </button>
                    )}
                    <TaskStatusBadge status={t.status} />
                  </div>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onInspect(t.id)}
                      className="rounded-lg bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                    >
                      Check
                    </button>
                    <button
                      type="button"
                      disabled={aiCheckingTaskId === t.id}
                      onClick={() => onRunAiCheck(t.id)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-2 py-1 text-[11px] font-bold cursor-pointer"
                      title="Soi nhanh bằng Google Gemini"
                    >
                      {aiCheckingTaskId === t.id
                        ? "..."
                        : savedAi
                          ? `AI ${savedAi.result.score}đ`
                          : "AI"}
                    </button>
                    {isLeader &&
                      (t.status === "WAITING_APPROVAL" ||
                        t.status === "BRIEF_REVIEW") && (
                        <button
                          type="button"
                          disabled={quickApprovingId === t.id}
                          onClick={() => onQuickApprove(t)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        >
                          Duyệt
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
