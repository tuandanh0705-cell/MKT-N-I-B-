"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  AlertTriangle,
  Plus,
  Camera,
  ClipboardList,
} from "lucide-react";
import { TASK_TYPE_META, DEFAULT_CONTENT_PILLARS } from "@/lib/constants";
import { getProjectContentOptions } from "@/lib/content-plan";
import {
  getPresetDateTimeLocal,
  parseVnDateTimeLocalToIso,
} from "@/lib/dates";
import { useToast } from "@/components/toast-provider";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { PlatformLogo } from "@/components/platform-logo";
import { PublishChannelInput } from "@/components/publish-channel-input";
import {
  CreateTaskAdvancedSection,
  CreateTaskMediaAssigneeRow,
  CreateTaskMediaHeaderFields,
  CreateTaskMediaSpecsBlock,
} from "@/components/create-task-media-fields";
import {
  buildMediaBriefSummaryText,
  createDefaultEditScript,
  createDefaultShootScript,
  createEmptyMediaBriefItem,
  type MediaBriefItem,
  type VideoOrderKind,
} from "@/lib/media-brief";
import type {
  CapacityItem,
  LeaveRequestItem,
  ProjectChannelSuggestions,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { TaskPriority, TaskType } from "@/generated/prisma/client";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projects: SimpleProject[];
  users: SimpleUser[];
  initialCapacity: CapacityItem[];
  channelSuggestions?: ProjectChannelSuggestions | null;
  currentUserId?: string;
  defaultAssigneeId?: string;
  defaultProjectId?: string;
  defaultContentPillar?: string;
  defaultCampaignWeek?: number;
  defaultTitle?: string;
  defaultTaskType?: TaskType;
  defaultOrderMode?: "MEDIA" | "TASK";
  defaultVideoKind?: VideoOrderKind;
  defaultParentTaskId?: string;
  defaultParentLabel?: string;
  onCreated: (task: TaskItem) => void;
}

const NON_MEDIA_TASK_TYPES: TaskType[] = [
  "CONTENT_SOCIAL",
  "CONTENT_ADS",
  "CONTENT_WEB",
  "WEB_SEO",
  "ADS_CAMPAIGN",
  "SEEDING_SUPPORT",
  "OTHER",
];

function computeTimingWarning(
  dueAtValue: string,
  outsideDept: boolean
): string | null {
  if (!dueAtValue) return null;
  const due = new Date(dueAtValue);
  if (Number.isNaN(due.getTime())) return null;

  const warnings: string[] = [];
  const diffHours = (due.getTime() - Date.now()) / (1000 * 60 * 60);
  const minHours = outsideDept ? 7 * 24 : 48;
  if (diffHours < minHours) {
    warnings.push(
      outsideDept
        ? "Phòng ban ngoài cần đặt trước tối thiểu 7 ngày."
        : "Đặt dưới 2 ngày (48h) — tự động gắn nhãn Gấp."
    );
  }

  const day = due.getDay();
  if (day === 0 || day === 6) {
    warnings.push("Rơi vào T7/CN (Media nghỉ cuối tuần).");
  }
  return warnings.length > 0 ? warnings.join(" ") : null;
}

