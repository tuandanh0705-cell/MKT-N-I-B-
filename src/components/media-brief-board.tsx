"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Plus,
  Scissors,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { TASK_STATUS_META } from "@/lib/constants";
import { getPresetDateTimeLocal } from "@/lib/dates";
import {
  createEmptyMediaBriefItem,
  getTaskPrimaryVideoKind,
  type VideoOrderKind,
} from "@/lib/media-brief";
import { canUserDeleteTask, softDeleteTasksByIds } from "@/lib/task-delete";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { MediaBriefRow, formatVnShortDate } from "@/components/media-brief-row";
import { useToast } from "@/components/toast-provider";
import type { SimpleProject, SimpleUser, TaskItem } from "@/types/crm";
import type { TaskStatus, UserRole } from "@/generated/prisma/client";

export type MediaBriefKind = "MEDIA_IMAGE" | "MEDIA_VIDEO";
export type MediaBriefTabKind = MediaBriefKind | "OUTSIDE_TEAM";

interface MediaBriefBoardProps {
  tasks: TaskItem[];
  projects?: SimpleProject[];
  defaultProjectId?: string;
  users: SimpleUser[];
  currentUserId: string;
  currentUserRole: UserRole;
  showProjectColumn?: boolean;
  onSelectTask: (taskId: string) => void;
  onTaskCreated: (task: TaskItem) => void;
  onTaskUpdated: (task: TaskItem) => void;
  onTaskDeleted?: (taskId: string) => void;
  onOpenCreateModal?: (kind: MediaBriefKind, videoKind?: VideoOrderKind) => void;
}

const ALL_STATUSES: TaskStatus[] = [
  "DRAFT",
  "BRIEF_REVIEW",
  "IN_PROGRESS",
  "WAITING_APPROVAL",
  "REVISION_NEEDED",
  "APPROVED_FINAL",
  "PUBLISHED",
  "DONE",
];

const MEMBER_EDITABLE_STATUSES = new Set<TaskStatus>([
  "DRAFT",
  "BRIEF_REVIEW",
  "IN_PROGRESS",
  "WAITING_APPROVAL",
]);

