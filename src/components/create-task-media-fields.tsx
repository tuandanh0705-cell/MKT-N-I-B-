"use client";

import { Camera, ChevronDown, ChevronUp, Film, Image as ImageIcon } from "lucide-react";
import { FB_POST_LAYOUTS } from "@/lib/constants";
import { MediaBriefItemsEditor } from "@/components/media-brief-items-editor";
import { PublishChannelInput } from "@/components/publish-channel-input";
import { FacebookPostPreview } from "@/components/facebook-post-preview";
import type { MediaBriefItem } from "@/lib/media-brief";
import type {
  CapacityItem,
  ProjectChannelSuggestions,
  SimpleProject,
  SimpleUser,
} from "@/types/crm";
import type { TaskPriority, TaskType } from "@/generated/prisma/client";

interface CreateTaskMediaHeaderProps {
  projects: SimpleProject[];
  activeProjectId: string;
  taskType: TaskType;
  onChangeProjectId: (id: string) => void;
  onSwitchMediaKind: (kind: "MEDIA_IMAGE" | "MEDIA_VIDEO") => void;
}

export function CreateTaskMediaHeaderFields({
  projects,
  activeProjectId,
  taskType,
  onChangeProjectId,
  onSwitchMediaKind,
}: CreateTaskMediaHeaderProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Dự án *
        </label>
        <select
          required
          value={activeProjectId}
          onChange={(e) => onChangeProjectId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Brief Media: Chọn 1 trong 2 -> Brief Ảnh hoặc Brief Video */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Loại Brief Media (Chọn 1 trong 2) *
        </label>
        <div
          role="radiogroup"
          aria-label="Chọn 1 trong 2: Brief Ảnh hoặc Brief Video"
          className="grid grid-cols-2 gap-2.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={taskType === "MEDIA_IMAGE"}
            onClick={() => onSwitchMediaKind("MEDIA_IMAGE")}
            className={`rounded-xl border-2 p-3 text-left transition cursor-pointer flex items-center gap-2.5 ${
              taskType === "MEDIA_IMAGE"
                ? "border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span
              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 ${
                taskType === "MEDIA_IMAGE"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-extrabold">Brief Ảnh</div>
              <div className="text-[11px] opacity-75">
                Chi tiết từng ảnh, tỷ lệ &amp; mẫu
              </div>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={taskType === "MEDIA_VIDEO"}
            onClick={() => onSwitchMediaKind("MEDIA_VIDEO")}
            className={`rounded-xl border-2 p-3 text-left transition cursor-pointer flex items-center gap-2.5 ${
              taskType === "MEDIA_VIDEO"
                ? "border-violet-500 bg-violet-50/70 text-violet-900 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span
              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 ${
                taskType === "MEDIA_VIDEO"
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Film className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-extrabold">Brief Video</div>
              <div className="text-[11px] opacity-75">
                Chi tiết từng video &amp; kịch bản
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateTaskMediaAssigneeRowProps {
  assigneeId: string;
  onChangeAssigneeId: (id: string) => void;
  users: SimpleUser[];
  capacity: CapacityItem[];
  isVideoBrief: boolean;
  publishChannel: string;
  onChangePublishChannel: (val: string) => void;
  channelSuggestions?: ProjectChannelSuggestions | null;
}

export function CreateTaskMediaAssigneeRow({
  assigneeId,
  onChangeAssigneeId,
  users,
  capacity,
  isVideoBrief,
  publishChannel,
  onChangePublishChannel,
  channelSuggestions,
}: CreateTaskMediaAssigneeRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Giao cho
        </label>
        <select
          value={assigneeId}
          onChange={(e) => onChangeAssigneeId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">-- Chọn nhân sự --</option>
          {users
            .filter((u) => u.isActive !== false)
            .map((u) => {
              const cap = capacity.find((c) => c.userId === u.id);
              const capText =
                cap && cap.limit
                  ? ` (${cap.used}/${cap.limit} ${cap.unit})`
                  : cap
                    ? ` (${cap.activeTasksCount} việc)`
                    : "";
              return (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {capText}
                </option>
              );
            })}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {isVideoBrief ? "Fanpage / Kênh đăng bài" : "Fanpage đăng bài"}
        </label>
        <PublishChannelInput
          platform="Fanpage"
          value={publishChannel}
          onChange={onChangePublishChannel}
          showLabel={false}
          suggestions={
            isVideoBrief && channelSuggestions
              ? {
                  ...channelSuggestions,
                  fanpages: Array.from(
                    new Set([
                      ...channelSuggestions.fanpages,
                      ...channelSuggestions.tiktoks,
                    ])
                  ),
                }
              : channelSuggestions
          }
          inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

interface CreateTaskMediaSpecsBlockProps {
  mediaBriefItems: MediaBriefItem[];
  onChangeMediaBriefItems: (items: MediaBriefItem[]) => void;
  isVideoBrief: boolean;
  briefLinkUrl: string;
  onChangeBriefLinkUrl: (v: string) => void;
  description: string;
  onChangeDescription: (v: string) => void;
}

export function CreateTaskMediaSpecsBlock({
  mediaBriefItems,
  onChangeMediaBriefItems,
  isVideoBrief,
  briefLinkUrl,
  onChangeBriefLinkUrl,
  description,
  onChangeDescription,
}: CreateTaskMediaSpecsBlockProps) {
  return (
    <>
      <MediaBriefItemsEditor
        items={mediaBriefItems}
        onChange={onChangeMediaBriefItems}
        isVideo={isVideoBrief}
        compact={false}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Link Brief tổng / Tư liệu (Drive / Canva)
          </label>
          <input
            type="url"
            value={briefLinkUrl}
            onChange={(e) => onChangeBriefLinkUrl(e.target.value)}
            placeholder="https://drive.google.com/... (nếu có)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú chung (nếu có)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Yêu cầu chung cho cả bộ..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </>
  );
}

interface CreateTaskAdvancedSectionProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  contentPillar: string;
  onChangeContentPillar: (v: string) => void;
  projectPillars: string[];
  campaignWeek: string;
  onChangeCampaignWeek: (v: string) => void;
  campaignWeeksTotal: number;
  proposedPublishAt: string;
  onChangeProposedPublishAt: (v: string) => void;
  fbPostLayout: string;
  onChangeFbPostLayout: (v: string) => void;
  scheduledPublishAt: string;
  onChangeScheduledPublishAt: (v: string) => void;
  priority: TaskPriority;
  onChangePriority: (p: TaskPriority) => void;
  isOutsideDepartment: boolean;
  onChangeOutsideDepartment: (checked: boolean) => void;
  caption: string;
  onChangeCaption: (v: string) => void;
  platform: string;
  publishChannel: string;
  projectName?: string;
  projectColor?: string;
  briefLinkUrl: string;
  title: string;
}

export function CreateTaskAdvancedSection({
  showAdvanced,
  onToggleAdvanced,
  contentPillar,
  onChangeContentPillar,
  projectPillars,
  campaignWeek,
  onChangeCampaignWeek,
  campaignWeeksTotal,
  proposedPublishAt,
  onChangeProposedPublishAt,
  fbPostLayout,
  onChangeFbPostLayout,
  scheduledPublishAt,
  onChangeScheduledPublishAt,
  priority,
  onChangePriority,
  isOutsideDepartment,
  onChangeOutsideDepartment,
  caption,
  onChangeCaption,
  platform,
  publishChannel,
  projectName,
  projectColor,
  briefLinkUrl,
  title,
}: CreateTaskAdvancedSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
      >
        {showAdvanced ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        {showAdvanced
          ? "Ẩn tùy chọn nâng cao"
          : "Thêm Caption, Lịch đăng, Mức ưu tiên..."}
      </button>

      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sky-50/70 rounded-xl p-3 border border-sky-200">
            <div>
              <label className="block text-xs font-semibold text-sky-900 mb-1">
                Trụ cột Nội dung (Content Matrix)
              </label>
              <select
                value={contentPillar}
                onChange={(e) => onChangeContentPillar(e.target.value)}
                className="w-full rounded-xl border border-sky-200 px-3 py-1.5 text-xs bg-white"
              >
                <option value="">-- Không xếp vào Matrix --</option>
                {projectPillars.map((pillar) => (
                  <option key={pillar} value={pillar}>
                    {pillar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-900 mb-1">
                Thuộc Tuần thứ mấy
              </label>
              <select
                value={campaignWeek}
                onChange={(e) => onChangeCampaignWeek(e.target.value)}
                className="w-full rounded-xl border border-sky-200 px-3 py-1.5 text-xs bg-white"
              >
                <option value="">-- Chưa chia tuần --</option>
                {Array.from(
                  { length: Math.max(4, campaignWeeksTotal) },
                  (_, i) => i + 1
                ).map((w) => (
                  <option key={w} value={String(w)}>
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mốc chi tiết Content / Vy đề xuất đăng
              </label>
              <input
                type="datetime-local"
                value={proposedPublishAt}
                onChange={(e) => onChangeProposedPublishAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bố cục bài đăng Facebook
              </label>
              <select
                value={fbPostLayout}
                onChange={(e) => onChangeFbPostLayout(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
              >
                {Object.entries(FB_POST_LAYOUTS).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày đăng chốt trên App
              </label>
              <input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => onChangeScheduledPublishAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => onChangePriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
              >
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Ưu tiên cao</option>
                <option value="URGENT">Gấp</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isOutsideDepartment}
              onChange={(e) => onChangeOutsideDepartment(e.target.checked)}
              className="rounded border-slate-300"
            />
            Order từ phòng ban khác (yêu cầu đặt trước 7 ngày)
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Caption bài đăng
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => onChangeCaption(e.target.value)}
              placeholder="Caption kèm hashtag, CTA, link UTM..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          {(platform === "Fanpage" ||
            platform === "Facebook" ||
            platform === "Group" ||
            caption.trim()) && (
            <FacebookPostPreview
              pageName={publishChannel.trim() || projectName || "Fanpage Meta Ecom"}
              pageColor={projectColor}
              caption={caption}
              layout={fbPostLayout}
              onChangeLayout={onChangeFbPostLayout}
              mediaUrl={briefLinkUrl}
              mediaUrls={briefLinkUrl ? [briefLinkUrl] : []}
              title={title}
            />
          )}
        </div>
      )}
    </div>
  );
}
export { Camera };
