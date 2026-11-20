"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bot, Film, FolderCheck, Image as ImageIcon } from "lucide-react";
import {
  AiAndStandardsModal,
  type AiAndStandardsTab,
} from "@/components/ai-and-standards-modal";
import { OutputInspectorModal } from "@/components/output-inspector-modal";
import { OutputsCardItem } from "@/components/outputs-card-item";
import {
  OutputsFilterBar,
  type MemberStatSummary,
  type OutputsPeriodFilter,
  type OutputsViewMode,
} from "@/components/outputs-filter-bar";
import { OutputsTableView } from "@/components/outputs-table-view";
import { PirateAvatar } from "@/components/pirate-art";
import { TaskStatusBadge } from "@/components/status-badge";
import { TaskDrawer } from "@/components/task-drawer";
import { useToast } from "@/components/toast-provider";
import { useGeminiQcRunner } from "@/hooks/use-gemini-qc";
import { ASSET_KIND_LABEL, TASK_STATUS_META } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import {
  formatVnDateTime,
  getVnDateString,
  getVnMonthBounds,
  getVnWeekBounds,
} from "@/lib/dates";
import {
  OUTPUT_CATEGORY_META,
  analyzeTaskOutputs,
  sortTasksForOutputCheck,
  type OutputCategoryFilter,
  type OutputReadinessFilter,
} from "@/lib/output-helpers";
import type { GeminiConfigInfo } from "@/lib/gemini-shared";
import type { UserRole } from "@/generated/prisma/client";
import type { SimpleProject, SimpleUser, TaskItem } from "@/types/crm";

