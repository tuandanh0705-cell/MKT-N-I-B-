"use client";

import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ExternalLink,
  PenLine,
  Send,
  Trash2,
} from "lucide-react";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { PlatformLogo } from "@/components/platform-logo";
import {
  deriveDefaultFormat,
  getContentRouteMeta,
  getContentStatusDisplay,
  getPostFormatMeta,
} from "@/lib/content-plan";
import { getVnDateString, getVnTimeString } from "@/lib/dates";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import type { SimpleUser, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

function getMediaPillMeta(mediaTask: TaskItem) {
  if (
    mediaTask.status === "APPROVED_FINAL" ||
    mediaTask.status === "PUBLISHED" ||
    mediaTask.status === "DONE"
  ) {
    return {
      label: mediaTask.taskType === "MEDIA_VIDEO" ? "✅ Video Final" : "✅ Ảnh Final",
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }
  if (mediaTask.status === "WAITING_APPROVAL") {
    return {
      label: "👀 Media chờ duyệt",
      cls: "bg-sky-50 text-sky-800 border-sky-200",
    };
  }
  if (mediaTask.status === "REVISION_NEEDED") {
    return {
      label: "🔧 Media cần sửa",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    label: mediaTask.taskType === "MEDIA_VIDEO" ? "🎬 Video đang làm" : "🎨 Ảnh đang làm",
    cls: "bg-amber-50 text-amber-900 border-amber-200",
  };
}

export function ContentCalendarMobileCard({
  task: t,
  projectSlug,
  users,
  linkedMediaOrders = [],
  todayStr,
  currentUserRole,
  rowBusy,
  deleteMode,
  deletable,
  deleting,
  isSelectedForDelete,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onToggleSelectDelete,
  onRequestDeleteSingle,
  onPatchTaskInline,
  onOpenEditor,
  onOpenMediaOrder,
  onRequestMediaOrder,
  onRequireCaptionBeforeSubmit,
}: {
  task: TaskItem;
  projectSlug: string;
  users: SimpleUser[];
  linkedMediaOrders?: TaskItem[];
  todayStr: string;
  currentUserRole: UserRole;
  rowBusy: boolean;
  deleteMode: boolean;
  deletable: boolean;
  deleting: boolean;
  isSelectedForDelete: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggleSelectDelete: (taskId: string) => void;
  onRequestDeleteSingle: (taskId: string) => void;
  onPatchTaskInline: (
    taskId: string,
    payload: Record<string, unknown>,
    toastMsg?: string
  ) => void;
  onOpenEditor: (task: TaskItem) => void;
  onOpenMediaOrder?: (taskId: string) => void;
  onRequestMediaOrder: (task: TaskItem) => void;
  onRequireCaptionBeforeSubmit: (task: TaskItem) => void;
}) {
  const pubDateVal = t.scheduledPublishAt
    ? getVnDateString(new Date(t.scheduledPublishAt))
    : "";
  const pubTimeVal = t.scheduledPublishAt
    ? getVnTimeString(t.scheduledPublishAt, "09:00")
    : "";
  const routeMeta = getContentRouteMeta(t.contentAngle);
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
    <div
      className={`rounded-2xl border p-3.5 space-y-2.5 bg-white shadow-2xs transition ${
        isSelectedForDelete
          ? "border-rose-400 bg-rose-50/50"
          : isToday
            ? "border-amber-300 bg-amber-50/30"
            : "border-slate-200"
      }`}
    >
      {/* Top badges row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {deleteMode && deletable && (
            <input
              type="checkbox"
              checked={isSelectedForDelete}
              onChange={() => onToggleSelectDelete(t.id)}
              aria-label={`Chọn xóa ${t.title}`}
              className="rounded border-rose-300 w-4 h-4 cursor-pointer shrink-0"
            />
          )}
          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {t.code}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            <PlatformLogo platform={t.platform} className="w-3 h-3" />
            {t.platform}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${formatMeta.badgeClass}`}
          >
            {formatMeta.label}
          </span>
          {t.contentAngle && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${routeMeta.badgeClass}`}
            >
              {routeMeta.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(onMoveUp || onMoveDown) && (
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
              <button
                type="button"
                disabled={!canMoveUp || rowBusy}
                onClick={onMoveUp}
                aria-label="Đưa dòng lên trên"
                title="Đưa lên trên"
                className="p-1 text-slate-600 hover:bg-white disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={!canMoveDown || rowBusy}
                onClick={onMoveDown}
                aria-label="Đưa dòng xuống dưới"
                title="Đưa xuống dưới"
                className="p-1 text-slate-600 hover:bg-white border-l border-slate-200 disabled:opacity-30 cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Title & caption snippet */}
      <button
        type="button"
        onClick={() => onOpenEditor(t)}
        className="w-full text-left space-y-1 cursor-pointer"
      >
        <div className="text-sm font-extrabold text-slate-900 leading-snug">
          {t.title}
        </div>
        {t.caption?.trim() ? (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {t.caption}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 italic">
            Chưa có nội dung bài viết — bấm để viết bài...
          </p>
        )}
      </button>

      {/* Linked Media Orders (2-way sync!) */}
      {linkedMediaOrders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedMediaOrders.map((m) => {
            const meta = getMediaPillMeta(m);
            const finalAsset =
              m.assets.find((a) => a.kind === "FINAL") || m.assets[0];
            return (
              <div key={m.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenMediaOrder?.(m.id)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${meta.cls}`}
                >
                  {meta.label} ({m.code})
                </button>
                {finalAsset && (
                  <a
                    href={finalAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-600 text-white px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-0.5"
                  >
                    File
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick inline Date & PIC */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="space-y-1">
          <label className="block text-[10px] font-semibold text-slate-500">
            Ngày &amp; Giờ đăng {!pubDateVal && <span className="text-amber-600">(Chưa xếp)</span>}
          </label>
          <input
            type="date"
            value={pubDateVal}
            disabled={rowBusy}
            onChange={(e) =>
              onPatchTaskInline(
                t.id,
                {
                  scheduledPublishAt: e.target.value
                    ? `${e.target.value}T${pubTimeVal || "09:00"}:00+07:00`
                    : null,
                },
                "Đã cập nhật ngày đăng."
              )
            }
            className={`w-full rounded-lg border px-2 py-1 text-xs bg-white ${
              !pubDateVal ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
            }`}
          />
          <input
            type="time"
            aria-label={`Giờ đăng ${t.code}`}
            value={pubTimeVal}
            disabled={rowBusy}
            onChange={(e) => {
              const nextTime = e.target.value;
              if (!nextTime) return;
              const targetDate = pubDateVal || todayStr;
              onPatchTaskInline(
                t.id,
                {
                  scheduledPublishAt: `${targetDate}T${nextTime}:00+07:00`,
                },
                `Đã cập nhật giờ đăng ${nextTime}.`
              );
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
            Người phụ trách (PIC)
          </label>
          <MultiAssigneePicker
            users={users}
            value={getTaskAssigneeIds(t)}
            disabled={rowBusy}
            compact
            popoverAlign="right"
            placeholder="Chưa gán"
            onChange={(nextIds) =>
              onPatchTaskInline(t.id, {
                assigneeIds: nextIds,
                assigneeId: nextIds[0] || null,
              })
            }
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenEditor(t)}
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <PenLine className="w-3 h-3" />
            {t.caption?.trim() ? "Sửa bài" : "Viết bài"}
          </button>

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
              className="rounded-lg bg-blue-600 text-white px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
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
              className="rounded-lg bg-emerald-600 text-white px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Duyệt
            </button>
          )}

          <button
            type="button"
            onClick={() => onRequestMediaOrder(t)}
            className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
            Order Media
          </button>
        </div>

        {deletable && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onRequestDeleteSingle(t.id)}
            title={`Xóa "${t.title}"`}
            className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
