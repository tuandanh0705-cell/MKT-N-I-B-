"use client";

import { useState } from "react";
import { CheckCircle2, Plus, RotateCcw, Settings2, Target, X } from "lucide-react";
import { DailyKpiTargetEditor } from "@/components/daily-kpi-editor";
import { useToast } from "@/components/toast-provider";
import type {
  DailyKpiItem,
  DailyKpiProgressRow,
  DailyKpiSummaryResult,
} from "@/lib/daily-kpi";
import type { SimpleProject } from "@/types/crm";
import type { TaskType } from "@/generated/prisma/client";

interface MyWorkDailyKpiPanelProps {
  dayLabel: string;
  dayOffReason?: "SUNDAY" | "LEAVE" | null;
  projects: SimpleProject[];
  targets: DailyKpiItem[];
  isDefaultFallback: boolean;
  kpiSummary: DailyKpiSummaryResult;
  canCreateTasks: boolean;
  onQuickPrefillRow: (
    taskType: TaskType,
    remainingQty: number,
    title: string,
    projectId?: string | null
  ) => void;
  onTargetsSaved: (
    nextItems: DailyKpiItem[],
    isDefaultFallback: boolean
  ) => void;
}

export function MyWorkDailyKpiPanel({
  dayLabel,
  dayOffReason = null,
  projects,
  targets,
  isDefaultFallback,
  kpiSummary,
  canCreateTasks,
  onQuickPrefillRow,
  onTargetsSaved,
}: MyWorkDailyKpiPanelProps) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<DailyKpiItem[]>(targets);
  const [savingConfig, setSavingConfig] = useState(false);

  function openEditor() {
    setDraftItems(targets.map((i) => ({ ...i })));
    setEditing(true);
  }

  async function saveTargets(resetToDefault = false) {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/profile/daily-kpi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resetToDefault
            ? { resetToDefault: true, syncTodayNow: false }
            : { items: draftItems, syncTodayNow: false }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được KPI ngày.", "error");
        return;
      }
      onTargetsSaved(data.items, Boolean(data.isDefaultFallback));
      setEditing(false);
      showToast(
        resetToDefault
          ? "Đã khôi phục chỉ tiêu KPI mặc định theo vai trò!"
          : "Đã lưu chỉ tiêu KPI ngày — hệ thống tự đo theo Task thật & Order của bạn!"
      );
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSavingConfig(false);
    }
  }

  const badgeClass = kpiSummary.allDoneMet
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : kpiSummary.allPlannedMet
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/55 via-white to-sky-50/40 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900">
            <Target className="w-4 h-4 text-rose-500" />
            KPI ngày {dayLabel}
          </span>
          {dayOffReason && kpiSummary.totalPlanned === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {dayOffReason === "SUNDAY"
                ? "Nghỉ Chủ Nhật — Không tính KPI bắt buộc"
                : "Ngày nghỉ phép đã duyệt — Không tính KPI"}
            </span>
          ) : kpiSummary.totalTarget > 0 ? (
            <>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${badgeClass}`}
              >
                {kpiSummary.allDoneMet && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                )}
                Xong {kpiSummary.totalDone}/{kpiSummary.totalTarget} (
                {kpiSummary.donePercent}%)
              </span>
              {kpiSummary.totalSubmitted > 0 && (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                  Chờ duyệt: {kpiSummary.totalSubmitted}
                </span>
              )}
              <span className="text-[11px] font-semibold text-slate-500">
                Đo từ Task thật &amp; Order ({kpiSummary.totalPlanned}/{kpiSummary.totalTarget} đã xếp)
                {isDefaultFallback ? " • Mặc định" : ""}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-500">
              Chưa cài chỉ tiêu KPI hàng ngày
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => (editing ? setEditing(false) : openEditor())}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              editing
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-amber-200 bg-white hover:bg-amber-50 text-slate-700"
            }`}
          >
            {editing ? (
              <>
                <X className="w-3 h-3" /> Đóng cài KPI
              </>
            ) : (
              <>
                <Settings2 className="w-3 h-3 text-amber-600" /> Cài chỉ tiêu KPI
              </>
            )}
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-xl border border-amber-300 bg-white p-3 space-y-2.5 shadow-xs">
          <div className="text-xs font-bold text-slate-800">
            Cài chỉ tiêu KPI mỗi ngày (hệ thống tự cộng sản lượng từ Task thật &amp; Order Media của bạn, không tự đẻ task giả):
          </div>
          <DailyKpiTargetEditor
            items={draftItems}
            projects={projects}
            onChange={setDraftItems}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={savingConfig}
              onClick={() => saveTargets(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Về mặc định theo vai trò
            </button>
            <button
              type="button"
              disabled={savingConfig}
              onClick={() => saveTargets(false)}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer"
            >
              {savingConfig ? "Đang lưu..." : "Lưu chỉ tiêu KPI ngày"}
            </button>
          </div>
        </div>
      )}

      {kpiSummary.breakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {kpiSummary.breakdown.map((row: DailyKpiProgressRow) => {
            const donePct = Math.min(
              100,
              Math.round((row.doneQty / Math.max(1, row.target)) * 100)
            );
            const submittedPct = Math.min(
              100,
              Math.round(
                ((row.doneQty + row.submittedQty) / Math.max(1, row.target)) * 100
              )
            );
            const plannedPct = Math.min(
              100,
              Math.round((row.plannedQty / Math.max(1, row.target)) * 100)
            );
            return (
              <div
                key={row.id}
                className={`rounded-xl border px-3 py-2 bg-white space-y-1.5 ${
                  row.metDone
                    ? "border-emerald-200 bg-emerald-50/35"
                    : row.submittedQty > 0
                      ? "border-sky-200 bg-sky-50/25"
                      : row.metPlanned
                        ? "border-amber-200"
                        : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800 truncate">
                    {row.title}
                  </span>
                  <span
                    className={`font-extrabold shrink-0 ${
                      row.metDone
                        ? "text-emerald-700"
                        : row.submittedQty > 0
                          ? "text-sky-700"
                          : row.metPlanned
                            ? "text-amber-700"
                            : "text-slate-600"
                    }`}
                  >
                    {row.doneQty}/{row.target} {row.unit}
                  </span>
                </div>

                <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-amber-300/80 transition-all"
                    style={{ width: `${plannedPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-500/90 transition-all"
                    style={{ width: `${submittedPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${donePct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500">
                    {row.metDone
                      ? "Đã đạt KPI"
                      : row.submittedQty > 0
                        ? `Chờ duyệt: ${row.submittedQty} • Đã xếp: ${row.plannedQty}/${row.target}`
                        : row.metPlanned
                          ? `Đã có trong To-do (${row.plannedQty}/${row.target} ${row.unit})`
                          : `Trong To-do: ${row.plannedQty}/${row.target} ${row.unit}`}
                  </span>
                  {row.remainingToPlan > 0 && canCreateTasks && (
                    <button
                      type="button"
                      onClick={() =>
                        onQuickPrefillRow(
                          row.taskType,
                          row.remainingToPlan,
                          row.title,
                          row.projectId
                        )
                      }
                      className="inline-flex items-center gap-0.5 font-extrabold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Tạo việc ({row.remainingToPlan} {row.unit})
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
