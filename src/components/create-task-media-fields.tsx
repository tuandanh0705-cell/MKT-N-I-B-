"use client";

import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Scissors,
} from "lucide-react";
import { FB_POST_LAYOUTS, FB_POST_LAYOUT_GROUPS } from "@/lib/constants";
import { getPresetDateTimeLocal } from "@/lib/dates";
import { MediaBriefItemsEditor } from "@/components/media-brief-items-editor";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { FacebookPostPreview } from "@/components/facebook-post-preview";
import {
  VIDEO_ORDER_KIND_META,
  type MediaBriefItem,
  type VideoOrderKind,
} from "@/lib/media-brief";
import type {
  SimpleProject,
  SimpleUser,
} from "@/types/crm";
import type { TaskPriority, TaskType } from "@/generated/prisma/client";

interface CreateTaskMediaHeaderProps {
  projects: SimpleProject[];
  activeProjectId: string;
  taskType: TaskType;
  videoOrderKind: VideoOrderKind;
  onChangeProjectId: (id: string) => void;
  onSwitchMediaKind: (kind: "MEDIA_IMAGE" | "MEDIA_VIDEO") => void;
  onSwitchVideoOrderKind: (kind: VideoOrderKind) => void;
}

export function CreateTaskMediaHeaderFields({
  projects,
  activeProjectId,
  taskType,
  videoOrderKind,
  onChangeProjectId,
  onSwitchMediaKind,
  onSwitchVideoOrderKind,
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
            className={`rounded-xl border-2 px-3 py-2.5 text-left transition cursor-pointer flex items-center gap-2.5 ${
              taskType === "MEDIA_IMAGE"
                ? "border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                taskType === "MEDIA_IMAGE"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </span>
            <span className="text-xs font-extrabold">Brief Ảnh</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={taskType === "MEDIA_VIDEO"}
            onClick={() => onSwitchMediaKind("MEDIA_VIDEO")}
            className={`rounded-xl border-2 px-3 py-2.5 text-left transition cursor-pointer flex items-center gap-2.5 ${
              taskType === "MEDIA_VIDEO"
                ? "border-violet-500 bg-violet-50/70 text-violet-900 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                taskType === "MEDIA_VIDEO"
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Film className="w-4 h-4" />
            </span>
            <span className="text-xs font-extrabold">Brief Video</span>
          </button>
        </div>
      </div>

      {/* Khi chọn Brief Video: Phân loại gọn 2 lựa chọn (không chú thích dài) */}
      {taskType === "MEDIA_VIDEO" && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Phân loại Order Video *
          </label>
          <div
            role="radiogroup"
            aria-label="Phân loại Order Video"
            className="grid grid-cols-2 gap-2.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={videoOrderKind === "SHOOT_AND_EDIT"}
              onClick={() => onSwitchVideoOrderKind("SHOOT_AND_EDIT")}
              className={`rounded-xl border-2 px-3 py-2.5 text-left transition cursor-pointer flex items-center gap-2.5 ${
                videoOrderKind === "SHOOT_AND_EDIT"
                  ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                  videoOrderKind === "SHOOT_AND_EDIT"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Clapperboard className="w-4 h-4" />
              </span>
              <span className="text-xs font-extrabold">
                {VIDEO_ORDER_KIND_META.SHOOT_AND_EDIT.label}
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={videoOrderKind === "EDIT_ONLY"}
              onClick={() => onSwitchVideoOrderKind("EDIT_ONLY")}
              className={`rounded-xl border-2 px-3 py-2.5 text-left transition cursor-pointer flex items-center gap-2.5 ${
                videoOrderKind === "EDIT_ONLY"
                  ? "border-violet-600 bg-violet-50/70 text-violet-950 shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                  videoOrderKind === "EDIT_ONLY"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Scissors className="w-4 h-4" />
              </span>
              <span className="text-xs font-extrabold">
                {VIDEO_ORDER_KIND_META.EDIT_ONLY.label}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateTaskMediaAssigneeRowProps {
  assigneeIds: string[];
  onChangeAssigneeIds: (ids: string[]) => void;
  users: SimpleUser[];
  isVideoBrief: boolean;
  dueAt: string;
  onChangeDueAt: (val: string) => void;
}

export function CreateTaskMediaAssigneeRow({
  assigneeIds,
  onChangeAssigneeIds,
  users,
  isVideoBrief,
  dueAt,
  onChangeDueAt,
}: CreateTaskMediaAssigneeRowProps) {
  const mediaScopes = isVideoBrief
    ? ["MEDIA_VIDEO", "CONTENT_EDIT", "MEDIA_DESIGN", "CONTENT_DESIGN"]
    : ["MEDIA_DESIGN", "CONTENT_DESIGN", "MEDIA_VIDEO", "CONTENT_EDIT"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Giao cho Media * (chọn 1 hoặc nhiều)
        </label>
        <MultiAssigneePicker
          users={users}
          value={assigneeIds}
          onChange={onChangeAssigneeIds}
          placeholder="-- Chọn nhân sự Media nhận order --"
          prioritizeScopes={mediaScopes}
          prioritizeGroupLabel={
            isVideoBrief
              ? "🎬 Team Video / Dựng phim"
              : "🎨 Team Thiết kế / Media"
          }
          otherGroupLabel="👥 Thành viên khác"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
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
                  onChangeDueAt(
                    getPresetDateTimeLocal(preset.days, preset.h, preset.m)
                  )
                }
                className="rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => onChangeDueAt(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

interface CreateTaskMediaSpecsBlockProps {
  mediaBriefItems: MediaBriefItem[];
  onChangeMediaBriefItems: (items: MediaBriefItem[]) => void;
  isVideoBrief: boolean;
  videoOrderKind: VideoOrderKind;
  briefLinkUrl: string;
  onChangeBriefLinkUrl: (v: string) => void;
  description: string;
  onChangeDescription: (v: string) => void;
}

export function CreateTaskMediaSpecsBlock({
  mediaBriefItems,
  onChangeMediaBriefItems,
  isVideoBrief,
  videoOrderKind,
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
        defaultVideoKind={videoOrderKind}
        showItemVideoKindSwitcher={false}
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
  draftDemoImages?: string[];
  onDemoImagesChange?: (urls: string[]) => void;
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
  draftDemoImages,
  onDemoImagesChange,
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
            platform === "Instagram" ||
            platform === "TikTok" ||
            platform === "Threads" ||
            caption.trim()) && (
            <FacebookPostPreview
              pageName={publishChannel.trim() || projectName || "Fanpage Meta Ecom"}
              pageColor={projectColor}
              platform={platform}
              caption={caption}
              layout={fbPostLayout}
              onChangeLayout={onChangeFbPostLayout}
              hideLayoutSelector
              draftDemoImages={draftDemoImages}
              onDemoImagesChange={onDemoImagesChange}
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
