"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Crown,
  Send,
  TrendingUp,
  User,
} from "lucide-react";
import {
  WeeklyReportsMembersTable,
  type MemberReportScoreRow,
} from "@/components/weekly-reports-members-table";
import {
  WeeklyReportsProjectsTable,
  type ProjectReportSummaryRow,
} from "@/components/weekly-reports-projects-table";
import { useToast } from "@/components/toast-provider";
import { shiftVnWeekStart } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";

type ProjectSummaryRow = ProjectReportSummaryRow;
type MemberScoreRow = MemberReportScoreRow;

export function WeeklyReportsView({
  initialWeekStart,
  initialWeekEnd,
  initialMonthKey,
  currentUserId,
  currentUserName,
  currentUserRole = "MEMBER",
}: {
  initialWeekStart: string;
  initialWeekEnd: string;
  initialMonthKey: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: "LEADER" | "MEMBER";
}) {
  const { showToast } = useToast();

  const [viewer, setViewer] = useState<{
    id?: string;
    name?: string;
    role: "LEADER" | "MEMBER";
  }>({
    id: currentUserId,
    name: currentUserName,
    role: currentUserRole,
  });
  const isLeader = viewer.role === "LEADER";

  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [weekEnd, setWeekEnd] = useState(initialWeekEnd);
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [loading, setLoading] = useState(true);

  const [workWeekly, setWorkWeekly] = useState<{
    byProject: ProjectSummaryRow[];
    byMember: MemberScoreRow[];
  }>({ byProject: [], byMember: [] });
  const [workMonthly, setWorkMonthly] = useState<{
    byProject: ProjectSummaryRow[];
    byMember: MemberScoreRow[];
  }>({ byProject: [], byMember: [] });

  const [drafts, setDrafts] = useState<
    Record<string, { highlights: string; blockers: string; proposals: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sendingLeader, setSendingLeader] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [memberDetailMode, setMemberDetailMode] = useState<"GROUPED" | "ALL">(
    "GROUPED"
  );

  const applyData = useCallback(
    (data: {
      viewer?: { id?: string; name?: string; role?: "LEADER" | "MEMBER" };
      weekStart: string;
      weekEnd: string;
      workReport: {
        weekly: { byProject: ProjectSummaryRow[]; byMember: MemberScoreRow[] };
        monthly: { byProject: ProjectSummaryRow[]; byMember: MemberScoreRow[] };
      };
    }) => {
      if (data.viewer?.role) {
        setViewer({
          id: data.viewer.id,
          name: data.viewer.name,
          role: data.viewer.role,
        });
      }
      setWeekStart(data.weekStart);
      setWeekEnd(data.weekEnd);
      setWorkWeekly(data.workReport.weekly);
      setWorkMonthly(data.workReport.monthly);

      const effectiveIsLeader =
        (data.viewer?.role ?? currentUserRole) === "LEADER";
      if (!effectiveIsLeader) {
        const selfIds = new Set<string>();
        for (const m of data.workReport.weekly.byMember || []) {
          selfIds.add(m.userId);
        }
        for (const m of data.workReport.monthly.byMember || []) {
          selfIds.add(m.userId);
        }
        if (selfIds.size > 0) {
          setExpandedMembers((prev) => {
            const next = { ...prev };
            for (const id of selfIds) {
              if (!(id in next)) next[id] = true;
            }
            return next;
          });
        }
      }

      const nextDrafts: Record<
        string,
        { highlights: string; blockers: string; proposals: string }
      > = {};
      for (const r of data.workReport.weekly.byProject || []) {
        nextDrafts[r.projectId] = {
          highlights: r.note?.highlights || "",
          blockers: r.note?.blockers || "",
          proposals: r.note?.proposals || "",
        };
      }
      setDrafts(nextDrafts);
    },
    [currentUserRole]
  );

  useEffect(() => {
    let active = true;
    fetch(
      `/api/reports/overview?weekStart=${encodeURIComponent(
        weekStart
      )}&month=${encodeURIComponent(monthKey)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) applyData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [weekStart, monthKey, applyData]);

  function updateDraft(
    projectId: string,
    field: "highlights" | "blockers" | "proposals",
    value: string
  ) {
    setDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || { highlights: "", blockers: "", proposals: "" }),
        [field]: value,
      },
    }));
  }

  async function saveNote(projectId: string) {
    const d = drafts[projectId] || { highlights: "", blockers: "", proposals: "" };
    setSavingId(projectId);
    setSavedId(null);
    try {
      const res = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, weekStart, ...d }),
      });
      if (res.ok) {
        setSavedId(projectId);
        showToast("Đã lưu ghi chú báo cáo tuần.");
      } else {
        showToast("Không lưu được ghi chú.", "error");
      }
    } finally {
      setSavingId(null);
    }
  }

  const activeWorkData = period === "WEEKLY" ? workWeekly : workMonthly;

  async function handleSendToLeader() {
    setSendingLeader(true);
    try {
      const periodLabel =
        period === "WEEKLY" ? `${weekStart} → ${weekEnd}` : `Tháng ${monthKey}`;
      const totalAssigned = activeWorkData.byMember.reduce(
        (s, m) => s + m.assignedCount,
        0
      );
      const totalDone = activeWorkData.byMember.reduce(
        (s, m) => s + m.completedCount,
        0
      );
      const avgOnTime =
        activeWorkData.byMember.length > 0
          ? Math.round(
              activeWorkData.byMember.reduce((s, m) => s + m.onTimeRate, 0) /
                activeWorkData.byMember.length
            )
          : 100;
      const summaryText =
        !isLeader && activeWorkData.byMember.length === 1
          ? `Cá nhân (${activeWorkData.byMember[0].name}) • Hoàn thành ${totalDone}/${totalAssigned} đầu việc • Tỷ lệ đúng hạn ${avgOnTime}%.`
          : `${activeWorkData.byMember.length} thành viên • Hoàn thành ${totalDone}/${totalAssigned} đầu việc • Tỷ lệ đúng hạn TB ${avgOnTime}%.`;

      const res = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_TO_LEADER",
          period,
          periodLabel,
          summaryText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã gửi Báo cáo Công việc & thông báo Push tới Leader!");
      } else {
        showToast(data.error || "Không gửi được báo cáo.", "error");
      }
    } finally {
      setSendingLeader(false);
    }
  }

  function handleExportCsv() {
    const label = period === "WEEKLY" ? `tuan-${weekStart}` : `thang-${monthKey}`;
    const rows: Array<Array<string | number>> = [];
    for (const m of activeWorkData.byMember) {
      const groups = m.natureGroups ?? [];
      if (groups.length === 0) {
        rows.push([
          m.name,
          "Chưa có công việc",
          "—",
          0,
          0,
          0,
          "—",
          m.onTimeRate,
        ]);
        continue;
      }
      for (const g of groups) {
        for (const item of g.mergedItems) {
          rows.push([
            m.name,
            g.natureLabel,
            item.title,
            item.taskCount,
            item.totalQuantity,
            item.completedQuantity,
            item.unit,
            item.projectNames.join(" / "),
          ]);
        }
      }
    }
    downloadCsv(
      `bao-cao-chi-tiet-${label}.csv`,
      [
        "Thành viên",
        "Tính chất công việc",
        "Đầu việc (Gộp cùng tính chất)",
        "Số đầu việc",
        "Tổng số lượng",
        "Đã hoàn thành (SL)",
        "Đơn vị",
        "Dự án",
      ],
      rows
    );
    showToast("Đã xuất file CSV chi tiết & gộp theo tính chất!");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {isLeader
                  ? "📋 Báo Cáo Công Việc Toàn Team (Tuần → Tháng)"
                  : "📋 Báo Cáo Công Việc Của Tôi (Tuần → Tháng)"}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  isLeader
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                {isLeader ? (
                  <>
                    <Crown className="w-3 h-3 text-amber-600" />
                    Leader xem tất cả ({activeWorkData.byMember.length})
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-sky-600" />
                    Chỉ hiện công việc của{" "}
                    {viewer.name || activeWorkData.byMember[0]?.name || "bạn"}
                  </>
                )}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {isLeader
                ? "Leader theo dõi đầy đủ công việc chi tiết, gộp theo tính chất của tất cả thành viên và KPI các Hải đồ."
                : "Tổng hợp chi tiết từng đầu việc, số lượng gộp theo tính chất và KPI tiến độ thuộc tài khoản của bạn."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link
              href="/outputs"
              className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5"
            >
              Kiểm tra Output (Content / Ảnh)
            </Link>
            <button
              type="button"
              disabled={sendingLeader || loading}
              onClick={handleSendToLeader}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
              {sendingLeader
                ? "Đang gửi..."
                : `Gửi Báo Cáo ${period === "WEEKLY" ? "Tuần" : "Tháng"} Cho Leader`}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Xuất Excel (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In / Lưu PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 print:hidden">
          <div className="inline-flex rounded-xl bg-amber-50 border border-amber-200 p-0.5">
            <button
              type="button"
              onClick={() => setPeriod("WEEKLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                period === "WEEKLY"
                  ? "bg-amber-500 text-white"
                  : "text-amber-900"
              }`}
            >
              Tổng kết Tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriod("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                period === "MONTHLY"
                  ? "bg-amber-500 text-white"
                  : "text-amber-900"
              }`}
            >
              Tổng kết Tháng
            </button>
          </div>

          {period === "WEEKLY" ? (
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWeekStart((w) => shiftVnWeekStart(w, -1))}
                className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                title="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                {weekStart} → {weekEnd}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart((w) => shiftVnWeekStart(w, 1))}
                className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                title="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center text-sm text-slate-400">
          Đang tổng hợp báo cáo công việc...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Biểu đồ Trực Quan Hóa KPI Dự Án & Hiệu Suất Thành Viên */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    📊 Biểu Đồ Tiến Độ KPI Theo Dự Án
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Sản lượng đạt / Chỉ tiêu KPI
                </span>
              </div>

              <div className="space-y-3">
                {activeWorkData.byProject.map((p) => {
                  const targetSum =
                    p.targets.social +
                    p.targets.ads +
                    p.targets.image +
                    p.targets.video;
                  const actualSum =
                    p.actuals.socialDone +
                    p.actuals.adsDone +
                    p.actuals.imageDone +
                    p.actuals.videoDone;
                  const pct =
                    targetSum > 0
                      ? Math.min(100, Math.round((actualSum / targetSum) * 100))
                      : p.actuals.totalTasks > 0
                        ? Math.round(
                            (p.actuals.doneTasks / p.actuals.totalTasks) * 100
                          )
                        : 0;
                  return (
                    <div key={p.projectId} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </span>
                        <span className="font-bold text-slate-700 shrink-0">
                          {targetSum > 0
                            ? `${actualSum} / ${targetSum} sp (${pct}%)`
                            : `${p.actuals.doneTasks} / ${p.actuals.totalTasks} việc (${pct}%)`}
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(actualSum > 0 || p.actuals.doneTasks > 0 ? 4 : 0, pct)}%`,
                            backgroundColor: p.color || "#f59e0b",
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                        <span>Social: {p.actuals.socialDone}/{p.targets.social}</span>
                        <span>Ads: {p.actuals.adsDone}/{p.targets.ads}</span>
                        <span>Ảnh: {p.actuals.imageDone}/{p.targets.image}</span>
                        <span>Video: {p.actuals.videoDone}/{p.targets.video}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-sky-200/80 p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {isLeader
                      ? "🎯 Tỷ Lệ Đúng Hạn & Sản Lượng Thành Viên"
                      : "🎯 Hiệu Suất & Tỷ Lệ Đúng Hạn Của Tôi"}
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  % Đúng deadline
                </span>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {activeWorkData.byMember.map((m) => (
                  <div key={m.userId} className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">
                        {m.name}{" "}
                        <span className="font-normal text-slate-400">
                          ({m.completedCount}/{m.assignedCount} việc •{" "}
                          {m.completedQuantity ?? m.totalQuantity}/
                          {m.assignedQuantity ?? m.totalQuantity} SL)
                        </span>
                      </span>
                      <span
                        className={`font-extrabold shrink-0 ${
                          m.onTimeRate >= 85
                            ? "text-emerald-600"
                            : m.onTimeRate >= 60
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {m.onTimeRate}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.onTimeRate >= 85
                            ? "bg-emerald-500"
                            : m.onTimeRate >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.max(m.assignedCount > 0 ? 4 : 0, m.onTimeRate)}%`,
                        }}
                      />
                    </div>
                    {!isLeader && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500">
                          Phân bổ tính chất công việc của bạn:
                        </div>
                        {(m.natureGroups ?? []).length === 0 ? (
                          <div className="text-xs text-slate-400">
                            Kỳ này bạn chưa có đầu việc nào được ghi nhận.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(m.natureGroups ?? []).map((g) => (
                              <span
                                key={g.taskType}
                                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2 py-1 text-[11px] font-bold text-sky-900"
                              >
                                <span>{g.natureLabel}:</span>
                                <span className="text-blue-700">
                                  {g.totalQuantity} {g.unit}
                                </span>
                                <span className="font-normal text-slate-500">
                                  ({g.completedQuantity}/{g.totalQuantity} xong)
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <WeeklyReportsMembersTable
            isLeader={isLeader}
            period={period}
            weekStart={weekStart}
            weekEnd={weekEnd}
            monthKey={monthKey}
            members={activeWorkData.byMember}
            expandedMembers={expandedMembers}
            memberDetailMode={memberDetailMode}
            onChangeDetailMode={setMemberDetailMode}
            onToggleMember={(userId) =>
              setExpandedMembers((prev) => ({
                ...prev,
                [userId]: !prev[userId],
              }))
            }
            onToggleAllMembers={() => {
              const hasAnyOpen = activeWorkData.byMember.some(
                (m) => expandedMembers[m.userId]
              );
              if (hasAnyOpen) {
                setExpandedMembers({});
              } else {
                const next: Record<string, boolean> = {};
                for (const m of activeWorkData.byMember) {
                  if (m.assignedCount > 0) next[m.userId] = true;
                }
                setExpandedMembers(next);
              }
            }}
          />

          <WeeklyReportsProjectsTable
            period={period}
            projects={activeWorkData.byProject}
            weeklyProjects={workWeekly.byProject}
            drafts={drafts}
            savingId={savingId}
            savedId={savedId}
            onUpdateDraft={updateDraft}
            onSaveNote={saveNote}
          />
        </div>
      )}
    </div>
  );
}
