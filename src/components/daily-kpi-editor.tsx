"use client";

import { Plus, Trash2 } from "lucide-react";
import { TASK_NATURE_META } from "@/lib/report-grouping";
import type { DailyKpiItem } from "@/lib/daily-kpi";
import type { SimpleProject } from "@/types/crm";
import type { TaskType } from "@/generated/prisma/client";

const ALL_TASK_TYPES = Object.keys(TASK_NATURE_META) as TaskType[];

interface DailyKpiTargetEditorProps {
  items: DailyKpiItem[];
  projects?: SimpleProject[];
  onChange: (next: DailyKpiItem[]) => void;
}

export function DailyKpiTargetEditor({
  items,
  projects = [],
  onChange,
}: DailyKpiTargetEditorProps) {
  function updateRow(idx: number, patch: Partial<DailyKpiItem>) {
    onChange(items.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function removeRow(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function addRow() {
    const newId = `kpi-${Date.now().toString(36)}-${items.length + 1}`;
    onChange([
      ...items,
      {
        id: newId,
        title: "Viết bài Content Facebook",
        taskType: "CONTENT_SOCIAL",
        target: 1,
        ...(projects[0] ? { projectId: projects[0].id } : {}),
      },
    ]);
  }

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          Chưa có đầu việc KPI hàng ngày nào — bấm &ldquo;+ Thêm đầu việc KPI&rdquo; để khai báo (vd: Viết bài Content Facebook, Kịch bản TVC, Bài SEO Web...).
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((row, idx) => {
            const meta = TASK_NATURE_META[row.taskType];
            return (
              <div
                key={row.id || idx}
                className="rounded-xl border border-slate-200 bg-slate-50/75 p-2.5 space-y-2"
              >
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateRow(idx, { title: e.target.value })}
                    placeholder="Tên đầu việc KPI (vd: Viết bài Content Facebook, Kịch bản TVC...)"
                    className="flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                  />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500">
                      SL:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={row.target}
                      onChange={(e) =>
                        updateRow(idx, {
                          target: Math.max(1, Number(e.target.value || 1)),
                        })
                      }
                      className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-extrabold text-slate-900 text-center"
                    />
                    <span className="text-[11px] font-semibold text-slate-500 min-w-[52px]">
                      {meta?.unit || "việc"}/ngày
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Xóa đầu việc KPI này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <select
                    value={row.taskType}
                    onChange={(e) =>
                      updateRow(idx, { taskType: e.target.value as TaskType })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700"
                    title="Loại việc để thống kê KPI & Báo cáo"
                  >
                    {ALL_TASK_TYPES.map((tt) => (
                      <option key={tt} value={tt}>
                        Loại: {TASK_NATURE_META[tt].label}
                      </option>
                    ))}
                  </select>

                  {projects.length > 0 && (
                    <select
                      value={row.projectId || ""}
                      onChange={(e) =>
                        updateRow(idx, {
                          projectId: e.target.value || null,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 max-w-[220px]"
                      title="Dự án mặc định khi đẩy sang To-Do List"
                    >
                      <option value="">Dự án: Tự lấy dự án đầu tiên</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          Dự án: {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm đầu việc KPI/ngày
      </button>
    </div>
  );
}