interface OutputsHubViewProps {
  initialTasks: TaskItem[];
  projects: SimpleProject[];
  users: SimpleUser[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  todayDateStr: string;
  initialAiConfig?: GeminiConfigInfo;
  initialMemberId?: string;
  initialCategory?: OutputCategoryFilter;
  initialProjectId?: string;
  initialReadiness?: OutputReadinessFilter;
}

function GalleryCoverImage({
  src,
  alt,
  fallbackTitle,
  isVideo,
  assetCount,
}: {
  src?: string;
  alt: string;
  fallbackTitle: string;
  isVideo: boolean;
  assetCount: number;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        onError={() => setFailed(true)}
        className="object-cover group-hover:scale-105 transition-transform"
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-50 to-sky-50">
      {isVideo ? (
        <Film className="w-9 h-9 text-violet-500 mb-2" />
      ) : (
        <ImageIcon className="w-9 h-9 text-amber-500 mb-2" />
      )}
      <div className="text-xs font-extrabold text-slate-800 line-clamp-2">
        {fallbackTitle}
      </div>
      <span className="text-[11px] text-slate-500 mt-1">
        {assetCount} file đính kèm • Bấm để kiểm tra
      </span>
    </div>
  );
}

export function OutputsHubView({
  initialTasks,
  projects,
  users,
  currentUserId,
  currentUserName,
  currentUserRole,
  todayDateStr,
  initialAiConfig = {
    configured: false,
    source: "NONE",
    maskedKey: null,
    model: "gemini-3.8-flash",
  },
  initialMemberId = "ALL",
  initialCategory = "ALL",
  initialProjectId = "ALL",
  initialReadiness,
}: OutputsHubViewProps) {
  const { showToast } = useToast();
  const isLeader = currentUserRole === "LEADER";

  const [prevInitialTasks, setPrevInitialTasks] =
    useState<TaskItem[]>(initialTasks);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    isLeader ? initialMemberId : currentUserId
  );
  const [onlyPendingMembers, setOnlyPendingMembers] = useState(false);
  const [categoryFilter, setCategoryFilter] =
    useState<OutputCategoryFilter>(initialCategory);
  const [readinessFilter, setReadinessFilter] =
    useState<OutputReadinessFilter>(
      initialReadiness ?? (isLeader ? "NEEDS_REVIEW" : "ALL")
    );
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId);
  const [periodFilter, setPeriodFilter] = useState<OutputsPeriodFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<OutputsViewMode>("CARDS");

  const [expandedCaptionIds, setExpandedCaptionIds] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);

  const [inspectTaskId, setInspectTaskId] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  const [aiConfig, setAiConfig] = useState<GeminiConfigInfo>(initialAiConfig);
  const [aiModalTab, setAiModalTab] = useState<AiAndStandardsTab | null>(null);

  const {
    aiCheckingTaskId,
    aiErrorsByTaskId,
    getAiResultForTask,
    runAiCheckForTask,
  } = useGeminiQcRunner({
    showToast,
    onResultSaved: (taskId, result) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                lastAiQcJson: result,
                lastAiQcAt: result.meta.checkedAt,
              }
            : t
        )
      );
    },
  });

  const weekBounds = useMemo(() => getVnWeekBounds(), []);
  const monthBounds = useMemo(() => getVnMonthBounds(), []);
  const thirtyDaysAgoStr = useMemo(() => {
    const anchor = new Date(`${todayDateStr}T12:00:00+07:00`);
    anchor.setUTCDate(anchor.getUTCDate() - 30);
    return getVnDateString(anchor);
  }, [todayDateStr]);

  const sortedTasks = useMemo(() => sortTasksForOutputCheck(tasks), [tasks]);

  const scopedBaseTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedTasks.filter((t) => {
      if (projectFilter !== "ALL" && t.project.id !== projectFilter) return false;

      if (periodFilter !== "ALL") {
        const refDate = new Date(
          t.completedAt ??
            t.approvedAt ??
            t.submittedAt ??
            t.scheduledPublishAt ??
            t.dueAt ??
            t.createdAt
        );
        const ymd = getVnDateString(refDate);
        if (
          periodFilter === "WEEK" &&
          (ymd < weekBounds.weekStartStr || ymd > weekBounds.weekEndStr)
        ) {
          return false;
        }
        if (
          periodFilter === "MONTH" &&
          (ymd < monthBounds.monthStartStr || ymd > monthBounds.monthEndStr)
        ) {
          return false;
        }
        if (periodFilter === "LAST_30" && ymd < thirtyDaysAgoStr) {
          return false;
        }
      }

      if (q) {
        const assetMatch = (t.assets ?? []).some(
          (a) =>
            a.label.toLowerCase().includes(q) || a.url.toLowerCase().includes(q)
        );
        const matched =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.caption || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.publishChannel || "").toLowerCase().includes(q) ||
          (t.assignee?.name || "").toLowerCase().includes(q) ||
          t.project.name.toLowerCase().includes(q) ||
          assetMatch;
        if (!matched) return false;
      }

      return true;
    });
  }, [
    sortedTasks,
    projectFilter,
    periodFilter,
    searchQuery,
    weekBounds.weekStartStr,
    weekBounds.weekEndStr,
    monthBounds.monthStartStr,
    monthBounds.monthEndStr,
    thirtyDaysAgoStr,
  ]);

  const memberStats = useMemo(() => {
    const map = new Map<string, MemberStatSummary>();
    for (const u of users) {
      map.set(u.id, {
        total: 0,
        withOutput: 0,
        needsReview: 0,
        contentCount: 0,
        imageCount: 0,
        videoCount: 0,
        linkCount: 0,
      });
    }

    let unassignedTotal = 0;

    for (const t of scopedBaseTasks) {
      if (!t.assignee?.id) {
        unassignedTotal += 1;
        continue;
      }
      const entry = map.get(t.assignee.id) ?? {
        total: 0,
        withOutput: 0,
        needsReview: 0,
        contentCount: 0,
        imageCount: 0,
        videoCount: 0,
        linkCount: 0,
      };
      const analyzed = analyzeTaskOutputs(t);
      entry.total += 1;
      if (analyzed.hasSubmittedOutput) entry.withOutput += 1;
      if (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") {
        entry.needsReview += 1;
      }
      if (analyzed.category === "CONTENT") entry.contentCount += 1;
      if (analyzed.category === "IMAGE") entry.imageCount += 1;
      if (analyzed.category === "VIDEO") entry.videoCount += 1;
      entry.linkCount += analyzed.deliverableAssets.length;
      map.set(t.assignee.id, entry);
    }

    return { map, unassignedTotal };
  }, [scopedBaseTasks, users]);

  const memberScopedTasks = useMemo(() => {
    if (!isLeader) return scopedBaseTasks;
    if (selectedMemberId === "ALL") return scopedBaseTasks;
    if (selectedMemberId === "UNASSIGNED") {
      return scopedBaseTasks.filter((t) => !t.assignee?.id);
    }
    return scopedBaseTasks.filter((t) => t.assignee?.id === selectedMemberId);
  }, [scopedBaseTasks, selectedMemberId, isLeader]);

  const summaryCounts = useMemo(() => {
    let total = 0;
    let withOutput = 0;
    let missingOutput = 0;
    let needsReview = 0;
    let approvedOrDone = 0;
    let revisionNeeded = 0;
    let contentTasks = 0;
    let contentWithCaption = 0;
    let imageTasks = 0;
    let imagePiecesTotal = 0;
    let videoTasks = 0;
    let otherTasks = 0;

    for (const t of memberScopedTasks) {
      total += 1;
      const a = analyzeTaskOutputs(t);
      if (a.hasSubmittedOutput) withOutput += 1;
      else missingOutput += 1;

      if (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") {
        needsReview += 1;
      } else if (
        t.status === "APPROVED_FINAL" ||
        t.status === "PUBLISHED" ||
        t.status === "DONE"
      ) {
        approvedOrDone += 1;
      } else if (t.status === "REVISION_NEEDED") {
        revisionNeeded += 1;
      }

      if (a.category === "CONTENT") {
        contentTasks += 1;
        if (a.hasCaption) contentWithCaption += 1;
      } else if (a.category === "IMAGE") {
        imageTasks += 1;
        imagePiecesTotal += Math.max(1, t.quantity || 1);
      } else if (a.category === "VIDEO") {
        videoTasks += 1;
      } else {
        otherTasks += 1;
      }
    }

    return {
      total,
      withOutput,
      missingOutput,
      needsReview,
      approvedOrDone,
      revisionNeeded,
      contentTasks,
      contentWithCaption,
      imageTasks,
      imagePiecesTotal,
      videoTasks,
      otherTasks,
    };
  }, [memberScopedTasks]);

  const filteredTasks = useMemo(() => {
    return memberScopedTasks.filter((t) => {
      const a = analyzeTaskOutputs(t);

      if (categoryFilter !== "ALL" && a.category !== categoryFilter) {
        return false;
      }

      if (readinessFilter === "HAS_OUTPUT" && !a.hasSubmittedOutput) return false;
      if (readinessFilter === "MISSING_OUTPUT" && a.hasSubmittedOutput) return false;
      if (
        readinessFilter === "NEEDS_REVIEW" &&
        t.status !== "WAITING_APPROVAL" &&
        t.status !== "BRIEF_REVIEW"
      ) {
        return false;
      }
      if (
        readinessFilter === "APPROVED_OR_DONE" &&
        t.status !== "APPROVED_FINAL" &&
        t.status !== "PUBLISHED" &&
        t.status !== "DONE"
      ) {
        return false;
      }
      if (
        readinessFilter === "REVISION_NEEDED" &&
        t.status !== "REVISION_NEEDED"
      ) {
        return false;
      }

      if (
        viewMode === "GALLERY" &&
        a.category !== "IMAGE" &&
        a.category !== "VIDEO" &&
        a.deliverableAssets.length === 0
      ) {
        return false;
      }

      return true;
    });
  }, [memberScopedTasks, categoryFilter, readinessFilter, viewMode]);

  const inspectingTask = useMemo(
    () => tasks.find((t) => t.id === inspectTaskId) ?? null,
    [tasks, inspectTaskId]
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/outputs", { cache: "no-store" });
      if (!res.ok) {
        showToast("Không thể tải lại dữ liệu Output.", "error");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks as TaskItem[]);
      }
      if (data.aiConfig) {
        setAiConfig(data.aiConfig as GeminiConfigInfo);
      }
      showToast("Đã đồng bộ dữ liệu Output mới nhất.");
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRunAiCheck(taskId: string, customFocus?: string) {
    if (!aiConfig.configured) {
      setInspectTaskId(taskId);
      if (isLeader) {
        setAiModalTab("GEMINI");
      } else {
        showToast("Leader chưa cấu hình Google Gemini API Key.", "error");
      }
      return null;
    }

    const target = tasks.find((t) => t.id === taskId);
    if (!target) return null;
    setInspectTaskId(taskId);
    return runAiCheckForTask(target, customFocus);
  }

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setInspectTaskId((cur) => (cur === deletedId ? null : cur));
    setDrawerTaskId((cur) => (cur === deletedId ? null : cur));
  }

  async function handleCopyCaption(task: TaskItem) {
    const text = (task.caption || "").trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(task.id);
    showToast(`Đã copy nội dung ${task.code}.`);
    setTimeout(() => setCopiedId((cur) => (cur === task.id ? null : cur)), 1800);
  }

  async function handleQuickApprove(task: TaskItem) {
    setQuickApprovingId(task.id);
    try {
      const action =
        task.status === "BRIEF_REVIEW" ? "APPROVE_BRIEF" : "APPROVE";
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể duyệt tác vụ.", "error");
        return;
      }
      if (data.task) handleTaskUpdated(data.task as TaskItem);
      showToast(
        action === "APPROVE_BRIEF"
          ? `Đã duyệt Brief ${task.code}!`
          : `Đã duyệt Final ${task.code}!`
      );
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setQuickApprovingId(null);
    }
  }

  function handleExportCsv() {
    const headers = [
      "Nhân viên",
      "Mã Task",
      "Tiêu đề",
      "Dự án",
      "Nhóm Output",
      "Số lượng",
      "Nền tảng",
      "Kênh đăng",
      "Trạng thái",
      "Có Caption",
      "Nội dung Caption",
      "Link Demo/Final/Đã đăng",
      "Thời gian nộp/cập nhật",
    ];
    const rows = filteredTasks.map((t) => {
      const a = analyzeTaskOutputs(t);
      const links = a.deliverableAssets
        .map(
          (asset) => `${ASSET_KIND_LABEL[asset.kind] || asset.kind}: ${asset.url}`
        )
        .join(" | ");
      return [
        t.assignee?.name || "Chưa gán",
        t.code,
        t.title,
        t.project.name,
        OUTPUT_CATEGORY_META[a.category].label,
        `${t.quantity} ${a.unitLabel}`,
        t.platform,
        t.publishChannel || "",
        TASK_STATUS_META[t.status]?.shortLabel || t.status,
        a.hasCaption ? "Có" : "Chưa",
        (t.caption || "").replace(/\s+/g, " ").trim(),
        links,
        formatVnDateTime(t.submittedAt ?? t.completedAt ?? t.createdAt),
      ];
    });
    downloadCsv(`output-nhan-vien-${todayDateStr}.csv`, headers, rows);
    showToast(`Đã xuất ${rows.length} dòng Output ra CSV.`);
  }

  return (
    <div className="space-y-5">
      <OutputsFilterBar
        isLeader={isLeader}
        currentUserName={currentUserName}
        aiConfig={aiConfig}
        projects={projects}
        users={users}
        scopedTotalCount={scopedBaseTasks.length}
        memberStats={memberStats}
        summaryCounts={summaryCounts}
        selectedMemberId={selectedMemberId}
        onSelectMemberId={setSelectedMemberId}
        onlyPendingMembers={onlyPendingMembers}
        onToggleOnlyPendingMembers={() => setOnlyPendingMembers((v) => !v)}
        categoryFilter={categoryFilter}
        onSelectCategory={setCategoryFilter}
        readinessFilter={readinessFilter}
        onSelectReadiness={setReadinessFilter}
        projectFilter={projectFilter}
        onChangeProjectFilter={setProjectFilter}
        periodFilter={periodFilter}
        onChangePeriodFilter={setPeriodFilter}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
        onOpenAiAndStandards={() => setAiModalTab("STANDARDS")}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
        <span>
          Đang hiển thị{" "}
          <span className="text-slate-900 font-extrabold">
            {filteredTasks.length}
          </span>{" "}
          đầu việc Output
        </span>
        {(categoryFilter !== "ALL" ||
          readinessFilter !== "ALL" ||
          projectFilter !== "ALL" ||
          periodFilter !== "ALL" ||
          searchQuery.trim() !== "" ||
          onlyPendingMembers ||
          (isLeader && selectedMemberId !== "ALL")) && (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("ALL");
              setReadinessFilter("ALL");
              setProjectFilter("ALL");
              setPeriodFilter("ALL");
              setSearchQuery("");
              setOnlyPendingMembers(false);
              if (isLeader) setSelectedMemberId("ALL");
            }}
            className="text-amber-700 hover:underline cursor-pointer"
          >
            Xem tất cả ({scopedBaseTasks.length})
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center space-y-2.5">
          <FolderCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">
            {readinessFilter === "NEEDS_REVIEW"
              ? "Tuyệt vời — Hiện không còn đầu việc nào chờ Leader duyệt!"
              : "Không tìm thấy đầu việc Output nào khớp bộ lọc hiện tại."}
          </div>
          {readinessFilter === "NEEDS_REVIEW" ? (
            <button
              type="button"
              onClick={() => setReadinessFilter("ALL")}
              className="rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
            >
              Xem toàn bộ Output ({summaryCounts.total})
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              Hãy đổi bộ lọc loại Output, nhân viên hoặc chuyển chế độ xem sang Thẻ Chi Tiết.
            </p>
          )}
        </div>
      ) : viewMode === "CARDS" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredTasks.map((t) => (
            <OutputsCardItem
              key={t.id}
              task={t}
              isLeader={isLeader}
              isExpanded={Boolean(expandedCaptionIds[t.id])}
              copied={copiedId === t.id}
              aiChecking={aiCheckingTaskId === t.id}
              quickApproving={quickApprovingId === t.id}
              savedAiResult={getAiResultForTask(t)}
              onToggleExpand={() =>
                setExpandedCaptionIds((prev) => ({
                  ...prev,
                  [t.id]: !prev[t.id],
                }))
              }
              onCopyCaption={() => {
                void handleCopyCaption(t);
              }}
              onInspect={() => setInspectTaskId(t.id)}
              onRunAiCheck={() => {
                void handleRunAiCheck(t.id);
              }}
              onOpenDrawer={() => setDrawerTaskId(t.id)}
              onQuickApprove={() => {
                void handleQuickApprove(t);
              }}
            />
          ))}
        </div>
      ) : viewMode === "GALLERY" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const a = analyzeTaskOutputs(t);
            const cover = a.imagePreviews[0];
            const savedAi = getAiResultForTask(t);
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-amber-200/80 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div
                  onClick={() => setInspectTaskId(t.id)}
                  className="relative h-48 w-full bg-slate-100 cursor-pointer group overflow-hidden"
                >
                  <GalleryCoverImage
                    src={cover?.previewUrl}
                    alt={t.title}
                    fallbackTitle={a.deliverableAssets[0]?.label || t.title}
                    isVideo={a.category === "VIDEO"}
                    assetCount={a.deliverableAssets.length}
                  />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-md bg-slate-950/75 text-white px-2 py-0.5 text-[10px] font-bold">
                      {t.quantity} {a.unitLabel}
                    </span>
                    {savedAi && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600/90 text-white px-2 py-0.5 text-[10px] font-extrabold">
                        <Bot className="w-3 h-3" />
                        {savedAi.result.score}đ
                      </span>
                    )}
                    {a.imagePreviews.length > 1 && (
                      <span className="rounded-md bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold">
                        +{a.imagePreviews.length - 1} ảnh
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <TaskStatusBadge status={t.status} />
                  </div>
                </div>

                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold text-slate-500">
                        {t.code}
                      </span>
                      <span className="font-bold text-slate-600">
                        {t.project.name}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2">
                      {t.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PirateAvatar
                        name={t.assignee?.name || "Chưa gán"}
                        color={t.assignee?.avatarColor || "#64748b"}
                        scope={t.assignee?.departmentScope}
                        pirateCharacter={t.assignee?.pirateCharacter}
                        size="sm"
                      />
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {t.assignee?.name || "Chưa gán"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectTaskId(t.id)}
                      className="rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 cursor-pointer"
                    >
                      Check Output
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <OutputsTableView
          tasks={filteredTasks}
          isLeader={isLeader}
          aiCheckingTaskId={aiCheckingTaskId}
          quickApprovingId={quickApprovingId}
          getAiResultForTask={getAiResultForTask}
          onInspect={(id) => setInspectTaskId(id)}
          onRunAiCheck={(id) => {
            void handleRunAiCheck(id);
          }}
          onQuickApprove={(t) => {
            void handleQuickApprove(t);
          }}
        />
      )}

      <OutputInspectorModal
        task={inspectingTask}
        open={Boolean(inspectingTask)}
        currentUserRole={currentUserRole}
        aiConfig={aiConfig}
        aiResult={inspectingTask ? getAiResultForTask(inspectingTask) : null}
        aiLoading={Boolean(
          inspectingTask && aiCheckingTaskId === inspectingTask.id
        )}
        aiError={
          inspectingTask ? aiErrorsByTaskId[inspectingTask.id] ?? null : null
        }
        onRunAiCheck={(taskId, focus) => handleRunAiCheck(taskId, focus)}
        onOpenAiSettings={
          isLeader ? () => setAiModalTab("GEMINI") : undefined
        }
        onOpenStandardsModal={
          isLeader ? () => setAiModalTab("STANDARDS") : undefined
        }
        onClose={() => setInspectTaskId(null)}
        onUpdated={handleTaskUpdated}
        onOpenTaskDrawer={(id) => setDrawerTaskId(id)}
      />

      {isLeader && (
        <AiAndStandardsModal
          open={aiModalTab !== null}
          initialTab={aiModalTab ?? "STANDARDS"}
          initialConfig={aiConfig}
          projects={projects}
          onClose={() => setAiModalTab(null)}
          onConfigSaved={(next) => setAiConfig(next)}
          onStandardsChanged={(activeStandardsCount, includeDefaultQc) =>
            setAiConfig((prev) => ({
              ...prev,
              activeStandardsCount,
              includeDefaultQc,
            }))
          }
        />
      )}

      <TaskDrawer
        taskId={drawerTaskId}
        currentUserRole={currentUserRole}
        onClose={() => setDrawerTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        onDuplicated={(dup) => setTasks((prev) => [dup, ...prev])}
      />
    </div>
  );
}
