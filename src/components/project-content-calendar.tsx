"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { ContentCalendarMobileCard } from "@/components/content-calendar-mobile-card";
import { ContentCalendarRow } from "@/components/content-calendar-row";
import {
  ContentCalendarToolbar,
  type ContentCalendarSortMode,
} from "@/components/content-calendar-toolbar";
import { CustomizableOptionSelect } from "@/components/customizable-option-select";
import { OutputInspectorModal } from "@/components/output-inspector-modal";
import { PlatformLogo } from "@/components/platform-logo";
import { useToast } from "@/components/toast-provider";
import { useGeminiQcRunner } from "@/hooks/use-gemini-qc";
import {
  getProjectContentOptions,
  isContentTaskItem,
  normalizeRouteSelectValue,
  parseGoogleSheetTimelineTsv,
  type ProjectContentOptionKind,
} from "@/lib/content-plan";
import { getVnDateString } from "@/lib/dates";
import { isUserAssignedToTask } from "@/lib/task-assignees";
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
  onTasksReordered,
  onRequestMediaOrder,
  onAddProjectOption,
  onOpenOptionsModal,
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
  onTasksReordered?: (orderMap: Record<string, number>) => void;
  onRequestMediaOrder: (sourceTask: TaskItem) => void;
  onAddProjectOption?: (
    kind: ProjectContentOptionKind,
    newValue: string
  ) => Promise<boolean>;
  onOpenOptionsModal?: (tab: ProjectContentOptionKind) => void;
}) {
  const { showToast } = useToast();
  const todayStr = getVnDateString();
  const projectOptions = useMemo(
    () => getProjectContentOptions(project.overviewJson),
    [project.overviewJson]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [picFilter, setPicFilter] = useState("ALL");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState<ContentCalendarSortMode>("TIME_DESC");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [qDate, setQDate] = useState(todayStr);
  const [qTime, setQTime] = useState("09:00");
  const [qRoute, setQRoute] = useState(projectOptions.routes[0] || "");
  const [qTitle, setQTitle] = useState("");
  const [qPlatform, setQPlatform] = useState(
    projectOptions.platforms[0] || "Fanpage"
  );
  const [qFormat, setQFormat] = useState(projectOptions.formats[0] || "Ảnh");
  const [qPicId, setQPicId] = useState(currentUserId);
  const [creatingQuick, setCreatingQuick] = useState(false);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");
  const [importing, setImporting] = useState(false);

  const [inspectTaskId, setInspectTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: "BEFORE" | "AFTER";
  } | null>(null);
  const [localOrderMap, setLocalOrderMap] = useState<Record<string, number> | null>(
    null
  );

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

    if (sortMode === "TIME_DESC") {
      // Mặc định: từ trên xuống dưới theo Ngày & Giờ đăng muộn nhất -> sớm nhất
      // (Bài chưa xếp ngày giữ trên cùng để không bị trôi mất khi mới tạo nháp)
      return [...base].sort((a, b) => {
        const aTime = a.scheduledPublishAt
          ? new Date(a.scheduledPublishAt).getTime()
          : null;
        const bTime = b.scheduledPublishAt
          ? new Date(b.scheduledPublishAt).getTime()
          : null;
        if (aTime === null && bTime !== null) return -1;
        if (aTime !== null && bTime === null) return 1;
        if (aTime !== null && bTime !== null && bTime !== aTime) {
          return bTime - aTime;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    if (sortMode === "TIME_ASC") {
      return [...base].sort((a, b) => {
        const aTime = a.scheduledPublishAt
          ? new Date(a.scheduledPublishAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bTime = b.scheduledPublishAt
          ? new Date(b.scheduledPublishAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Chế độ Thủ công (MANUAL): tôn trọng thứ tự kéo thả (sortOrder ASC), dòng mới thêm lên trên cùng
    return [...base].sort((a, b) => {
      const aOrder =
        localOrderMap && Object.prototype.hasOwnProperty.call(localOrderMap, a.id)
          ? localOrderMap[a.id]
          : a.sortOrder;
      const bOrder =
        localOrderMap && Object.prototype.hasOwnProperty.call(localOrderMap, b.id)
          ? localOrderMap[b.id]
          : b.sortOrder;
      const aHas = typeof aOrder === "number";
      const bHas = typeof bOrder === "number";
      if (aHas && bHas) {
        if (aOrder !== bOrder) return aOrder - bOrder;
      } else if (aHas !== bHas) {
        return aHas ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, localOrderMap, sortMode]);

  async function commitReorder(nextOrderedIds: string[]) {
    const prevOrderMap: Record<string, number> = {};
    contentPosts.forEach((t, idx) => {
      prevOrderMap[t.id] = idx;
    });
    const nextOrderMap: Record<string, number> = {};
    nextOrderedIds.forEach((id, idx) => {
      nextOrderMap[id] = idx;
    });

    if (onTasksReordered) {
      onTasksReordered(nextOrderMap);
      setLocalOrderMap(null);
    } else {
      setLocalOrderMap(nextOrderMap);
    }

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          orderedIds: nextOrderedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (onTasksReordered) {
          onTasksReordered(prevOrderMap);
        } else {
          setLocalOrderMap(prevOrderMap);
        }
        showToast(data.error || "Không lưu được thứ tự sắp xếp.", "error");
        return;
      }
      showToast("Đã lưu thứ tự sắp xếp dòng.");
    } catch {
      if (onTasksReordered) {
        onTasksReordered(prevOrderMap);
      } else {
        setLocalOrderMap(prevOrderMap);
      }
      showToast("Lỗi kết nối khi lưu thứ tự sắp xếp.", "error");
    }
  }

  function handleReorderDrop(
    draggedId: string,
    targetId: string,
    position: "BEFORE" | "AFTER"
  ) {
    setDraggingId(null);
    setDropTarget(null);
    if (!draggedId || !targetId || draggedId === targetId) return;

    const currentIds = contentPosts.map((t) => t.id);
    const fromIdx = currentIds.indexOf(draggedId);
    if (fromIdx < 0) return;

    const withoutDragged = currentIds.filter((id) => id !== draggedId);
    const targetIdx = withoutDragged.indexOf(targetId);
    if (targetIdx < 0) return;

    const insertIdx = position === "BEFORE" ? targetIdx : targetIdx + 1;
    withoutDragged.splice(insertIdx, 0, draggedId);

    const unchanged = withoutDragged.every((id, i) => id === currentIds[i]);
    if (unchanged) return;

    void commitReorder(withoutDragged);
  }

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

  // Bản đồ liên kết 2 chiều: Bài Content -> Danh sách Order Media thuộc bài đó
  const linkedMediaByParentId = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    const mediaTasks = tasks.filter(
      (t) =>
        t.isMediaOrder ||
        t.taskType === "MEDIA_IMAGE" ||
        t.taskType === "MEDIA_VIDEO"
    );
    const codeToContentId = new Map<string, string>();
    for (const post of contentPosts) {
      codeToContentId.set(post.code.toUpperCase(), post.id);
    }

    for (const m of mediaTasks) {
      let parentId = m.parentTaskId || null;
      if (!parentId) {
        const match = m.title.match(/\[Media cho ([A-Z0-9-]+)\]/i);
        if (match) {
          parentId = codeToContentId.get(match[1].toUpperCase()) ?? null;
        }
      }
      if (!parentId) continue;
      const arr = map.get(parentId) ?? [];
      arr.push(m);
      map.set(parentId, arr);
    }
    return map;
  }, [tasks, contentPosts]);

  const filterRouteOptions = useMemo(() => {
    const out = [...projectOptions.routes];
    const seen = new Set(out.map((r) => r.toLowerCase()));
    for (const post of contentPosts) {
      const normalized = normalizeRouteSelectValue(
        post.contentAngle,
        projectOptions.routes
      );
      if (normalized && !seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        out.push(normalized);
      }
    }
    return out;
  }, [projectOptions.routes, contentPosts]);

  const filteredPosts = useMemo(() => {
    return contentPosts.filter((t) => {
      if (monthFilter === "UNSCHEDULED") {
        if (t.scheduledPublishAt) return false;
      } else if (monthFilter !== "ALL") {
        if (!t.scheduledPublishAt) return false;
        const m = getVnDateString(new Date(t.scheduledPublishAt)).slice(0, 7);
        if (m !== monthFilter) return false;
      }
      if (picFilter === "MINE") {
        if (!isUserAssignedToTask(t, currentUserId)) return false;
      } else if (picFilter !== "ALL" && !isUserAssignedToTask(t, picFilter)) {
        return false;
      }
      if (routeFilter !== "ALL") {
        const normalized = normalizeRouteSelectValue(
          t.contentAngle,
          projectOptions.routes
        );
        if (normalized.toLowerCase() !== routeFilter.toLowerCase())
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
    projectOptions.routes,
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

  function handleMoveFilteredRelative(taskId: string, direction: "UP" | "DOWN") {
    const visibleIdx = filteredPosts.findIndex((t) => t.id === taskId);
    if (visibleIdx < 0) return;
    const neighbor =
      direction === "UP"
        ? filteredPosts[visibleIdx - 1]
        : filteredPosts[visibleIdx + 1];
    if (!neighbor) return;
    handleReorderDrop(
      taskId,
      neighbor.id,
      direction === "UP" ? "BEFORE" : "AFTER"
    );
  }

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
        window.dispatchEvent(new CustomEvent("reviews-count-updated"));
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
      window.dispatchEvent(new CustomEvent("reviews-count-updated"));
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
          scheduledPublishAt: qDate
            ? `${qDate}T${qTime || "09:00"}:00+07:00`
            : null,
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
        routeOptions={filterRouteOptions}
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
        sortMode={sortMode}
        onChangeSortMode={(nextMode) => {
          setSortMode(nextMode);
          if (nextMode === "MANUAL") {
            showToast(
              "Đã chuyển sang chế độ Thủ công — di chuột vào đầu dòng (hiện bàn tay) để kéo thả lên xuống!",
              "info"
            );
          }
        }}
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
        onOpenOptionsModal={onOpenOptionsModal}
      />

      {/* Chế độ xem Thẻ gọn trên Mobile (không phải vuốt ngang 11 cột) */}
      <div className="md:hidden space-y-2.5">
        {quickOpen && (
          <form
            onSubmit={handleQuickAdd}
            className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-3.5 space-y-2.5 text-xs"
          >
            <div className="font-extrabold text-sky-950">➕ Thêm nhanh bài viết mới</div>
            <input
              type="text"
              required
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              placeholder="Nhập tiêu đề / ý tưởng bài viết..."
              className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <input
                  type="date"
                  value={qDate}
                  onChange={(e) => setQDate(e.target.value)}
                  className="w-full rounded-xl border border-sky-300 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="time"
                  aria-label="Giờ đăng bài mới"
                  value={qTime}
                  onChange={(e) => setQTime(e.target.value)}
                  className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                />
              </div>
              <CustomizableOptionSelect
                value={qRoute}
                options={projectOptions.routes}
                emptyLabel="-- Tuyến --"
                placeholder="Tên tuyến mới..."
                selectClassName="w-full rounded-xl border border-sky-300 bg-white px-2 py-1.5 text-xs"
                onChange={setQRoute}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("ROUTES", val)
                    : undefined
                }
              />
              <CustomizableOptionSelect
                value={qPlatform}
                options={projectOptions.platforms}
                placeholder="Nền tảng mới..."
                selectClassName="w-full rounded-xl border border-sky-300 bg-white px-2 py-1.5 text-xs"
                onChange={setQPlatform}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("PLATFORMS", val)
                    : undefined
                }
              />
              <CustomizableOptionSelect
                value={qFormat}
                options={projectOptions.formats}
                placeholder="Format mới..."
                selectClassName="w-full rounded-xl border border-sky-300 bg-white px-2 py-1.5 text-xs"
                onChange={setQFormat}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("FORMATS", val)
                    : undefined
                }
              />
              <select
                value={qPicId}
                onChange={(e) => setQPicId(e.target.value)}
                className="col-span-2 rounded-xl border border-sky-300 bg-white px-2 py-1.5 text-xs"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={creatingQuick || !qTitle.trim()}
                className="rounded-xl bg-blue-600 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {creatingQuick ? "..." : "+ Lưu bài"}
              </button>
            </div>
          </form>
        )}

        {filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 px-4 text-center text-xs text-slate-400">
            Chưa có bài viết nào trong bộ lọc này — bấm{" "}
            <strong>&ldquo;Viết bài mới&rdquo;</strong> hoặc{" "}
            <strong>&ldquo;Thêm dòng&rdquo;</strong> để bắt đầu ngay!
          </div>
        ) : (
          filteredPosts.map((t, idx) => (
            <ContentCalendarMobileCard
              key={t.id}
              task={t}
              projectSlug={project.slug}
              users={users}
              linkedMediaOrders={linkedMediaByParentId.get(t.id) ?? []}
              todayStr={todayStr}
              currentUserRole={currentUserRole}
              rowBusy={savingId === t.id}
              deleteMode={deleteMode}
              deletable={canUserDeleteTask(t, currentUserId, currentUserRole)}
              deleting={deleting}
              isSelectedForDelete={selectedDeleteIds.includes(t.id)}
              canMoveUp={sortMode === "MANUAL" && idx > 0}
              canMoveDown={
                sortMode === "MANUAL" && idx < filteredPosts.length - 1
              }
              onMoveUp={
                sortMode === "MANUAL"
                  ? () => handleMoveFilteredRelative(t.id, "UP")
                  : undefined
              }
              onMoveDown={
                sortMode === "MANUAL"
                  ? () => handleMoveFilteredRelative(t.id, "DOWN")
                  : undefined
              }
              onToggleSelectDelete={toggleSelectDelete}
              onRequestDeleteSingle={(id) => setDeleteConfirmIds([id])}
              onPatchTaskInline={patchTaskInline}
              onOpenEditor={(target) => onOpenEditor(target)}
              onOpenMediaOrder={(id) => onOpenTaskDrawer?.(id)}
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
      </div>

      {/* Bảng Timeline Đăng Bài (Desktop 11 cột chuẩn Google Sheets) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs min-w-[1040px]">
          <thead>
            <tr className="bg-[#38761d] text-white uppercase text-[11px] font-extrabold">
              <th
                className="py-3 px-1 w-9 text-center"
                title="Di chuột vào đầu dòng (hiện biểu tượng bàn tay) rồi kéo lên xuống để sắp xếp"
              >
                <GripVertical className="w-3.5 h-3.5 mx-auto opacity-75" />
              </th>
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
              <th className="py-3 px-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() =>
                    setSortMode((prev) =>
                      prev === "TIME_DESC" ? "TIME_ASC" : "TIME_DESC"
                    )
                  }
                  title="Bấm để đảo chiều sắp xếp theo Ngày & Giờ đăng"
                  className="inline-flex items-center gap-1 uppercase font-extrabold hover:text-amber-200 transition cursor-pointer"
                >
                  <span>Ngày / Giờ đăng</span>
                  {sortMode === "TIME_DESC" ? (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                  ) : sortMode === "TIME_ASC" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-amber-300" />
                  ) : null}
                </button>
              </th>
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
            {/* Dòng thêm bài nhanh inline (luôn thêm lên trên cùng) */}
            {quickOpen && (
              <tr className="bg-sky-50/70">
                <td className="p-2 text-center text-sky-400">
                  <GripVertical className="w-3.5 h-3.5 mx-auto opacity-50" />
                </td>
                {deleteMode && <td className="p-2 text-center text-slate-300">—</td>}
                <td className="p-2">
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={qDate}
                      onChange={(e) => setQDate(e.target.value)}
                      className="w-full rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs"
                    />
                    <input
                      type="time"
                      aria-label="Giờ đăng dòng mới"
                      value={qTime}
                      onChange={(e) => setQTime(e.target.value)}
                      className="w-full rounded-lg border border-sky-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                    />
                  </div>
                </td>
                <td className="p-2">
                  <CustomizableOptionSelect
                    value={qRoute}
                    options={projectOptions.routes}
                    emptyLabel="-- Tuyến --"
                    placeholder="Tên tuyến mới..."
                    selectClassName="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs max-w-[135px]"
                    inputClassName="w-28 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs focus:outline-none"
                    onChange={setQRoute}
                    onAddOption={
                      onAddProjectOption
                        ? (val) => onAddProjectOption("ROUTES", val)
                        : undefined
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    autoFocus
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
                    <CustomizableOptionSelect
                      value={qPlatform}
                      options={projectOptions.platforms}
                      placeholder="Nền tảng mới..."
                      selectClassName="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs max-w-[115px]"
                      inputClassName="w-24 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs focus:outline-none"
                      onChange={setQPlatform}
                      onAddOption={
                        onAddProjectOption
                          ? (val) => onAddProjectOption("PLATFORMS", val)
                          : undefined
                      }
                    />
                  </div>
                </td>
                <td className="p-2 text-[11px] text-slate-500">
                  Lưu xong bấm vào đây để viết bài &amp; AI Check
                </td>
                <td className="p-2">
                  <CustomizableOptionSelect
                    value={qFormat}
                    options={projectOptions.formats}
                    placeholder="Format mới..."
                    selectClassName="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs max-w-[115px]"
                    inputClassName="w-24 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-xs focus:outline-none"
                    onChange={setQFormat}
                    onAddOption={
                      onAddProjectOption
                        ? (val) => onAddProjectOption("FORMATS", val)
                        : undefined
                    }
                  />
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
                  colSpan={deleteMode ? 13 : 12}
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
                  routeOptions={projectOptions.routes}
                  platformOptions={projectOptions.platforms}
                  formatOptions={projectOptions.formats}
                  linkedMediaOrders={linkedMediaByParentId.get(t.id) ?? []}
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
                  manualDragEnabled={sortMode === "MANUAL"}
                  onRequestManualMode={() => {
                    setSortMode("MANUAL");
                    showToast(
                      "Đã chuyển sang chế độ Thủ công — giữ tay nắm đầu dòng để kéo thả sắp xếp lên xuống!",
                      "info"
                    );
                  }}
                  isDragging={draggingId === t.id}
                  dropIndicator={
                    dropTarget?.id === t.id && draggingId !== t.id
                      ? dropTarget.position
                      : null
                  }
                  onRowDragStart={(id) => {
                    setDraggingId(id);
                    setDropTarget(null);
                  }}
                  onRowDragOver={(targetId, pos) => {
                    if (!draggingId || draggingId === targetId) {
                      setDropTarget(null);
                      return;
                    }
                    setDropTarget((prev) =>
                      prev?.id === targetId && prev.position === pos
                        ? prev
                        : { id: targetId, position: pos }
                    );
                  }}
                  onRowDrop={(transferredId, targetId, pos) => {
                    const sourceId = transferredId || draggingId;
                    if (sourceId) {
                      handleReorderDrop(sourceId, targetId, pos);
                    }
                  }}
                  onRowDragEnd={() => {
                    setDraggingId(null);
                    setDropTarget(null);
                  }}
                  onToggleSelectDelete={toggleSelectDelete}
                  onRequestDeleteSingle={(id) => setDeleteConfirmIds([id])}
                  onPatchTaskInline={patchTaskInline}
                  onAddProjectOption={onAddProjectOption}
                  onOpenEditor={(target) => onOpenEditor(target)}
                  onOpenMediaOrder={(id) => onOpenTaskDrawer?.(id)}
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
