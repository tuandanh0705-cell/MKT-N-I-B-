"use client";

import { useMemo, useState } from "react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { ContentCalendarRow } from "@/components/content-calendar-row";
import { ContentCalendarToolbar } from "@/components/content-calendar-toolbar";
import { OutputInspectorModal } from "@/components/output-inspector-modal";
import { PlatformLogo } from "@/components/platform-logo";
import { useToast } from "@/components/toast-provider";
import { useGeminiQcRunner } from "@/hooks/use-gemini-qc";
import {
  CONTENT_PLATFORM_OPTIONS,
  CONTENT_ROUTE_OPTIONS,
  POST_FORMAT_OPTIONS,
  getContentRouteMeta,
  isContentTaskItem,
  parseGoogleSheetTimelineTsv,
} from "@/lib/content-plan";
import { getVnDateString } from "@/lib/dates";
import { canUserDeleteTask, softDeleteTasksByIds } from "@/lib/task-delete";
import type {
  ProjectChannelSuggestions,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export function ProjectContentCalendarPanel({
  project,
  tasks,
  users,
  channelSuggestions,
  currentUserId,
  currentUserRole,
  onOpenTaskDrawer,
  onOpenEditor,
  onTaskUpdated,
  onTaskDeleted,
  onTasksAdded,
  onRequestMediaOrder,
}: {
  project: SimpleProject;
  tasks: TaskItem[];
  users: SimpleUser[];
  channelSuggestions?: ProjectChannelSuggestions | null;
  currentUserId: string;
  currentUserRole: UserRole;
  onOpenTaskDrawer?: (taskId: string) => void;
  onOpenEditor: (task: TaskItem | null) => void;
  onTaskUpdated: (updated: TaskItem) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTasksAdded: (added: TaskItem[]) => void;
  onRequestMediaOrder: (sourceTask: TaskItem) => void;
}) {
  const { showToast } = useToast();
  const todayStr = getVnDateString();

  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [picFilter, setPicFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [qDate, setQDate] = useState(todayStr);
  const [qRoute, setQRoute] = useState("EDUCATE");
  const [qTitle, setQTitle] = useState("");
  const [qPlatform, setQPlatform] = useState("Fanpage");
  const [qFormat, setQFormat] = useState("Ảnh");
  const [qPicId, setQPicId] = useState(currentUserId);
  const [creatingQuick, setCreatingQuick] = useState(false);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");
  const [importing, setImporting] = useState(false);

  const [inspectTaskId, setInspectTaskId] = useState<string | null>(null);

  const {
    aiCheckingTaskId,
    aiErrorsByTaskId,
    getAiResultForTask,
    runAiCheckForTask,
  } = useGeminiQcRunner({
    showToast,
    onResultSaved: (taskId, result) => {
      const target = tasks.find((t) => t.id === taskId);
      if (target) {
        onTaskUpdated({
          ...target,
          lastAiQcJson: result,
          lastAiQcAt: result.meta.checkedAt,
        });
      }
    },
  });

  const inspectingTask = useMemo(
    () => tasks.find((t) => t.id === inspectTaskId) ?? null,
    [tasks, inspectTaskId]
  );

  const contentPosts = useMemo(() => {
    const base = tasks.filter(
      (t) =>
        isContentTaskItem(t) ||
        (!t.isMediaOrder &&
          t.taskType !== "ADS_CAMPAIGN" &&
          t.taskType !== "WEB_SEO")
    );
    return [...base].sort((a, b) => {
      const da = a.scheduledPublishAt
        ? new Date(a.scheduledPublishAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const db = b.scheduledPublishAt
        ? new Date(b.scheduledPublishAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of contentPosts) {
      if (t.scheduledPublishAt) {
        const d = getVnDateString(new Date(t.scheduledPublishAt));
        set.add(d.slice(0, 7));
      }
    }
    return Array.from(set).sort();
  }, [contentPosts]);

  const filteredPosts = useMemo(() => {
    return contentPosts.filter((t) => {
      if (monthFilter !== "ALL") {
        if (!t.scheduledPublishAt) return false;
        const m = getVnDateString(new Date(t.scheduledPublishAt)).slice(0, 7);
        if (m !== monthFilter) return false;
      }
      if (picFilter === "MINE") {
        if (t.assignee?.id !== currentUserId) return false;
      } else if (picFilter !== "ALL" && t.assignee?.id !== picFilter) {
        return false;
      }
      if (routeFilter !== "ALL") {
        if (getContentRouteMeta(t.contentAngle).label !== routeFilter)
          return false;
      }
      if (statusFilter !== "ALL") {
        if (statusFilter === "AIRED") {
          if (!t.isAired && t.status !== "PUBLISHED") return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          t.title.toLowerCase().includes(q) ||
          (t.caption || "").toLowerCase().includes(q) ||
          (t.contentPillar || "").toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [
    contentPosts,
    monthFilter,
    picFilter,
    routeFilter,
    statusFilter,
    searchQuery,
    currentUserId,
  ]);

  const deletableFilteredIds = useMemo(
    () =>
      filteredPosts
        .filter((t) => canUserDeleteTask(t, currentUserId, currentUserRole))
        .map((t) => t.id),
    [filteredPosts, currentUserRole, currentUserId]
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
        showToast(`Đã chuyển ${deletedIds.length} bài viết vào Thùng rác.`);
      } else {
        showToast("Không xóa được bài viết đã chọn.", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmIds(null);
    }
  }

  const parsedPreviewRows = useMemo(
    () => (pasteOpen && pasteRaw.trim() ? parseGoogleSheetTimelineTsv(pasteRaw) : []),
    [pasteOpen, pasteRaw]
  );

  async function patchTaskInline(
    taskId: string,
    payload: Record<string, unknown>,
    toastMsg?: string
  ) {
    setSavingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được bài viết.", "error");
        return;
      }
      onTaskUpdated(data.task);
      if (toastMsg) showToast(toastMsg);
    } finally {
      setSavingId(null);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!qTitle.trim()) return;
    setCreatingQuick(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: qTitle.trim(),
          platform: qPlatform,
          taskType: "CONTENT_SOCIAL",
          isMediaOrder: false,
          contentAngle: qRoute || null,
          postFormat: qFormat,
          assigneeId: qPicId || currentUserId,
          scheduledPublishAt: qDate ? `${qDate}T09:00:00+07:00` : null,
          status: "DRAFT",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thêm được bài viết.", "error");
        return;
      }
      onTasksAdded([data.task]);
      setQTitle("");
      setQuickOpen(false);
      showToast(
        "Đã thêm dòng vào Lịch Đăng Bài! Bấm cột Bài viết để soạn nội dung."
      );
    } finally {
      setCreatingQuick(false);
    }
  }

  async function handleBulkImport() {
    if (parsedPreviewRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tasks/import-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          rows: parsedPreviewRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Import thất bại.", "error");
        return;
      }
      onTasksAdded(data.tasks || []);
      setPasteRaw("");
      setPasteOpen(false);
      showToast(`Đã đưa ${(data.tasks || []).length} bài viết vào Lịch Đăng Bài!`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ContentCalendarToolbar
        filteredCount={filteredPosts.length}
        users={users}
        availableMonths={availableMonths}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        monthFilter={monthFilter}
        onChangeMonthFilter={setMonthFilter}
        picFilter={picFilter}
        onChangePicFilter={setPicFilter}
        routeFilter={routeFilter}
        onChangeRouteFilter={setRouteFilter}
        statusFilter={statusFilter}
        onChangeStatusFilter={setStatusFilter}
        deleteMode={deleteMode}
        onToggleDeleteMode={() => {
          setDeleteMode((v) => !v);
          setSelectedDeleteIds([]);
        }}
        selectedDeleteCount={selectedDeleteIds.length}
        deletableCount={deletableFilteredIds.length}
        deleting={deleting}
        onToggleSelectAllDelete={() =>
          setSelectedDeleteIds(
            selectedDeleteIds.length === deletableFilteredIds.length
              ? []
              : deletableFilteredIds
          )
        }
        onRequestDeleteSelected={() => setDeleteConfirmIds(selectedDeleteIds)}
        onExitDeleteMode={() => {
          setDeleteMode(false);
          setSelectedDeleteIds([]);
        }}
        pasteOpen={pasteOpen}
        onTogglePasteOpen={() => setPasteOpen((v) => !v)}
        pasteRaw={pasteRaw}
        onChangePasteRaw={setPasteRaw}
        parsedPreviewCount={parsedPreviewRows.length}
        importing={importing}
        onBulkImport={handleBulkImport}
        onToggleQuickAdd={() => setQuickOpen((v) => !v)}
        onOpenNewEditor={() => onOpenEditor(null)}
      />

      {/* Bảng Timeline Đăng Bài (11 cột tinh gọn) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs min-w-[1040px]">
          <thead>
            <tr className="bg-[#38761d] text-white uppercase text-[11px] font-extrabold">
              {deleteMode && (
                <th className="py-3 px-2 whitespace-nowrap bg-rose-700 text-center w-20">
                  <div className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={
                        deletableFilteredIds.length > 0 &&
                        selectedDeleteIds.length === deletableFilteredIds.length
                      }
                      onChange={() =>
                        setSelectedDeleteIds(
                          selectedDeleteIds.length ===
                            deletableFilteredIds.length
                            ? []
                            : deletableFilteredIds
                        )
                      }
                      className="rounded border-rose-300 cursor-pointer"
                    />
                    <span>Xóa</span>
                  </div>
                </th>
              )}
              <th className="py-3 px-2 whitespace-nowrap">Ngày đăng</th>
              <th className="py-3 px-2 whitespace-nowrap">Tuyến</th>
              <th className="py-3 px-2 min-w-[165px]">Nội dung</th>
              <th className="py-3 px-2 whitespace-nowrap">Nền tảng</th>
              <th className="py-3 px-2 min-w-[230px]">Bài viết</th>
              <th className="py-3 px-2 whitespace-nowrap bg-[#4a86e8]">Format</th>
              <th className="py-3 px-2 whitespace-nowrap bg-[#f1c232] text-slate-900">
                Tình trạng
              </th>
              <th className="py-3 px-2 whitespace-nowrap bg-[#6aa84f]">
                Deadline
              </th>
              <th className="py-3 px-2 whitespace-nowrap">Link SP</th>
              <th className="py-3 px-2 whitespace-nowrap">PIC</th>
              <th className="py-3 px-2 whitespace-nowrap text-right">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* Dòng thêm bài nhanh inline */}
            {quickOpen && (
              <tr className="bg-sky-50/70">
                {deleteMode && <td className="p-2 text-center text-slate-300">—</td>}
                <td className="p-2">
                  <input
                    type="date"
                    value={qDate}
                    onChange={(e) => setQDate(e.target.value)}
                    className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={qRoute}
                    onChange={(e) => setQRoute(e.target.value)}
                    className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs"
                  >
                    {CONTENT_ROUTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void handleQuickAdd(e);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setQuickOpen(false);
                      }
                    }}
                    placeholder="Nhập ý tưởng / tiêu đề..."
                    className="w-full rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold"
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1.5">
                    <PlatformLogo platform={qPlatform} size="xs" />
                    <select
                      value={qPlatform}
                      onChange={(e) => setQPlatform(e.target.value)}
                      className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs"
                    >
                      {CONTENT_PLATFORM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="p-2 text-[11px] text-slate-500">
                  Lưu xong bấm vào đây để viết bài &amp; AI Check
                </td>
                <td className="p-2">
                  <select
                    value={qFormat}
                    onChange={(e) => setQFormat(e.target.value)}
                    className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs"
                  >
                    {POST_FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-[11px] text-slate-500" colSpan={3}>
                  Tạo bản nháp mới &amp; gắn Deadline sau khi lưu
                </td>
                <td className="p-2">
                  <select
                    value={qPicId}
                    onChange={(e) => setQPicId(e.target.value)}
                    className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs max-w-[120px]"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    disabled={creatingQuick || !qTitle.trim()}
                    onClick={handleQuickAdd}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 text-xs font-bold cursor-pointer"
                  >
                    {creatingQuick ? "..." : "+ Lưu dòng"}
                  </button>
                </td>
              </tr>
            )}

            {filteredPosts.length === 0 ? (
              <tr>
                <td
                  colSpan={deleteMode ? 12 : 11}
                  className="py-12 text-center text-slate-400"
                >
                  Chưa có bài viết nào trong bộ lọc này — bấm{" "}
                  <strong>&ldquo;Viết bài mới&rdquo;</strong> hoặc{" "}
                  <strong>&ldquo;Thêm dòng&rdquo;</strong> để bắt đầu ngay!
                </td>
              </tr>
            ) : (
              filteredPosts.map((t) => (
                <ContentCalendarRow
                  key={t.id}
                  task={t}
                  projectSlug={project.slug}
                  users={users}
                  channelSuggestions={channelSuggestions}
                  todayStr={todayStr}
                  currentUserRole={currentUserRole}
                  rowBusy={savingId === t.id}
                  deleteMode={deleteMode}
                  deletable={canUserDeleteTask(
                    t,
                    currentUserId,
                    currentUserRole
                  )}
                  deleting={deleting}
                  isSelectedForDelete={selectedDeleteIds.includes(t.id)}
                  savedAiResult={getAiResultForTask(t)}
                  onToggleSelectDelete={toggleSelectDelete}
                  onRequestDeleteSingle={(id) => setDeleteConfirmIds([id])}
                  onPatchTaskInline={patchTaskInline}
                  onOpenEditor={(target) => onOpenEditor(target)}
                  onInspectAiScore={(id) => setInspectTaskId(id)}
                  onRequestMediaOrder={onRequestMediaOrder}
                  onRequireCaptionBeforeSubmit={(target) => {
                    onOpenEditor(target);
                    showToast(
                      "Hãy viết nội dung bài viết xong rồi bấm Gửi Leader duyệt nhé!",
                      "info"
                    );
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <OutputInspectorModal
        task={inspectingTask}
        open={Boolean(inspectingTask)}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        users={users}
        aiResult={inspectingTask ? getAiResultForTask(inspectingTask) : null}
        aiLoading={Boolean(
          inspectingTask && aiCheckingTaskId === inspectingTask.id
        )}
        aiError={
          inspectingTask ? aiErrorsByTaskId[inspectingTask.id] ?? null : null
        }
        onRunAiCheck={(taskId, focus) => {
          const target = tasks.find((x) => x.id === taskId);
          if (target) return runAiCheckForTask(target, focus);
          return Promise.resolve(null);
        }}
        onClose={() => setInspectTaskId(null)}
        onUpdated={onTaskUpdated}
        onOpenTaskDrawer={(id) => {
          setInspectTaskId(null);
          if (onOpenTaskDrawer) {
            onOpenTaskDrawer(id);
          } else {
            const matched = tasks.find((x) => x.id === id) || null;
            if (matched) onOpenEditor(matched);
          }
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteConfirmIds && deleteConfirmIds.length > 0)}
        loading={deleting}
        itemName={
          deleteConfirmIds && deleteConfirmIds.length > 1
            ? `${deleteConfirmIds.length} bài viết đã chọn`
            : filteredPosts.find((p) => p.id === deleteConfirmIds?.[0])?.title ||
              "bài viết này"
        }
        description="Bài viết sẽ được chuyển vào Thùng rác (có thể khôi phục lại bất cứ lúc nào)."
        onCancel={() => setDeleteConfirmIds(null)}
        onConfirm={() => {
          if (deleteConfirmIds) executeDelete(deleteConfirmIds);
        }}
      />
    </div>
  );
}