export function MediaBriefBoard({
  tasks,
  projects = [],
  defaultProjectId,
  users,
  currentUserId,
  currentUserRole,
  showProjectColumn = false,
  onSelectTask,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onOpenCreateModal,
}: MediaBriefBoardProps) {
  const { showToast } = useToast();

  // Chọn loại tab: Brief Ảnh, Brief Video hoặc Đơn Ngoài Team
  const [briefKind, setBriefKind] = useState<MediaBriefTabKind>("MEDIA_IMAGE");
  const [videoKindFilter, setVideoKindFilter] = useState<
    "ALL" | VideoOrderKind
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Chế độ xóa nhanh & xóa hàng loạt
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // Dòng thêm nhanh Brief ngay trên bảng
  const [quickOpen, setQuickOpen] = useState(false);
  const [qProjectId, setQProjectId] = useState(
    defaultProjectId || projects[0]?.id || ""
  );
  const [qTitle, setQTitle] = useState("");
  const [qQty, setQQty] = useState(1);
  const [qVideoKind, setQVideoKind] =
    useState<VideoOrderKind>("SHOOT_AND_EDIT");
  const [qDeadline, setQDeadline] = useState(() =>
    getPresetDateTimeLocal(2, 17, 30)
  );
  const [qAssigneeId, setQAssigneeId] = useState("");
  const [qBriefUrl, setQBriefUrl] = useState("");
  const [qNote, setQNote] = useState("");
  const [creatingQuick, setCreatingQuick] = useState(false);

  const isImage = briefKind === "MEDIA_IMAGE";
  const isOutside = briefKind === "OUTSIDE_TEAM";
  const qtyColumnLabel =
    briefKind === "MEDIA_VIDEO"
      ? "Số lượng video"
      : isOutside
        ? "Số lượng"
        : "Số lượng ảnh";
  const unitLabel =
    briefKind === "MEDIA_VIDEO" ? "video" : isOutside ? "sp" : "ảnh";

  const mediaTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.taskType === "MEDIA_IMAGE" ||
        t.taskType === "MEDIA_VIDEO" ||
        t.isMediaOrder ||
        t.isOutsideDepartment
    );
  }, [tasks]);

  const imageCount = useMemo(
    () =>
      mediaTasks.filter(
        (t) =>
          t.taskType !== "MEDIA_VIDEO" &&
          (t.isMediaOrder || t.taskType === "MEDIA_IMAGE")
      ).length,
    [mediaTasks]
  );
  const videoCount = useMemo(
    () => mediaTasks.filter((t) => t.taskType === "MEDIA_VIDEO").length,
    [mediaTasks]
  );
  const shootVideoCount = useMemo(
    () =>
      mediaTasks.filter(
        (t) =>
          t.taskType === "MEDIA_VIDEO" &&
          getTaskPrimaryVideoKind(t.mediaBriefItemsJson) === "SHOOT_AND_EDIT"
      ).length,
    [mediaTasks]
  );
  const editVideoCount = useMemo(
    () =>
      mediaTasks.filter(
        (t) =>
          t.taskType === "MEDIA_VIDEO" &&
          getTaskPrimaryVideoKind(t.mediaBriefItemsJson) === "EDIT_ONLY"
      ).length,
    [mediaTasks]
  );
  const outsideCount = useMemo(
    () => mediaTasks.filter((t) => Boolean(t.isOutsideDepartment)).length,
    [mediaTasks]
  );

  const rows = useMemo(() => {
    return mediaTasks
      .filter((t) => {
        const matchesKind =
          briefKind === "OUTSIDE_TEAM"
            ? Boolean(t.isOutsideDepartment)
            : briefKind === "MEDIA_IMAGE"
              ? t.taskType !== "MEDIA_VIDEO" &&
                (t.isMediaOrder || t.taskType === "MEDIA_IMAGE")
              : t.taskType === "MEDIA_VIDEO";
        if (!matchesKind) return false;
        if (briefKind === "MEDIA_VIDEO" && videoKindFilter !== "ALL") {
          if (getTaskPrimaryVideoKind(t.mediaBriefItemsJson) !== videoKindFilter) {
            return false;
          }
        }
        if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
        if (
          showProjectColumn &&
          projectFilter !== "ALL" &&
          t.project.id !== projectFilter
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const hit =
            t.title.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            (t.assignee?.name.toLowerCase().includes(q) ?? false);
          if (!hit) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [
    mediaTasks,
    briefKind,
    videoKindFilter,
    statusFilter,
    showProjectColumn,
    projectFilter,
    searchQuery,
  ]);

  const totalUnits = useMemo(
    () => rows.reduce((s, r) => s + Math.max(1, r.quantity || 1), 0),
    [rows]
  );

  const deletableRowIds = useMemo(
    () =>
      rows
        .filter((r) => canUserDeleteTask(r, currentUserId, currentUserRole))
        .map((r) => r.id),
    [rows, currentUserId, currentUserRole]
  );

  function toggleSelectDelete(taskId: string) {
    setSelectedDeleteIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  async function executeDelete(ids: string[]) {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const { deletedIds } = await softDeleteTasksByIds(ids);
      const removed = new Set(deletedIds);
      for (const id of deletedIds) {
        onTaskDeleted?.(id);
      }
      setSelectedDeleteIds((prev) => prev.filter((id) => !removed.has(id)));
      if (deletedIds.length > 0) {
        showToast(`Đã chuyển ${deletedIds.length} Order Media vào Thùng rác.`);
      } else {
        showToast("Không xóa được Order Media đã chọn.", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmIds(null);
    }
  }

  async function patchMediaTask(
    taskId: string,
    payload: Record<string, unknown>,
    successMsg?: string
  ) {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được Order Media.", "error");
        return;
      }
      onTaskUpdated(data.task);
      if (successMsg) showToast(successMsg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    const targetProjectId = defaultProjectId || qProjectId || projects[0]?.id;
    if (!targetProjectId || !qTitle.trim()) return;
    setCreatingQuick(true);
    try {
      const isQuickVideo = briefKind === "MEDIA_VIDEO";
      const quickQty = Math.max(1, Number(qQty || 1));
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          title: qTitle.trim(),
          taskType: isQuickVideo ? "MEDIA_VIDEO" : "MEDIA_IMAGE",
          isMediaOrder: true,
          isOutsideDepartment: briefKind === "OUTSIDE_TEAM",
          quantity: quickQty,
          dueAt: qDeadline ? new Date(qDeadline).toISOString() : null,
          assigneeId: qAssigneeId || null,
          briefLinkUrl: qBriefUrl.trim() || undefined,
          description: qNote.trim() || null,
          platform: isQuickVideo ? "TikTok" : "Fanpage",
          ...(isQuickVideo
            ? {
                mediaBriefItemsJson: Array.from({ length: quickQty }, () =>
                  createEmptyMediaBriefItem(true, undefined, undefined, qVideoKind)
                ),
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được Brief Media.", "error");
        return;
      }
      onTaskCreated(data.task);
      setQTitle("");
      setQQty(1);
      setQBriefUrl("");
      setQNote("");
      showToast(
        `Đã tạo ${
          isOutside
            ? "Đơn Ngoài Team"
            : isImage
              ? "Brief Ảnh"
              : "Brief Video"
        } ${data.task.code}!`
      );
    } finally {
      setCreatingQuick(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Thanh Chọn 1 trong 2: Brief Ảnh / Brief Video + Hành động */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* Segmented control chọn loại Brief */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Brief Media:
            </span>
            <div
              role="radiogroup"
              aria-label="Chọn loại Brief Media"
              className="flex flex-wrap sm:inline-flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={briefKind === "MEDIA_IMAGE"}
                onClick={() => setBriefKind("MEDIA_IMAGE")}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer whitespace-nowrap ${
                  briefKind === "MEDIA_IMAGE"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                <span>Brief Ảnh</span>
                <span className="rounded-full bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold">
                  {imageCount}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={briefKind === "MEDIA_VIDEO"}
                onClick={() => setBriefKind("MEDIA_VIDEO")}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer whitespace-nowrap ${
                  briefKind === "MEDIA_VIDEO"
                    ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600 shrink-0" />
                <span>Brief Video</span>
                <span className="rounded-full bg-violet-50 text-violet-700 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold">
                  {videoCount}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={briefKind === "OUTSIDE_TEAM"}
                onClick={() => setBriefKind("OUTSIDE_TEAM")}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer whitespace-nowrap ${
                  briefKind === "OUTSIDE_TEAM"
                    ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-300"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📋 Đơn Ngoài Team</span>
                <span className="rounded-full bg-amber-50 text-amber-800 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold">
                  {outsideCount}
                </span>
              </button>
            </div>
          </div>

          {/* Nút thêm nhanh, chế độ xóa & Tạo form đầy đủ */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDeleteMode((v) => !v);
                setSelectedDeleteIds([]);
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                deleteMode
                  ? "border-rose-600 bg-rose-600 text-white shadow-xs"
                  : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteMode ? "Đang bật Chế độ xóa" : "Chế độ xóa"}
            </button>
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {quickOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {quickOpen ? "Đóng thêm nhanh" : "+ Thêm dòng nhanh"}
            </button>
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenCreateModal(
                    briefKind === "MEDIA_VIDEO" ? "MEDIA_VIDEO" : "MEDIA_IMAGE"
                  )
                }
                className={`rounded-xl text-white px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  briefKind === "MEDIA_VIDEO"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {briefKind === "MEDIA_VIDEO" ? (
                  <Film className="w-3.5 h-3.5" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {briefKind === "MEDIA_VIDEO" ? "+ Tạo Brief Video" : "+ Tạo Brief Ảnh"}
              </button>
            )}
          </div>
        </div>

        {deleteMode && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-rose-900 font-semibold">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Chế độ xóa đang bật — Đã chọn{" "}
                <strong>{selectedDeleteIds.length}</strong> /{" "}
                {deletableRowIds.length} order
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {deletableRowIds.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDeleteIds(
                      selectedDeleteIds.length === deletableRowIds.length
                        ? []
                        : deletableRowIds
                    )
                  }
                  className="rounded-lg border border-rose-200 bg-white hover:bg-rose-100 text-rose-800 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                >
                  {selectedDeleteIds.length === deletableRowIds.length
                    ? "Bỏ chọn hết"
                    : "Chọn tất cả"}
                </button>
              )}
              <button
                type="button"
                disabled={selectedDeleteIds.length === 0 || deleting}
                onClick={() => setDeleteConfirmIds(selectedDeleteIds)}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Xóa đã chọn ({selectedDeleteIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteMode(false);
                  setSelectedDeleteIds([]);
                }}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                Thoát
              </button>
            </div>
          </div>
        )}

        {/* Phân loại riêng cho tab Brief Video: Loại 1 Quay & Dựng | Loại 2 Dựng Video */}
        {briefKind === "MEDIA_VIDEO" && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-emerald-950 mr-1">
                Phân loại Video:
              </span>
              <button
                type="button"
                onClick={() => setVideoKindFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  videoKindFilter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Tất cả ({videoCount})
              </button>
              <button
                type="button"
                onClick={() => setVideoKindFilter("SHOOT_AND_EDIT")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                  videoKindFilter === "SHOOT_AND_EDIT"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                <Clapperboard className="w-3 h-3" />
                Loại 1: Quay &amp; Dựng ({shootVideoCount})
              </button>
              <button
                type="button"
                onClick={() => setVideoKindFilter("EDIT_ONLY")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                  videoKindFilter === "EDIT_ONLY"
                    ? "bg-violet-700 text-white shadow-2xs"
                    : "bg-white border border-violet-200 text-violet-800 hover:bg-violet-50"
                }`}
              >
                <Scissors className="w-3 h-3" />
                Loại 2: Dựng Video ({editVideoCount})
              </button>
            </div>

            {onOpenCreateModal && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenCreateModal("MEDIA_VIDEO", "SHOOT_AND_EDIT")
                  }
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Clapperboard className="w-3 h-3" />
                  + Order Quay &amp; Dựng
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCreateModal("MEDIA_VIDEO", "EDIT_ONLY")}
                  className="rounded-lg bg-violet-700 hover:bg-violet-800 text-white px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Scissors className="w-3 h-3" />
                  + Order Dựng Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bộ lọc gọn & Tổng số lượng */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Tìm tiêu đề, mã, PIC trong ${
                  isOutside
                    ? "Đơn Ngoài Team"
                    : isImage
                      ? "Brief Ảnh"
                      : "Brief Video"
                }...`}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {showProjectColumn && projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả tình trạng</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {TASK_STATUS_META[st].shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
            <span>{rows.length} order</span>
            <span className="text-slate-300">•</span>
            <span
              className={
                isOutside
                  ? "text-amber-700"
                  : isImage
                    ? "text-blue-700"
                    : "text-violet-700"
              }
            >
              Tổng {totalUnits} {unitLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bảng Brief Ảnh / Brief Video đúng cấu trúc STT | Ngày order | Tình trạng | Deadline | Số lượng ảnh/video | Tiêu đề */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              {deleteMode && (
                <th className="py-3 px-2.5 w-20 text-center bg-rose-50 text-rose-700">
                  <div className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={
                        deletableRowIds.length > 0 &&
                        selectedDeleteIds.length === deletableRowIds.length
                      }
                      onChange={() =>
                        setSelectedDeleteIds(
                          selectedDeleteIds.length === deletableRowIds.length
                            ? []
                            : deletableRowIds
                        )
                      }
                      className="rounded border-rose-300 cursor-pointer"
                    />
                    <span>Xóa</span>
                  </div>
                </th>
              )}
              <th className="py-3 px-3 w-12 text-center">STT</th>
              {showProjectColumn && <th className="py-3 px-3">Dự án</th>}
              <th className="py-3 px-3 whitespace-nowrap">Ngày order</th>
              <th className="py-3 px-3 whitespace-nowrap">Tình trạng</th>
              <th className="py-3 px-3 whitespace-nowrap">Deadline</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">
                {qtyColumnLabel}
              </th>
              <th className="py-3 px-3 min-w-[260px]">Tiêu đề</th>
              <th className="py-3 px-3 whitespace-nowrap text-right">Chi tiết</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {quickOpen && (
              <tr className={isImage ? "bg-blue-50/50" : "bg-violet-50/50"}>
                {deleteMode && (
                  <td className="py-2.5 px-2.5 text-center text-slate-300">—</td>
                )}
                <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                  +
                </td>
                {showProjectColumn && (
                  <td className="py-2.5 px-3">
                    <select
                      value={qProjectId}
                      onChange={(e) => setQProjectId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="py-2.5 px-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {formatVnShortDate(new Date())}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                    Đang làm
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <input
                    type="datetime-local"
                    value={qDeadline}
                    onChange={(e) => setQDeadline(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  />
                </td>
                <td className="py-2.5 px-3 text-center">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={qQty}
                    onChange={(e) =>
                      setQQty(Math.max(1, Number(e.target.value || 1)))
                    }
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-center font-bold"
                  />
                </td>
                <td className="py-2.5 px-3 space-y-1.5">
                  <input
                    type="text"
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickCreate(e);
                      }
                    }}
                    placeholder={
                      isImage
                        ? "Nhập tiêu đề Brief Ảnh (vd: Bộ 5 ảnh Feedback)..."
                        : "Nhập tiêu đề Brief Video (vd: Video Reels giới thiệu SP)..."
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {briefKind === "MEDIA_VIDEO" && (
                      <select
                        value={qVideoKind}
                        onChange={(e) =>
                          setQVideoKind(e.target.value as VideoOrderKind)
                        }
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-900"
                      >
                        <option value="SHOOT_AND_EDIT">
                          🎥 Loại 1: Quay &amp; Dựng
                        </option>
                        <option value="EDIT_ONLY">
                          ✂️ Loại 2: Dựng Video
                        </option>
                      </select>
                    )}
                    <select
                      value={qAssigneeId}
                      onChange={(e) => setQAssigneeId(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                    >
                      <option value="">-- Giao Media --</option>
                      {users
                        .filter((u) => u.isActive !== false)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="url"
                      value={qBriefUrl}
                      onChange={(e) => setQBriefUrl(e.target.value)}
                      placeholder="Link Brief Drive/Canva (nếu có)..."
                      className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                    />
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    disabled={creatingQuick || !qTitle.trim()}
                    onClick={handleQuickCreate}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    {creatingQuick ? "Đang lưu..." : "Lưu order"}
                  </button>
                </td>
              </tr>
            )}

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={(showProjectColumn ? 8 : 7) + (deleteMode ? 1 : 0)}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  Chưa có{" "}
                  {isOutside
                    ? "Đơn Ngoài Team"
                    : isImage
                      ? "Brief Ảnh"
                      : "Brief Video"}{" "}
                  nào khớp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map((t, idx) => (
                <MediaBriefRow
                  key={t.id}
                  task={t}
                  index={idx}
                  isImageTab={isImage}
                  isOutsideTab={isOutside}
                  qtyColumnLabel={qtyColumnLabel}
                  unitLabel={unitLabel}
                  showProjectColumn={showProjectColumn}
                  deleteMode={deleteMode}
                  isSelectedForDelete={selectedDeleteIds.includes(t.id)}
                  busy={busyId === t.id}
                  deleting={deleting}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  allStatuses={ALL_STATUSES}
                  memberEditableStatuses={MEMBER_EDITABLE_STATUSES}
                  onSelectTask={onSelectTask}
                  onPatchTask={patchMediaTask}
                  onToggleSelectDelete={toggleSelectDelete}
                  onRequestDeleteSingle={(taskId) => setDeleteConfirmIds([taskId])}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteConfirmIds && deleteConfirmIds.length > 0)}
        loading={deleting}
        itemName={
          deleteConfirmIds && deleteConfirmIds.length > 1
            ? `${deleteConfirmIds.length} Order Media đã chọn`
            : rows.find((r) => r.id === deleteConfirmIds?.[0])?.title ||
              "Order Media này"
        }
        description="Order Media sẽ được chuyển vào Thùng rác (có thể khôi phục lại)."
        onCancel={() => setDeleteConfirmIds(null)}
        onConfirm={() => {
          if (deleteConfirmIds) executeDelete(deleteConfirmIds);
        }}
      />
    </div>
  );
}
