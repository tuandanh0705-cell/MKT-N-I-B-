"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Settings2,
  LayoutGrid,
  FolderOpen,
  BookOpen,
  Camera,
  TableProperties,
  PenLine,
  Link2,
  ExternalLink,
} from "lucide-react";
import { CreateTaskModal } from "@/components/create-task-modal";
import {
  AiAndStandardsModal,
  type AiAndStandardsTab,
} from "@/components/ai-and-standards-modal";
import { TaskDrawer } from "@/components/task-drawer";
import { ProjectContentOverviewPanel } from "@/components/project-content-overview";
import { ProjectContentMatrixPanel } from "@/components/project-content-matrix";
import { ProjectContentCalendarPanel } from "@/components/project-content-calendar";
import { ProjectPublishCalendarPanel } from "@/components/project-publish-calendar";
import { MediaBriefBoard } from "@/components/media-brief-board";
import {
  ContentPostEditorModal,
  type ContentPostPrefill,
} from "@/components/content-post-editor-modal";
import { useToast } from "@/components/toast-provider";
import {
  normalizeContentMatrix,
  isContentTaskItem,
} from "@/lib/content-plan";
import { buildProjectChannelSuggestions } from "@/lib/platform-meta";
import type { GeminiConfigInfo } from "@/lib/gemini-shared";
import type {
  CapacityItem,
  ProjectChannelSuggestions,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { TaskType, UserRole } from "@/generated/prisma/client";

export type ProjectViewTab =
  | "OVERVIEW"
  | "MATRIX"
  | "CONTENT_CALENDAR"
  | "CALENDAR"
  | "MEDIA_BRIEF";

interface ProjectWorkspaceProps {
  project: SimpleProject;
  membersLabel: string[];
  initialTasks: TaskItem[];
  allAccessibleProjects: SimpleProject[];
  users: SimpleUser[];
  capacity: CapacityItem[];
  baseChannelSuggestions?: ProjectChannelSuggestions;
  currentUserId: string;
  currentUserRole: UserRole;
  initialAiConfig?: GeminiConfigInfo;
  initialTab?: string;
  initialTaskId?: string;
  initialOpenChat?: boolean;
}

const VALID_TABS: ProjectViewTab[] = [
  "OVERVIEW",
  "MATRIX",
  "CONTENT_CALENDAR",
  "CALENDAR",
  "MEDIA_BRIEF",
];

export function ProjectWorkspace({
  project: initialProject,
  membersLabel,
  initialTasks,
  allAccessibleProjects,
  users,
  capacity,
  baseChannelSuggestions,
  currentUserId,
  currentUserRole,
  initialAiConfig = {
    configured: false,
    source: "NONE",
    maskedKey: null,
    model: "gemini-3.8-flash",
  },
  initialTab,
  initialTaskId,
  initialOpenChat = false,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const initialMatchedTask = initialTaskId
    ? initialTasks.find((t) => t.id === initialTaskId) || null
    : null;
  const normalizedTab =
    initialTab === "CONTENT_DETAIL"
      ? "CONTENT_CALENDAR"
      : initialTab && VALID_TABS.includes(initialTab as ProjectViewTab)
        ? (initialTab as ProjectViewTab)
        : initialMatchedTask && isContentTaskItem(initialMatchedTask)
          ? "CONTENT_CALENDAR"
          : "OVERVIEW";

  const [prevInitialProject, setPrevInitialProject] =
    useState<SimpleProject>(initialProject);
  const [project, setProject] = useState<SimpleProject>(initialProject);
  if (prevInitialProject !== initialProject) {
    setPrevInitialProject(initialProject);
    setProject(initialProject);
  }

  const [prevInitialTasks, setPrevInitialTasks] =
    useState<TaskItem[]>(initialTasks);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [aiConfig, setAiConfig] = useState<GeminiConfigInfo>(initialAiConfig);
  const [aiModalTab, setAiModalTab] = useState<AiAndStandardsTab | null>(null);
  const [viewMode, setViewMode] = useState<ProjectViewTab>(normalizedTab);
  const [createOpen, setCreateOpen] = useState(false);
  const [matrixDefaults, setMatrixDefaults] = useState<{
    pillar?: string;
    week?: number;
    title?: string;
    taskType?: TaskType;
    orderMode?: "MEDIA" | "TASK";
    videoKind?: "SHOOT_AND_EDIT" | "EDIT_ONLY";
    parentTaskId?: string;
    parentLabel?: string;
  }>({});
  const [prevDeepLinkKey, setPrevDeepLinkKey] = useState<string>(
    `${initialTaskId ?? ""}:${initialOpenChat ? "1" : "0"}`
  );
  const [openChatInitially, setOpenChatInitially] = useState<boolean>(
    Boolean(initialOpenChat && initialMatchedTask)
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(
    initialMatchedTask && !isContentTaskItem(initialMatchedTask)
      ? initialMatchedTask.id
      : null
  );
  const [contentEditorOpen, setContentEditorOpen] = useState<boolean>(
    Boolean(initialMatchedTask && isContentTaskItem(initialMatchedTask))
  );
  const [contentEditorTask, setContentEditorTask] = useState<TaskItem | null>(
    initialMatchedTask && isContentTaskItem(initialMatchedTask)
      ? initialMatchedTask
      : null
  );
  const [contentEditorPrefill, setContentEditorPrefill] =
    useState<ContentPostPrefill | null>(null);

  const currentDeepLinkKey = `${initialTaskId ?? ""}:${initialOpenChat ? "1" : "0"}`;
  if (prevDeepLinkKey !== currentDeepLinkKey) {
    setPrevDeepLinkKey(currentDeepLinkKey);
    if (initialTaskId) {
      const target = tasks.find((t) => t.id === initialTaskId) || null;
      if (target) {
        setOpenChatInitially(Boolean(initialOpenChat));
        if (isContentTaskItem(target)) {
          setActiveTaskId(null);
          setContentEditorTask(target);
          setContentEditorPrefill(null);
          setContentEditorOpen(true);
        } else {
          setContentEditorOpen(false);
          setContentEditorTask(null);
          setActiveTaskId(target.id);
        }
      }
    }
  }

  const mergedChannelSuggestions = useMemo<ProjectChannelSuggestions>(() => {
    const fromTasks = buildProjectChannelSuggestions({ tasks });
    return {
      fanpages: Array.from(
        new Set([...(baseChannelSuggestions?.fanpages ?? []), ...fromTasks.fanpages])
      ),
      tiktoks: Array.from(
        new Set([...(baseChannelSuggestions?.tiktoks ?? []), ...fromTasks.tiktoks])
      ),
      websites: Array.from(
        new Set([...(baseChannelSuggestions?.websites ?? []), ...fromTasks.websites])
      ),
      others: Array.from(
        new Set([...(baseChannelSuggestions?.others ?? []), ...fromTasks.others])
      ),
    };
  }, [baseChannelSuggestions, tasks]);

  const contentPostsCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          isContentTaskItem(t) ||
          (!t.isMediaOrder &&
            t.taskType !== "ADS_CAMPAIGN" &&
            t.taskType !== "WEB_SEO")
      ).length,
    [tasks]
  );

  const mediaBriefsCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.taskType === "MEDIA_IMAGE" ||
          t.taskType === "MEDIA_VIDEO" ||
          t.isMediaOrder
      ).length,
    [tasks]
  );

  // Leader sửa thông tin / KPI dự án
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projName, setProjName] = useState(initialProject.name);
  const [projChannels, setProjChannels] = useState(
    initialProject.channelSummary || ""
  );
  const [projKpiNote, setProjKpiNote] = useState(initialProject.kpiNote || "");
  const [projSocial, setProjSocial] = useState(
    initialProject.weeklySocialTarget || 0
  );
  const [projAds, setProjAds] = useState(initialProject.weeklyAdsTarget || 0);
  const [projImage, setProjImage] = useState(
    initialProject.weeklyImageTarget || 0
  );
  const [projVideo, setProjVideo] = useState(
    initialProject.weeklyVideoTarget || 0
  );
  const [savingProj, setSavingProj] = useState(false);

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  }

  async function handleContentPostSaved(
    savedTask: TaskItem,
    matrixIdeaId?: string | null
  ) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      return exists
        ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
        : [savedTask, ...prev];
    });
    setContentEditorTask(savedTask);

    if (matrixIdeaId) {
      const matrix = normalizeContentMatrix(project.contentMatrixJson);
      const needsLink = matrix.ideas.some(
        (i) => i.id === matrixIdeaId && i.linkedTaskId !== savedTask.id
      );
      if (needsLink) {
        const nextMatrix = {
          ...matrix,
          ideas: matrix.ideas.map((i) =>
            i.id === matrixIdeaId ? { ...i, linkedTaskId: savedTask.id } : i
          ),
        };
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: project.id,
            contentMatrixJson: nextMatrix,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setProject((prev) => ({
            ...prev,
            contentMatrixJson: data.project.contentMatrixJson,
          }));
        }
      }
    }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    setSavingProj(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          name: projName,
          channelSummary: projChannels,
          kpiNote: projKpiNote,
          weeklySocialTarget: projSocial,
          weeklyAdsTarget: projAds,
          weeklyImageTarget: projImage,
          weeklyVideoTarget: projVideo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProject((prev) => ({ ...prev, ...data.project }));
        setEditProjectOpen(false);
        showToast("Đã cập nhật thông tin & KPI dự án.");
        router.refresh();
      } else {
        showToast(data.error || "Không cập nhật được dự án.", "error");
      }
    } finally {
      setSavingProj(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-lg leading-none" aria-hidden>🗺️</span>
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-amber-200"
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {project.name}
              </h1>
              {project.channelSummary && (
                <span className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                  {project.channelSummary}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs sm:text-sm text-slate-600">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
              {project.kpiNote && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-800 px-2.5 py-1 font-semibold">
                  KPI: {project.kpiNote}
                </span>
              )}
              {membersLabel.length > 0 && (
                <span>
                  Phụ trách dự án:{" "}
                  <strong className="text-slate-800">
                    {membersLabel.join(", ")}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project.masterResourceUrl && (
              <a
                href={project.masterResourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={project.masterResourceNote || project.masterResourceUrl}
                className="rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                Link Tổng Dự Án
                <ExternalLink className="w-3.5 h-3.5 opacity-75" />
              </a>
            )}
            <Link
              href={`/resources?projectId=${project.id}`}
              className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4" />
              Kho Tài Nguyên
            </Link>
            {currentUserRole === "LEADER" && (
              <button
                type="button"
                onClick={() => setEditProjectOpen((v) => !v)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                Sửa KPI Dự án
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMatrixDefaults({});
                setCreateOpen(true);
              }}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Order Media / Giao việc
            </button>
            {viewMode !== "CONTENT_CALENDAR" && (
              <button
                type="button"
                onClick={() => {
                  setContentEditorTask(null);
                  setContentEditorPrefill(null);
                  setContentEditorOpen(true);
                }}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PenLine className="w-4 h-4" />
                + Viết bài mới
              </button>
            )}
          </div>
        </div>

        {/* Form sửa KPI Dự án (Leader Only) */}
        {editProjectOpen && currentUserRole === "LEADER" && (
          <form
            onSubmit={handleSaveProject}
            className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên dự án
                </label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kênh triển khai
                </label>
                <input
                  type="text"
                  value={projChannels}
                  onChange={(e) => setProjChannels(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú KPI
                </label>
                <input
                  type="text"
                  value={projKpiNote}
                  onChange={(e) => setProjKpiNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KPI Social/tuần
                </label>
                <input
                  type="number"
                  min={0}
                  value={projSocial}
                  onChange={(e) => setProjSocial(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KPI Ads/tuần
                </label>
                <input
                  type="number"
                  min={0}
                  value={projAds}
                  onChange={(e) => setProjAds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KPI Ảnh/tuần
                </label>
                <input
                  type="number"
                  min={0}
                  value={projImage}
                  onChange={(e) => setProjImage(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KPI Video/tuần
                </label>
                <input
                  type="number"
                  min={0}
                  value={projVideo}
                  onChange={(e) => setProjVideo(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditProjectOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={savingProj}
                className="rounded-xl bg-blue-600 text-white px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {savingProj ? "Đang lưu..." : "Lưu KPI"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex sm:inline-flex items-center overflow-x-auto no-scrollbar rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("OVERVIEW")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer ${
                viewMode === "OVERVIEW"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Tổng quan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MATRIX")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer ${
                viewMode === "MATRIX"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Matrix Content
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CONTENT_CALENDAR")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer ${
                viewMode === "CONTENT_CALENDAR"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              Nội dung chi tiết ({contentPostsCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CALENDAR")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer ${
                viewMode === "CALENDAR"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Lịch Đăng Bài
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MEDIA_BRIEF")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer ${
                viewMode === "MEDIA_BRIEF"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Brief Media ({mediaBriefsCount})
            </button>
          </div>
        </div>
      </div>

      {/* View: Brief Media (Brief Ảnh / Brief Video) */}
      {viewMode === "MEDIA_BRIEF" && (
        <MediaBriefBoard
          tasks={tasks}
          projects={allAccessibleProjects}
          defaultProjectId={project.id}
          users={users}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onSelectTask={(taskId) => setActiveTaskId(taskId)}
          onTaskCreated={(createdTask) =>
            setTasks((prev) => [createdTask, ...prev])
          }
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          onOpenCreateModal={(kind, videoKind) => {
            setMatrixDefaults({
              taskType: kind,
              orderMode: "MEDIA",
              videoKind,
            });
            setCreateOpen(true);
          }}
        />
      )}

      {/* View 3: Lịch Đăng Bài dạng Lịch Tháng / Tuần */}
      {viewMode === "CALENDAR" && (
        <ProjectPublishCalendarPanel
          tasks={tasks}
          channelSuggestions={mergedChannelSuggestions}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          onOpenContentPost={(post) => {
            setContentEditorTask(post);
            setContentEditorPrefill(null);
            setContentEditorOpen(true);
          }}
          onOpenTaskDrawer={(task) => setActiveTaskId(task.id)}
          onCreatePostForDate={(dateStr) => {
            setContentEditorTask(null);
            setContentEditorPrefill({ publishDate: dateStr });
            setContentEditorOpen(true);
          }}
        />
      )}

      {/* View 0: Tổng quan về dự án */}
      {viewMode === "OVERVIEW" && (
        <ProjectContentOverviewPanel
          project={project}
          tasks={tasks}
          membersLabel={membersLabel}
          onProjectUpdated={(updated) =>
            setProject((prev) => ({ ...prev, ...updated }))
          }
          onJumpTab={(nextTab) => setViewMode(nextTab)}
          onNewPost={() => {
            setContentEditorTask(null);
            setContentEditorPrefill(null);
            setContentEditorOpen(true);
          }}
        />
      )}

      {/* View 4: Matrix Content (7 tầng chiều sâu x nhiều Topic) */}
      {viewMode === "MATRIX" && (
        <ProjectContentMatrixPanel
          project={project}
          tasks={tasks}
          onProjectUpdated={(updated) =>
            setProject((prev) => ({ ...prev, ...updated }))
          }
          onCreatePostFromIdea={(prefill) => {
            setContentEditorTask(null);
            setContentEditorPrefill(prefill);
            setContentEditorOpen(true);
          }}
          onOpenExistingPost={(linkedTask) => {
            setContentEditorTask(linkedTask);
            setContentEditorPrefill(null);
            setContentEditorOpen(true);
          }}
        />
      )}

      {/* View 4B: Lịch Đăng Bài & Soạn Thảo Trực Tiếp */}
      {viewMode === "CONTENT_CALENDAR" && (
        <ProjectContentCalendarPanel
          project={project}
          tasks={tasks}
          users={users}
          channelSuggestions={mergedChannelSuggestions}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onOpenTaskDrawer={(taskId) => setActiveTaskId(taskId)}
          onOpenEditor={(targetTask) => {
            setContentEditorTask(targetTask);
            setContentEditorPrefill(null);
            setContentEditorOpen(true);
          }}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          onTasksAdded={(added) =>
            setTasks((prev) => [...added, ...prev])
          }
          onRequestMediaOrder={(sourceTask) => {
            const isVid =
              (sourceTask.postFormat || "").toLowerCase().includes("video") ||
              (sourceTask.postFormat || "").toLowerCase().includes("reel");
            setMatrixDefaults({
              title: `[Media cho ${sourceTask.code}] ${sourceTask.title}`,
              taskType: isVid ? "MEDIA_VIDEO" : "MEDIA_IMAGE",
              orderMode: "MEDIA",
              pillar: sourceTask.contentPillar || undefined,
              parentTaskId: sourceTask.id,
              parentLabel: `${sourceTask.code} — ${sourceTask.title}`,
            });
            setCreateOpen(true);
          }}
        />
      )}

      <CreateTaskModal
        key={`${project.id}-${matrixDefaults.pillar || ""}-${matrixDefaults.week || 0}-${matrixDefaults.title || ""}-${matrixDefaults.taskType || ""}-${matrixDefaults.orderMode || ""}-${matrixDefaults.videoKind || ""}-${matrixDefaults.parentTaskId || ""}`}
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setMatrixDefaults({});
        }}
        projects={allAccessibleProjects}
        users={users}
        initialCapacity={capacity}
        channelSuggestions={mergedChannelSuggestions}
        currentUserId={currentUserId}
        defaultAssigneeId={
          matrixDefaults.orderMode === "MEDIA" ? undefined : currentUserId
        }
        defaultProjectId={project.id}
        defaultContentPillar={matrixDefaults.pillar}
        defaultCampaignWeek={matrixDefaults.week}
        defaultTitle={matrixDefaults.title}
        defaultTaskType={matrixDefaults.taskType}
        defaultOrderMode={matrixDefaults.orderMode}
        defaultVideoKind={matrixDefaults.videoKind}
        defaultParentTaskId={matrixDefaults.parentTaskId}
        defaultParentLabel={matrixDefaults.parentLabel}
        onCreated={(newTask) => {
          if (newTask.project.id === project.id) {
            setTasks((prev) => [newTask, ...prev]);
          }
        }}
      />

      <ContentPostEditorModal
        open={contentEditorOpen}
        onClose={() => {
          setContentEditorOpen(false);
          setContentEditorTask(null);
          setContentEditorPrefill(null);
          setOpenChatInitially(false);
        }}
        project={project}
        users={users}
        channelSuggestions={mergedChannelSuggestions}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        task={contentEditorTask}
        prefill={contentEditorPrefill}
        initialRightTab={openChatInitially ? "CHAT" : undefined}
        aiConfig={aiConfig}
        onOpenAiSettings={
          currentUserRole === "LEADER"
            ? () => setAiModalTab("GEMINI")
            : undefined
        }
        onOpenStandardsModal={
          currentUserRole === "LEADER"
            ? () => setAiModalTab("STANDARDS")
            : undefined
        }
        onAiChecked={(checkedTaskId, result) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === checkedTaskId
                ? {
                    ...t,
                    lastAiQcJson: result,
                    lastAiQcAt: result.meta.checkedAt,
                  }
                : t
            )
          );
        }}
        onSaved={handleContentPostSaved}
      />

      {currentUserRole === "LEADER" && (
        <AiAndStandardsModal
          open={aiModalTab !== null}
          initialTab={aiModalTab ?? "STANDARDS"}
          initialConfig={aiConfig}
          projects={allAccessibleProjects}
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
        taskId={activeTaskId}
        currentUserRole={currentUserRole}
        initialTab={openChatInitially ? "CHAT" : undefined}
        onClose={() => {
          setActiveTaskId(null);
          setOpenChatInitially(false);
        }}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        onDuplicated={(dup) => {
          if (dup.project.id === project.id) {
            setTasks((prev) => [dup, ...prev]);
          }
        }}
      />
    </div>
  );
}
