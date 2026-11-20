"use client";

import { BarChart3, CheckCircle2, Save } from "lucide-react";

export interface ProjectReportSummaryRow {
  projectId: string;
  slug: string;
  name: string;
  color: string;
  kpiNote: string | null;
  targets: { social: number; ads: number; image: number; video: number };
  actuals: {
    totalTasks: number;
    doneTasks: number;
    socialDone: number;
    adsDone: number;
    imageDone: number;
    videoDone: number;
    onTimeCount: number;
    lateCount: number;
  };
  note: {
    highlights: string | null;
    blockers: string | null;
    proposals: string | null;
    author?: { name: string } | null;
  } | null;
}

interface WeeklyReportsProjectsTableProps {
  period: "WEEKLY" | "MONTHLY";
  projects: ProjectReportSummaryRow[];
  weeklyProjects: ProjectReportSummaryRow[];
  drafts: Record<
    string,
    { highlights: string; blockers: string; proposals: string }
  >;
  savingId: string | null;
  savedId: string | null;
  onUpdateDraft: (
    projectId: string,
    field: "highlights" | "blockers" | "proposals",
    value: string
  ) => void;
  onSaveNote: (projectId: string) => void;
}

export function WeeklyReportsProjectsTable({
  period,
  projects,
  weeklyProjects,
  drafts,
  savingId,
  savedId,
  onUpdateDraft,
  onSaveNote,
}: WeeklyReportsProjectsTableProps) {
  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-extrabold text-slate-900">
            Tiến độ KPI Theo Hải Đồ / Dự Án (
            {period === "WEEKLY" ? "Tuần" : "Ước tính Tháng = 4 tuần"})
          </h2>
        </div>

        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="py-3 px-4">Dự án</th>
              <th className="py-3 px-4">Social (Đạt / KPI)</th>
              <th className="py-3 px-4">Ads (Đạt / KPI)</th>
              <th className="py-3 px-4">Ảnh (Đạt / KPI)</th>
              <th className="py-3 px-4">Video (Đạt / KPI)</th>
              <th className="py-3 px-4">Đúng hạn</th>
              <th className="py-3 px-4">Trễ Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((r) => (
              <tr key={r.projectId} className="hover:bg-slate-50/70">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <div>
                      <div className="font-bold text-slate-900">{r.name}</div>
                      {r.kpiNote && (
                        <div className="text-[11px] text-slate-500">
                          {r.kpiNote}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-semibold">
                  {r.actuals.socialDone} / {r.targets.social || "—"}
                </td>
                <td className="py-3 px-4 font-semibold">
                  {r.actuals.adsDone} / {r.targets.ads || "—"}
                </td>
                <td className="py-3 px-4 font-semibold">
                  {r.actuals.imageDone} / {r.targets.image || "—"}
                </td>
                <td className="py-3 px-4 font-semibold">
                  {r.actuals.videoDone} / {r.targets.video || "—"}
                </td>
                <td className="py-3 px-4">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-bold">
                    {r.actuals.onTimeCount}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      r.actuals.lateCount > 0
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.actuals.lateCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {period === "WEEKLY" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
          {weeklyProjects.map((r) => {
            const d = drafts[r.projectId] || {
              highlights: "",
              blockers: "",
              proposals: "",
            };
            return (
              <div
                key={r.projectId}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    <h3 className="text-sm font-bold text-slate-900">
                      Ghi chú Báo cáo Tuần — {r.name}
                    </h3>
                  </div>
                  {savedId === r.projectId && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã lưu
                    </span>
                  )}
                </div>

                <textarea
                  rows={2}
                  value={d.highlights}
                  onChange={(e) =>
                    onUpdateDraft(r.projectId, "highlights", e.target.value)
                  }
                  placeholder="Kết quả nổi bật trong tuần..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <textarea
                  rows={2}
                  value={d.blockers}
                  onChange={(e) =>
                    onUpdateDraft(r.projectId, "blockers", e.target.value)
                  }
                  placeholder="Phát sinh / Vướng mắc / Khó khăn..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <textarea
                  rows={2}
                  value={d.proposals}
                  onChange={(e) =>
                    onUpdateDraft(r.projectId, "proposals", e.target.value)
                  }
                  placeholder="Đề xuất cải thiện tuần tới..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingId === r.projectId}
                    onClick={() => onSaveNote(r.projectId)}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingId === r.projectId ? "Đang lưu..." : "Lưu ghi chú"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
