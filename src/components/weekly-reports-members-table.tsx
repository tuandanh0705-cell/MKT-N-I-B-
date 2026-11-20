"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  ListChecks,
  Users,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { TaskStatusBadge } from "@/components/status-badge";
import type {
  MemberDetailedTaskRow,
  MemberNatureGroup,
} from "@/lib/report-grouping";

export interface MemberReportScoreRow {
  userId: string;
  name: string;
  title: string;
  departmentScope: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  assignedCount: number;
  completedCount: number;
  activeCount: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  dailyKpiTargetSummary?: string;
  kpiWorkingDays?: number;
  kpiExpectedQty?: number;
  kpiDoneQty?: number;
  kpiCompletionRate?: number;
  totalQuantity: number;
  assignedQuantity?: number;
  completedQuantity?: number;
  natureGroups?: MemberNatureGroup[];
  detailedTasks?: MemberDetailedTaskRow[];
  revisionTotal: number;
}

interface WeeklyReportsMembersTableProps {
  isLeader: boolean;
  period: "WEEKLY" | "MONTHLY";
  weekStart: string;
  weekEnd: string;
  monthKey: string;
  members: MemberReportScoreRow[];
  expandedMembers: Record<string, boolean>;
  memberDetailMode: "GROUPED" | "ALL";
  onChangeDetailMode: (mode: "GROUPED" | "ALL") => void;
  onToggleMember: (userId: string) => void;
  onToggleAllMembers: () => void;
}

