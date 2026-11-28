"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  PenLine,
  Plus,
  RotateCw,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { getVnDateString, getVnTimeString } from "@/lib/dates";
import {
  CONTENT_PLATFORM_OPTIONS,
  isContentTaskItem,
  getContentStatusDisplay,
} from "@/lib/content-plan";
import {
  getPlatformChannelMeta,
  normalizePlatformSelectValue,
} from "@/lib/platform-meta";
import { canUserDeleteTask, softDeleteTasksByIds } from "@/lib/task-delete";
import { formatTaskAssigneesLabel, getTaskAssignees } from "@/lib/task-assignees";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { PlatformLogo } from "@/components/platform-logo";
import { PublishChannelInput } from "@/components/publish-channel-input";
import { useToast } from "@/components/toast-provider";
import type { ProjectChannelSuggestions, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ProjectPublishCalendarProps {
  tasks: TaskItem[];
  channelSuggestions?: ProjectChannelSuggestions | null;
  currentUserId?: string;
  currentUserRole?: UserRole;
  onTaskUpdated?: (task: TaskItem) => void;
  onTaskDeleted?: (taskId: string) => void;
  onOpenContentPost: (task: TaskItem) => void;
  onOpenTaskDrawer: (task: TaskItem) => void;
  onCreatePostForDate: (dateStr: string) => void;
}

const WEEKDAYS_SUN_TO_SAT = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

const QUICK_PRIMARY_PLATFORMS = ["Fanpage", "TikTok", "WEB"] as const;

function getVnTimeLabel(input: string | Date | null | undefined): string {
  if (!input) return "19:00";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "19:00";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
  const anchor = new Date(`${ymd}T12:00:00+07:00`);
  anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
  return getVnDateString(anchor);
}

export function ProjectPublishCalendarPanel({
  tasks,
  channelSuggestions,
  currentUserId,
  currentUserRole,
  onTaskUpdated,
  onTaskDeleted,
  onOpenContentPost,
  onOpenTaskDrawer,
  onCreatePostForDate,
}: ProjectPublishCalendarProps) {
  const { showToast } = useToast();
  const todayStr = getVnDateString();
  const [calMode, setCalMode] = useState<"MONTH" | "WEEK">("MONTH");
  const [cursorDateStr, setCursorDateStr] = useState<string>(todayStr);
  const [expandedDayStr, setExpandedDayStr] = useState<string | null>(null);

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editPlatform, setEditPlatform] = useState("Fanpage");
  const [editChannel, setEditChannel] = useState("");
  const [editPublishDate, setEditPublishDate] = useState("");
  const [editPublishTime, setEditPublishTime] = useState("09:00");
  const [savingDetail, setSavingDetail] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingDetail, setDeletingDetail] = useState(false);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dropTargetDateStr, setDropTargetDateStr] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  const scheduledPosts = useMemo(() => {
    return tasks.filter(
      (t) =>
        isContentTaskItem(t) ||
        Boolean(t.scheduledPublishAt) ||
        (!t.isMediaOrder && t.taskType !== "ADS_CAMPAIGN" && t.taskType !== "WEB_SEO")
    );
  }, [tasks]);

  const detailPost = useMemo(
    () => (detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null),
    [detailTaskId, tasks]
  );

  const postsByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of scheduledPosts) {
      const refDate = t.scheduledPublishAt ?? t.dueAt;
      if (!refDate) continue;
      const ymd = getVnDateString(new Date(refDate));
      const existing = map.get(ymd) ?? [];
      existing.push(t);
      map.set(ymd, existing);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const ta = new Date(a.scheduledPublishAt ?? a.dueAt ?? 0).getTime();
        const tb = new Date(b.scheduledPublishAt ?? b.dueAt ?? 0).getTime();
        return ta - tb;
      });
    }
    return map;
  }, [scheduledPosts]);

  const cursorYear = Number(cursorDateStr.slice(0, 4));
  const cursorMonth = Number(cursorDateStr.slice(5, 7));

  const monthCells = useMemo(() => {
    const firstDayStr = `${cursorYear}-${String(cursorMonth).padStart(2, "0")}-01`;
    const firstAnchor = new Date(`${firstDayStr}T12:00:00+07:00`);
    const firstDow = firstAnchor.getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursorYear, cursorMonth, 0)).getUTCDate();
    const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      inCurrentMonth: boolean;
    }> = [];
    for (let i = 0; i < totalCells; i++) {
      const ymd = addDaysToYmd(firstDayStr, i - firstDow);
      cells.push({
        dateStr: ymd,
        dayNum: Number(ymd.slice(8, 10)),
        inCurrentMonth: Number(ymd.slice(5, 7)) === cursorMonth,
      });
    }
    return cells;
  }, [cursorYear, cursorMonth]);

  const weekCells = useMemo(() => {
    const anchor = new Date(`${cursorDateStr}T12:00:00+07:00`);
    const dow = anchor.getUTCDay();
    const startSun = addDaysToYmd(cursorDateStr, -dow);
    return Array.from({ length: 7 }, (_, i) => {
      const ymd = addDaysToYmd(startSun, i);
      return {
        dateStr: ymd,
        dayNum: Number(ymd.slice(8, 10)),
        weekdayLabel: WEEKDAYS_SUN_TO_SAT[i],
      };
    });
  }, [cursorDateStr]);

  function shiftCursor(direction: -1 | 1) {
    if (calMode === "WEEK") {
      setCursorDateStr((prev) => addDaysToYmd(prev, direction * 7));
      return;
    }
    const base = new Date(Date.UTC(cursorYear, cursorMonth - 1 + direction, 1, 5, 0, 0));
    setCursorDateStr(getVnDateString(base));
  }

  function openPostDetail(t: TaskItem) {
    setDetailTaskId(t.id);
    setEditPlatform(normalizePlatformSelectValue(t.platform));
    setEditChannel(t.publishChannel || "");
    const refDate = t.scheduledPublishAt ?? t.dueAt;
    setEditPublishDate(refDate ? getVnDateString(new Date(refDate)) : todayStr);
    setEditPublishTime(getVnTimeString(refDate, "09:00"));
  }

  async function handleDropPostOnDate(postId: string, targetDateStr: string) {
    setDraggedPostId(null);
    setDropTargetDateStr(null);
    const post = tasks.find((t) => t.id === postId);
    if (!post) return;

    const currentRef = post.scheduledPublishAt ?? post.dueAt;
    const currentYmd = currentRef ? getVnDateString(new Date(currentRef)) : "";
    if (currentYmd === targetDateStr) return;

    const preservedTime = getVnTimeString(currentRef, "09:00");
    const nextIso = `${targetDateStr}T${preservedTime}:00+07:00`;

    setReschedulingId(postId);
    try {
      const res = await fetch(`/api/tasks/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledPublishAt: nextIso }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không dời được lịch đăng bài.", "error");
        return;
      }
      onTaskUpdated?.(data.task);
      const ddmm = `${targetDateStr.slice(8, 10)}/${targetDateStr.slice(5, 7)}`;
      showToast(`Đã dời lịch "${post.title}" sang ${ddmm} lúc ${preservedTime}!`);
    } catch {
      showToast("Lỗi kết nối khi dời lịch bài viết.", "error");
    } finally {
      setReschedulingId(null);
    }
  }

  async function saveDetailChannel() {
    if (!detailPost) return;
    setSavingDetail(true);
    try {
      const nextScheduled = editPublishDate
        ? `${editPublishDate}T${editPublishTime || "09:00"}:00+07:00`
        : null;
      const res = await fetch(`/api/tasks/${detailPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: editPlatform,
          publishChannel: editChannel.trim() || null,
          scheduledPublishAt: nextScheduled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được lịch & kênh đăng.", "error");
        return;
      }
      onTaskUpdated?.(data.task);
      showToast("Đã cập nhật lịch đăng & nền tảng bài viết!");
    } finally {
      setSavingDetail(false);
    }
  }

  function isReadyPost(t: TaskItem): boolean {
    return (
      Boolean(t.isAired) ||
      t.status === "APPROVED_FINAL" ||
      t.status === "PUBLISHED" ||
      t.status === "DONE"
    );
  }

  const expandedPosts = expandedDayStr ? postsByDate.get(expandedDayStr) ?? [] : [];
  const detailMeta = detailPost ? getPlatformChannelMeta(editPlatform) : null;
  const detailOrigRef = detailPost
    ? detailPost.scheduledPublishAt ?? detailPost.dueAt
    : null;
  const detailOrigDate = detailOrigRef
    ? getVnDateString(new Date(detailOrigRef))
    : "";
  const detailOrigTime = getVnTimeString(detailOrigRef, "09:00");
  const detailDirty =
    detailPost !== null &&
    (normalizePlatformSelectValue(detailPost.platform) !== editPlatform ||
      (detailPost.publishChannel || "") !== editChannel.trim() ||
      detailOrigDate !== editPublishDate ||
      detailOrigTime !== editPublishTime);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Thanh điều hướng kiểu Lịch chuẩn */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setCalMode("WEEK")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                calMode === "WEEK"
                  ? "bg-sky-50 text-sky-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setCalMode("MONTH")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                calMode === "MONTH"
                  ? "bg-sky-50 text-sky-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tháng
            </button>
          </div>

          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => shiftCursor(-1)}
              title="Trước"
              className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursorDateStr(todayStr)}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 border-x border-slate-200 cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => shiftCursor(1)}
              title="Sau"
              className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
          {calMode === "WEEK" && weekCells.length === 7
            ? `Tuần ${weekCells[0].dayNum}/${weekCells[0].dateStr.slice(5, 7)} → ${weekCells[6].dayNum}/${weekCells[6].dateStr.slice(5, 7)}/${weekCells[6].dateStr.slice(0, 4)}`
            : `Tháng ${cursorMonth} ${cursorYear}`}
        </h2>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 text-teal-800 px-2 py-1">
              <FileText className="w-3 h-3 text-teal-600" />
              Đã duyệt / Lên lịch
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 text-orange-700 px-2 py-1">
              <RotateCw className="w-3 h-3 text-orange-500" />
              Đang chờ / Nháp
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1">
              <PlatformLogo platform="Fanpage" size="xs" />
              <PlatformLogo platform="TikTok" size="xs" />
              <PlatformLogo platform="WEB" size="xs" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCreatePostForDate(cursorDateStr)}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Lên lịch bài
          </button>
        </div>
      </div>

      {/* Lưới Tháng (cuộn ngang mượt trên Mobile để đủ chỗ hiển thị) */}
      {calMode === "MONTH" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
              {WEEKDAYS_SUN_TO_SAT.map((label) => (
                <div
                  key={label}
                  className="py-2.5 px-2 text-center text-xs font-bold text-slate-700 border-r last:border-r-0 border-slate-200"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((cell) => {
                const isToday = cell.dateStr === todayStr;
                const dayPosts = postsByDate.get(cell.dateStr) ?? [];
                const visiblePosts = dayPosts.slice(0, 2);
                const extraCount = dayPosts.length - visiblePosts.length;

                const isDropOver = dropTargetDateStr === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dropTargetDateStr !== cell.dateStr) {
                        setDropTargetDateStr(cell.dateStr);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (
                        !e.currentTarget.contains(e.relatedTarget as Node | null) &&
                        dropTargetDateStr === cell.dateStr
                      ) {
                        setDropTargetDateStr(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const postId =
                        e.dataTransfer.getData("text/plain") || draggedPostId;
                      if (postId) void handleDropPostOnDate(postId, cell.dateStr);
                    }}
                    className={`group relative min-h-[112px] sm:min-h-[122px] p-1.5 sm:p-2 border-r border-b border-slate-200 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1.5 transition ${
                      isDropOver
                        ? "bg-sky-100/80 ring-2 ring-inset ring-sky-400"
                        : isToday
                          ? "bg-sky-50/80"
                          : cell.inCurrentMonth
                            ? "bg-white hover:bg-slate-50/60"
                            : "bg-slate-50/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold leading-none ${
                          isToday
                            ? "text-sky-600"
                            : cell.inCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-300"
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      <button
                        type="button"
                        onClick={() => onCreatePostForDate(cell.dateStr)}
                        title={`Thêm bài ngày ${cell.dayNum}/${cell.dateStr.slice(5, 7)}`}
                        className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:bg-sky-100 hover:text-sky-700 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      {visiblePosts.map((post) => {
                        const ready = isReadyPost(post);
                        const timeStr = getVnTimeLabel(post.scheduledPublishAt ?? post.dueAt);
                        const meta = getPlatformChannelMeta(post.platform);
                        return (
                          <button
                            key={post.id}
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              setDraggedPostId(post.id);
                              e.dataTransfer.setData("text/plain", post.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDraggedPostId(null);
                              setDropTargetDateStr(null);
                            }}
                            onClick={() => openPostDetail(post)}
                            title={`${timeStr} • ${meta.displayLabel}${
                              post.publishChannel ? ` (${post.publishChannel})` : ""
                            } • ${post.title}${
                              getTaskAssignees(post).length > 0
                                ? ` — ${formatTaskAssigneesLabel(post)}`
                                : ""
                            } (Kéo thả sang ngày khác để đổi lịch)`}
                            className={`w-full rounded-md px-1.5 py-1 flex items-center justify-between gap-1 text-left text-[11px] font-bold transition hover:brightness-95 cursor-grab active:cursor-grabbing ${
                              draggedPostId === post.id || reschedulingId === post.id
                                ? "opacity-50"
                                : ""
                            } ${
                              ready
                                ? "bg-teal-50 text-teal-800 border border-teal-100"
                                : "bg-orange-50 text-orange-700 border border-orange-100"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1 min-w-0">
                              {ready ? (
                                <FileText className="w-3 h-3 text-teal-600 shrink-0" />
                              ) : (
                                <RotateCw className="w-3 h-3 text-orange-500 shrink-0" />
                              )}
                              <span className="shrink-0 tabular-nums">{timeStr}</span>
                              <span className="truncate font-semibold text-[10.5px] opacity-90 hidden md:inline">
                                {post.title}
                              </span>
                            </span>
                            <PlatformLogo platform={post.platform} size="sm" />
                          </button>
                        );
                      })}

                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDayStr(cell.dateStr)}
                          className="text-[11px] font-semibold text-sky-600 hover:underline pl-0.5 cursor-pointer"
                        >
                          + {extraCount} bài viết khác
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Lưới Tuần (7 ngày Chủ Nhật -> Thứ Bảy) */
        <>
          <div className="hidden md:grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
            {WEEKDAYS_SUN_TO_SAT.map((label) => (
              <div
                key={label}
                className="py-2.5 px-2 text-center text-xs font-bold text-slate-700 border-r last:border-r-0 border-slate-200"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7">
            {weekCells.map((cell) => {
              const isToday = cell.dateStr === todayStr;
              const isDropOver = dropTargetDateStr === cell.dateStr;
              const dayPosts = postsByDate.get(cell.dateStr) ?? [];
              return (
                <div
                  key={cell.dateStr}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dropTargetDateStr !== cell.dateStr) {
                      setDropTargetDateStr(cell.dateStr);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node | null) &&
                      dropTargetDateStr === cell.dateStr
                    ) {
                      setDropTargetDateStr(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const postId =
                      e.dataTransfer.getData("text/plain") || draggedPostId;
                    if (postId) void handleDropPostOnDate(postId, cell.dateStr);
                  }}
                  className={`min-h-[120px] md:min-h-[260px] p-2.5 border-r-0 md:border-r md:last:border-r-0 border-b md:border-b-0 border-slate-200 flex flex-col gap-2 transition ${
                    isDropOver
                      ? "bg-sky-100/80 ring-2 ring-inset ring-sky-400"
                      : isToday
                        ? "bg-sky-50/75"
                        : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span
                      className={`text-xs font-extrabold inline-flex items-center gap-1.5 ${
                        isToday ? "text-sky-600" : "text-slate-700"
                      }`}
                    >
                      <span className="md:hidden text-slate-500 font-bold">
                        {cell.weekdayLabel} •
                      </span>
                      <span>
                        {cell.dayNum}/{cell.dateStr.slice(5, 7)}
                      </span>
                      {isToday && (
                        <span className="md:hidden rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[10px]">
                          Hôm nay
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCreatePostForDate(cell.dateStr)}
                      className="rounded-md p-1 text-slate-400 hover:bg-sky-100 hover:text-sky-700 cursor-pointer"
                      title="Thêm bài ngày này"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                {dayPosts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-slate-300">
                    Trống
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dayPosts.map((post) => {
                      const ready = isReadyPost(post);
                      const timeStr = getVnTimeLabel(post.scheduledPublishAt ?? post.dueAt);
                      const meta = getPlatformChannelMeta(post.platform);
                      return (
                        <button
                          key={post.id}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            setDraggedPostId(post.id);
                            e.dataTransfer.setData("text/plain", post.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggedPostId(null);
                            setDropTargetDateStr(null);
                          }}
                          onClick={() => openPostDetail(post)}
                          title="Kéo thả sang ngày khác để đổi lịch đăng"
                          className={`w-full rounded-lg p-2 text-left border transition hover:shadow-xs cursor-grab active:cursor-grabbing space-y-1 ${
                            draggedPostId === post.id || reschedulingId === post.id
                              ? "opacity-50"
                              : ""
                          } ${
                            ready
                              ? "bg-teal-50/90 border-teal-200/80 text-teal-900"
                              : "bg-orange-50/90 border-orange-200/80 text-orange-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                            <span className="inline-flex items-center gap-1">
                              {ready ? (
                                <FileText className="w-3 h-3 text-teal-600" />
                              ) : (
                                <RotateCw className="w-3 h-3 text-orange-500" />
                              )}
                              {timeStr}
                            </span>
                            <PlatformLogo platform={post.platform} size="sm" />
                          </div>
                          <div className="text-xs font-semibold line-clamp-2">
                            {post.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] opacity-85">
                            <span className="font-bold">{meta.displayLabel}</span>
                            {post.publishChannel && (
                              <span className="truncate max-w-full rounded bg-white/80 px-1 py-0.5 font-semibold text-slate-700">
                                → {post.publishChannel}
                              </span>
                            )}
                          </div>
                          {getTaskAssignees(post).length > 0 && (
                            <div className="text-[10px] opacity-75 truncate">
                              {formatTaskAssigneesLabel(post)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal xem toàn bộ bài viết khi bấm "+ X bài viết khác" */}
      {expandedDayStr && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setExpandedDayStr(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">
                Lịch ngày {expandedDayStr.split("-").reverse().join("/")} ({expandedPosts.length} bài)
              </h3>
              <button
                type="button"
                onClick={() => setExpandedDayStr(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {expandedPosts.map((post) => {
                const ready = isReadyPost(post);
                const statusInfo = getContentStatusDisplay(post.status, post.isAired);
                const timeStr = getVnTimeLabel(post.scheduledPublishAt ?? post.dueAt);
                const meta = getPlatformChannelMeta(post.platform);
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setExpandedDayStr(null);
                      openPostDetail(post);
                    }}
                    className={`w-full rounded-xl p-3 border text-left transition hover:shadow-sm cursor-pointer flex items-center justify-between gap-3 ${
                      ready
                        ? "bg-teal-50/70 border-teal-200"
                        : "bg-orange-50/70 border-orange-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <span>{timeStr}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {post.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800">
                          {meta.channelShortLabel}:
                        </span>
                        <span className="font-semibold text-blue-700">
                          {post.publishChannel || meta.emptyChannelLabel}
                        </span>
                        {post.assignee && (
                          <span className="text-slate-400">• {post.assignee.name}</span>
                        )}
                      </div>
                    </div>
                    <PlatformLogo platform={post.platform} size="md" />
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const targetDate = expandedDayStr;
                  setExpandedDayStr(null);
                  onCreatePostForDate(targetDate);
                }}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm bài ngày này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Lịch Đăng Bài: Logo Nền Tảng + Kênh TikTok / Fanpage / WEB cụ thể */}
      {detailPost && detailMeta && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setDetailTaskId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header với Logo Nền Tảng lớn */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <PlatformLogo platform={editPlatform} size="lg" className="mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${detailMeta.badgeClass}`}
                    >
                      {detailMeta.displayLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {getVnTimeLabel(detailPost.scheduledPublishAt ?? detailPost.dueAt)}
                      {" • "}
                      {getVnDateString(
                        new Date(
                          detailPost.scheduledPublishAt ??
                            detailPost.dueAt ??
                            detailPost.createdAt
                        )
                      )
                        .split("-")
                        .reverse()
                        .join("/")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        getContentStatusDisplay(detailPost.status, detailPost.isAired).badgeClass
                      }`}
                    >
                      {getContentStatusDisplay(detailPost.status, detailPost.isAired).label}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {detailPost.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono font-bold text-slate-600">
                      {detailPost.code}
                    </span>
                    {detailPost.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {detailPost.assignee.name}
                      </span>
                    )}
                    {detailPost.postFormat && (
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-semibold text-slate-700">
                        {detailPost.postFormat}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailTaskId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thân modal: Chọn nền tảng & chỉ rõ Kênh TikTok / Fanpage / WEB */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-2xl border-2 border-sky-200/80 bg-sky-50/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Nền tảng &amp; Nơi đăng cụ thể
                  </span>
                  {detailPost.publishChannel ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-900 shadow-2xs">
                      <PlatformLogo platform={detailPost.platform} size="xs" />
                      <span>
                        {getPlatformChannelMeta(detailPost.platform).channelShortLabel}:{" "}
                        {detailPost.publishChannel}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700">
                      {detailMeta.emptyChannelLabel}
                    </span>
                  )}
                </div>

                {/* Chọn nhanh 3 nền tảng chính + dropdown nền tảng khác */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_PRIMARY_PLATFORMS.map((p) => {
                    const active =
                      normalizePlatformSelectValue(editPlatform).toLowerCase() ===
                      p.toLowerCase();
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPlatform(p)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          active
                            ? "border-blue-500 bg-white text-blue-800 shadow-xs ring-1 ring-blue-500/30"
                            : "border-slate-200 bg-white/80 hover:bg-white text-slate-700"
                        }`}
                      >
                        <PlatformLogo platform={p} size="xs" />
                        <span>{p}</span>
                      </button>
                    );
                  })}

                  <select
                    value={normalizePlatformSelectValue(editPlatform)}
                    onChange={(e) => setEditPlatform(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {CONTENT_PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ô nhập + gợi ý Kênh TikTok / Fanpage / Website */}
                <PublishChannelInput
                  platform={editPlatform}
                  value={editChannel}
                  onChange={setEditChannel}
                  suggestions={channelSuggestions}
                />

                {/* Đổi nhanh Ngày & Giờ đăng ngay trên lịch */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sky-200/70">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Ngày đăng
                    </label>
                    <input
                      type="date"
                      value={editPublishDate}
                      onChange={(e) => setEditPublishDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Giờ đăng
                    </label>
                    <input
                      type="time"
                      value={editPublishTime}
                      onChange={(e) => setEditPublishTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={saveDetailChannel}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                      detailDirty
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        : "bg-slate-800 hover:bg-slate-900 text-white"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {savingDetail ? "Đang lưu..." : "Lưu lịch & nơi đăng"}
                  </button>
                </div>
              </div>

              {(detailPost.caption || detailPost.description) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    {detailPost.caption ? "Nội dung / Caption" : "Mô tả chi tiết"}
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-line line-clamp-5 leading-relaxed">
                    {detailPost.caption || detailPost.description}
                  </p>
                </div>
              )}

              {detailPost.productLink && (
                <a
                  href={detailPost.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Link sản phẩm / Tham chiếu
                </a>
              )}
            </div>

            {/* Footer nút mở Studio, TaskDrawer hoặc Xóa */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTaskId(null)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
                {canUserDeleteTask(
                  detailPost,
                  currentUserId,
                  currentUserRole
                ) && (
                  <button
                    type="button"
                    disabled={deletingDetail}
                    onClick={() => setConfirmDeleteId(detailPost.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa bài
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailPost;
                    setDetailTaskId(null);
                    onOpenTaskDrawer(target);
                  }}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 px-3.5 py-2 text-xs font-bold cursor-pointer"
                >
                  Mở Task đầy đủ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = detailPost;
                    setDetailTaskId(null);
                    onOpenContentPost(target);
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Soạn nội dung chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(confirmDeleteId)}
        loading={deletingDetail}
        itemName={
          tasks.find((t) => t.id === confirmDeleteId)?.title || "bài viết này"
        }
        description="Bài viết sẽ được chuyển vào Thùng rác (có thể khôi phục lại)."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          setDeletingDetail(true);
          try {
            const { deletedIds } = await softDeleteTasksByIds([
              confirmDeleteId,
            ]);
            if (deletedIds.length > 0) {
              onTaskDeleted?.(confirmDeleteId);
              window.dispatchEvent(new Event("reviews-count-updated"));
              setDetailTaskId(null);
              showToast("Đã chuyển bài viết vào Thùng rác.");
            } else {
              showToast("Không xóa được bài viết này.", "error");
            }
          } finally {
            setDeletingDetail(false);
            setConfirmDeleteId(null);
          }
        }}
      />
    </div>
  );
}
