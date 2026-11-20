"use client";

import { Bot, Camera, Check, ExternalLink, PenLine, Send, Trash2 } from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import {
  CONTENT_PLATFORM_OPTIONS,
  CONTENT_ROUTE_OPTIONS,
  POST_FORMAT_OPTIONS,
  deriveDefaultFormat,
  getContentRouteMeta,
  getContentStatusDisplay,
  getPostFormatMeta,
} from "@/lib/content-plan";
import { getVnDateString } from "@/lib/dates";
import {
  getPlatformChannelMeta,
  getSuggestionsForPlatform,
  normalizePlatformSelectValue,
} from "@/lib/platform-meta";
import type { GeminiQcCheckResponse } from "@/lib/gemini-shared";
import type { ProjectChannelSuggestions, SimpleUser, TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ContentCalendarRowProps {
  task: TaskItem;
  projectSlug: string;
  users: SimpleUser[];
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
  onOpenEditor: (task: TaskItem) => void;
  onInspectAiScore: (taskId: string) => void;
  onRequestMediaOrder: (task: TaskItem) => void;
  onRequireCaptionBeforeSubmit: (task: TaskItem) => void;
}

export function ContentCalendarRow({
  task: t,
  projectSlug,
  users,
  channelSuggestions,
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
  onOpenEditor,
  onInspectAiScore,
  onRequestMediaOrder,
  onRequireCaptionBeforeSubmit,
}: ContentCalendarRowProps) {
  const pubDateVal = t.scheduledPublishAt
    ? getVnDateString(new Date(t.scheduledPublishAt))
    : "";
  const mediaDueVal = t.mediaDueAt ? getVnDateString(new Date(t.mediaDueAt)) : "";
  const contentDueVal = t.dueAt ? getVnDateString(new Date(t.dueAt)) : "";
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

  const chMeta = getPlatformChannelMeta(t.platform);
  const chOptions = getSuggestionsForPlatform(t.platform, channelSuggestions);
  const listId = `ch-opt-${t.id}`;

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
              title="Chỉ Leader hoặc tác giả bản Nháp mới xóa được"
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
      <td className="py-2.5 px-2">
        <select
          value={t.contentAngle || ""}
          disabled={rowBusy}
          onChange={(e) =>
            onPatchTaskInline(
              t.id,
              { contentAngle: e.target.value || null },
              "Đã đổi tuyến nội dung."
            )
          }
          className={`rounded-full border px-2 py-1 text-[11px] font-bold cursor-pointer ${routeMeta.badgeClass}`}
        >
          <option value="">-- Tuyến --</option>
          {CONTENT_ROUTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

      {/* 4. Nền tảng & Kênh/Page/Web */}
      <td className="py-2.5 px-2 min-w-[135px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={t.platform} size="xs" />
            <select
              value={normalizePlatformSelectValue(t.platform)}
              disabled={rowBusy}
              onChange={(e) =>
                onPatchTaskInline(t.id, { platform: e.target.value })
              }
              className="rounded-lg border border-blue-200 bg-blue-50/70 text-blue-800 px-1.5 py-1 text-[11px] font-bold"
            >
              {CONTENT_PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <input
            key={`${t.id}-${t.publishChannel || ""}`}
            type="text"
            list={chOptions.length > 0 ? listId : undefined}
            defaultValue={t.publishChannel || ""}
            disabled={rowBusy}
            placeholder={`+ ${chMeta.channelShortLabel}`}
            onBlur={(e) => {
              const next = e.target.value.trim();
              const prev = (t.publishChannel || "").trim();
              if (next !== prev) {
                onPatchTaskInline(
                  t.id,
                  { publishChannel: next || null },
                  `Đã cập nhật ${chMeta.channelShortLabel}.`
                );
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
          {chOptions.length > 0 && (
            <datalist id={listId}>
              {chOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
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
      <td className="py-2.5 px-2">
        <select
          value={formatVal}
          disabled={rowBusy}
          onChange={(e) =>
            onPatchTaskInline(t.id, { postFormat: e.target.value })
          }
          className={`rounded-full border px-2 py-1 text-[11px] font-bold cursor-pointer ${formatMeta.badgeClass}`}
        >
          {POST_FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
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

      {/* 9. Link SP */}
      <td className="py-2.5 px-2 max-w-[100px] whitespace-nowrap">
        {t.productLink ? (
          <a
            href={t.productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
          >
            Mở link
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : t.assets[0] ? (
          <a
            href={t.assets[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Ảnh/File
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onOpenEditor(t)}
            className="text-[11px] text-slate-400 hover:text-blue-600 cursor-pointer"
          >
            + Gắn link
          </button>
        )}
      </td>

      {/* 10. PIC */}
      <td className="py-2.5 px-2">
        <select
          value={t.assignee?.id || ""}
          disabled={rowBusy}
          onChange={(e) =>
            onPatchTaskInline(t.id, {
              assigneeId: e.target.value || null,
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold max-w-[115px]"
        >
          <option value="">Chưa gán</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
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