export function WeeklyReportsMembersTable({
  isLeader,
  period,
  weekStart,
  weekEnd,
  monthKey,
  members,
  expandedMembers,
  memberDetailMode,
  onChangeDetailMode,
  onToggleMember,
  onToggleAllMembers,
}: WeeklyReportsMembersTableProps) {
  const hasAnyOpen = members.some((m) => expandedMembers[m.userId]);

  return (
    <div className="bg-white rounded-2xl border-2 border-sky-200/80 shadow-sm overflow-x-auto">
      <div className="px-5 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-600" />
          <h2 className="text-sm font-extrabold text-slate-900">
            {isLeader
              ? "Báo Cáo Chi Tiết & Tổng Hợp Theo Tính Chất — Tất Cả Thành Viên"
              : "Báo Cáo Công Việc Của Tôi — Chi Tiết & Gộp Theo Tính Chất"}{" "}
            ({period === "WEEKLY" ? `Tuần ${weekStart} → ${weekEnd}` : `Tháng ${monthKey}`})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => onChangeDetailMode("GROUPED")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                memberDetailMode === "GROUPED"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Gộp theo tính chất
            </button>
            <button
              type="button"
              onClick={() => onChangeDetailMode("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                memberDetailMode === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-amber-600" />
              Từng đầu việc lẻ
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleAllMembers}
            className="rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 px-3 py-1 text-xs font-bold cursor-pointer"
          >
            {hasAnyOpen
              ? "Thu gọn chi tiết"
              : isLeader
                ? "Mở chi tiết tất cả"
                : "Mở chi tiết"}
          </button>
        </div>
      </div>

      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase">
            <th className="py-3 px-4">Thành viên</th>
            <th className="py-3 px-4">Gộp theo tính chất &amp; SL</th>
            <th className="py-3 px-4">Hoàn thành</th>
            <th className="py-3 px-4">Đang làm</th>
            <th className="py-3 px-4">SL xong / Tổng SL</th>
            <th className="py-3 px-4">KPI cá nhân</th>
            <th className="py-3 px-4">Sửa</th>
            <th className="py-3 px-4">Đúng hạn</th>
            <th className="py-3 px-4 text-right print:hidden">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => {
            const isExpanded = Boolean(expandedMembers[m.userId]);
            const natureGroups = m.natureGroups ?? [];
            const detailedTasks = m.detailedTasks ?? [];
            const assignedQty = m.assignedQuantity ?? m.totalQuantity;
            const completedQty = m.completedQuantity ?? m.totalQuantity;

            return (
              <Fragment key={m.userId}>
                <tr
                  onClick={() => {
                    if (m.assignedCount === 0) return;
                    onToggleMember(m.userId);
                  }}
                  className={`hover:bg-sky-50/40 transition ${
                    m.assignedCount > 0 ? "cursor-pointer" : ""
                  } ${isExpanded ? "bg-sky-50/50" : ""}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <PirateAvatar
                        name={m.name}
                        color={m.avatarColor}
                        scope={m.departmentScope}
                        pirateCharacter={m.pirateCharacter}
                        size="md"
                      />
                      <div className="font-bold text-slate-900">{m.name}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    {natureGroups.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        Chưa có việc kỳ này
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {natureGroups.map((g) => (
                          <span
                            key={g.taskType}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-900"
                          >
                            <span>{g.natureLabel}:</span>
                            <span className="text-blue-700">
                              {g.totalQuantity} {g.unit}
                            </span>
                            <span className="text-[10px] font-normal text-slate-500">
                              ({g.taskCount} việc)
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-bold">
                      {m.completedCount}/{m.assignedCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">
                    {m.activeCount}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-700 whitespace-nowrap">
                    {completedQty} / {assignedQty}
                  </td>
                  <td
                    className="py-3 px-4 whitespace-nowrap"
                    title={
                      m.dailyKpiTargetSummary
                        ? `KPI ngày: ${m.dailyKpiTargetSummary} (${m.kpiWorkingDays ?? 0} ngày làm việc)`
                        : undefined
                    }
                  >
                    {(m.kpiExpectedQty ?? 0) > 0 ? (
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            (m.kpiCompletionRate ?? 0) >= 100
                              ? "bg-emerald-100 text-emerald-800"
                              : (m.kpiCompletionRate ?? 0) >= 60
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.kpiDoneQty ?? 0}/{m.kpiExpectedQty} ({m.kpiCompletionRate ?? 0}%)
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {m.kpiWorkingDays ?? 0} ngày công
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{m.revisionTotal}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-emerald-700">
                      {m.onTimeRate}% ({m.onTimeCount})
                    </span>
                    {m.lateCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold">
                        Trễ {m.lateCount}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right print:hidden">
                    {m.assignedCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {isExpanded ? "Ẩn" : "Chi tiết"}
                      </span>
                    )}
                  </td>
                </tr>

                {isExpanded && m.assignedCount > 0 && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={9} className="px-4 py-3.5">
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-700">
                              Tổng hợp tính chất ({m.name}):
                            </span>
                            {natureGroups.map((g) => (
                              <span
                                key={g.taskType}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-bold text-amber-950"
                              >
                                <span>{g.natureLabel}:</span>
                                <span className="text-blue-700">
                                  {g.totalQuantity} {g.unit}
                                </span>
                                <span className="text-[11px] font-normal text-slate-600">
                                  (xong {g.completedQuantity}/{g.totalQuantity} •{" "}
                                  {g.taskCount} đầu việc)
                                </span>
                              </span>
                            ))}
                          </div>
                          <Link
                            href={`/outputs?memberId=${m.userId}`}
                            className="print:hidden rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 shrink-0"
                          >
                            Xem Output (Content / Ảnh) →
                          </Link>
                        </div>

                        {memberDetailMode === "GROUPED" ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                                  <th className="py-2 px-2.5">Tính chất</th>
                                  <th className="py-2 px-2.5">Công việc (Gộp cùng tên)</th>
                                  <th className="py-2 px-2.5">Dự án</th>
                                  <th className="py-2 px-2.5">Số lượng</th>
                                  <th className="py-2 px-2.5">Hoàn thành</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {natureGroups.flatMap((g) =>
                                  g.mergedItems.map((item) => (
                                    <tr
                                      key={item.mergeKey}
                                      className="hover:bg-slate-50/70"
                                    >
                                      <td className="py-2 px-2.5 font-bold text-sky-800 whitespace-nowrap">
                                        {g.natureLabel}
                                      </td>
                                      <td className="py-2 px-2.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-semibold text-slate-900">
                                            {item.title}
                                          </span>
                                          {item.taskCount > 1 && (
                                            <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 text-[10px] font-extrabold">
                                              Gộp ×{item.taskCount} việc
                                            </span>
                                          )}
                                          <span className="text-[10px] font-mono text-slate-400">
                                            [{item.codes.join(", ")}]
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-2.5 text-slate-600">
                                        {item.projectNames.join(", ")}
                                      </td>
                                      <td className="py-2 px-2.5 font-extrabold text-blue-700 whitespace-nowrap">
                                        {item.totalQuantity} {item.unit}
                                      </td>
                                      <td className="py-2 px-2.5 whitespace-nowrap">
                                        {item.taskCount === 1 ? (
                                          <TaskStatusBadge status={item.latestStatus} />
                                        ) : (
                                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
                                            {item.completedQuantity}/
                                            {item.totalQuantity} {item.unit} (
                                            {item.completedCount}/{item.taskCount} việc)
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                                  <th className="py-2 px-2.5">Mã</th>
                                  <th className="py-2 px-2.5">Tên công việc</th>
                                  <th className="py-2 px-2.5">Tính chất</th>
                                  <th className="py-2 px-2.5">Dự án</th>
                                  <th className="py-2 px-2.5">Số lượng</th>
                                  <th className="py-2 px-2.5">Trạng thái</th>
                                  <th className="py-2 px-2.5">Ngày</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {detailedTasks.map((t) => (
                                  <tr key={t.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-2.5 font-mono font-bold text-slate-500 whitespace-nowrap">
                                      {t.code}
                                    </td>
                                    <td className="py-2 px-2.5 font-semibold text-slate-900">
                                      {t.title}
                                    </td>
                                    <td className="py-2 px-2.5 text-sky-800 font-semibold whitespace-nowrap">
                                      {t.natureLabel}
                                    </td>
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: t.projectColor }}
                                        />
                                        {t.projectName}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-extrabold text-blue-700 whitespace-nowrap">
                                      {t.quantity} {t.unit}
                                    </td>
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <TaskStatusBadge status={t.status} />
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">
                                      {t.dateStr.split("-").reverse().join("/")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
