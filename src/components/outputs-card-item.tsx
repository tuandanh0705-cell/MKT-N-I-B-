"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { TaskAssigneesBadges } from "@/components/task-assignees-badges";
import { TaskStatusBadge } from "@/components/status-badge";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import { formatVnDateTime } from "@/lib/dates";
import {
  VIDEO_ORDER_KIND_META,
  countFilledScriptRows,
  getItemVideoOrderKind,
} from "@/lib/media-brief";
import {
  OUTPUT_CATEGORY_META,
  analyzeTaskOutputs,
  getAssetDomainLabel,
} from "@/lib/output-helpers";
import type { GeminiQcCheckResponse } from "@/lib/gemini-shared";
import type { TaskItem } from "@/types/crm";

function CardThumbnail({
  src,
  alt,
  label,
  onClick,
}: {
  src: string;
  alt: string;
  label: string;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-24 w-28 sm:w-32 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 cursor-pointer hover:border-amber-400 transition"
      title={`Xem to: ${label}`}
    >
      {failed ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-50">
          <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[10px] font-bold text-slate-600 line-clamp-2">
            {label}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          onError={() => setFailed(true)}
          className="object-cover group-hover:scale-105 transition-transform"
        />
      )}
      <span className="absolute bottom-1 left-1 right-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white truncate">
        {label}
      </span>
    </button>
  );
}

interface OutputsCardItemProps {
  task: TaskItem;
  isLeader: boolean;
  isExpanded: boolean;
  copied: boolean;
  aiChecking: boolean;
  quickApproving: boolean;
  savedAiResult: GeminiQcCheckResponse | null;
  onToggleExpand: () => void;
  onCopyCaption: () => void;
  onInspect: () => void;
  onRunAiCheck: () => void;
  onOpenDrawer: () => void;
  onQuickApprove: () => void;
}

