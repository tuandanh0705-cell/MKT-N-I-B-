"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Bot,
  CheckCircle2,
  ClipboardList,
  CopyPlus,
  ExternalLink,
  History,
  Info,
  Link2,
  MessageSquare,
  Pencil,
  Pin,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { MediaBriefItemsEditor } from "@/components/media-brief-items-editor";
import { VideoScriptBriefViewer } from "@/components/video-script-brief-viewer";
import { PirateAvatar } from "@/components/pirate-art";
import { PlatformLogo } from "@/components/platform-logo";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskTypeBadge,
} from "@/components/status-badge";
import { TaskDrawerEditForm } from "@/components/task-drawer-edit-form";
import { TaskDrawerQcTab } from "@/components/task-drawer-qc-tab";
import { TaskDrawerSubtasksLog } from "@/components/task-drawer-subtasks-log";
import { TaskFeedbackChat } from "@/components/task-feedback-chat";
import { useToast } from "@/components/toast-provider";
import { useGeminiQcRunner } from "@/hooks/use-gemini-qc";
import {
  isMediaProductionUser,
  isTaskOverdue,
  taskRequiresLeaderApproval,
} from "@/lib/constants";
import { formatVnDateTime, getVnDateString } from "@/lib/dates";
import type { GeminiConfigInfo } from "@/lib/gemini-shared";
import {
  createEmptyMediaBriefItem,
  normalizeMediaBriefItems,
  type MediaBriefItem,
} from "@/lib/media-brief";
import { getPlatformChannelMeta } from "@/lib/platform-meta";
import { getQcCriteriaForTaskType } from "@/lib/qc-standards";
import { normalizeSubtasks } from "@/lib/subtasks";
import type { SimpleUser, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export type DrawerTab = "OVERVIEW" | "CHAT" | "OUTPUT_QC" | "SUBTASKS_LOG";

interface TaskDrawerProps {
  taskId: string | null;
  currentUserRole: UserRole;
  currentUserScope?: string;
  centeredModal?: boolean;
  initialTab?: DrawerTab;
  onClose: () => void;
  onUpdated: (task: TaskItem) => void;
  onDeleted?: (taskId: string) => void;
  onDuplicated?: (task: TaskItem) => void;
}

export function TaskDrawer(props: TaskDrawerProps) {
  if (!props.taskId) return null;
  return (
    <TaskDrawerInner
      key={`${props.taskId}-${props.initialTab ?? "OVERVIEW"}`}
      {...props}
      taskId={props.taskId}
    />
  );
}

function TaskDrawerInner({
  taskId,
  currentUserRole,
  currentUserScope,
  centeredModal = false,
  initialTab,
  onClose,
  onUpdated,
  onDeleted,
  onDuplicated,
}: Omit<TaskDrawerProps, "taskId"> & { taskId: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [aiConfig, setAiConfig] = useState<GeminiConfigInfo | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DrawerTab>(
    initialTab ?? "OVERVIEW"
  );
  const [editMode, setEditMode] = useState(false);

  const [mediaBriefDraft, setMediaBriefDraft] = useState<MediaBriefItem[]>([]);
  const [editingMediaBrief, setEditingMediaBrief] = useState(false);

  const [showRevisionPanel, setShowRevisionPanel] = useState(false);
  const [showQcReference, setShowQcReference] = useState(false);
  const [selectedQcFlags, setSelectedQcFlags] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    aiCheckingTaskId,
    aiErrorsByTaskId,
    getAiResultForTask,
    runAiCheckForTask,
  } = useGeminiQcRunner({
    showToast,
    onResultSaved: (_id, result) => {
      setTask((prev) => {
        if (!prev) return prev;
        const nextTask: TaskItem = {
          ...prev,
          lastAiQcJson: result,
          lastAiQcAt: result.meta.checkedAt,
        };
        onUpdated(nextTask);
        return nextTask;
      });
    },
  });

  function syncDrafts(t: TaskItem) {
    const existingBriefItems = normalizeMediaBriefItems(t.mediaBriefItemsJson);
    setMediaBriefDraft(
      existingBriefItems.length > 0
        ? existingBriefItems
        : [createEmptyMediaBriefItem(t.taskType === "MEDIA_VIDEO")]
    );
    const prevFlags = Array.isArray(t.qcChecklistJson)
      ? (t.qcChecklistJson as string[])
      : [];
    setSelectedQcFlags(prevFlags);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/tasks/${taskId}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Không tải được chi tiết");
        return data.task as TaskItem;
      }),
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : { users: [] }))
        .catch(() => ({ users: [] })),
      fetch("/api/outputs/ai-settings")
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined),
    ])
      .then(([loadedTask, usersData, loadedAi]) => {
        if (!active) return;
        setTask(loadedTask);
        syncDrafts(loadedTask);
        setUsers(usersData.users || []);
        if (loadedAi) setAiConfig(loadedAi as GeminiConfigInfo);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  const qcCriteria = task ? getQcCriteriaForTaskType(task.taskType) : [];
  const overdue = task ? isTaskOverdue(task) : false;
  const savedAiResult = task ? getAiResultForTask(task) : null;

  async function runPatch(
    payload: Record<string, unknown>,
    successToast?: string
  ) {
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Cập nhật thất bại.";
        setError(msg);
        showToast(msg, "error");
      } else {
        setTask(data.task);
        syncDrafts(data.task);
        onUpdated(data.task);
        if (successToast) showToast(successToast);
        router.refresh();
      }
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendUrgentReminder() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/remind`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không gửi được nhắc nhở.", "error");
      } else {
        showToast(
          data.emailSent
            ? "Đã gửi thông báo & Email nhắc việc cho nhân sự."
            : "Đã gửi thông báo nhắc việc trong hệ thống."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicateTask() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: task.project.id,
          title: `${task.title} (Bản sao)`,
          taskType: task.taskType,
          platform: task.platform,
          publishChannel: task.publishChannel || null,
          assigneeId: task.assignee?.id || null,
          priority: task.priority,
          quantity: task.quantity,
          isMediaOrder: task.isMediaOrder,
          description: task.description,
          caption: task.caption,
          mediaBriefItemsJson: task.mediaBriefItemsJson,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã nhân bản thành ${data.task.code}.`);
        onDuplicated?.(data.task);
        router.refresh();
      } else {
        showToast(data.error || "Không nhân bản được.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDeleteTask() {
    if (!task) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setSaving(false);
    setConfirmDeleteOpen(false);
    if (res.ok) {
      showToast(
        `Đã chuyển ${task.code} vào Thùng rác (có thể khôi phục trong 30 ngày).`,
        "info"
      );
      onDeleted?.(task.id);
      router.refresh();
      onClose();
    } else {
      showToast("Không thể xóa công việc này.", "error");
    }
  }

  function toggleQcFlag(code: string) {
    setSelectedQcFlags((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  const subtasksList = task ? normalizeSubtasks(task.subtasksJson) : [];
  const commentCount = task
    ? task.comments?.length ?? task._count?.comments ?? 0
    : 0;
  const isMediaProduction = isMediaProductionUser(
    currentUserRole,
    currentUserScope
  );
  const isMediaBriefTask = Boolean(
    task &&
      (task.isMediaOrder ||
        task.taskType === "MEDIA_IMAGE" ||
        task.taskType === "MEDIA_VIDEO")
  );
  const useCenteredPopup = Boolean(
    centeredModal || isMediaProduction || isMediaBriefTask
  );
  const linkOnlyOutput =
    isMediaProduction || (currentUserRole !== "LEADER" && isMediaBriefTask);

  return (
    <div
      className={
        useCenteredPopup
          ? "fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-5"
          : "fixed inset-0 z-50 flex justify-end"
      }
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={
          useCenteredPopup
            ? "relative z-10 w-full max-w-6xl h-[95dvh] sm:h-[92vh] bg-white rounded-2xl shadow-2xl border-2 border-amber-200/80 flex flex-col overflow-hidden"
            : "relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
        }
      >
        {/* Top Bar */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between gap-2">
          {task ? (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {task.code}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white truncate max-w-[160px]"
                style={{ backgroundColor: task.project.color }}
              >
                {task.project.name}
              </span>
              <TaskStatusBadge status={task.status} />
              {overdue && (
                <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-[11px] font-bold">
                  QUÁ HẠN
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-500">
              Đang tải chi tiết...
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {task && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("OVERVIEW");
                    setEditMode((v) => !v);
                  }}
                  title="Chỉnh sửa thông tin công việc"
                  className={`p-2 rounded-lg cursor-pointer ${
                    editMode
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateTask}
                  disabled={saving}
                  title="Nhân bản thẻ việc này"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <CopyPlus className="w-4 h-4" />
                </button>
              </>
            )}
            {task && currentUserRole === "LEADER" && (
              <>
                {task.assignee && (
                  <button
                    type="button"
                    onClick={handleSendUrgentReminder}
                    disabled={saving}
                    title="Gửi thông báo & Email nhắc việc ngay"
                    className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer"
                  >
                    <BellRing className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={saving}
                  title="Xóa công việc (chuyển vào Thùng rác)"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4-Tab Strip */}
        {task && !loading && (
          <div className="px-3 sm:px-5 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("OVERVIEW")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeTab === "OVERVIEW"
                  ? "bg-[#0B2545] text-amber-300 shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Thông tin &amp; Brief
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CHAT")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeTab === "CHAT"
                  ? "bg-[#0B2545] text-amber-300 shadow-xs"
                  : commentCount > 0
                    ? "bg-amber-100/80 text-amber-900 hover:bg-amber-200/80"
                    : "text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat &amp; Feedback
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  activeTab === "CHAT"
                    ? "bg-amber-400 text-[#0B2545]"
                    : commentCount > 0
                      ? "bg-amber-600 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {commentCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("OUTPUT_QC")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeTab === "OUTPUT_QC"
                  ? "bg-[#0B2545] text-amber-300 shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {linkOnlyOutput ? (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Link Output ({task.assets.length})
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Output &amp; AI Check ({task.assets.length})
                  {savedAiResult && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500 text-white px-1.5 py-0.5 text-[10px]">
                      <Bot className="w-2.5 h-2.5" />
                      {savedAiResult.result.score}đ
                    </span>
                  )}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SUBTASKS_LOG")}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeTab === "SUBTASKS_LOG"
                  ? "bg-[#0B2545] text-amber-300 shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Subtasks ({subtasksList.filter((s) => s.done).length}/
              {subtasksList.length}) &amp; Lịch sử
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Đang tải thông tin công việc...
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          {task && !loading && (
            <>
              {/* Quick Workflow Action Strip (Luôn hiện trên đầu Overview & Output QC) */}
              {activeTab !== "SUBTASKS_LOG" && (
                <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Quy trình duyệt (Sửa: {task.revisionCount}/{task.maxRevisions})
                    </span>
                    {!linkOnlyOutput && (
                      <button
                        type="button"
                        onClick={() => setShowQcReference((prev) => !prev)}
                        className="text-xs font-medium text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        {showQcReference
                          ? "Ẩn tiêu chuẩn QC"
                          : `${qcCriteria.length} tiêu chuẩn QC`}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentUserRole === "LEADER" &&
                      task.status === "BRIEF_REVIEW" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runPatch(
                              { action: "APPROVE_BRIEF" },
                              "Đã duyệt Brief cho nhân sự sản xuất."
                            )
                          }
                          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Duyệt Brief
                        </button>
                      )}

                    {task.status !== "WAITING_APPROVAL" &&
                      task.status !== "APPROVED_FINAL" &&
                      task.status !== "PUBLISHED" &&
                      task.status !== "DONE" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runPatch(
                              { action: "SUBMIT_FOR_REVIEW" },
                              "Đã đẩy bài lên hàng đợi Leader duyệt."
                            )
                          }
                          className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Gửi Leader duyệt
                        </button>
                      )}

                    {currentUserRole === "LEADER" &&
                      task.status !== "APPROVED_FINAL" &&
                      task.status !== "PUBLISHED" &&
                      task.status !== "DONE" && (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              runPatch(
                                { action: "APPROVE" },
                                "Đã duyệt Final thành công!"
                              )
                            }
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Duyệt Final
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setShowRevisionPanel((p) => !p)}
                            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Yêu cầu sửa
                          </button>
                        </>
                      )}

                    {task.status === "APPROVED_FINAL" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          runPatch(
                            { action: "MARK_PUBLISHED" },
                            "Đã đánh dấu Lên lịch / Đã đăng."
                          )
                        }
                        className="rounded-xl bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        Đánh dấu Đã đăng
                      </button>
                    )}

                    {task.status !== "DONE" &&
                      task.status !== "PUBLISHED" &&
                      (currentUserRole === "LEADER" ||
                        !taskRequiresLeaderApproval(task) ||
                        task.status === "APPROVED_FINAL") && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runPatch(
                              { action: "MARK_DONE" },
                              "Đã hoàn tất đầu việc!"
                            )
                          }
                          className="rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          Hoàn tất (Done)
                        </button>
                      )}

                    {!isMediaProduction &&
                      task.status !== "DONE" &&
                      task.status !== "PUBLISHED" &&
                      task.plannedDate !== getVnDateString() && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runPatch(
                              { plannedDate: getVnDateString() },
                              "Đã đưa vào kế hoạch làm Hôm nay (vẫn giữ nguyên Deadline gốc)!"
                            )
                          }
                          className="rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-100 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pin className="w-3.5 h-3.5" />
                          Làm hôm nay
                        </button>
                      )}

                    {activeTab !== "CHAT" && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("CHAT")}
                        className="rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat feedback ({commentCount})
                      </button>
                    )}
                  </div>

                  {showRevisionPanel && currentUserRole === "LEADER" && (
                    <div className="bg-slate-800 rounded-xl p-3 space-y-2.5 border border-slate-700">
                      <div className="text-xs font-semibold text-rose-300">
                        Chọn lỗi vi phạm QC ({selectedQcFlags.length} lỗi):
                      </div>
                      <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                        {qcCriteria.map((c) => {
                          const checked = selectedQcFlags.includes(c.code);
                          return (
                            <label
                              key={c.code}
                              className={`flex items-start gap-2 rounded-lg p-2 text-[11px] cursor-pointer border ${
                                checked
                                  ? "bg-rose-500/20 border-rose-400 text-white"
                                  : "bg-slate-900/60 border-slate-700 text-slate-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQcFlag(c.code)}
                                className="mt-0.5"
                              />
                              <span>
                                <strong>[{c.group}]</strong> {c.detail}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <textarea
                        rows={2}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Nhập hướng dẫn chỉnh sửa cụ thể cho nhân sự..."
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRevisionPanel(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            await runPatch(
                              {
                                action: "REQUEST_REVISION",
                                qcFlags: selectedQcFlags,
                                feedback: feedbackText,
                              },
                              "Đã trả bài yêu cầu sửa & gửi thông báo."
                            );
                            setShowRevisionPanel(false);
                            setFeedbackText("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                        >
                          Gửi yêu cầu sửa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showQcReference && activeTab !== "SUBTASKS_LOG" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tiêu chuẩn kiểm duyệt Output ({qcCriteria.length} mục)
                  </h4>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {qcCriteria.map((c) => (
                      <div
                        key={c.code}
                        className="text-xs bg-white rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <span className="font-bold text-blue-700 mr-1.5">
                          {c.code}
                        </span>
                        <span className="font-semibold text-slate-800 mr-1.5">
                          [{c.owner} • {c.group}]
                        </span>
                        <span className="text-slate-600">{c.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4">
                  {editMode ? (
                    <TaskDrawerEditForm
                      task={task}
                      users={users}
                      saving={saving}
                      onCancel={() => setEditMode(false)}
                      onSave={runPatch}
                    />
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <TaskTypeBadge taskType={task.taskType} />
                        <TaskPriorityBadge priority={task.priority} />
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <PlatformLogo platform={task.platform} size="xs" />
                          <strong className="text-slate-800">
                            {getPlatformChannelMeta(task.platform).displayLabel}
                          </strong>
                          {task.publishChannel && (
                            <span className="text-blue-700 font-semibold">
                              → {task.publishChannel}
                            </span>
                          )}
                        </span>
                        {task.isMediaOrder && (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {task.taskType === "MEDIA_VIDEO"
                              ? `Số lượng video: ${task.quantity}`
                              : `Số lượng ảnh: ${task.quantity}`}
                          </span>
                        )}
                        {task.contentPillar && (
                          <span className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                            Matrix: {task.contentPillar}
                            {task.campaignWeek
                              ? ` (Tuần ${task.campaignWeek})`
                              : ""}
                          </span>
                        )}
                        {task.isOutsideDepartment && (
                          <span className="text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                            📋 Đơn Ngoài Team
                            {task.externalSenderName
                              ? `: ${task.externalSenderName}`
                              : ""}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {task.title}
                      </h2>
                    </div>
                  )}

                  {task.revisionCount >= task.maxRevisions && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Đã chạm ngưỡng tối đa {task.revisionCount}/
                        {task.maxRevisions} lần sửa theo quy trình!
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/80 text-xs">
                    <div>
                      <div className="text-slate-400 mb-1">Người thực hiện</div>
                      {task.assignee ? (
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <PirateAvatar
                            name={task.assignee.name}
                            color={task.assignee.avatarColor}
                            scope={task.assignee.departmentScope}
                            pirateCharacter={task.assignee.pirateCharacter}
                            size="sm"
                          />
                          <span className="truncate">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-500 italic">
                          Chưa gán
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Người tạo / Order</div>
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <PirateAvatar
                          name={task.requester.name}
                          color={task.requester.avatarColor}
                          pirateCharacter={task.requester.pirateCharacter}
                          size="sm"
                        />
                        <span className="truncate">{task.requester.name}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Deadline</div>
                      <div
                        className={`font-semibold ${
                          overdue ? "text-rose-600" : "text-slate-800"
                        }`}
                      >
                        {formatVnDateTime(task.dueAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">
                        Lịch đăng dự kiến
                      </div>
                      <div className="font-semibold text-slate-800">
                        {formatVnDateTime(task.scheduledPublishAt)}
                      </div>
                    </div>
                  </div>

                  {(task.isMediaOrder ||
                    task.taskType === "MEDIA_IMAGE" ||
                    task.taskType === "MEDIA_VIDEO") &&
                    (() => {
                      const isVideoMedia = task.taskType === "MEDIA_VIDEO";
                      const briefItems = normalizeMediaBriefItems(
                        task.mediaBriefItemsJson
                      );
                      return (
                        <div className="rounded-xl border border-blue-200/80 bg-blue-50/20 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                              {isVideoMedia
                                ? `Brief chi tiết từng video (${briefItems.length || task.quantity} video)`
                                : `Brief chi tiết từng ảnh (${briefItems.length || task.quantity} ảnh)`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingMediaBrief((v) => !v)}
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {editingMediaBrief ? "Hủy" : "Sửa / Thêm"}
                            </button>
                          </div>

                          {editingMediaBrief ? (
                            <div className="space-y-2.5">
                              <MediaBriefItemsEditor
                                items={mediaBriefDraft}
                                onChange={setMediaBriefDraft}
                                isVideo={isVideoMedia}
                                compact
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={async () => {
                                    await runPatch(
                                      {
                                        mediaBriefItemsJson: mediaBriefDraft,
                                        quantity: Math.max(
                                          1,
                                          mediaBriefDraft.length
                                        ),
                                      },
                                      `Đã cập nhật brief chi tiết ${
                                        isVideoMedia ? "từng video" : "từng ảnh"
                                      }.`
                                    );
                                    setEditingMediaBrief(false);
                                  }}
                                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                                >
                                  {saving ? "Đang lưu..." : "Lưu chi tiết"}
                                </button>
                              </div>
                            </div>
                          ) : briefItems.length === 0 ? (
                            <div className="text-xs text-slate-500">
                              Chưa nhập chi tiết từng{" "}
                              {isVideoMedia ? "video" : "ảnh"} — bấm{" "}
                              <strong>Sửa / Thêm</strong> để bổ sung tỷ lệ, nội dung và mẫu.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {briefItems.map((it, idx) =>
                                isVideoMedia ? (
                                  <VideoScriptBriefViewer
                                    key={it.id}
                                    item={it}
                                    index={idx}
                                    compact={!useCenteredPopup}
                                  />
                                ) : (
                                  <div
                                    key={it.id}
                                    className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5 text-xs"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-extrabold text-slate-900">
                                        Ảnh {idx + 1}
                                      </span>
                                      <span className="rounded-full bg-sky-50 border border-sky-200 text-sky-800 px-2 py-0.5 text-[11px] font-bold">
                                        Tỷ lệ: {it.ratio}
                                      </span>
                                    </div>
                                    {it.content && (
                                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                                        {it.content}
                                      </p>
                                    )}
                                    {it.sampleUrl && (
                                      <div className="text-[11px]">
                                        <span className="font-semibold text-slate-500">
                                          Mẫu:{" "}
                                        </span>
                                        {/^https?:\/\//i.test(it.sampleUrl) ? (
                                          <a
                                            href={it.sampleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                                          >
                                            {it.sampleUrl}
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        ) : (
                                          <span className="text-slate-700">
                                            {it.sampleUrl}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {it.note && (
                                      <div className="text-[11px] text-slate-500">
                                        Ghi chú: {it.note}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {task.description && (
                    <div className="rounded-xl border border-slate-200 p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Brief / Mô tả yêu cầu
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-line">
                        {task.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CHAT & FEEDBACK TRỰC TIẾP TRONG TASK */}
              {activeTab === "CHAT" && (
                <TaskFeedbackChat
                  taskId={task.id}
                  taskCode={task.code}
                  initialComments={task.comments ?? []}
                  users={users}
                  currentUserRole={currentUserRole}
                  maxHeightClass="max-h-[420px]"
                  onCommentsChanged={(nextComments) => {
                    const prevCount =
                      task.comments?.length ?? task._count?.comments ?? 0;
                    const updatedTask: TaskItem = {
                      ...task,
                      comments: nextComments,
                      _count: {
                        comments: nextComments.length,
                        activityLogs: task._count?.activityLogs,
                      },
                    };
                    setTask(updatedTask);
                    if (nextComments.length !== prevCount) {
                      onUpdated(updatedTask);
                    }
                  }}
                />
              )}

              {/* TAB 3: OUTPUT & AI CHECK */}
              {activeTab === "OUTPUT_QC" && (
                <TaskDrawerQcTab
                  task={task}
                  currentUserRole={currentUserRole}
                  linkOnlyOutput={linkOnlyOutput}
                  saving={saving}
                  aiConfig={aiConfig}
                  aiResult={savedAiResult}
                  aiLoading={aiCheckingTaskId === task.id}
                  aiError={aiErrorsByTaskId[task.id] ?? null}
                  onRunAiCheck={(focus) => {
                    void runAiCheckForTask(task, focus);
                  }}
                  onRunPatch={runPatch}
                />
              )}

              {/* TAB 4: SUBTASKS & LOGS */}
              {activeTab === "SUBTASKS_LOG" && (
                <TaskDrawerSubtasksLog
                  task={task}
                  users={users}
                  onTaskUpdated={(updated) => {
                    setTask(updated);
                    syncDrafts(updated);
                    onUpdated(updated);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        itemName={task ? `${task.code} — ${task.title}` : ""}
        toneMode="PIRATE"
        loading={saving}
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
