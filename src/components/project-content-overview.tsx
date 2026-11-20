"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  FolderOpen,
  LayoutGrid,
  Pencil,
  Plus,
  Save,
  TableProperties,
  X,
} from "lucide-react";
import {
  normalizeProjectOverview,
  type ProjectOverviewData,
} from "@/lib/content-plan";
import { useToast } from "@/components/toast-provider";
import type { SimpleProject, TaskItem } from "@/types/crm";

export function ProjectContentOverviewPanel({
  project,
  tasks,
  membersLabel,
  onProjectUpdated,
  onJumpTab,
  onNewPost,
}: {
  project: SimpleProject;
  tasks: TaskItem[];
  membersLabel: string[];
  onProjectUpdated: (updated: Partial<SimpleProject>) => void;
  onJumpTab: (tab: "MATRIX" | "CONTENT_CALENDAR") => void;
  onNewPost: () => void;
}) {
  const { showToast } = useToast();
  const initialOverview = normalizeProjectOverview(
    project.overviewJson,
    project.description
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectOverviewData>(initialOverview);

  const contentTasks = tasks.filter(
    (t) => !t.isMediaOrder || Boolean(t.postFormat || t.contentAngle || t.caption)
  );
  const waitingCount = contentTasks.filter(
    (t) => t.status === "WAITING_APPROVAL"
  ).length;
  const approvedCount = contentTasks.filter((t) =>
    ["APPROVED_FINAL", "PUBLISHED", "DONE"].includes(t.status)
  ).length;
  const airedCount = contentTasks.filter(
    (t) => t.isAired || t.status === "PUBLISHED"
  ).length;
  const draftCount = contentTasks.filter((t) =>
    ["DRAFT", "IN_PROGRESS", "REVISION_NEEDED"].includes(t.status)
  ).length;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          overviewJson: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được tổng quan dự án.", "error");
        return;
      }
      onProjectUpdated({ overviewJson: data.project.overviewJson });
      setEditing(false);
      showToast("Đã lưu Hồ sơ Tổng Quan Dự Án!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Thống kê tiến độ bài viết & KPI nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-3.5">
          <div className="text-xs font-semibold text-slate-500">Tổng bài Content</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {contentTasks.length}
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5">
          <div className="text-xs font-semibold text-sky-700">Đang viết / Sửa</div>
          <div className="text-2xl font-black text-sky-950 mt-1">{draftCount}</div>
        </div>
        <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3.5">
          <div className="text-xs font-semibold text-violet-700">Chờ Leader duyệt</div>
          <div className="text-2xl font-black text-violet-950 mt-1">
            {waitingCount}
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
          <div className="text-xs font-semibold text-emerald-700">Đã duyệt / Air</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            {approvedCount} / {airedCount}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-amber-800">KPI / Tuần</div>
          <div className="text-xs font-bold text-slate-900 mt-1 space-y-0.5">
            <div>Social: {project.weeklySocialTarget || 0} • Ads: {project.weeklyAdsTarget || 0}</div>
            <div>Ảnh: {project.weeklyImageTarget || 0} • Video: {project.weeklyVideoTarget || 0}</div>
          </div>
        </div>
      </div>

      {/* Hồ sơ Tổng quan Dự án cho người viết Content */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              Tổng Quan Dự Án — {project.name}
            </h2>
            {membersLabel.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                Team: <strong className="text-slate-700">{membersLabel.join(", ")}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onJumpTab("MATRIX")}
              className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              Matrix Content
            </button>
            <button
              type="button"
              onClick={() => onJumpTab("CONTENT_CALENDAR")}
              className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <TableProperties className="w-3.5 h-3.5 text-sky-600" />
              Nội dung chi tiết
            </button>
            <button
              type="button"
              onClick={onNewPost}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Viết bài
            </button>
            <Link
              href={`/resources?projectId=${project.id}`}
              className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              Tài nguyên
            </Link>
            <button
              type="button"
              onClick={() => {
                setForm(
                  normalizeProjectOverview(
                    project.overviewJson,
                    project.description
                  )
                );
                setEditing((v) => !v);
              }}
              className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editing ? "Đóng" : "Chỉnh sửa"}
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Sản phẩm / Dịch vụ cốt lõi
                </label>
                <textarea
                  rows={3}
                  value={form.productSummary}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, productSummary: e.target.value }))
                  }
                  placeholder="Mô tả ngắn gọn dịch vụ/sản phẩm chính, gói bán, mức giá tham khảo..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Chân dung khách hàng mục tiêu (Target Audience)
                </label>
                <textarea
                  rows={3}
                  value={form.targetAudience}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetAudience: e.target.value }))
                  }
                  placeholder="Chủ shop, chủ thương hiệu, độ tuổi, hành vi, trình độ..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Nỗi đau & Insight khách hàng
                </label>
                <textarea
                  rows={3}
                  value={form.painPoints}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, painPoints: e.target.value }))
                  }
                  placeholder="Tốn chi phí tự setup, thiếu host, live đều không ra đơn, sợ mất bảo mật..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Điểm khác biệt nổi bật (USP)
                </label>
                <textarea
                  rows={3}
                  value={form.usp}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, usp: e.target.value }))
                  }
                  placeholder="Phòng live chuẩn studio từ A-Z, chi phí hợp lý, hỗ trợ thumbnail & voucher..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Giọng văn (Tone & Voice) & Cách xưng hô
                </label>
                <textarea
                  rows={3}
                  value={form.toneAndVoice}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, toneAndVoice: e.target.value }))
                  }
                  placeholder="Chuyên gia gần gũi, thẳng thắn, thực chiến; xưng Ecom / chúng mình — gọi chủ thương hiệu / bạn..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6. Lưu ý bắt buộc / Từ khóa tránh vi phạm
                </label>
                <textarea
                  rows={3}
                  value={form.forbiddenNotes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, forbiddenNotes: e.target.value }))
                  }
                  placeholder="Tránh cam kết doanh thu tuyệt đối, lưu ý chính sách nền tảng..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bộ Hashtag mặc định của dự án
                </label>
                <input
                  type="text"
                  value={form.hashtagsDefault}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hashtagsDefault: e.target.value }))
                  }
                  placeholder="#MetaEcom #Livestream #SetupLivestream"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link Plan Sheet / Tài liệu gốc (nếu muốn tham chiếu thêm)
                </label>
                <input
                  type="url"
                  value={form.planSheetUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, planSheetUrl: e.target.value }))
                  }
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Đang lưu..." : "Lưu Tổng Quan Dự Án"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {[
              {
                title: "📦 Sản phẩm / Dịch vụ cốt lõi",
                value: initialOverview.productSummary,
                accent: "bg-blue-50/60 border-blue-200",
              },
              {
                title: "🎯 Chân dung khách hàng",
                value: initialOverview.targetAudience,
                accent: "bg-emerald-50/60 border-emerald-200",
              },
              {
                title: "💡 Nỗi đau & Insight chính",
                value: initialOverview.painPoints,
                accent: "bg-rose-50/60 border-rose-200",
              },
              {
                title: "⭐ USP & Lợi thế nổi bật",
                value: initialOverview.usp,
                accent: "bg-amber-50/70 border-amber-200",
              },
              {
                title: "🗣️ Tone & Voice / Xưng hô",
                value: initialOverview.toneAndVoice,
                accent: "bg-violet-50/60 border-violet-200",
              },
              {
                title: "⚠️ Lưu ý / Từ khóa tránh",
                value: initialOverview.forbiddenNotes,
                accent: "bg-slate-50 border-slate-200",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border p-4 space-y-1.5 ${card.accent}`}
              >
                <div className="font-extrabold text-slate-900">{card.title}</div>
                {card.value.trim() ? (
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {card.value}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">Chưa nhập</p>
                )}
              </div>
            ))}
          </div>
        )}

        {(initialOverview.hashtagsDefault || initialOverview.planSheetUrl) &&
          !editing && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              {initialOverview.hashtagsDefault && (
                <div className="text-slate-700">
                  <span className="font-bold text-slate-900 mr-1.5">
                    # Hashtag mặc định:
                  </span>
                  <span className="font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {initialOverview.hashtagsDefault}
                  </span>
                </div>
              )}
              {initialOverview.planSheetUrl && (
                <a
                  href={initialOverview.planSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở Google Sheet gốc
                </a>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
