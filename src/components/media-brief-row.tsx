"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Link2,
  Send,
  Trash2,
} from "lucide-react";
import { TASK_STATUS_META, isTaskOverdue } from "@/lib/constants";
import { formatVnDateTime } from "@/lib/dates";
import { normalizeMediaBriefItems } from "@/lib/media-brief";
import { canUserDeleteTask } from "@/lib/task-delete";
import type { TaskItem } from "@/types/crm";
import type { TaskStatus, UserRole } from "@/generated/prisma/client";

export function toVnDateTimeInputValue(input?: string | Date | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(d).replace(" ", "T");
}

export function formatVnShortDate(input: string | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

interface MediaBriefRowProps {
  task: TaskItem;
  index: number;
  isImageTab: boolean;
  isOutsideTab?: boolean;
  qtyColumnLabel: string;
  unitLabel: string;
  showProjectColumn: boolean;
  deleteMode: boolean;
  isSelectedForDelete: boolean;
  busy: boolean;
  deleting: boolean;
  currentUserId: string;
  currentUserRole: UserRole;
  allStatuses: TaskStatus[];
  memberEditableStatuses: Set<TaskStatus>;
  onSelectTask: (taskId: string) => void;
  onPatchTask: (
    taskId: string,
    payload: Record<string, unknown>,
    successMsg?: string
  ) => Promise<void>;
  onToggleSelectDelete: (taskId: string) => void;
  onRequestDeleteSingle: (taskId: string) => void;
}

export function MediaBriefRow({
  task: t,
  index,
  isImageTab,
  isOutsideTab = false,
  qtyColumnLabel,
  unitLabel,
  showProjectColumn,
  deleteMode,
  isSelectedForDelete,
  busy,
  deleting,
  currentUserId,
  currentUserRole,
  allStatuses,
  memberEditableStatuses,
  onSelectTask,
  onPatchTask,
  onToggleSelectDelete,
  onRequestDeleteSingle,
}: MediaBriefRowProps) {
  const stMeta = TASK_STATUS_META[t.status] ?? TASK_STATUS_META.DRAFT;
  const overdue = isTaskOverdue(t);
  const deletable = canUserDeleteTask(t, currentUserId, currentUserRole);
  const briefAsset = t.assets.find((a) => a.kind === "BRIEF_REF");
  const outputAsset =
    t.assets.find((a) => a.kind === "FINAL") ||
    t.assets.find((a) => a.kind === "DEMO");
  const briefItems = normalizeMediaBriefItems(t.mediaBriefItemsJson);
  const isVideoRow = t.taskType === "MEDIA_VIDEO";
  const rowUnitLabel = isOutsideTab
    ? isVideoRow
      ? "video"
      : t.taskType === "MEDIA_IMAGE"
        ? "ảnh"
        : "sp"
    : unitLabel;

  return (
    <tr
      className={`hover:bg-slate-50/80 transition ${
        isSelectedForDelete
          ? "bg-rose-50/70"
          : overdue
            ? "bg-rose-50/35"
            : ""
      }`}
    >
      {deleteMode && (
        <td className="py-3 px-2.5 text-center whitespace-nowrap bg-rose-50/40">
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
            <span className="text-[10px] text-slate-300">—</span>
          )}
        </td>
      )}

      {/* 1. STT */}
      <td className="py-3 px-3 text-center font-bold text-slate-500">
        {index + 1}
      </td>

      {/* (Optional) Dự án */}
      {showProjectColumn && (
        <td className="py-3 px-3 whitespace-nowrap">
          <Link
            href={`/projects/${t.project.slug}?tab=MEDIA_BRIEF`}
            className="inline-flex items-center gap-1.5 font-bold text-slate-800 hover:text-blue-700"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: t.project.color }}
            />
            {t.project.name}
          </Link>
        </td>
      )}

      {/* 2. Ngày order */}
      <td
        className="py-3 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap"
        title={formatVnDateTime(t.createdAt)}
      >
        {formatVnShortDate(t.createdAt)}
      </td>

      {/* 3. Tình trạng */}
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <select
            value={t.status}
            disabled={busy}
            onChange={(e) =>
              onPatchTask(
                t.id,
                { status: e.target.value },
                `Đã cập nhật tình trạng ${t.code}.`
              )
            }
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${stMeta.colorClass}`}
          >
            {allStatuses.map((st) => {
              const disabledOpt =
                currentUserRole !== "LEADER" &&
                !memberEditableStatuses.has(st) &&
                st !== t.status;
              return (
                <option key={st} value={st} disabled={disabledOpt}>
                  {TASK_STATUS_META[st].shortLabel}
                </option>
              );
            })}
          </select>
          {currentUserRole === "LEADER" && t.status === "BRIEF_REVIEW" && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onPatchTask(
                  t.id,
                  { action: "APPROVE_BRIEF" },
                  `Đã duyệt Brief ${t.code}.`
                )
              }
              title="Duyệt Brief ngay"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white p-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>

      {/* 4. Deadline */}
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="space-y-1">
          <input
            key={`${t.id}-due-${t.dueAt || ""}`}
            type="datetime-local"
            defaultValue={toVnDateTimeInputValue(t.dueAt)}
            disabled={busy}
            onBlur={(e) => {
              const nextVal = e.target.value;
              const prevVal = toVnDateTimeInputValue(t.dueAt);
              if (nextVal !== prevVal) {
                onPatchTask(
                  t.id,
                  {
                    dueAt: nextVal ? new Date(nextVal).toISOString() : null,
                  },
                  `Đã cập nhật Deadline ${t.code}.`
                );
              }
            }}
            className={`rounded-lg border px-2 py-1 text-xs font-semibold bg-white ${
              overdue
                ? "border-rose-300 text-rose-700"
                : "border-slate-200 text-slate-700"
            }`}
          />
          {(overdue || t.isRushOrder) && (
            <div className="flex items-center gap-1 text-[10px] font-bold">
              {overdue && (
                <span className="inline-flex items-center gap-0.5 text-rose-600">
                  <AlertTriangle className="w-3 h-3" />
                  Trễ hạn
                </span>
              )}
              {t.isRushOrder && (
                <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.5">
                  Gấp
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      {/* 5. Số lượng ảnh / Số lượng video */}
      <td className="py-3 px-3 text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <input
            key={`${t.id}-qty-${t.quantity}`}
            type="number"
            min={1}
            max={99}
            defaultValue={t.quantity || 1}
            disabled={busy}
            onBlur={(e) => {
              const nextQty = Math.max(1, Number(e.target.value || 1));
              if (nextQty !== (t.quantity || 1)) {
                onPatchTask(
                  t.id,
                  { quantity: nextQty },
                  `Đã cập nhật ${qtyColumnLabel.toLowerCase()} ${t.code}.`
                );
              }
            }}
            className={`w-14 rounded-lg border px-1.5 py-1 text-xs text-center font-extrabold bg-white ${
              isOutsideTab
                ? "border-amber-200 text-amber-800"
                : isImageTab
                  ? "border-blue-200 text-blue-700"
                  : "border-violet-200 text-violet-700"
            }`}
          />
          <span className="text-[11px] font-semibold text-slate-500">
            {rowUnitLabel}
          </span>
        </div>
      </td>

      {/* 6. Tiêu đề (+ PIC, Fanpage & Chi tiết từng ảnh/video) */}
      <td className="py-3 px-3 max-w-md">
        <button
          type="button"
          onClick={() => onSelectTask(t.id)}
          className="text-left font-bold text-slate-900 hover:text-blue-700 line-clamp-2 cursor-pointer"
        >
          {t.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-mono font-semibold text-slate-400">{t.code}</span>
          {t.isOutsideDepartment && (
            <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-extrabold text-amber-900">
              Ngoài team
            </span>
          )}
          {t.publishChannel && (
            <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-semibold text-blue-800">
              {t.publishChannel}
            </span>
          )}
          {t.assignee && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
              PIC: {t.assignee.name}
            </span>
          )}
          {briefItems.map((it, itemIdx) => (
            <span
              key={it.id}
              className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-medium text-slate-700"
            >
              {isVideoRow ? `Video ${itemIdx + 1}` : `Ảnh ${itemIdx + 1}`}: {it.ratio}
            </span>
          ))}
          {briefAsset && (
            <a
              href={briefAsset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-semibold text-amber-800 hover:underline"
            >
              <Link2 className="w-3 h-3" />
              Brief
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {outputAsset && (
            <a
              href={outputAsset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-semibold text-emerald-800 hover:underline"
            >
              <Send className="w-3 h-3" />
              {outputAsset.kind === "FINAL" ? "Final" : "Demo"}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </td>

      {/* 7. Chi tiết */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectTask(t.id)}
            className="rounded-lg border border-slate-200 bg-white hover:bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Mở Brief
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
