"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Clock,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MessageSquare,
  Palette,
  Search,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { TaskStatusBadge } from "@/components/status-badge";
import type { DrawerTab } from "@/components/task-drawer";
import { isCompletedTaskStatus } from "@/components/my-work-task-row";
import {
  TASK_TYPE_META,
  isTaskOverdue,
  taskRequiresLeaderApproval,
} from "@/lib/constants";
import { formatVnDate, formatVnDateTime, getVnDateString } from "@/lib/dates";
import {
  VIDEO_ORDER_KIND_META,
  countFilledScriptRows,
  getTaskPrimaryVideoKind,
  normalizeMediaBriefItems,
  type VideoOrderKind,
} from "@/lib/media-brief";
import type { TaskItem } from "@/types/crm";

type OrderStatusFilter =
  | "OPEN"
  | "REVISION"
  | "WORKING"
  | "WAITING"
  | "COMPLETED"
  | "ALL";

type OrderViewMode = "CARDS" | "TABLE";

interface MyWorkMediaOrdersBoardProps {
  tasks: TaskItem[];
  currentUserScope: string;
  todayDate: string;
  togglingTaskId: string | null;
  onOpenTask: (
    taskId: string,
    openChat?: boolean,
    tabOverride?: DrawerTab
  ) => void;
  onSubmitForReview: (task: TaskItem) => void;
  onToggleDone: (task: TaskItem) => void;
}

function getStatusSortRank(status: string): number {
  switch (status) {
    case "REVISION_NEEDED":
      return 0;
    case "IN_PROGRESS":
    case "BRIEF_REVIEW":
    case "DRAFT":
      return 1;
    case "WAITING_APPROVAL":
      return 2;
    case "APPROVED_FINAL":
      return 3;
    case "PUBLISHED":
    case "DONE":
      return 4;
    default:
      return 5;
  }
}

function getOrderUnitLabel(task: TaskItem): string {
  const qty = Math.max(1, task.quantity || 1);
  if (task.taskType === "MEDIA_IMAGE") return `${qty} ảnh`;
  if (task.taskType === "MEDIA_VIDEO") return `${qty} video`;
  return `${qty} ${TASK_TYPE_META[task.taskType]?.label || "việc"}`;
}

function getShortRatioBadge(ratio: string): string {
  const clean = ratio.trim();
  const parenIdx = clean.indexOf("(");
  if (parenIdx > 0) {
    return clean.slice(0, parenIdx).trim();
  }
  return clean.length > 22 ? `${clean.slice(0, 20)}…` : clean;
}

function getDeliverableAssets(task: TaskItem) {
  return (task.assets ?? []).filter(
    (a) => a.kind === "DEMO" || a.kind === "FINAL" || a.kind === "PUBLISHED_LINK"
  );
}

function getBriefRefAsset(task: TaskItem) {
  return (task.assets ?? []).find((a) => a.kind === "BRIEF_REF") ?? null;
}

