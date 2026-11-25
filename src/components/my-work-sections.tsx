"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Calendar, CheckCircle2, ChevronDown, X } from "lucide-react";
import { isDailyKpiDayOff, type ApprovedLeaveSpan, type DailyKpiSummaryResult } from "@/lib/daily-kpi";
import { TASK_NATURE_META } from "@/lib/report-grouping";
import type { SimpleProject, TaskItem } from "@/types/crm";
import type { TaskType } from "@/generated/prisma/client";

export interface MyWorkUpcomingDay {
  dateStr: string;
  dayNum: number;
  monthNum: number;
  shortDow: string;
  longDow: string;
  relLabel: string | null;
}

interface MyWorkWeekStripProps {
  upcomingDays: MyWorkUpcomingDay[];
  dayBuckets: Map<string, TaskItem[]>;
  kpiByDayMap: Map<string, DailyKpiSummaryResult>;
  approvedLeaves: ApprovedLeaveSpan[];
  todayDate: string;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
}

export function MyWorkWeekStrip({
  upcomingDays,
  dayBuckets,
  kpiByDayMap,
  approvedLeaves,
  todayDate,
  selectedDateStr,
  onSelectDate,
}: MyWorkWeekStripProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5 border-b border-slate-100 pb-3">
      {upcomingDays.map((d) => {
        const count = (dayBuckets.get(d.dateStr) ?? []).length;
        const dayKpi = kpiByDayMap.get(d.dateStr);
        const dayOffInfo = isDailyKpiDayOff(d.dateStr, approvedLeaves);
        const isToday = d.dateStr === todayDate;
        const isSelected = d.dateStr === selectedDateStr;
        const hasKpi = Boolean(dayKpi && dayKpi.totalTarget > 0);
        const isRestDayWithoutTasks =
          dayOffInfo.isOff && (!dayKpi || dayKpi.totalPlanned === 0) && count === 0;

        const kpiBadgeText = isRestDayWithoutTasks
          ? dayOffInfo.reason === "SUNDAY"
            ? "Nghỉ CN"
            : "Nghỉ phép"
          : hasKpi
            ? dayKpi!.totalDone === 0 && dayKpi!.totalSubmitted > 0
              ? `⏳ ${dayKpi!.totalSubmitted}/${dayKpi!.totalTarget}`
              : `${dayKpi!.allDoneMet ? "✓ " : ""}${dayKpi!.totalDone}/${dayKpi!.totalTarget}`
            : count > 0
              ? `${count} việc`
              : "0";

        const kpiBadgeClass = isRestDayWithoutTasks
          ? "bg-slate-100 text-slate-500"
          : hasKpi
            ? dayKpi!.allDoneMet
              ? "bg-emerald-100 text-emerald-800"
              : dayKpi!.totalSubmitted > 0
                ? "bg-sky-100 text-sky-800"
                : dayKpi!.totalPlanned > 0
                  ? "bg-amber-100 text-amber-800"
                  : isSelected
                    ? "bg-slate-200/80 text-slate-700"
                    : "bg-slate-100 text-slate-400"
            : count > 0
              ? "bg-amber-100 text-amber-800"
              : "text-transparent select-none";

        return (
          <button
            key={d.dateStr}
            type="button"
            onClick={() => onSelectDate(d.dateStr)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 transition cursor-pointer ${
              isSelected
                ? isToday
                  ? "bg-rose-50/90 border-rose-300 shadow-xs"
                  : "bg-amber-50/90 border-amber-300 shadow-xs"
                : "border-transparent hover:bg-slate-50"
            }`}
          >
            <span
              className={`text-[11px] font-bold ${
                isSelected
                  ? isToday
                    ? "text-rose-700"
                    : "text-amber-900"
                  : "text-slate-500"
              }`}
            >
              {d.shortDow}
            </span>
            <span
              className={`w-7 h-7 rounded-lg text-xs font-extrabold inline-flex items-center justify-center ${
                isSelected && isToday
                  ? "bg-rose-500 text-white shadow-xs"
                  : isSelected
                    ? "bg-[#0B2545] text-amber-300 shadow-xs"
                    : isToday
                      ? "bg-rose-100 text-rose-700"
                      : "text-slate-800"
              }`}
            >
              {d.dayNum}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 rounded-full leading-tight ${kpiBadgeClass}`}
              title={
                isRestDayWithoutTasks
                  ? dayOffInfo.reason === "SUNDAY"
                    ? "Chủ Nhật — Ngày nghỉ"
                    : "Ngày nghỉ phép đã duyệt"
                  : hasKpi
                    ? `KPI ngày: xong ${dayKpi!.totalDone}/${dayKpi!.totalTarget}, đã xếp ${dayKpi!.totalPlanned}/${dayKpi!.totalTarget}`
                    : undefined
              }
            >
              {kpiBadgeText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface MyWorkInlineCreateFormProps {
  targetDateStr: string;
  projects: SimpleProject[];
  inlineTitle: string;
  inlineProjectId: string;
  inlineTaskType: TaskType;
  inlineQuantity: number;
  inlineTime: string;
  creatingInline: boolean;
  onChangeTitle: (v: string) => void;
  onChangeProjectId: (v: string) => void;
  onChangeTaskType: (v: TaskType) => void;
  onChangeQuantity: (v: number) => void;
  onChangeTime: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent, targetDateStr: string) => void;
}

export function MyWorkInlineCreateForm({
  targetDateStr,
  projects,
  inlineTitle,
  inlineProjectId,
  inlineTaskType,
  inlineQuantity,
  inlineTime,
  creatingInline,
  onChangeTitle,
  onChangeProjectId,
  onChangeTaskType,
  onChangeQuantity,
  onChangeTime,
  onCancel,
  onSubmit,
}: MyWorkInlineCreateFormProps) {
  return (
    <form
      onSubmit={(e) => onSubmit(e, targetDateStr)}
      className="mt-2 rounded-xl border border-slate-300 bg-white p-3 shadow-xs space-y-2.5"
    >
      <input
        type="text"
        autoFocus
        value={inlineTitle}
        onChange={(e) => onChangeTitle(e.target.value)}
        placeholder="Tên đầu việc mới (vd: Viết 2 bài Social Inpro, Quay 1 video...)..."
        className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={inlineProjectId}
            onChange={(e) => onChangeProjectId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={inlineTaskType}
            onChange={(e) => onChangeTaskType(e.target.value as TaskType)}
            className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-xs font-semibold text-slate-800"
            title="Loại KPI tính sản lượng"
          >
            {(Object.keys(TASK_NATURE_META) as TaskType[]).map((tt) => (
              <option key={tt} value={tt}>
                {TASK_NATURE_META[tt].label}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
            <span>SL:</span>
            <input
              type="number"
              min={1}
              max={999}
              value={inlineQuantity}
              onChange={(e) =>
                onChangeQuantity(Math.max(1, Number(e.target.value || 1)))
              }
              className="w-12 bg-transparent font-bold text-slate-900 text-center focus:outline-none"
            />
            <span className="text-[11px] text-slate-500">
              {TASK_NATURE_META[inlineTaskType]?.unit || "việc"}
            </span>
          </label>

          <input
            type="time"
            value={inlineTime}
            onChange={(e) => onChangeTime(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={creatingInline || !inlineTitle.trim()}
            className="rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-45 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer"
          >
            {creatingInline ? "Đang thêm..." : "Thêm việc"}
          </button>
        </div>
      </div>
    </form>
  );
}

interface MyWorkExtraAccordionsProps {
  attentionTasks: TaskItem[];
  futureTasks: TaskItem[];
  completedTasks: TaskItem[];
  showBacklog: boolean;
  showFuture: boolean;
  showCompleted: boolean;
  onToggleBacklog: () => void;
  onToggleFuture: () => void;
  onToggleCompleted: () => void;
  renderRow: (t: TaskItem, options?: { allowMoveToday?: boolean }) => ReactNode;
}

export function MyWorkExtraAccordions({
  attentionTasks,
  futureTasks,
  completedTasks,
  showBacklog,
  showFuture,
  showCompleted,
  onToggleBacklog,
  onToggleFuture,
  onToggleCompleted,
  renderRow,
}: MyWorkExtraAccordionsProps) {
  return (
    <>
      {attentionTasks.length > 0 && (
        <div className="pt-3 border-t border-slate-200 space-y-1.5">
          <button
            type="button"
            onClick={onToggleBacklog}
            className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            Quá hạn / Chưa lên ngày ({attentionTasks.length})
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showBacklog ? "rotate-180" : ""
              }`}
            />
          </button>
          {showBacklog && (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/35 px-3 py-2">
              {attentionTasks.map((t) => renderRow(t, { allowMoveToday: true }))}
            </div>
          )}
        </div>
      )}

      {futureTasks.length > 0 && (
        <div className="pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onToggleFuture}
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-700 hover:text-sky-800 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Sắp tới sau tuần này ({futureTasks.length})
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showFuture ? "rotate-180" : ""
              }`}
            />
          </button>

          {showFuture && (
            <div className="mt-2">{futureTasks.map((t) => renderRow(t))}</div>
          )}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onToggleCompleted}
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Đã hoàn thành ({completedTasks.length})
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showCompleted ? "rotate-180" : ""
              }`}
            />
          </button>

          {showCompleted && (
            <div className="mt-2 opacity-80">
              {completedTasks.map((t) => renderRow(t))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