export function CreateTaskModal({
  open,
  onClose,
  projects,
  users,
  initialCapacity,
  channelSuggestions,
  currentUserId,
  defaultAssigneeId,
  defaultProjectId,
  defaultContentPillar,
  defaultCampaignWeek,
  defaultTitle,
  defaultTaskType,
  defaultOrderMode,
  defaultVideoKind = "SHOOT_AND_EDIT",
  defaultParentTaskId,
  defaultParentLabel,
  onCreated,
}: CreateTaskModalProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const initialIsMedia =
    defaultOrderMode === "MEDIA"
      ? true
      : defaultOrderMode === "TASK"
        ? false
        : defaultTaskType === "MEDIA_IMAGE" || defaultTaskType === "MEDIA_VIDEO";

  const [orderMode, setOrderMode] = useState<"MEDIA" | "TASK">(
    initialIsMedia ? "MEDIA" : "TASK"
  );
  const [projectId, setProjectId] = useState(
    defaultProjectId || projects[0]?.id || ""
  );
  const [title, setTitle] = useState(defaultTitle || "");
  const [taskType, setTaskType] = useState<TaskType>(
    defaultTaskType || (initialIsMedia ? "MEDIA_IMAGE" : "CONTENT_SOCIAL")
  );
  const [videoOrderKind, setVideoOrderKind] =
    useState<VideoOrderKind>(defaultVideoKind);
  const [platform, setPlatform] = useState("Fanpage");
  const [publishChannel, setPublishChannel] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(() =>
    !initialIsMedia && defaultAssigneeId ? [defaultAssigneeId] : []
  );
  const [quantity, setQuantity] = useState(1);
  const [mediaBriefItems, setMediaBriefItems] = useState<MediaBriefItem[]>(() => [
    createEmptyMediaBriefItem(
      initialIsMedia && defaultTaskType === "MEDIA_VIDEO",
      undefined,
      undefined,
      defaultVideoKind
    ),
  ]);
  const [dueAt, setDueAt] = useState(() =>
    getPresetDateTimeLocal(initialIsMedia ? 2 : 0, 17, 30)
  );
  const [briefLinkUrl, setBriefLinkUrl] = useState("");
  const [draftDemoImages, setDraftDemoImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Tùy chọn mở rộng (thu gọn mặc định trừ khi mở từ ô Content Matrix)
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(defaultContentPillar || defaultCampaignWeek)
  );
  const [priority, setPriority] = useState<TaskPriority>("NORMAL");
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [proposedBriefDueAt, setProposedBriefDueAt] = useState("");
  const [proposedPublishAt, setProposedPublishAt] = useState("");
  const [contentPillar, setContentPillar] = useState(defaultContentPillar || "");
  const [campaignWeek, setCampaignWeek] = useState<string>(
    defaultCampaignWeek ? String(defaultCampaignWeek) : ""
  );
  const [fbPostLayout, setFbPostLayout] = useState("SINGLE_SQUARE");
  const [isOutsideDepartment, setIsOutsideDepartment] = useState(false);
  const [caption, setCaption] = useState("");
  const [leavesOnDate, setLeavesOnDate] = useState<LeaveRequestItem[]>([]);

  const [timingWarning, setTimingWarning] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<CapacityItem[]>(initialCapacity);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProjectId = projectId || defaultProjectId || projects[0]?.id || "";
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectPillars = Array.isArray(activeProject?.contentPillarsJson)
    ? (activeProject?.contentPillarsJson as string[])
    : DEFAULT_CONTENT_PILLARS;

  const refDate = open ? (dueAt || scheduledPublishAt || "").slice(0, 10) : "";

  useEffect(() => {
    if (!refDate) return;
    let active = true;
    fetch(`/api/capacity?date=${refDate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.capacity) setCapacity(data.capacity);
      })
      .catch(() => {});

    fetch(`/api/leaves?date=${refDate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.leaves) setLeavesOnDate(data.leaves);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refDate]);

  const assigneeLeaveWarnings = leavesOnDate.filter((l) =>
    assigneeIds.includes(l.userId)
  );

  const selectedCapacities = capacity.filter((c) =>
    assigneeIds.includes(c.userId)
  );
  const projectPlatformOptions = getProjectContentOptions(
    activeProject?.overviewJson
  ).platforms;
  const isMediaOrder =
    orderMode === "MEDIA" ||
    (TASK_TYPE_META[taskType]?.isMediaOrderDefault ?? false);
  const isVideoBrief = taskType === "MEDIA_VIDEO";
  const todayFormatted = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  function switchMediaKind(kind: "MEDIA_IMAGE" | "MEDIA_VIDEO") {
    setTaskType(kind);
    const nextIsVid = kind === "MEDIA_VIDEO";
    setMediaBriefItems((prev) =>
      prev.map((it) => {
        if (nextIsVid) {
          const isImageDefault =
            it.ratio === "1:1 (Vuông)" ||
            it.ratio.startsWith("1200 × 1200");
          const nextKind = it.videoKind || videoOrderKind;
          return {
            ...it,
            ratio: isImageDefault
              ? "1080 × 1920 (9:16 TikTok / Reels / Story)"
              : it.ratio,
            videoKind: nextKind,
            shootScript:
              nextKind === "SHOOT_AND_EDIT"
                ? it.shootScript ?? createDefaultShootScript()
                : it.shootScript,
            editScript:
              nextKind === "EDIT_ONLY"
                ? it.editScript ?? createDefaultEditScript()
                : it.editScript,
          };
        }
        const isVidDefault =
          it.ratio === "9:16 (TikTok / Reels)" ||
          it.ratio.startsWith("1080 × 1920");
        return {
          ...it,
          ratio: isVidDefault ? "1200 × 1200 (Ảnh đơn vuông 1:1)" : it.ratio,
        };
      })
    );
  }

  function switchVideoOrderKind(nextKind: VideoOrderKind) {
    setVideoOrderKind(nextKind);
    setMediaBriefItems((prev) =>
      prev.map((it) => ({
        ...it,
        videoKind: nextKind,
        shootScript:
          nextKind === "SHOOT_AND_EDIT"
            ? it.shootScript ?? createDefaultShootScript()
            : it.shootScript,
        editScript:
          nextKind === "EDIT_ONLY"
            ? it.editScript ?? createDefaultEditScript()
            : it.editScript,
      }))
    );
  }

  function switchOrderMode(nextMode: "MEDIA" | "TASK") {
    setOrderMode(nextMode);
    if (nextMode === "MEDIA") {
      if (taskType !== "MEDIA_IMAGE" && taskType !== "MEDIA_VIDEO") {
        setTaskType("MEDIA_IMAGE");
      }
      if (!dueAt || dueAt === getPresetDateTimeLocal(0, 17, 30)) {
        applyDueAt(getPresetDateTimeLocal(2, 17, 30));
      }
      if (assigneeIds.length === 1 && assigneeIds[0] === currentUserId) {
        setAssigneeIds([]);
      }
    } else if (taskType === "MEDIA_IMAGE" || taskType === "MEDIA_VIDEO") {
      setTaskType("CONTENT_SOCIAL");
      if (assigneeIds.length === 0 && defaultAssigneeId) {
        setAssigneeIds([defaultAssigneeId]);
      }
    }
  }

  if (!open) return null;

  function applyDueAt(val: string) {
    setDueAt(val);
    setTimingWarning(computeTimingWarning(val, isOutsideDepartment));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (assigneeIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 người thực hiện.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const effectivePlatform = isMediaOrder
        ? publishChannel.trim().toLowerCase().includes("tiktok") ||
          publishChannel.trim().startsWith("@")
          ? "TikTok"
          : platform || "Fanpage"
        : platform;
      const effectiveQuantity = isMediaOrder
        ? Math.max(1, mediaBriefItems.length)
        : quantity;
      const effectiveDescription = isMediaOrder
        ? description.trim() ||
          buildMediaBriefSummaryText(mediaBriefItems, isVideoBrief)
        : description;

      let effectiveTitle = title.trim();
      if (isMediaOrder && isVideoBrief && !effectiveTitle) {
        const firstVideo = mediaBriefItems[0];
        const derivedFromScript =
          firstVideo?.videoKind === "EDIT_ONLY"
            ? firstVideo.editScript?.thumbnailTitle?.trim() ||
              firstVideo.editScript?.scenes
                .find((s) => s.voiceOrCutNote.trim())
                ?.voiceOrCutNote.trim()
                .split("\n")[0]
                ?.slice(0, 80)
            : firstVideo?.shootScript?.scriptTitle?.trim() ||
              firstVideo?.shootScript?.rows
                .find((r) => r.dialogue.trim() || r.textOnScreen.trim())
                ?.dialogue.trim()
                .slice(0, 80);
        const kindPrefix =
          videoOrderKind === "EDIT_ONLY" ? "Dựng Video" : "Quay & Dựng";
        effectiveTitle =
          derivedFromScript ||
          `${kindPrefix} — ${activeProject?.name || "Media"} (${todayFormatted})`;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          title: effectiveTitle,
          taskType,
          platform: effectivePlatform,
          publishChannel: publishChannel.trim() || null,
          assigneeIds,
          assigneeId: assigneeIds[0] || null,
          priority,
          quantity: effectiveQuantity,
          isMediaOrder,
          isOutsideDepartment,
          dueAt: parseVnDateTimeLocalToIso(dueAt),
          scheduledPublishAt: parseVnDateTimeLocalToIso(scheduledPublishAt),
          proposedBriefDueAt: parseVnDateTimeLocalToIso(proposedBriefDueAt),
          proposedPublishAt: parseVnDateTimeLocalToIso(proposedPublishAt),
          contentPillar: contentPillar || null,
          campaignWeek: campaignWeek ? Number(campaignWeek) : null,
          fbPostLayout,
          description: effectiveDescription,
          caption,
          briefLinkUrl,
          initialAssets:
            draftDemoImages.length > 0
              ? draftDemoImages.map((url, idx) => ({
                  kind: "DEMO",
                  label: url.startsWith("data:image/")
                    ? `Ảnh demo bài viết #${idx + 1}`
                    : "Ảnh / Thành phẩm bài viết",
                  url,
                }))
              : undefined,
          parentTaskId: defaultParentTaskId || null,
          mediaBriefItemsJson: isMediaOrder ? mediaBriefItems : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo đầu việc.");
        setSubmitting(false);
        return;
      }

      onCreated(data.task);
      window.dispatchEvent(new CustomEvent("reviews-count-updated"));
      showToast(`Đã tạo ${data.task.code}: ${data.task.title}`);
      setTitle("");
      setPublishChannel("");
      setDescription("");
      setCaption("");
      setBriefLinkUrl("");
      setDraftDemoImages([]);
      setQuantity(1);
      setMediaBriefItems([
        createEmptyMediaBriefItem(
          isVideoBrief,
          undefined,
          undefined,
          isVideoBrief ? videoOrderKind : undefined
        ),
      ]);
      onClose();
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden transition-all ${
          isMediaOrder && isVideoBrief ? "max-w-6xl" : "max-w-4xl"
        }`}
      >
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {isMediaOrder
                ? isVideoBrief
                  ? "Tạo Brief Video (Order Media)"
                  : "Tạo Brief Ảnh (Order Media)"
                : "Giao việc / Tạo Task mới"}
            </h2>
            {isMediaOrder && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                Ngày order: {todayFormatted}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {defaultParentLabel && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-900 font-semibold flex items-center gap-2">
              <span>🔗</span>
              <span className="truncate">
                Liên kết 2 chiều với bài viết: <strong>{defaultParentLabel}</strong> (khi Media nộp/duyệt Final sẽ tự báo cho bài viết gốc)
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Chế độ: Giao việc / Tạo Task vs Order Media (Brief Ảnh / Video) */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchOrderMode("TASK")}
              className={`rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                orderMode === "TASK"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Giao việc / Tạo Task
            </button>
            <button
              type="button"
              onClick={() => switchOrderMode("MEDIA")}
              className={`rounded-lg px-3 py-2 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                orderMode === "MEDIA"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Order Media (Brief Ảnh / Video)
            </button>
          </div>

          {orderMode === "MEDIA" ? (
            <CreateTaskMediaHeaderFields
              projects={projects}
              activeProjectId={activeProjectId}
              taskType={taskType}
              videoOrderKind={videoOrderKind}
              onChangeProjectId={setProjectId}
              onSwitchMediaKind={switchMediaKind}
              onSwitchVideoOrderKind={switchVideoOrderKind}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dự án *
                </label>
                <select
                  required
                  value={activeProjectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại công việc
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                >
                  {NON_MEDIA_TASK_TYPES.map((key) => (
                    <option key={key} value={key}>
                      {TASK_TYPE_META[key]?.label ?? key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!(isMediaOrder && isVideoBrief) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMediaOrder ? "Tiêu đề Brief Ảnh *" : "Tiêu đề công việc *"}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isMediaOrder
                    ? undefined
                    : "VD: Lên kế hoạch nội dung tuần tới..."
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {orderMode === "MEDIA" ? (
            <CreateTaskMediaAssigneeRow
              assigneeIds={assigneeIds}
              onChangeAssigneeIds={setAssigneeIds}
              users={users}
              isVideoBrief={isVideoBrief}
              dueAt={dueAt}
              onChangeDueAt={applyDueAt}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giao cho * (chọn 1 hoặc nhiều người)
                  </label>
                  <MultiAssigneePicker
                    users={users}
                    value={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="-- Chọn người thực hiện --"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <PlatformLogo platform={platform} size="xs" />
                    <span>Nền tảng</span>
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {projectPlatformOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {!projectPlatformOptions.includes("Ads Manager") && (
                      <option value="Ads Manager">Ads Manager</option>
                    )}
                    {!projectPlatformOptions.includes(platform) &&
                      platform !== "Ads Manager" && (
                        <option value={platform}>{platform}</option>
                      )}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                <PublishChannelInput
                  platform={platform}
                  value={publishChannel}
                  onChange={setPublishChannel}
                  suggestions={channelSuggestions}
                  compact
                />
              </div>
            </>
          )}

          {selectedCapacities.length > 0 && (
            <div className="space-y-1.5">
              {selectedCapacities.map((cap) => (
                <div
                  key={cap.userId}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center justify-between ${
                    cap.status === "FULL"
                      ? "bg-rose-50 text-rose-700"
                      : cap.status === "NEAR_LIMIT"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <span>
                    Công suất {cap.name} ({cap.periodLabel}):{" "}
                    <strong>
                      {cap.limit
                        ? `${cap.used}/${cap.limit} ${cap.unit}`
                        : `${cap.activeTasksCount} việc đang mở`}
                    </strong>
                  </span>
                  <span className="font-bold">
                    {cap.status === "FULL"
                      ? "ĐẦY SLOT"
                      : cap.status === "NEAR_LIMIT"
                        ? "SẮP ĐẦY"
                        : "CÒN TRỐNG"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {orderMode !== "MEDIA" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Deadline hoàn thành
                </label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "Hôm nay 17:30", days: 0, h: 17, m: 30 },
                    { label: "Mai 15:00", days: 1, h: 15, m: 0 },
                    { label: "Sau 2 ngày", days: 2, h: 17, m: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        applyDueAt(
                          getPresetDateTimeLocal(preset.days, preset.h, preset.m)
                        )
                      }
                      className="rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 text-[11px] font-medium text-slate-600 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => applyDueAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {timingWarning && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{timingWarning}</span>
            </div>
          )}

          {assigneeLeaveWarnings.length > 0 && (
            <div className="space-y-1.5">
              {assigneeLeaveWarnings.map((lv) => (
                <div
                  key={lv.id}
                  className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 flex items-center gap-2 text-xs text-rose-800 font-medium"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Lưu ý lịch nghỉ: {lv.user.name} có lịch{" "}
                    <strong>{lv.startDate} → {lv.endDate}</strong>{" "}
                    ({lv.reason || "Đã báo nghỉ/bận"}).
                  </span>
                </div>
              ))}
            </div>
          )}

          {orderMode === "MEDIA" ? (
            <CreateTaskMediaSpecsBlock
              mediaBriefItems={mediaBriefItems}
              onChangeMediaBriefItems={setMediaBriefItems}
              isVideoBrief={isVideoBrief}
              videoOrderKind={videoOrderKind}
              briefLinkUrl={briefLinkUrl}
              onChangeBriefLinkUrl={setBriefLinkUrl}
              description={description}
              onChangeDescription={setDescription}
            />
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Brief / Tư liệu (Google Drive / Canva)
                </label>
                <input
                  type="url"
                  value={briefLinkUrl}
                  onChange={(e) => setBriefLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc https://www.canva.com/..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú / Yêu cầu ngắn
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Thông điệp chính, yêu cầu chi tiết..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Tùy chọn nâng cao thu gọn */}
          <CreateTaskAdvancedSection
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            contentPillar={contentPillar}
            onChangeContentPillar={setContentPillar}
            projectPillars={projectPillars}
            campaignWeek={campaignWeek}
            onChangeCampaignWeek={setCampaignWeek}
            campaignWeeksTotal={activeProject?.campaignWeeks || 4}
            proposedPublishAt={proposedPublishAt}
            onChangeProposedPublishAt={setProposedPublishAt}
            fbPostLayout={fbPostLayout}
            onChangeFbPostLayout={setFbPostLayout}
            scheduledPublishAt={scheduledPublishAt}
            onChangeScheduledPublishAt={setScheduledPublishAt}
            priority={priority}
            onChangePriority={setPriority}
            isOutsideDepartment={isOutsideDepartment}
            onChangeOutsideDepartment={(checked) => {
              setIsOutsideDepartment(checked);
              setTimingWarning(computeTimingWarning(dueAt, checked));
            }}
            caption={caption}
            onChangeCaption={setCaption}
            platform={platform}
            publishChannel={publishChannel}
            projectName={activeProject?.name}
            projectColor={activeProject?.color}
            briefLinkUrl={briefLinkUrl}
            draftDemoImages={draftDemoImages}
            onDemoImagesChange={setDraftDemoImages}
            title={title}
          />

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? "Đang tạo..." : "Tạo & Giao việc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
