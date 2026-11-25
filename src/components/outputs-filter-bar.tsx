"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Crown,
  Download,
  Filter,
  FolderCheck,
  Image as ImageIcon,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Settings2,
  User,
  X,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import type { GeminiConfigInfo } from "@/lib/gemini-shared";
import type {
  OutputCategoryFilter,
  OutputReadinessFilter,
} from "@/lib/output-helpers";
import type { SimpleProject, SimpleUser } from "@/types/crm";

export type OutputsViewMode = "CARDS" | "GALLERY" | "TABLE";
export type OutputsPeriodFilter = "ALL" | "WEEK" | "MONTH" | "LAST_30";

export interface MemberStatSummary {
  total: number;
  withOutput: number;
  needsReview: number;
  contentCount: number;
  imageCount: number;
  videoCount: number;
  linkCount: number;
}

export interface OutputsSummaryCounts {
  total: number;
  withOutput: number;
  missingOutput: number;
  needsReview: number;
  approvedOrDone: number;
  revisionNeeded: number;
  contentTasks: number;
  contentWithCaption: number;
  imageTasks: number;
  imagePiecesTotal: number;
  videoTasks: number;
  otherTasks: number;
}

interface OutputsFilterBarProps {
  isLeader: boolean;
  isMediaProduction?: boolean;
  currentUserName: string;
  aiConfig: GeminiConfigInfo;
  projects: SimpleProject[];
  users: SimpleUser[];
  scopedTotalCount: number;
  memberStats: {
    map: Map<string, MemberStatSummary>;
    unassignedTotal: number;
  };
  summaryCounts: OutputsSummaryCounts;
  selectedMemberId: string;
  onSelectMemberId: (id: string) => void;
  onlyPendingMembers: boolean;
  onToggleOnlyPendingMembers: () => void;
  categoryFilter: OutputCategoryFilter;
  onSelectCategory: (cat: OutputCategoryFilter) => void;
  readinessFilter: OutputReadinessFilter;
  onSelectReadiness: (r: OutputReadinessFilter) => void;
  projectFilter: string;
  onChangeProjectFilter: (p: string) => void;
  periodFilter: OutputsPeriodFilter;
  onChangePeriodFilter: (p: OutputsPeriodFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  viewMode: OutputsViewMode;
  onChangeViewMode: (m: OutputsViewMode) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
  onOpenAiAndStandards: () => void;
}

export function OutputsFilterBar({
  isLeader,
  isMediaProduction = false,
  currentUserName,
  aiConfig,
  projects,
  users,
  scopedTotalCount,
  memberStats,
  summaryCounts,
  selectedMemberId,
  onSelectMemberId,
  onlyPendingMembers,
  onToggleOnlyPendingMembers,
  categoryFilter,
  onSelectCategory,
  readinessFilter,
  onSelectReadiness,
  projectFilter,
  onChangeProjectFilter,
  periodFilter,
  onChangePeriodFilter,
  searchQuery,
  onChangeSearchQuery,
  viewMode,
  onChangeViewMode,
  refreshing,
  onRefresh,
  onExportCsv,
  onOpenAiAndStandards,
}: OutputsFilterBarProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeAdvancedFilterCount = [
    selectedMemberId !== "ALL",
    categoryFilter !== "ALL",
    projectFilter !== "ALL",
    periodFilter !== "ALL",
    onlyPendingMembers,
  ].filter(Boolean).length;

  const visibleUsers = onlyPendingMembers
    ? users.filter((u) => {
        const st = memberStats.map.get(u.id);
        return (st?.needsReview ?? 0) > 0 || u.id === selectedMemberId;
      })
    : users;

  const readinessTabs: Array<{
    id: OutputReadinessFilter;
    label: string;
    count?: number;
    highlight?: boolean;
  }> = [
    {
      id: "NEEDS_REVIEW",
      label: "Cần duyệt ngay",
      count: summaryCounts.needsReview,
      highlight: true,
    },
    { id: "ALL", label: "Tất cả", count: summaryCounts.total },
    { id: "HAS_OUTPUT", label: "Đã nộp", count: summaryCounts.withOutput },
    { id: "REVISION_NEEDED", label: "Cần sửa", count: summaryCounts.revisionNeeded },
    { id: "APPROVED_OR_DONE", label: "Đã duyệt / Xong", count: summaryCounts.approvedOrDone },
    { id: "MISSING_OUTPUT", label: "Chưa nộp", count: summaryCounts.missingOutput },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-3.5 sm:p-5 space-y-3 shadow-sm">
      {/* Row 1: Title + Gộp nút Leader */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <FolderCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {isLeader ? "Kiểm Tra & Duyệt Output" : "Kho Output Của Tôi"}
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
                Leader QC Toàn Team
              </>
            ) : (
              <>
                <User className="w-3 h-3 text-sky-600" />
                {currentUserName}
              </>
            )}
          </span>
          {isMediaProduction && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {summaryCounts.total} task đã làm
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLeader ? (
            <button
              type="button"
              onClick={onOpenAiAndStandards}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                aiConfig.configured
                  ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900"
                  : "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
              Cài đặt AI &amp; Tiêu chuẩn ({aiConfig.activeStandardsCount ?? 0})
            </button>
          ) : !isMediaProduction ? (
            <span
              className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 ${
                aiConfig.configured
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              {aiConfig.configured ? "Gemini QC: Sẵn sàng" : "Gemini QC: Chưa bật"}
            </span>
          ) : null}
          <Link
            href="/reports"
            className="rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1"
          >
            Báo cáo SL
          </Link>
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất CSV
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-60 text-amber-300 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {/* Row 2: Tab hàng đợi duyệt & trạng thái Output (cuộn ngang 1 dòng trên Mobile) */}
      {!isMediaProduction && (
        <div className="flex sm:flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 pb-2.5">
          {readinessTabs.map((tab) => {
            const active = readinessFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectReadiness(tab.id)}
                className={`rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? tab.highlight
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-[#0B2545] text-amber-300 shadow-xs"
                    : tab.highlight && (tab.count ?? 0) > 0
                      ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    active
                      ? "bg-white/20 text-white"
                      : tab.highlight && (tab.count ?? 0) > 0
                        ? "bg-rose-600 text-white"
                        : "bg-white text-slate-700"
                  }`}
                >
                  {tab.count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nút mở/thu gọn bộ lọc nâng cao trên Mobile để danh sách bài xuất hiện ngay */}
      {!isMediaProduction && (
        <div className="sm:hidden flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Tìm bài, mã task, link..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:outline-none pl-8 pr-7 py-1.5 text-xs text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilters((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
              showMobileFilters || activeAdvancedFilterCount > 0
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-1.5 text-[10px] font-black">
                {activeAdvancedFilterCount}
              </span>
            )}
            {showMobileFilters ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Khối thống kê + lọc nhân viên + lọc loại (thu gọn được trên mobile, luôn hiện trên sm+) */}
      <div className={showMobileFilters ? "space-y-3" : "hidden sm:block space-y-3.5"}>

      {/* Row 3: Dải thống kê mảnh (Compact KPI Strip ~1/2 chiều cao, bấm lọc nhanh) */}
      {!isMediaProduction && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => {
            onSelectCategory("ALL");
            onSelectReadiness("HAS_OUTPUT");
          }}
          className="rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="text-[11px] font-bold text-emerald-800">Đã có Output</span>
          <span className="text-sm font-black text-slate-900">
            {summaryCounts.withOutput}
            <span className="text-[11px] font-normal text-slate-500">
              /{summaryCounts.total}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCategory("CONTENT");
            onSelectReadiness("ALL");
          }}
          className="rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="text-[11px] font-bold text-sky-800">Content</span>
          <span className="text-sm font-black text-slate-900">
            {summaryCounts.contentWithCaption}
            <span className="text-[11px] font-normal text-slate-500">
              /{summaryCounts.contentTasks}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCategory("IMAGE");
            onSelectReadiness("ALL");
          }}
          className="rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="text-[11px] font-bold text-amber-800">Ấn phẩm Ảnh</span>
          <span className="text-sm font-black text-slate-900">
            {summaryCounts.imageTasks}
            <span className="text-[11px] font-normal text-slate-500 ml-0.5">
              ({summaryCounts.imagePiecesTotal})
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCategory("VIDEO");
            onSelectReadiness("ALL");
          }}
          className="rounded-xl border border-violet-200 bg-violet-50/60 hover:bg-violet-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="text-[11px] font-bold text-violet-800">Video &amp; Khác</span>
          <span className="text-sm font-black text-slate-900">
            {summaryCounts.videoTasks}
            <span className="text-[11px] font-normal text-slate-500 ml-0.5">
              • {summaryCounts.otherTasks}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectCategory("ALL");
            onSelectReadiness("NEEDS_REVIEW");
          }}
          className="col-span-2 sm:col-span-1 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="text-[11px] font-bold text-rose-700">Chờ duyệt</span>
          <span className="text-sm font-black text-rose-700">
            {summaryCounts.needsReview}
          </span>
        </button>
      </div>
      )}

      {/* Row 4: Dải chọn nhân viên gọn nhẹ + Nút Chỉ xem ai đang có bài chờ check */}
      {isLeader && (
        <div className="pt-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Nhân viên thực hiện
            </span>
            <button
              type="button"
              onClick={onToggleOnlyPendingMembers}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold cursor-pointer transition ${
                onlyPendingMembers
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Filter className="w-3 h-3" />
              {onlyPendingMembers
                ? "Đang lọc: Có bài chờ check"
                : "Chỉ xem ai đang có bài chờ check"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectMemberId("ALL")}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                selectedMemberId === "ALL"
                  ? "border-[#0B2545] bg-[#0B2545] text-amber-300"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] opacity-80">({scopedTotalCount})</span>
            </button>

            {visibleUsers.map((u) => {
              const st = memberStats.map.get(u.id);
              const active = selectedMemberId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelectMemberId(u.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                  }`}
                >
                  <PirateAvatar
                    name={u.name}
                    color={u.avatarColor}
                    scope={u.departmentScope}
                    pirateCharacter={u.pirateCharacter}
                    size="sm"
                  />
                  <span>{u.name}</span>
                  {st && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {st.withOutput}/{st.total}
                    </span>
                  )}
                  {(st?.needsReview ?? 0) > 0 && (
                    <span className="rounded-full bg-rose-100 text-rose-700 px-1.5 py-0 text-[10px] font-extrabold">
                      {st?.needsReview} chờ
                    </span>
                  )}
                </button>
              );
            })}

            {memberStats.unassignedTotal > 0 && !onlyPendingMembers && (
              <button
                type="button"
                onClick={() => onSelectMemberId("UNASSIGNED")}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  selectedMemberId === "UNASSIGNED"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                Chưa gán ({memberStats.unassignedTotal})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 5: Category Pills + View Mode + Search & Dropdowns (ẩn với Design & Edit) */}
      {!isMediaProduction && (
        <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "ALL", label: `Tất cả (${summaryCounts.total})` },
                { id: "CONTENT", label: `Content (${summaryCounts.contentTasks})` },
                { id: "IMAGE", label: `Ảnh (${summaryCounts.imageTasks})` },
                { id: "VIDEO", label: `Video (${summaryCounts.videoTasks})` },
                { id: "OTHER", label: `Web / Seeding (${summaryCounts.otherTasks})` },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCategory(c.id)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  categoryFilter === c.id
                    ? "bg-[#0B2545] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 gap-0.5">
            <button
              type="button"
              onClick={() => onChangeViewMode("CARDS")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                viewMode === "CARDS"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-600" />
              Thẻ Chi Tiết
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("GALLERY")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                viewMode === "GALLERY"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              Kho Ấn Phẩm
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("TABLE")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <List className="w-3.5 h-3.5 text-emerald-600" />
              Bảng Đối Chiếu
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:block relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Tìm bài viết, mã task, kênh đăng, link file..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none pl-9 pr-8 py-1.5 text-xs text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={projectFilter}
            onChange={(e) => onChangeProjectFilter(e.target.value)}
            className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả dự án ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(e) =>
              onChangePeriodFilter(e.target.value as OutputsPeriodFilter)
            }
            className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả thời gian</option>
            <option value="WEEK">Tuần này</option>
            <option value="MONTH">Tháng này</option>
            <option value="LAST_30">30 ngày gần nhất</option>
          </select>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}