export function MyWorkMediaOrdersBoard({
  tasks,
  currentUserScope,
  todayDate,
  togglingTaskId,
  onOpenTask,
  onSubmitForReview,
  onToggleDone,
}: MyWorkMediaOrdersBoardProps) {
  const isVideoSpecialist = currentUserScope === "MEDIA_VIDEO";

  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [videoKindFilter, setVideoKindFilter] = useState<
    "ALL" | VideoOrderKind
  >("ALL");
  const [viewMode, setViewMode] = useState<OrderViewMode>("CARDS");

  // Danh sách người order & dự án thực tế xuất hiện trong các order giao cho bạn
  const requesterOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; count: number; openCount: number }
    >();
    for (const t of tasks) {
      const existing = map.get(t.requester.id);
      const isOpen =
        !isCompletedTaskStatus(t.status) && t.status !== "APPROVED_FINAL";
      if (existing) {
        existing.count += 1;
        if (isOpen) existing.openCount += 1;
      } else {
        map.set(t.requester.id, {
          id: t.requester.id,
          name: t.requester.name,
          count: 1,
          openCount: isOpen ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.openCount !== a.openCount
        ? b.openCount - a.openCount
        : a.name.localeCompare(b.name, "vi")
    );
  }, [tasks]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const t of tasks) {
      const existing = map.get(t.project.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(t.project.id, {
          id: t.project.id,
          name: t.project.name,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    );
  }, [tasks]);

  const hasAnyVideoTask = useMemo(
    () => isVideoSpecialist || tasks.some((t) => t.taskType === "MEDIA_VIDEO"),
    [isVideoSpecialist, tasks]
  );

  // KPI counts theo 4 nhóm trạng thái chính
  const summary = useMemo(() => {
    let revisionCount = 0;
    let revisionUnits = 0;
    let workingCount = 0;
    let workingUnits = 0;
    let overdueCount = 0;
    let waitingCount = 0;
    let completedCount = 0;
    let approvedAwaitingDoneCount = 0;

    for (const t of tasks) {
      const qty = Math.max(1, t.quantity || 1);
      if (t.status === "REVISION_NEEDED") {
        revisionCount += 1;
        revisionUnits += qty;
        if (isTaskOverdue(t)) overdueCount += 1;
      } else if (
        t.status === "IN_PROGRESS" ||
        t.status === "BRIEF_REVIEW" ||
        t.status === "DRAFT"
      ) {
        workingCount += 1;
        workingUnits += qty;
        if (isTaskOverdue(t)) overdueCount += 1;
      } else if (t.status === "WAITING_APPROVAL") {
        waitingCount += 1;
      } else if (t.status === "APPROVED_FINAL") {
        completedCount += 1;
        approvedAwaitingDoneCount += 1;
      } else if (t.status === "PUBLISHED" || t.status === "DONE") {
        completedCount += 1;
      }
    }

    return {
      total: tasks.length,
      openCount: revisionCount + workingCount + waitingCount,
      revisionCount,
      revisionUnits,
      workingCount,
      workingUnits,
      overdueCount,
      waitingCount,
      completedCount,
      approvedAwaitingDoneCount,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = tasks.filter((t) => {
      // 1. Lọc theo nhóm trạng thái
      if (statusFilter === "OPEN") {
        if (
          t.status === "APPROVED_FINAL" ||
          t.status === "PUBLISHED" ||
          t.status === "DONE"
        ) {
          return false;
        }
      } else if (statusFilter === "REVISION") {
        if (t.status !== "REVISION_NEEDED") return false;
      } else if (statusFilter === "WORKING") {
        if (
          t.status !== "IN_PROGRESS" &&
          t.status !== "BRIEF_REVIEW" &&
          t.status !== "DRAFT"
        ) {
          return false;
        }
      } else if (statusFilter === "WAITING") {
        if (t.status !== "WAITING_APPROVAL") return false;
      } else if (statusFilter === "COMPLETED") {
        if (
          t.status !== "APPROVED_FINAL" &&
          t.status !== "PUBLISHED" &&
          t.status !== "DONE"
        ) {
          return false;
        }
      }

      // 2. Lọc theo người order
      if (requesterFilter !== "ALL" && t.requester.id !== requesterFilter) {
        return false;
      }

      // 3. Lọc theo dự án
      if (projectFilter !== "ALL" && t.project.id !== projectFilter) {
        return false;
      }

      // 4. Lọc theo loại video (Quay & Dựng / Dựng Video)
      if (videoKindFilter !== "ALL") {
        const primaryKind = getTaskPrimaryVideoKind(t.mediaBriefItemsJson);
        if (primaryKind !== videoKindFilter) return false;
      }

      // 5. Tìm kiếm nhanh
      if (!q) return true;
      const briefItems = normalizeMediaBriefItems(t.mediaBriefItemsJson);
      const briefText = briefItems
        .map((it) =>
          [
            it.ratio,
            it.content,
            it.note,
            it.shootScript?.scriptTitle,
            it.editScript?.thumbnailTitle,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ")
        .toLowerCase();

      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.requester.name.toLowerCase().includes(q) ||
        t.project.name.toLowerCase().includes(q) ||
        (t.externalSenderName || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        briefText.includes(q)
      );
    });

    // Sắp xếp ưu tiên: Cần sửa -> Đang làm (quá hạn / gấp / deadline sớm) -> Chờ duyệt -> Đã duyệt/Xong
    return [...matched].sort((a, b) => {
      const rankDiff = getStatusSortRank(a.status) - getStatusSortRank(b.status);
      if (rankDiff !== 0) return rankDiff;

      if (getStatusSortRank(a.status) <= 1) {
        const aOver = isTaskOverdue(a) ? 0 : 1;
        const bOver = isTaskOverdue(b) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;

        const aRush = a.isRushOrder ? 0 : 1;
        const bRush = b.isRushOrder ? 0 : 1;
        if (aRush !== bRush) return aRush - bRush;

        const aDue = a.dueAt
          ? new Date(a.dueAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt
          ? new Date(b.dueAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
      }

      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [
    tasks,
    statusFilter,
    requesterFilter,
    projectFilter,
    videoKindFilter,
    searchQuery,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    requesterFilter !== "ALL" ||
    projectFilter !== "ALL" ||
    videoKindFilter !== "ALL";

  const unitWord = isVideoSpecialist ? "video" : "ảnh";

  function toggleKpiFilter(target: OrderStatusFilter) {
    setStatusFilter((cur) => (cur === target ? "OPEN" : target));
  }

  function renderOrderActionButton(t: TaskItem, compact = false) {
    const busy = togglingTaskId === t.id;
    const isCompleted = isCompletedTaskStatus(t.status);
    const requiresApproval = taskRequiresLeaderApproval(t);

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đã xong
        </span>
      );
    }

    if (t.status === "APPROVED_FINAL") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleDone(t)}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {compact ? "Xong" : "Hoàn tất đơn"}
        </button>
      );
    }

    if (t.status === "WAITING_APPROVAL") {
      return (
        <button
          type="button"
          onClick={() => onOpenTask(t.id, false, "OUTPUT_QC")}
          className="rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          {compact ? "Cập nhật" : "Chờ duyệt • Sửa file"}
        </button>
      );
    }

    // REVISION_NEEDED / IN_PROGRESS / BRIEF_REVIEW / DRAFT
    if (requiresApproval) {
      const deliverables = getDeliverableAssets(t);
      const hasDeliverable = deliverables.length > 0;
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmitForReview(t)}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 ${
            t.status === "REVISION_NEEDED"
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          title={
            hasDeliverable
              ? "Gửi thành phẩm đã nộp lên Leader duyệt"
              : "Mở tab Output để dán link thành phẩm và gửi duyệt"
          }
        >
          {hasDeliverable ? (
            <Send className="w-3.5 h-3.5" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {compact
            ? hasDeliverable
              ? "Gửi duyệt"
              : "Nộp bài"
            : t.status === "REVISION_NEEDED"
              ? "Nộp bản sửa"
              : hasDeliverable
                ? "Gửi duyệt"
                : "Nộp bài & Gửi duyệt"}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggleDone(t)}
        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Hoàn tất
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 sm:p-6 space-y-5">
      {/* Header Nhật Ký Hải Trình chuyên biệt cho Design / Edit */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isVideoSpecialist
                ? "bg-violet-100 text-violet-700 border border-violet-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {isVideoSpecialist ? (
              <Clapperboard className="w-5 h-5" />
            ) : (
              <Palette className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {isVideoSpecialist
                ? "Nhật Ký Hải Trình — Order Video Từ Mọi Người"
                : "Nhật Ký Hải Trình — Order Thiết Kế Từ Mọi Người"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isVideoSpecialist
                ? "Tập trung toàn bộ đơn Quay & Dựng video được team order cho bạn — mở xem kịch bản, nộp link thành phẩm và trao đổi feedback trực tiếp."
                : "Tập trung toàn bộ đơn Thiết kế ảnh được team order cho bạn — mở xem brief & kích thước, nộp link thiết kế và trao đổi feedback trực tiếp."}
            </p>
          </div>
        </div>

        {/* Chuyển chế độ Thẻ / Bảng */}
        <div className="inline-flex rounded-xl bg-amber-50 p-0.5 border border-amber-200">
          <button
            type="button"
            onClick={() => setViewMode("CARDS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "CARDS"
                ? "bg-[#0B2545] text-amber-300"
                : "text-slate-700 hover:bg-amber-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Dạng thẻ
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TABLE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "TABLE"
                ? "bg-[#0B2545] text-amber-300"
                : "text-slate-700 hover:bg-amber-100"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Dạng bảng
          </button>
        </div>
      </div>

      {/* 4 Thẻ tổng quan trạng thái (bấm để lọc nhanh) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => toggleKpiFilter("REVISION")}
          className={`text-left rounded-2xl border-2 p-3.5 transition cursor-pointer ${
            statusFilter === "REVISION"
              ? "border-rose-500 bg-rose-50 shadow-sm"
              : summary.revisionCount > 0
                ? "border-rose-200 bg-rose-50/50 hover:border-rose-300"
                : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
              Cần sửa lại
            </span>
            {summary.revisionCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">
              {summary.revisionCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              đơn{summary.revisionUnits > 0 ? ` • ${summary.revisionUnits} ${unitWord}` : ""}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleKpiFilter("WORKING")}
          className={`text-left rounded-2xl border-2 p-3.5 transition cursor-pointer ${
            statusFilter === "WORKING"
              ? "border-sky-500 bg-sky-50 shadow-sm"
              : "border-sky-200 bg-sky-50/40 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-sky-800">
              Đang cần làm
            </span>
            {summary.overdueCount > 0 && (
              <span className="rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-extrabold">
                {summary.overdueCount} trễ
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-900">
              {summary.workingCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              đơn{summary.workingUnits > 0 ? ` • ${summary.workingUnits} ${unitWord}` : ""}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleKpiFilter("WAITING")}
          className={`text-left rounded-2xl border-2 p-3.5 transition cursor-pointer ${
            statusFilter === "WAITING"
              ? "border-violet-500 bg-violet-50 shadow-sm"
              : "border-violet-200 bg-violet-50/40 hover:border-violet-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-violet-800">
              Chờ Leader duyệt
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-violet-900">
              {summary.waitingCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              đơn đã nộp
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleKpiFilter("COMPLETED")}
          className={`text-left rounded-2xl border-2 p-3.5 transition cursor-pointer ${
            statusFilter === "COMPLETED"
              ? "border-emerald-500 bg-emerald-50 shadow-sm"
              : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              Đã duyệt / Xong
            </span>
            {summary.approvedAwaitingDoneCount > 0 && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                {summary.approvedAwaitingDoneCount} đã duyệt
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800">
              {summary.completedCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              đơn hoàn tất
            </span>
          </div>
        </button>
      </div>

      {/* Thanh Tab trạng thái + Bộ lọc chi tiết */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  id: "OPEN",
                  label: `Đang mở (${summary.openCount})`,
                },
                {
                  id: "REVISION",
                  label: `Cần sửa (${summary.revisionCount})`,
                },
                {
                  id: "WORKING",
                  label: `Đang làm (${summary.workingCount})`,
                },
                {
                  id: "WAITING",
                  label: `Chờ duyệt (${summary.waitingCount})`,
                },
                {
                  id: "COMPLETED",
                  label: `Đã xong (${summary.completedCount})`,
                },
                {
                  id: "ALL",
                  label: `Tất cả (${summary.total})`,
                },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === pill.id
                    ? "bg-[#0B2545] text-amber-300 shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {hasAnyVideoTask && (
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {(
                [
                  { id: "ALL", label: "Tất cả video" },
                  { id: "SHOOT_AND_EDIT", label: "🎥 Quay & Dựng" },
                  { id: "EDIT_ONLY", label: "✂️ Dựng Video" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVideoKindFilter(opt.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    videoKindFilter === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hàng tìm kiếm + lọc theo Người order + Dự án */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên order, mã đơn, người đặt, dự án hoặc nội dung brief..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                title="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={requesterFilter}
            onChange={(e) => setRequesterFilter(e.target.value)}
            aria-label="Lọc theo người order"
            className="rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">
              Tất cả người order ({requesterOptions.length})
            </option>
            {requesterOptions.map((req) => (
              <option key={req.id} value={req.id}>
                {req.name} ({req.count})
              </option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Lọc theo dự án"
            className="rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả dự án ({projectOptions.length})</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.count})
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setRequesterFilter("ALL");
                setProjectFilter("ALL");
                setVideoKindFilter("ALL");
              }}
              className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Xóa lọc ({filteredTasks.length})</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Nội dung danh sách Order */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-sm font-extrabold text-slate-800">
            {statusFilter === "OPEN" && !hasActiveFilters
              ? "Hiện chưa có order nào đang chờ xử lý!"
              : "Không tìm thấy order nào khớp bộ lọc hiện tại."}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Khi các thành viên trong team đặt Brief Ảnh hoặc Brief Video cho bạn, đơn hàng sẽ xuất hiện ngay tại đây kèm đầy đủ kích thước, kịch bản và deadline.
          </p>
          {statusFilter === "OPEN" && summary.completedCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 px-3.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Xem {summary.completedCount} đơn đã hoàn tất
            </button>
          )}
        </div>
      ) : viewMode === "CARDS" ? (
        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const overdue = isTaskOverdue(t);
            const dueYmd = t.dueAt ? getVnDateString(new Date(t.dueAt)) : null;
            const isDueToday = dueYmd === todayDate;
            const briefItems = normalizeMediaBriefItems(t.mediaBriefItemsJson);
            const primaryVideoKind =
              t.taskType === "MEDIA_VIDEO"
                ? getTaskPrimaryVideoKind(t.mediaBriefItemsJson)
                : null;
            const totalScriptRows = briefItems.reduce(
              (acc, item) => acc + countFilledScriptRows(item),
              0
            );
            const firstBriefPreviewTitle =
              briefItems[0]?.shootScript?.scriptTitle ||
              briefItems[0]?.editScript?.thumbnailTitle ||
              "";
            const briefRefAsset = getBriefRefAsset(t);
            const deliverableAssets = getDeliverableAssets(t);
            const latestDeliverable =
              deliverableAssets[deliverableAssets.length - 1] ?? null;
            const commentCount = t._count?.comments ?? t.comments?.length ?? 0;

            const leftAccent =
              t.status === "REVISION_NEEDED" || overdue
                ? "border-l-rose-500"
                : t.status === "WAITING_APPROVAL"
                  ? "border-l-violet-500"
                  : t.status === "APPROVED_FINAL" ||
                      t.status === "DONE" ||
                      t.status === "PUBLISHED"
                    ? "border-l-emerald-500"
                    : "border-l-sky-500";

            return (
              <div
                key={t.id}
                className={`rounded-2xl border border-slate-200/90 border-l-4 ${leftAccent} bg-white hover:border-amber-300/90 hover:shadow-sm transition p-4 space-y-3`}
              >
                {/* Hàng trên: Người order + Dự án + Mã đơn + Trạng thái */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200 pl-1 pr-2.5 py-0.5">
                      <PirateAvatar
                        name={t.requester.name}
                        color={t.requester.avatarColor}
                        pirateCharacter={t.requester.pirateCharacter}
                        size="sm"
                      />
                      <span className="text-[11px] text-slate-500 font-medium">
                        Order từ
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {t.requester.name}
                      </span>
                    </div>

                    {t.isOutsideDepartment && (
                      <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                        📋 Ngoài team
                        {t.externalSenderName ? ` • ${t.externalSenderName}` : ""}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.project.color }}
                      />
                      {t.project.name}
                    </span>

                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                      {t.code}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Đặt {formatVnDate(t.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.isRushOrder && (
                      <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[11px] font-extrabold text-rose-700">
                        ⚡ Gấp
                      </span>
                    )}
                    <TaskStatusBadge status={t.status} />
                  </div>
                </div>

                {/* Hàng giữa: Tiêu đề + Thông số số lượng / Loại video / Kích thước ảnh */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenTask(t.id, false, "OVERVIEW")}
                    className="text-left text-base font-extrabold text-slate-900 hover:text-amber-700 transition cursor-pointer leading-snug"
                  >
                    {t.title}
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Số lượng sản phẩm */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-extrabold ${
                        t.taskType === "MEDIA_VIDEO"
                          ? "bg-violet-50 border-violet-200 text-violet-800"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      {t.taskType === "MEDIA_VIDEO" ? (
                        <Film className="w-3.5 h-3.5" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      {getOrderUnitLabel(t)}
                    </span>

                    {/* Phân loại Video (Loại 1 / Loại 2) */}
                    {primaryVideoKind && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold ${VIDEO_ORDER_KIND_META[primaryVideoKind].badgeClass}`}
                      >
                        <span>
                          {VIDEO_ORDER_KIND_META[primaryVideoKind].badgeEmoji}
                        </span>
                        <span>
                          {VIDEO_ORDER_KIND_META[primaryVideoKind].label}
                        </span>
                        {totalScriptRows > 0 && (
                          <span className="opacity-80">
                            • {totalScriptRows}{" "}
                            {primaryVideoKind === "SHOOT_AND_EDIT"
                              ? "cảnh"
                              : "scene"}
                          </span>
                        )}
                      </span>
                    )}

                    {/* Kích thước ảnh trong Brief */}
                    {t.taskType === "MEDIA_IMAGE" &&
                      briefItems.slice(0, 4).map((item, idx) => (
                        <span
                          key={item.id || idx}
                          className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          Ảnh {idx + 1}: {getShortRatioBadge(item.ratio)}
                        </span>
                      ))}
                    {t.taskType === "MEDIA_IMAGE" && briefItems.length > 4 && (
                      <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        +{briefItems.length - 4} ảnh khác
                      </span>
                    )}

                    {/* Tỷ lệ video nếu có */}
                    {t.taskType === "MEDIA_VIDEO" && briefItems[0]?.ratio && (
                      <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {getShortRatioBadge(briefItems[0].ratio)}
                      </span>
                    )}

                    {/* Link Brief nhanh */}
                    {briefRefAsset && (
                      <a
                        href={briefRefAsset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-800 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link Brief / Tư liệu
                      </a>
                    )}

                    {/* Thành phẩm đã nộp */}
                    {latestDeliverable && (
                      <a
                        href={latestDeliverable.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800 transition"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Đã nộp {deliverableAssets.length} file
                      </a>
                    )}
                  </div>

                  {/* Dòng tóm tắt kịch bản hoặc mô tả ngắn */}
                  {firstBriefPreviewTitle &&
                  firstBriefPreviewTitle.toLowerCase() !==
                    t.title.toLowerCase() ? (
                    <p className="text-xs text-slate-600 line-clamp-1">
                      <span className="font-bold text-slate-700">
                        {primaryVideoKind === "EDIT_ONLY"
                          ? "Thumbnail: "
                          : "Kịch bản: "}
                      </span>
                      {firstBriefPreviewTitle}
                    </p>
                  ) : t.description ? (
                    <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-line">
                      {t.description}
                    </p>
                  ) : null}
                </div>

                {/* Hàng đáy: Deadline + Nút thao tác nhanh */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${
                        overdue
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : isDueToday
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {overdue ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>
                        Deadline: {formatVnDateTime(t.dueAt)}
                        {overdue
                          ? " • Quá hạn"
                          : isDueToday
                            ? " • Hôm nay"
                            : ""}
                      </span>
                    </span>

                    {t.revisionCount > 0 && (
                      <span className="rounded-xl bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700">
                        Sửa lần {t.revisionCount}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenTask(t.id, false, "OVERVIEW")}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-800 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      Xem Brief
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTask(t.id, true, "CHAT")}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                        commentCount > 0
                          ? "border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Feedback</span>
                      {commentCount > 0 && (
                        <span className="rounded-full bg-sky-600 text-white px-1.5 py-0.2 text-[10px] font-extrabold">
                          {commentCount}
                        </span>
                      )}
                    </button>

                    {renderOrderActionButton(t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Chế độ Dạng bảng gọn gàng */
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Người order</th>
                <th className="py-2.5 px-3">Đơn hàng &amp; Dự án</th>
                <th className="py-2.5 px-3 text-center">Số lượng</th>
                <th className="py-2.5 px-3">Deadline</th>
                <th className="py-2.5 px-3">Tình trạng</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.map((t, idx) => {
                const overdue = isTaskOverdue(t);
                const dueYmd = t.dueAt
                  ? getVnDateString(new Date(t.dueAt))
                  : null;
                const isDueToday = dueYmd === todayDate;
                const primaryVideoKind =
                  t.taskType === "MEDIA_VIDEO"
                    ? getTaskPrimaryVideoKind(t.mediaBriefItemsJson)
                    : null;
                const commentCount =
                  t._count?.comments ?? t.comments?.length ?? 0;

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-amber-50/40 transition align-middle"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <PirateAvatar
                          name={t.requester.name}
                          color={t.requester.avatarColor}
                          pirateCharacter={t.requester.pirateCharacter}
                          size="sm"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {t.requester.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatVnDate(t.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-[300px]">
                      <button
                        type="button"
                        onClick={() => onOpenTask(t.id, false, "OVERVIEW")}
                        className="text-left font-extrabold text-slate-900 hover:text-amber-700 line-clamp-1 cursor-pointer"
                      >
                        {t.title}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          {t.code}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: t.project.color }}
                          />
                          {t.project.name}
                        </span>
                        {primaryVideoKind && (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${VIDEO_ORDER_KIND_META[primaryVideoKind].badgeClass}`}
                          >
                            {VIDEO_ORDER_KIND_META[primaryVideoKind].badgeEmoji}{" "}
                            {VIDEO_ORDER_KIND_META[primaryVideoKind].shortLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 font-extrabold text-amber-900">
                        {getOrderUnitLabel(t)}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div
                        className={`font-bold ${
                          overdue
                            ? "text-rose-700"
                            : isDueToday
                              ? "text-amber-800"
                              : "text-slate-700"
                        }`}
                      >
                        {formatVnDateTime(t.dueAt)}
                      </div>
                      {overdue && (
                        <div className="text-[10px] font-extrabold text-rose-600">
                          Quá hạn
                        </div>
                      )}
                      {!overdue && isDueToday && (
                        <div className="text-[10px] font-bold text-amber-700">
                          Hôm nay
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <TaskStatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenTask(t.id, false, "OVERVIEW")}
                          className="rounded-lg border border-slate-200 bg-white hover:bg-amber-50 px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                        >
                          Brief
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenTask(t.id, true, "CHAT")}
                          className="rounded-lg border border-slate-200 bg-white hover:bg-sky-50 px-2 py-1 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                          title="Feedback"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {commentCount > 0 ? commentCount : ""}
                        </button>
                        {renderOrderActionButton(t, true)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
