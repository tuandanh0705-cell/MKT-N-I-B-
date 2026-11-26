"use client";

import { Bot, Camera, Check, ExternalLink, PenLine, Send, Trash2 } from "lucide-react";
import { CustomizableOptionSelect } from "@/components/customizable-option-select";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { PlatformLogo } from "@/components/platform-logo";
import {
  deriveDefaultFormat,
  getContentRouteMeta,
  getContentStatusDisplay,
  getPostFormatMeta,
  normalizeRouteSelectValue,
  type ProjectContentOptionKind,
} from "@/lib/content-plan";
import { getVnDateString } from "@/lib/dates";
import { normalizePlatformSelectValue } from "@/lib/platform-meta";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import type { GeminiQcCheckResponse } from "@/lib/gemini-shared";
import type { ProjectChannelSuggestions, SimpleUser, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ContentCalendarRowProps {
  task: TaskItem;
  projectSlug: string;
  users: SimpleUser[];
  routeOptions: string[];
  platformOptions: string[];
  formatOptions: string[];
  linkedMediaOrders?: TaskItem[];
  channelSuggestions?: ProjectChannelSuggestions | null;
  todayStr: string;
  currentUserRole: UserRole;
  rowBusy: boolean;
  deleteMode: boolean;
  deletable: boolean;
  deleting: boolean;
  isSelectedForDelete: boolean;
  savedAiResult: GeminiQcCheckResponse | null;
  onToggleSelectDelete: (taskId: string) => void;
  onRequestDeleteSingle: (taskId: string) => void;
  onPatchTaskInline: (
    taskId: string,
    payload: Record<string, unknown>,
    toastMsg?: string
  ) => void;
  onAddProjectOption?: (
    kind: ProjectContentOptionKind,
    newValue: string
  ) => Promise<boolean>;
  onOpenEditor: (task: TaskItem) => void;
  onOpenMediaOrder?: (taskId: string) => void;
  onInspectAiScore: (taskId: string) => void;
  onRequestMediaOrder: (task: TaskItem) => void;
  onRequireCaptionBeforeSubmit: (task: TaskItem) => void;
}

export function ContentCalendarRow({
  task: t,
  projectSlug,
  users,
  routeOptions,
  platformOptions,
  formatOptions,
  linkedMediaOrders = [],
  todayStr,
  currentUserRole,
  rowBusy,
  deleteMode,
  deletable,
  deleting,
  isSelectedForDelete,
  savedAiResult,
  onToggleSelectDelete,
  onRequestDeleteSingle,
  onPatchTaskInline,
  onAddProjectOption,
  onOpenEditor,
  onOpenMediaOrder,
  onInspectAiScore,
  onRequestMediaOrder,
  onRequireCaptionBeforeSubmit,
}: ContentCalendarRowProps) {
  const pubDateVal = t.scheduledPublishAt
    ? getVnDateString(new Date(t.scheduledPublishAt))
    : "";
  const mediaDueVal = t.mediaDueAt ? getVnDateString(new Date(t.mediaDueAt)) : "";
  const contentDueVal = t.dueAt ? getVnDateString(new Date(t.dueAt)) : "";
  const normalizedRoute = normalizeRouteSelectValue(t.contentAngle, routeOptions);
  const routeMeta = getContentRouteMeta(normalizedRoute);
  const formatVal = deriveDefaultFormat(t);
  const formatMeta = getPostFormatMeta(formatVal);
  const statusMeta = getContentStatusDisplay(t.status, t.isAired);
  const isToday = pubDateVal === todayStr;

  const canSubmitReview =
    t.status !== "WAITING_APPROVAL" &&
    t.status !== "APPROVED_FINAL" &&
    t.status !== "PUBLISHED" &&
    t.status !== "DONE";

  return (
    <tr
      className={`align-top hover:bg-slate-50/80 ${
        isSelectedForDelete
          ? "bg-rose-50/70"
          : isToday
            ? "bg-amber-50/40"
            : ""
      }`}
    >
      {deleteMode && (
        <td className="py-2.5 px-2 whitespace-nowrap text-center bg-rose-50/40">
          {deletable ? (
            <div className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={isSelectedForDelete}
                onChange={() => onToggleSelectDelete(t.id)}
                aria-label={`Chọn xóa ${t.title}`}
                className="rounded border-rose-300 cursor-pointer"
              />
              <button
                type="button"
                disabled={deleting}
                onClick={() => onRequestDeleteSingle(t.id)}
                title={`Xóa "${t.title}"`}
                className="rounded-lg p-1 text-rose-600 hover:bg-rose-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span
              title="Không có quyền xóa"
              className="text-[10px] text-slate-300"
            >
              —
            </span>
          )}
        </td>
      )}

      {/* 1. Ngày đăng */}
      <td className="py-2.5 px-2 whitespace-nowrap">
        <input
          type="date"
          value={pubDateVal}
          disabled={rowBusy}
          onChange={(e) =>
            onPatchTaskInline(
              t.id,
              {
                scheduledPublishAt: e.target.value
                  ? `${e.target.value}T09:00:00+07:00`
                  : null,
              },
              "Đã cập nhật ngày đăng."
            )
          }
          className={`rounded-lg border px-1.5 py-1 text-xs font-semibold ${
            isToday
              ? "border-amber-400 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-800"
          }`}
        />
      </td>

      {/* 2. Tuyến nội dung */}
      <td className="py-2.5 px-2 min-w-[125px]">
        <CustomizableOptionSelect
          value={normalizedRoute}
          options={routeOptions}
          emptyLabel="-- Tuyến --"
          placeholder="Tên tuyến mới..."
          disabled={rowBusy}
          selectClassName={`rounded-full border px-2 py-1 text-[11px] font-bold cursor-pointer max-w-[140px] ${routeMeta.badgeClass}`}
          inputClassName="w-28 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-[11px] font-bold text-slate-900 focus:outline-none"
          onChange={(val) =>
            onPatchTaskInline(
              t.id,
              { contentAngle: val || null },
              "Đã đổi tuyến nội dung."
            )
          }
          onAddOption={
            onAddProjectOption
              ? (val) => onAddProjectOption("ROUTES", val)
              : undefined
          }
        />
      </td>

      {/* 3. Nội dung / Brief */}
      <td
        onClick={() => onOpenEditor(t)}
        className="py-2.5 px-2 cursor-pointer group max-w-[200px]"
      >
        <div className="font-bold text-slate-900 group-hover:text-blue-700 line-clamp-3 leading-snug">
          {t.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] text-slate-400">{t.code}</span>
          {t.contentPillar && (
            <span className="rounded bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 text-[10px] truncate max-w-[130px]">
              {t.contentPillar}
            </span>
          )}
        </div>
      </td>

      {/* 4. Nền tảng */}
      <td className="py-2.5 px-2 min-w-[130px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={t.platform} size="xs" />
            <CustomizableOptionSelect
              value={normalizePlatformSelectValue(t.platform)}
              options={platformOptions}
              placeholder="Nền tảng mới..."
              disabled={rowBusy}
              selectClassName="rounded-lg border border-blue-200 bg-blue-50/70 text-blue-800 px-1.5 py-1 text-[11px] font-bold max-w-[115px]"
              inputClassName="w-24 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-[11px] font-bold text-slate-900 focus:outline-none"
              onChange={(val) => onPatchTaskInline(t.id, { platform: val })}
              onAddOption={
                onAddProjectOption
                  ? (val) => onAddProjectOption("PLATFORMS", val)
                  : undefined
              }
            />
          </div>
          {t.publishChannel && (
            <div
              title={t.publishChannel}
              className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]"
            >
              {t.publishChannel}
            </div>
          )}
        </div>
      </td>

      {/* 5. Bài viết + huy hiệu điểm Gemini AI đã lưu */}
      <td
        onClick={() => onOpenEditor(t)}
        className="py-2.5 px-2 cursor-pointer max-w-[260px]"
      >
        {t.caption && t.caption.trim() ? (
          <div className="rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 p-2 space-y-1 transition">
            <p className="text-slate-800 line-clamp-3 whitespace-pre-line leading-snug">
              {t.caption}
            </p>
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-semibold text-blue-600 inline-flex items-center gap-1">
                <PenLine className="w-3 h-3" />
                Sửa ({t.caption.length})
              </span>
              {savedAiResult && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectAiScore(t.id);
                  }}
                  title="Xem chi tiết kết quả Gemini AI Check đã lưu"
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-extrabold cursor-pointer ${
                    savedAiResult.result.score >= 80
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : savedAiResult.result.score >= 60
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  {savedAiResult.result.score}đ
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-xl border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/60 px-2.5 py-2 text-[11px] font-bold text-blue-700 inline-flex items-center gap-1.5 transition">
              <PenLine className="w-3.5 h-3.5" />
              Viết bài
            </span>
            {savedAiResult && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectAiScore(t.id);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 cursor-pointer"
              >
                <Bot className="w-3 h-3" />
                {savedAiResult.result.score}đ
              </button>
            )}
          </div>
        )}
      </td>

      {/* 6. Format */}
      <td className="py-2.5 px-2 min-w-[105px]">
        <CustomizableOptionSelect
          value={formatVal}
          options={formatOptions}
          placeholder="Format mới..."
          disabled={rowBusy}
          selectClassName={`rounded-full border px-2 py-1 text-[11px] font-bold cursor-pointer max-w-[120px] ${formatMeta.badgeClass}`}
          inputClassName="w-24 rounded-lg border-2 border-blue-400 bg-white px-2 py-1 text-[11px] font-bold text-slate-900 focus:outline-none"
          onChange={(val) => onPatchTaskInline(t.id, { postFormat: val })}
          onAddOption={
            onAddProjectOption
              ? (val) => onAddProjectOption("FORMATS", val)
              : undefined
          }
        />
      </td>

      {/* 7. Tình trạng (Sau Format, trước Deadline) */}
      <td className="py-2.5 px-2 whitespace-nowrap">
        <span
          className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.badgeClass}`}
        >
          {statusMeta.label}
        </span>
      </td>

      {/* 8. Deadline gộp (Dòng trên: Content, Dòng dưới: Ấn phẩm) */}
      <td className="py-2.5 px-2 whitespace-nowrap">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 text-[10px] font-bold text-emerald-700">
              Content
            </span>
            <input
              type="date"
              aria-label={`Deadline Content ${t.code}`}
              value={contentDueVal}
              disabled={rowBusy}
              onChange={(e) =>
                onPatchTaskInline(t.id, {
                  dueAt: e.target.value ? `${e.target.value}T17:00:00+07:00` : null,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 text-[10px] font-bold text-amber-700">
              Ấn phẩm
            </span>
            <input
              type="date"
              aria-label={`Deadline Ấn phẩm ${t.code}`}
              value={mediaDueVal}
              disabled={rowBusy}
              onChange={(e) =>
                onPatchTaskInline(t.id, {
                  mediaDueAt: e.target.value
                    ? `${e.target.value}T17:00:00+07:00`
                    : null,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
            />
          </div>
        </div>
      </td>

      {/* 9. Link SP & Trạng thái Media liên kết 2 chiều */}
      <td className="py-2.5 px-2 max-w-[140px] space-y-1">
        {linkedMediaOrders.length > 0 && (
          <div className="space-y-1">
            {linkedMediaOrders.map((m) => {
              const isDone =
                m.status === "APPROVED_FINAL" ||
                m.status === "PUBLISHED" ||
                m.status === "DONE";
              const isWaiting = m.status === "WAITING_APPROVAL";
              const isRev = m.status === "REVISION_NEEDED";
              const finalAsset =
                m.assets.find((a) => a.kind === "FINAL") || m.assets[0];
              return (
                <div key={m.id} className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onOpenMediaOrder?.(m.id)}
                    title={`${m.code}: ${m.title}`}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                      isDone
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isWaiting
                          ? "bg-sky-50 text-sky-800 border-sky-200"
                          : isRev
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    {isDone
                      ? "✅ Media Final"
                      : isWaiting
                        ? "👀 Media chờ duyệt"
                        : isRev
                          ? "🔧 Media sửa"
                          : "🎨 Media đang làm"}
                  </button>
                  {finalAsset && (
                    <a
                      href={finalAsset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở link sản phẩm Media"
                      className="text-emerald-700 hover:text-emerald-900"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {t.productLink ? (
          <a
            href={t.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline whitespace-nowrap"
          >
            Mở link
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : t.assets[0] ? (
          <a
            href={t.assets[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline whitespace-nowrap"
          >
            Ảnh/File
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : linkedMediaOrders.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpenEditor(t)}
            className="text-[11px] text-slate-400 hover:text-blue-600 cursor-pointer whitespace-nowrap"
          >
            + Gắn link
          </button>
        ) : null}
      </td>

      {/* 10. PIC (hỗ trợ chọn 1 hoặc nhiều người) */}
      <td className="py-2.5 px-2 min-w-[125px]">
        <MultiAssigneePicker
          users={users}
          value={getTaskAssigneeIds(t)}
          disabled={rowBusy}
          compact
          popoverAlign="right"
          placeholder="Chưa gán"
          onChange={(nextIds) =>
            onPatchTaskInline(
              t.id,
              {
                assigneeIds: nextIds,
                assigneeId: nextIds[0] || null,
              },
              nextIds.length > 1
                ? `Đã gán ${nextIds.length} người thực hiện.`
                : "Đã cập nhật PIC."
            )
          }
        />
      </td>

      {/* 11. Thao tác (Đã bỏ AI Check theo tối ưu) */}
      <td className="py-2.5 px-2 whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-1">
          {canSubmitReview && (
            <button
              type="button"
              disabled={rowBusy}
              onClick={() => {
                if (!t.caption?.trim()) {
                  onRequireCaptionBeforeSubmit(t);
                  return;
                }
                onPatchTaskInline(
                  t.id,
                  {
                    action: "SUBMIT_FOR_REVIEW",
                    notifyUrl: `/projects/${projectSlug}?tab=CONTENT_CALENDAR&taskId=${t.id}`,
                  },
                  `Đã gửi bài ${t.code} & thông báo cho Leader duyệt!`
                );
              }}
              title="Gửi Leader duyệt & bắn thông báo"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              Gửi duyệt
            </button>
          )}

          {currentUserRole === "LEADER" && t.status === "WAITING_APPROVAL" && (
            <button
              type="button"
              disabled={rowBusy}
              onClick={() =>
                onPatchTaskInline(
                  t.id,
                  { action: "APPROVE" },
                  `Đã duyệt Final bài ${t.code}!`
                )
              }
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Duyệt
            </button>
          )}

          <button
            type="button"
            onClick={() => onRequestMediaOrder(t)}
            title="Đặt Order Ảnh/Video cho Media từ bài viết này"
            className="rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
            Order Media
          </button>

          {deletable && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => onRequestDeleteSingle(t.id)}
              title={`Xóa "${t.title}"`}
              className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