export function OutputsCardItem({
  task: t,
  isLeader,
  isExpanded,
  copied,
  aiChecking,
  quickApproving,
  savedAiResult,
  onToggleExpand,
  onCopyCaption,
  onInspect,
  onRunAiCheck,
  onOpenDrawer,
  onQuickApprove,
}: OutputsCardItemProps) {
  const a = analyzeTaskOutputs(t);
  const catMeta = OUTPUT_CATEGORY_META[a.category];
  const captionText = (t.caption || "").trim();
  const latestComment = t.comments?.[0];

  return (
    <div
      className={`rounded-2xl border-2 ${catMeta.accentBorder} bg-white p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3.5`}
    >
      <div className="space-y-3">
        {/* Top Row: Member, Project, Saved AI Score, Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <TaskAssigneesBadges
              task={t}
              size="sm"
              emptyLabel="Chưa phân công"
            />
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.project.color }}
              />
              {t.project.name}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {savedAiResult && (
              <button
                type="button"
                onClick={onInspect}
                title="Xem chi tiết kết quả Gemini AI Check đã lưu"
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-extrabold cursor-pointer ${
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
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600">
              {t.code}
            </span>
            <TaskStatusBadge status={t.status} />
          </div>
        </div>

        {/* Title + Metadata */}
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
            {t.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold ${catMeta.badgeClass}`}
            >
              {catMeta.label} • {t.quantity} {a.unitLabel}
            </span>

            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700">
              <PlatformLogo platform={t.platform} size="xs" />
              <span>{t.publishChannel || t.platform}</span>
            </span>

            {t.contentAngle && (
              <span className="rounded-md bg-sky-50 px-2 py-0.5 font-bold text-sky-700">
                {t.contentAngle}
              </span>
            )}

            {t.wasLate && (
              <span className="rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700">
                Trễ deadline
              </span>
            )}

            <span className="text-slate-400">
              {formatVnDateTime(t.submittedAt ?? t.completedAt ?? t.createdAt)}
            </span>
          </div>
        </div>

        {/* Content Output Block */}
        {(a.hasCaption || a.category === "CONTENT") && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-sky-800">
                <FileText className="w-3.5 h-3.5" />
                Nội dung Content
              </span>
              {a.hasCaption && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {captionText.length} ký tự
                  </span>
                  <button
                    type="button"
                    onClick={onCopyCaption}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
              )}
            </div>

            {a.hasCaption ? (
              <div>
                <div
                  className={`text-xs sm:text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed ${
                    isExpanded ? "" : "line-clamp-4"
                  }`}
                >
                  {captionText}
                </div>
                {captionText.length > 180 && (
                  <button
                    type="button"
                    onClick={onToggleExpand}
                    className="mt-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isExpanded ? "Thu gọn" : "Đọc toàn bộ caption"}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs italic text-amber-700">
                Chưa có caption bài viết
                {a.hasDescription
                  ? ` — Brief: ${t.description?.slice(0, 120)}...`
                  : "."}
              </div>
            )}
          </div>
        )}

        {/* Visual Previews & Deliverables */}
        {(a.imagePreviews.length > 0 ||
          a.deliverableAssets.length > 0 ||
          a.mediaBriefItems.length > 0 ||
          Boolean(t.productLink)) && (
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-amber-900">
                {a.category === "VIDEO" ? (
                  <Film className="w-3.5 h-3.5" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                Ấn phẩm &amp; Link sản phẩm ({a.deliverableAssets.length})
              </span>
              {a.mediaBriefItems.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-800">
                  Brief: {a.mediaBriefItems.length}{" "}
                  {a.category === "VIDEO" ? "video" : "ảnh"}
                </span>
              )}
            </div>

            {a.imagePreviews.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {a.imagePreviews.slice(0, 4).map((p) => (
                  <CardThumbnail
                    key={p.asset.id}
                    src={p.previewUrl}
                    alt={p.asset.label}
                    label={p.asset.label}
                    onClick={onInspect}
                  />
                ))}
                {a.imagePreviews.length > 4 && (
                  <button
                    type="button"
                    onClick={onInspect}
                    className="h-24 w-20 rounded-xl border border-amber-300 bg-amber-100/70 text-amber-900 text-xs font-extrabold shrink-0 cursor-pointer"
                  >
                    +{a.imagePreviews.length - 4} ảnh
                  </button>
                )}
              </div>
            )}

            {a.deliverableAssets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {a.deliverableAssets.map((asset) =>
                  /^data:image\//i.test(asset.url) ? (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={onInspect}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-amber-300 px-2.5 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      <span className="text-amber-700">
                        {ASSET_KIND_LABEL[asset.kind] || asset.kind}
                      </span>
                      <span className="truncate max-w-[140px]">
                        {asset.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (Ảnh tải lên)
                      </span>
                    </button>
                  ) : (
                    <a
                      key={asset.id}
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 px-2.5 py-1 text-[11px] font-bold text-slate-700"
                    >
                      <span className="text-blue-600">
                        {ASSET_KIND_LABEL[asset.kind] || asset.kind}
                      </span>
                      <span className="truncate max-w-[140px]">
                        {asset.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({getAssetDomainLabel(asset.url)})
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )
                )}
              </div>
            )}

            {a.mediaBriefItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {a.mediaBriefItems.slice(0, 3).map((item, idx) => {
                  const vidKind =
                    a.category === "VIDEO" ? getItemVideoOrderKind(item) : null;
                  const filledRows =
                    a.category === "VIDEO" ? countFilledScriptRows(item) : 0;
                  return (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                        vidKind
                          ? VIDEO_ORDER_KIND_META[vidKind].badgeClass
                          : "border-amber-200 bg-white text-slate-700"
                      }`}
                    >
                      <strong className={vidKind ? "" : "text-amber-900"}>
                        {a.category === "VIDEO" ? "Video" : "Ảnh"} {idx + 1}
                      </strong>
                      {vidKind ? (
                        <span>
                          {VIDEO_ORDER_KIND_META[vidKind].badgeEmoji}{" "}
                          {VIDEO_ORDER_KIND_META[vidKind].shortLabel}
                          {filledRows > 0
                            ? ` (${filledRows} ${
                                vidKind === "SHOOT_AND_EDIT" ? "cảnh" : "scene"
                              })`
                            : ""}
                        </span>
                      ) : (
                        <>
                          <span>({item.ratio})</span>
                          {item.content && (
                            <span className="truncate max-w-[140px] text-slate-500">
                              — {item.content}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {t.productLink && (
              <div>
                <a
                  href={t.productLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  <Link2 className="w-3 h-3" />
                  Link bài viết / sản phẩm đã gắn
                </a>
              </div>
            )}
          </div>
        )}

        {!a.hasSubmittedOutput &&
          a.category !== "CONTENT" &&
          a.mediaBriefItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              {a.hasDescription
                ? `Mô tả: ${t.description}`
                : "Nhân sự chưa gắn link sản phẩm hoặc nội dung output cho đầu việc này."}
            </div>
          )}

        {latestComment && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="line-clamp-2">
              <strong className="text-slate-800">
                {latestComment.author.name}:
              </strong>{" "}
              {latestComment.content}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onInspect}
            className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Check &amp; Preview Output
          </button>
          <button
            type="button"
            disabled={aiChecking}
            onClick={onRunAiCheck}
            className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-800 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Wand2 className={`w-3.5 h-3.5 ${aiChecking ? "animate-spin" : ""}`} />
            {aiChecking
              ? "Gemini đang soi..."
              : savedAiResult
                ? `AI Check lại (${savedAiResult.result.score}đ)`
                : "AI Check"}
          </button>
          <button
            type="button"
            onClick={onOpenDrawer}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Mở Task
          </button>
        </div>

        {isLeader &&
          (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") && (
            <button
              type="button"
              disabled={quickApproving}
              onClick={onQuickApprove}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {quickApproving
                ? "Đang duyệt..."
                : t.status === "BRIEF_REVIEW"
                  ? "Duyệt Brief"
                  : "Duyệt Final"}
            </button>
          )}
      </div>
    </div>
  );
}
