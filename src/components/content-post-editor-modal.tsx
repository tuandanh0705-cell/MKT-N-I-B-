"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Hash,
  Link2,
  MessageSquare,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { CustomizableOptionSelect } from "@/components/customizable-option-select";
import { FacebookPostPreview } from "@/components/facebook-post-preview";
import { GeminiQcPanel } from "@/components/gemini-qc-panel";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { PlatformLogo } from "@/components/platform-logo";
import { PublishChannelInput } from "@/components/publish-channel-input";
import { TaskFeedbackChat } from "@/components/task-feedback-chat";
import type { AppliedOptionRename } from "@/components/project-content-options-modal";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import {
  deriveDefaultFormat,
  getContentStatusDisplay,
  getProjectContentOptions,
  normalizeProjectOverview,
  normalizeRouteSelectValue,
  type ProjectContentOptionKind,
} from "@/lib/content-plan";
import { normalizePlatformSelectValue } from "@/lib/platform-meta";
import { FB_POST_LAYOUTS, FB_POST_LAYOUT_GROUPS } from "@/lib/constants";
import { getVnDateString } from "@/lib/dates";
import { useToast } from "@/components/toast-provider";
import {
  parseSavedAiQcResult,
  type GeminiConfigInfo,
  type GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import { getTaskPreviewMediaUrls } from "@/lib/output-helpers";
import type {
  AssetLinkItem,
  ProjectChannelSuggestions,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export interface ContentPostPrefill {
  title?: string;
  route?: string;
  format?: string;
  topic?: string;
  matrixIdeaId?: string;
  publishDate?: string;
}

export type ContentEditorRightTab = "PREVIEW" | "AI_QC" | "CHAT";

interface ContentPostEditorModalProps {
  open: boolean;
  onClose: () => void;
  project: SimpleProject;
  users: SimpleUser[];
  channelSuggestions?: ProjectChannelSuggestions | null;
  currentUserId: string;
  currentUserRole: UserRole;
  task?: TaskItem | null;
  prefill?: ContentPostPrefill | null;
  initialRightTab?: ContentEditorRightTab;
  aiConfig?: GeminiConfigInfo;
  onOpenAiSettings?: () => void;
  onOpenStandardsModal?: () => void;
  onAiChecked?: (taskId: string, result: GeminiQcCheckResponse) => void;
  onAddProjectOption?: (
    kind: ProjectContentOptionKind,
    newValue: string
  ) => Promise<boolean>;
  onOpenOptionsModal?: (tab: ProjectContentOptionKind) => void;
  optionRenameBatch?: { id: number; renames: AppliedOptionRename[] } | null;
  onSaved: (task: TaskItem, matrixIdeaId?: string | null) => void;
}

export function ContentPostEditorModal(props: ContentPostEditorModalProps) {
  if (!props.open) return null;
  const key = `${props.task?.id || "new"}-${props.prefill?.matrixIdeaId || ""}-${
    props.prefill?.publishDate || ""
  }-${props.prefill?.title || ""}-${props.initialRightTab || ""}`;
  return <ContentPostEditorInner key={key} {...props} />;
}

function ContentPostEditorInner({
  onClose,
  project,
  users,
  channelSuggestions,
  currentUserId,
  currentUserRole,
  task,
  prefill,
  initialRightTab,
  aiConfig,
  onOpenAiSettings,
  onOpenStandardsModal,
  onAiChecked,
  onAddProjectOption,
  onOpenOptionsModal,
  optionRenameBatch,
  onSaved,
}: ContentPostEditorModalProps) {
  const { showToast } = useToast();
  const overview = normalizeProjectOverview(
    project.overviewJson,
    project.description
  );
  const projectOptions = getProjectContentOptions(project.overviewJson);

  const [title, setTitle] = useState(task?.title || prefill?.title || "");
  const [caption, setCaption] = useState(task?.caption || "");
  const [route, setRoute] = useState(
    task
      ? normalizeRouteSelectValue(task.contentAngle, projectOptions.routes)
      : normalizeRouteSelectValue(
          prefill?.route ?? projectOptions.routes[0] ?? "",
          projectOptions.routes
        )
  );
  const [topic, setTopic] = useState(
    task?.contentPillar || prefill?.topic || ""
  );
  const [platform, setPlatform] = useState(
    task?.platform
      ? normalizePlatformSelectValue(task.platform)
      : projectOptions.platforms[0] || "Fanpage"
  );
  const [publishChannel, setPublishChannel] = useState(
    task?.publishChannel || ""
  );
  const [format, setFormat] = useState(
    task
      ? deriveDefaultFormat(task)
      : prefill?.format || projectOptions.formats[0] || "Ảnh"
  );

  const [prevRenameBatchId, setPrevRenameBatchId] = useState<number>(
    optionRenameBatch?.id ?? 0
  );
  if (optionRenameBatch && optionRenameBatch.id !== prevRenameBatchId) {
    setPrevRenameBatchId(optionRenameBatch.id);
    for (const rn of optionRenameBatch.renames) {
      if (
        rn.field === "contentAngle" &&
        route &&
        (route.toLowerCase() === rn.from.toLowerCase() ||
          (rn.from.toUpperCase() === "CASE STUDY" &&
            route.toUpperCase() === "CASE") ||
          (rn.from.toUpperCase() === "BÁN HÀNG / PR" &&
            route.toUpperCase() === "BÁN HÀNG"))
      ) {
        setRoute(rn.to);
      } else if (
        rn.field === "platform" &&
        platform.toLowerCase() === rn.from.toLowerCase()
      ) {
        setPlatform(rn.to);
      } else if (
        rn.field === "postFormat" &&
        format.toLowerCase() === rn.from.toLowerCase()
      ) {
        setFormat(rn.to);
      }
    }
  }
  const [fbLayout, setFbLayout] = useState(
    task?.fbPostLayout || "SINGLE_SQUARE"
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(() =>
    task ? getTaskAssigneeIds(task) : currentUserId ? [currentUserId] : []
  );
  const [publishDate, setPublishDate] = useState(
    task?.scheduledPublishAt
      ? getVnDateString(new Date(task.scheduledPublishAt))
      : prefill?.publishDate || getVnDateString()
  );
  const [mediaDueDate, setMediaDueDate] = useState(
    task?.mediaDueAt ? getVnDateString(new Date(task.mediaDueAt)) : ""
  );
  const [contentDueDate, setContentDueDate] = useState(
    task?.dueAt ? getVnDateString(new Date(task.dueAt)) : ""
  );
  const [productLink, setProductLink] = useState(task?.productLink || "");
  const [isAired, setIsAired] = useState(Boolean(task?.isAired));
  const [newAssetUrl, setNewAssetUrl] = useState("");

  // Leader phản hồi sửa bài ngay trong Studio
  const [leaderFeedback, setLeaderFeedback] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab cột phải: Preview Facebook | AI Check QC (Gemini) | Chat & Feedback bài viết
  const [rightTab, setRightTab] = useState<ContentEditorRightTab>(
    initialRightTab === "CHAT" && task?.id
      ? "CHAT"
      : initialRightTab === "AI_QC"
        ? "AI_QC"
        : "PREVIEW"
  );
  const [commentCount, setCommentCount] = useState<number>(
    task?.comments?.length ?? task?._count?.comments ?? 0
  );
  const [editorDemoImages, setEditorDemoImages] = useState<string[]>([]);
  const [savedAssets, setSavedAssets] = useState<AssetLinkItem[]>(
    task?.assets ?? []
  );
  const [removingAssetId, setRemovingAssetId] = useState<string | null>(null);
  const [customAiFocus, setCustomAiFocus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<GeminiQcCheckResponse | null>(
    parseSavedAiQcResult(task?.lastAiQcJson)
  );

  const statusMeta = task
    ? getContentStatusDisplay(task.status, isAired)
    : {
        label: "Bài mới",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      };

  const existingMediaUrls = getTaskPreviewMediaUrls({
    assets: savedAssets,
    taskType: task?.taskType || "CONTENT_SOCIAL",
    isMediaOrder: Boolean(task?.isMediaOrder),
  });
  const previewMediaUrls = newAssetUrl.trim()
    ? [newAssetUrl.trim(), ...existingMediaUrls]
    : existingMediaUrls;

  async function handleRemoveSavedAsset(assetId: string) {
    if (!task || removingAssetId) return;
    setRemovingAssetId(assetId);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAssetId: assetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không gỡ được ảnh / link đính kèm.", "error");
        return;
      }
      if (data.task) {
        setSavedAssets(data.task.assets ?? []);
        onSaved(data.task, prefill?.matrixIdeaId || task.matrixIdeaId || null);
      }
      showToast("Đã gỡ ảnh / link đính kèm.");
    } catch {
      showToast("Lỗi kết nối khi gỡ ảnh đính kèm.", "error");
    } finally {
      setRemovingAssetId(null);
    }
  }

  async function handleRunEditorAiCheck() {
    const combinedUrls = Array.from(
      new Set([...previewMediaUrls, ...editorDemoImages].filter(Boolean))
    );
    if (!caption.trim() && !title.trim() && combinedUrls.length === 0) {
      showToast(
        "Hãy viết tiêu đề, nội dung bài viết hoặc chọn ảnh demo trước khi AI Check.",
        "error"
      );
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/outputs/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task?.id,
          customFocus: customAiFocus,
          draft: {
            projectId: project.id,
            title: title.trim() || "Bài viết đang soạn",
            caption,
            platform,
            publishChannel: publishChannel.trim() || null,
            contentAngle: route || null,
            contentPillar: topic || null,
            postFormat: format || null,
            productLink: productLink.trim() || null,
            taskType: task?.taskType || "CONTENT_SOCIAL",
            demoAssetUrls: combinedUrls,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = String(data.error || "Gemini AI Check thất bại.");
        setAiError(msg);
        showToast(msg, "error");
        return;
      }
      const typedResult = data as GeminiQcCheckResponse;
      setAiResult(typedResult);
      if (task?.id) {
        onAiChecked?.(task.id, typedResult);
      }
      showToast(
        `Gemini đã chấm ${data.result?.score ?? 0}/100 điểm cho bài viết này.`
      );
    } catch {
      const msg = "Lỗi kết nối khi gọi Google Gemini AI.";
      setAiError(msg);
      showToast(msg, "error");
    } finally {
      setAiLoading(false);
    }
  }

  function insertPostStructure() {
    const starter = `[HOOK — Câu mở đầu gây chú ý / đánh trúng nỗi đau]\n\n[THÂN BÀI — Giải thích / So sánh / Dẫn chứng cụ thể]\n\n[CTA — Kêu gọi inbox / comment nhận tư vấn]\n${
      overview.hashtagsDefault ? `\n${overview.hashtagsDefault}` : ""
    }`;
    setCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${starter}` : starter));
  }

  function appendDefaultHashtags() {
    if (!overview.hashtagsDefault.trim()) {
      showToast(
        "Dự án chưa cài bộ hashtag mặc định ở tab Tổng quan.",
        "info"
      );
      return;
    }
    setCaption((prev) =>
      prev.includes(overview.hashtagsDefault.trim())
        ? prev
        : `${prev.trim()}\n\n${overview.hashtagsDefault.trim()}`.trim()
    );
  }

  async function savePost(mode: "DRAFT" | "SUBMIT_REVIEW") {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      showToast("Vui lòng nhập Nội dung / Ý tưởng ngắn cho bài viết.", "error");
      return;
    }
    if (mode === "SUBMIT_REVIEW" && !caption.trim()) {
      showToast(
        "Vui lòng viết nội dung bài viết trước khi gửi Leader duyệt.",
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      const scheduledPublishAt = publishDate
        ? `${publishDate}T09:00:00+07:00`
        : null;
      const mediaDueAt = mediaDueDate
        ? `${mediaDueDate}T17:00:00+07:00`
        : null;
      const dueAt = contentDueDate
        ? `${contentDueDate}T17:00:00+07:00`
        : null;

      const pendingAssetUrls = Array.from(
        new Set(
          [
            ...(newAssetUrl.trim() ? [newAssetUrl.trim()] : []),
            ...editorDemoImages.map((u) => u.trim()),
          ].filter(Boolean)
        )
      );
      const pendingAssetsPayload = pendingAssetUrls.map((url, idx) => ({
        kind: "DEMO" as const,
        label: url.startsWith("data:image/")
          ? `Ảnh demo bài viết #${idx + 1}`
          : "Ảnh / Thành phẩm bài viết",
        url,
      }));

      if (!task) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            title: cleanedTitle,
            caption,
            platform,
            publishChannel: publishChannel.trim() || null,
            taskType: "CONTENT_SOCIAL",
            isMediaOrder: false,
            assigneeIds:
              assigneeIds.length > 0 ? assigneeIds : [currentUserId],
            assigneeId: assigneeIds[0] || currentUserId,
            contentAngle: route || null,
            contentPillar: topic || null,
            postFormat: format,
            fbPostLayout: fbLayout,
            scheduledPublishAt,
            mediaDueAt,
            dueAt,
            productLink: productLink.trim() || null,
            isAired,
            matrixIdeaId: prefill?.matrixIdeaId || null,
            initialAssets:
              pendingAssetsPayload.length > 0 ? pendingAssetsPayload : undefined,
            status:
              mode === "SUBMIT_REVIEW"
                ? "WAITING_APPROVAL"
                : caption.trim()
                  ? "IN_PROGRESS"
                  : "DRAFT",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Không tạo được bài viết.", "error");
          return;
        }
        setNewAssetUrl("");
        setEditorDemoImages([]);
        onSaved(data.task, prefill?.matrixIdeaId || null);
        window.dispatchEvent(new CustomEvent("reviews-count-updated"));
        showToast(
          mode === "SUBMIT_REVIEW"
            ? "Đã lưu bài & gửi thông báo cho Leader duyệt!"
            : "Đã lưu bài viết vào Nội dung chi tiết."
        );
        onClose();
        return;
      }

      // Cập nhật bài đã có
      const notifyUrl = `/projects/${project.slug}?tab=CONTENT_CALENDAR&taskId=${task.id}`;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanedTitle,
          caption,
          platform,
          publishChannel: publishChannel.trim() || null,
          assigneeIds,
          assigneeId: assigneeIds[0] || null,
          contentAngle: route || null,
          contentPillar: topic || null,
          postFormat: format,
          fbPostLayout: fbLayout,
          scheduledPublishAt,
          mediaDueAt,
          dueAt,
          productLink: productLink.trim() || null,
          isAired,
          ...(pendingAssetsPayload.length > 0
            ? { newAssets: pendingAssetsPayload }
            : {}),
          ...(mode === "SUBMIT_REVIEW"
            ? { action: "SUBMIT_FOR_REVIEW", notifyUrl }
            : task.status === "DRAFT" && caption.trim()
              ? { status: "IN_PROGRESS" }
              : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được bài viết.", "error");
        return;
      }
      setNewAssetUrl("");
      setEditorDemoImages([]);
      if (data.task?.assets) {
        setSavedAssets(data.task.assets);
      }
      onSaved(data.task, prefill?.matrixIdeaId || task.matrixIdeaId || null);
      window.dispatchEvent(new CustomEvent("reviews-count-updated"));
      showToast(
        mode === "SUBMIT_REVIEW"
          ? "Đã lưu bài & bắn thông báo tới Leader duyệt!"
          : "Đã lưu nội dung bài viết."
      );
      if (mode === "SUBMIT_REVIEW") {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLeaderDecision(action: "APPROVE" | "REQUEST_REVISION") {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "REQUEST_REVISION"
            ? {
                feedback:
                  leaderFeedback.trim() ||
                  "Cần chỉnh sửa lại câu chữ / bố cục theo góp ý của Leader.",
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không xử lý được thao tác duyệt.", "error");
        return;
      }
      onSaved(data.task, task.matrixIdeaId || null);
      window.dispatchEvent(new CustomEvent("reviews-count-updated"));
      showToast(
        action === "APPROVE"
          ? "Đã duyệt Final bài viết & báo cho người viết!"
          : "Đã trả bài yêu cầu sửa & gửi thông báo."
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const lineCount = caption ? caption.split("\n").length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header Studio */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: project.color }}
            >
              {project.name}
            </span>
            {task && (
              <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                {task.code}
              </span>
            )}
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
            {topic && (
              <span className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[11px] font-semibold">
                Matrix: {topic}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Studio 2 Cột */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột Trái: Thông tin bài + Khung viết bài */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày đăng
                </label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5"
                />
              </div>
              <CustomizableOptionSelect
                label={<span>Tuyến nội dung</span>}
                value={route}
                options={projectOptions.routes}
                emptyLabel="-- Chưa chọn --"
                placeholder="VD: REVIEW STUDIO..."
                onChange={setRoute}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("ROUTES", val)
                    : undefined
                }
                onOpenManager={
                  onOpenOptionsModal
                    ? () => onOpenOptionsModal("ROUTES")
                    : undefined
                }
                managerTitle="Tùy chỉnh Tuyến nội dung của dự án này"
              />
              <CustomizableOptionSelect
                label={
                  <>
                    <PlatformLogo platform={platform} size="xs" />
                    <span>Nền tảng</span>
                  </>
                }
                value={platform}
                options={projectOptions.platforms}
                placeholder="VD: LinkedIn, Email..."
                onChange={setPlatform}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("PLATFORMS", val)
                    : undefined
                }
                onOpenManager={
                  onOpenOptionsModal
                    ? () => onOpenOptionsModal("PLATFORMS")
                    : undefined
                }
                managerTitle="Tùy chỉnh Nền tảng của dự án này"
              />
              <CustomizableOptionSelect
                label={<span>Format</span>}
                value={format}
                options={projectOptions.formats}
                placeholder="VD: Infographic, Slide..."
                onChange={setFormat}
                onAddOption={
                  onAddProjectOption
                    ? (val) => onAddProjectOption("FORMATS", val)
                    : undefined
                }
                onOpenManager={
                  onOpenOptionsModal
                    ? () => onOpenOptionsModal("FORMATS")
                    : undefined
                }
                managerTitle="Tùy chỉnh Format của dự án này"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-5">
                <PublishChannelInput
                  platform={platform}
                  value={publishChannel}
                  onChange={setPublishChannel}
                  suggestions={channelSuggestions}
                  compact
                  inputClassName="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Idea *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Khái niệm về set up live không lo về giá là gì?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Khung Soạn Bài Viết Trực Tiếp */}
            <div className="rounded-2xl border-2 border-blue-200/80 bg-blue-50/20 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  ✍️ Nội dung Bài viết / Kịch bản chi tiết
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={insertPostStructure}
                    className="rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Khung 3 phần
                  </button>
                  <button
                    type="button"
                    onClick={appendDefaultHashtags}
                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Hash className="w-3 h-3" />
                    Chèn Hashtag
                  </button>
                  {caption.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(caption);
                        showToast("Đã copy nội dung bài viết!");
                      }}
                      className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={11}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Viết nội dung bài đăng tại đây..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 leading-relaxed focus:border-blue-500 focus:outline-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  <strong>{caption.length}</strong> ký tự •{" "}
                  <strong>{lineCount}</strong> dòng
                </span>
                <button
                  type="button"
                  onClick={() => setRightTab("AI_QC")}
                  className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {aiResult
                    ? `Xem kết quả AI Check (${aiResult.result.score}đ)`
                    : "Chuyển sang AI Check QC →"}
                </button>
              </div>
            </div>

            {/* Mốc deadline, PIC, Link SP & Đính kèm ảnh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PIC (Người viết)
                </label>
                <MultiAssigneePicker
                  users={users}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="-- Chưa gán --"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deadline ảnh
                </label>
                <input
                  type="date"
                  value={mediaDueDate}
                  onChange={(e) => setMediaDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deadline content
                </label>
                <input
                  type="date"
                  value={contentDueDate}
                  onChange={(e) => setContentDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link sản phẩm
                </label>
                <input
                  type="text"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ảnh / Canva Demo
                </label>
                <input
                  type="url"
                  value={newAssetUrl}
                  onChange={(e) => setNewAssetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <label className="inline-flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAired}
                  onChange={(e) => setIsAired(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Đã Air bài
              </label>

              {task && savedAssets.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {savedAssets.map((a) => {
                    const isDataImg = /^data:image\//i.test(a.url);
                    return (
                      <div
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200/80 px-2 py-1 text-[11px] font-semibold text-blue-700"
                      >
                        {isDataImg ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Link2 className="w-3 h-3 text-amber-600" />
                            <span>{a.label}</span>
                          </span>
                        ) : (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            <Link2 className="w-3 h-3" />
                            <span className="max-w-[160px] truncate">{a.label}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={removingAssetId === a.id}
                          onClick={() => void handleRemoveSavedAsset(a.id)}
                          title="Gỡ ảnh / link này"
                          className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Tab Preview Facebook | AI Check QC (Gemini) | Chat & Feedback */}
          <div className="lg:col-span-5 space-y-3">
            {/* Thanh chuyển Tab song song với khung viết */}
            <div
              className={`grid rounded-xl bg-slate-100 p-1 gap-1 border border-slate-200 ${
                task?.id ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              <button
                type="button"
                onClick={() => setRightTab("PREVIEW")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                  rightTab === "PREVIEW"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab("AI_QC")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                  rightTab === "AI_QC"
                    ? "bg-white text-indigo-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">AI Check</span>
                {aiResult && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-black shrink-0 ${
                      aiResult.result.score >= 80
                        ? "bg-emerald-100 text-emerald-800"
                        : aiResult.result.score >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {aiResult.result.score}đ
                  </span>
                )}
              </button>
              {task?.id && (
                <button
                  type="button"
                  onClick={() => setRightTab("CHAT")}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                    rightTab === "CHAT"
                      ? "bg-[#0B2545] text-amber-300 shadow-xs"
                      : commentCount > 0
                        ? "bg-amber-100/90 text-amber-900 hover:bg-amber-200/80"
                        : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Chat</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-black shrink-0 ${
                      rightTab === "CHAT"
                        ? "bg-amber-400 text-[#0B2545]"
                        : commentCount > 0
                          ? "bg-amber-600 text-white"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {commentCount}
                  </span>
                </button>
              )}
            </div>

            {overview.toneAndVoice && rightTab !== "CHAT" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
                <div className="font-bold text-amber-900">
                  🧭 Nhắc nhanh Tone & Voice của {project.name}:
                </div>
                <p className="text-amber-800 whitespace-pre-line line-clamp-3">
                  {overview.toneAndVoice}
                </p>
              </div>
            )}

            {task?.status === "REVISION_NEEDED" &&
              task.comments &&
              task.comments.length > 0 &&
              rightTab !== "CHAT" && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-rose-800">
                      🔧 Leader yêu cầu sửa:
                    </div>
                    <button
                      type="button"
                      onClick={() => setRightTab("CHAT")}
                      className="text-[11px] font-extrabold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                    >
                      Trả lời / Trao đổi ngay →
                    </button>
                  </div>
                  <p className="text-rose-700 whitespace-pre-line">
                    {task.comments[task.comments.length - 1]?.content}
                  </p>
                </div>
              )}

            {/* Giữ FacebookPostPreview mounted để không mất ảnh demo chọn tạm khi chuyển tab */}
            <div className={rightTab === "PREVIEW" ? "space-y-2" : "hidden"}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700">
                  Demo bài đăng đa nền tảng
                </span>
                <select
                  value={fbLayout}
                  onChange={(e) => setFbLayout(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs max-w-[260px]"
                >
                  {FB_POST_LAYOUT_GROUPS.map((grp) => (
                    <optgroup key={grp} label={grp}>
                      {Object.entries(FB_POST_LAYOUTS)
                        .filter(([, m]) => m.group === grp)
                        .map(([k, m]) => (
                          <option key={k} value={k}>
                            {m.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <FacebookPostPreview
                pageName={publishChannel.trim() || project.name}
                pageColor={project.color}
                platform={platform}
                postFormat={format}
                description={task?.description}
                caption={caption}
                layout={fbLayout}
                onChangeLayout={setFbLayout}
                hideLayoutSelector
                draftDemoImages={editorDemoImages}
                onDemoImagesChange={setEditorDemoImages}
                mediaUrl={previewMediaUrls[0] || null}
                mediaUrls={previewMediaUrls}
                title={title}
              />
            </div>

            {rightTab === "AI_QC" && (
              <GeminiQcPanel
                currentUserRole={currentUserRole}
                aiConfig={aiConfig}
                aiResult={aiResult}
                aiLoading={aiLoading}
                aiError={aiError}
                customFocus={customAiFocus}
                onChangeCustomFocus={setCustomAiFocus}
                onRunCheck={() => {
                  void handleRunEditorAiCheck();
                }}
                onOpenAiSettings={onOpenAiSettings}
                onOpenStandardsModal={
                  currentUserRole === "LEADER"
                    ? onOpenStandardsModal
                    : undefined
                }
                runButtonLabel={
                  aiResult ? "AI Check lại" : "AI Check Bài & Ảnh"
                }
                onApplySuggestedCaption={(suggested) => {
                  setCaption(suggested);
                  showToast("Đã áp dụng Caption gợi ý vào khung soạn!");
                }}
              />
            )}

            {rightTab === "CHAT" && task?.id && (
              <TaskFeedbackChat
                taskId={task.id}
                taskCode={task.code}
                initialComments={task.comments ?? []}
                users={users}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                compact
                maxHeightClass="max-h-[420px]"
                placeholder="Trao đổi & feedback ngay trên bài viết này (Enter gửi, Ctrl+V dán ảnh)..."
                onCommentsChanged={(next) => setCommentCount(next.length)}
              />
            )}
          </div>
        </div>

        {/* Footer Thanh Hành Động */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {currentUserRole === "LEADER" &&
              task &&
              task.status === "WAITING_APPROVAL" && (
                <>
                  {showRevisionInput ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={leaderFeedback}
                        onChange={(e) => setLeaderFeedback(e.target.value)}
                        placeholder="Nhập lý do/chỗ cần sửa..."
                        className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs w-56"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleLeaderDecision("REQUEST_REVISION")}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 text-xs font-bold cursor-pointer"
                      >
                        Gửi yêu cầu sửa
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setShowRevisionInput(true)}
                      className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Trả sửa
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleLeaderDecision("APPROVE")}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Duyệt bài Final
                  </button>
                </>
              )}

            <button
              type="button"
              disabled={saving}
              onClick={() => savePost("DRAFT")}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Đang lưu..." : "Lưu nháp / Cập nhật"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => savePost("SUBMIT_REVIEW")}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Viết xong • Gửi Leader duyệt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
