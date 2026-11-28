"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Copy,
  Search,
} from "lucide-react";
import { TaskStatusBadge } from "@/components/status-badge";
import { TaskDrawer } from "@/components/task-drawer";
import { TaskAssigneesBadges } from "@/components/task-assignees-badges";
import { PlatformLogo } from "@/components/platform-logo";
import { useToast } from "@/components/toast-provider";
import { TASK_TYPE_META } from "@/lib/constants";
import { normalizeMediaBriefItems } from "@/lib/media-brief";
import { getPlatformChannelMeta } from "@/lib/platform-meta";
import { formatVnDateTime } from "@/lib/dates";
import { getTaskAssignees } from "@/lib/task-assignees";
import type { TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ReviewsBoardProps {
  initialTasks: TaskItem[];
  currentUserRole: UserRole;
}

export function ReviewsBoard({
  initialTasks,
  currentUserRole,
}: ReviewsBoardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  }

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      map.set(t.project.id, t.project.name);
    }
    return [...map.entries()];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== "ALL" && t.project.id !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          getTaskAssignees(t).some((u) => u.name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, searchQuery]);

  const waitingApproval = filtered.filter(
    (t) => t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW"
  );
  const needsRevision = filtered.filter((t) => t.status === "REVISION_NEEDED");
  const recentlyApproved = filtered.filter(
    (t) => t.status === "APPROVED_FINAL" || t.status === "PUBLISHED"
  );

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function quickApprove(task: TaskItem) {
    setQuickBusyId(task.id);
    try {
      const action =
        task.status === "BRIEF_REVIEW" ? "APPROVE_BRIEF" : "APPROVE";
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        handleTaskUpdated(data.task);
        window.dispatchEvent(new Event("reviews-count-updated"));
        showToast(
          action === "APPROVE_BRIEF"
            ? `Đã duyệt Brief ${task.code}.`
            : `Đã duyệt Final ${task.code}!`
        );
        router.refresh();
      } else {
        showToast("Không duyệt được công việc này.", "error");
      }
    } finally {
      setQuickBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {currentUserRole === "LEADER"
              ? "💎 Kiểm Duyệt Kho Báu (15:00 – 16:00)"
              : "💎 Theo dõi Kho báu & Vá buồm"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {currentUserRole === "LEADER"
              ? "Thuyền trưởng xem nhanh Link Drive/Canva, Caption và đóng dấu Final trước ngày ra khơi (D-1)."
              : "Danh sách kho báu thuộc dự án của bạn đang chờ Thuyền trưởng duyệt, cần vá buồm hoặc đã sẵn sàng lên sóng."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã, tiêu đề..."
              className="w-full rounded-xl border-2 border-amber-200/80 bg-white pl-9 pr-3 py-1.5 text-xs sm:text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border-2 border-amber-200/80 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium focus:border-amber-400 focus:outline-none"
          >
            <option value="ALL">Tất cả dự án</option>
            {projectOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 1: Chờ duyệt */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-violet-600" />
          <h2 className="text-base font-bold text-slate-900">
            Đang chờ Leader duyệt ({waitingApproval.length})
          </h2>
        </div>

        {waitingApproval.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Hiện không có bài viết hay Brief nào đang chờ duyệt.
          </div>
        ) : (
          <div className="space-y-3">
            {waitingApproval.map((t) => {
              const latestAsset = t.assets[0];
              const mediaItems = normalizeMediaBriefItems(t.mediaBriefItemsJson);
              const isVideoMedia = t.taskType === "MEDIA_VIDEO";
              const chMeta = getPlatformChannelMeta(t.platform);
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTaskId(t.id)}
                  className="rounded-2xl border border-slate-200 hover:border-violet-400 p-4 transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                      <span className="font-mono font-bold text-slate-700">
                        {t.code}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.project.color }}
                        />
                        {t.project.name}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{TASK_TYPE_META[t.taskType]?.label}</span>
                      {(t.isMediaOrder ||
                        t.taskType === "MEDIA_IMAGE" ||
                        t.taskType === "MEDIA_VIDEO") && (
                        <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[11px] font-bold">
                          {t.quantity} {isVideoMedia ? "video" : "ảnh"}
                        </span>
                      )}
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {t.title}
                    </h3>
                    {t.caption && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                        {t.caption}
                      </p>
                    )}
                    {mediaItems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {mediaItems.map((it, idx) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-[11px] font-medium text-sky-900"
                          >
                            <strong>
                              {isVideoMedia ? `Video ${idx + 1}` : `Ảnh ${idx + 1}`}
                            </strong>{" "}
                            ({it.ratio})
                            {it.content && (
                              <span className="text-slate-600 truncate max-w-[180px]">
                                : {it.content}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span>Thực hiện:</span>
                        <TaskAssigneesBadges
                          task={t}
                          size="sm"
                          emptyLabel="Chưa gán"
                        />
                      </span>
                      <span>
                        Lịch đăng:{" "}
                        <strong className="text-slate-800">
                          {formatVnDateTime(t.scheduledPublishAt ?? t.dueAt)}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <PlatformLogo platform={t.platform} size="xs" />
                        <span>
                          {chMeta.displayLabel}
                          {t.publishChannel ? ` → ${t.publishChannel}` : ""}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {latestAsset &&
                      (latestAsset.url.startsWith("data:image/") ? (
                        <button
                          type="button"
                          onClick={() => setActiveTaskId(t.id)}
                          className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          Xem {latestAsset.label}
                        </button>
                      ) : (
                        <a
                          href={latestAsset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          Mở {latestAsset.label}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ))}

                    {currentUserRole === "LEADER" && (
                      <>
                        <button
                          type="button"
                          disabled={quickBusyId === t.id}
                          onClick={() => quickApprove(t)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t.status === "BRIEF_REVIEW" ? "Duyệt Brief" : "Duyệt Final"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTaskId(t.id)}
                          className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Trả sửa & QC
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Cần sửa */}
      <div className="bg-white rounded-2xl border-2 border-rose-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            🔧 Đang vá buồm / Chỉnh sửa ({needsRevision.length})
          </h2>
        </div>

        {needsRevision.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Không có đầu việc nào đang chờ sửa.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {needsRevision.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTaskId(t.id)}
                className="rounded-xl border border-rose-200 bg-rose-50/30 hover:border-rose-400 p-3.5 cursor-pointer transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-rose-700">
                    {t.code} • {t.project.name}
                  </span>
                  <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-[11px] font-bold">
                    Sửa {t.revisionCount}/{t.maxRevisions}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                  <TaskAssigneesBadges
                    task={t}
                    size="sm"
                    emptyLabel="Chưa gán"
                  />
                  <span>• Hạn: {formatVnDateTime(t.dueAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Đã duyệt sẵn sàng đăng */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            ⭐ Đã đóng dấu Final / Sẵn sàng ra khơi ({recentlyApproved.length})
          </h2>
        </div>

        {recentlyApproved.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            Chưa có bài đã duyệt gần đây.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentlyApproved.map((t) => {
              const latestAsset = t.assets[0];
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTaskId(t.id)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 p-3.5 cursor-pointer transition flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {t.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {t.project.name}
                      </span>
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <PlatformLogo platform={t.platform} size="xs" />
                      <span>
                        Lịch đăng: {formatVnDateTime(t.scheduledPublishAt ?? t.dueAt)} •{" "}
                        {t.publishChannel ||
                          getPlatformChannelMeta(t.platform).displayLabel}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.caption && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(t.caption || "");
                          showToast("Đã copy Caption để đăng bài!");
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Caption
                      </button>
                    )}
                    {latestAsset && (
                      <a
                        href={latestAsset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        File
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskDrawer
        taskId={activeTaskId}
        currentUserRole={currentUserRole}
        onClose={() => setActiveTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
