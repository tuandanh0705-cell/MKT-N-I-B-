"use client";

import {
  CheckCircle2,
  ExternalLink,
  Eye,
  Film,
  Image as ImageIcon,
  Link2,
  Sparkles,
} from "lucide-react";
import { TASK_STATUS_META } from "@/lib/constants";
import { formatVnDateTime } from "@/lib/dates";
import {
  VIDEO_ORDER_KIND_META,
  getTaskPrimaryVideoKind,
} from "@/lib/media-brief";
import { analyzeTaskOutputs, getAssetDomainLabel } from "@/lib/output-helpers";
import type { TaskItem } from "@/types/crm";

interface OutputsCompactCardProps {
  task: TaskItem;
  onInspect: () => void;
  onOpenDrawer: () => void;
}

export function OutputsCompactCard({
  task: t,
  onInspect,
  onOpenDrawer,
}: OutputsCompactCardProps) {
  const a = analyzeTaskOutputs(t);
  const statusMeta = TASK_STATUS_META[t.status];
  const primaryVideoKind =
    t.taskType === "MEDIA_VIDEO"
      ? getTaskPrimaryVideoKind(t.mediaBriefItemsJson)
      : null;

  const deliverables = a.deliverableAssets;
  const primaryAsset = deliverables[deliverables.length - 1] ?? null;
  const extraAssetCount = Math.max(0, deliverables.length - 1);
  const finishedAt = t.completedAt ?? t.approvedAt ?? t.submittedAt ?? t.createdAt;

  return (
    <div className="rounded-2xl border border-amber-200/90 bg-white hover:border-amber-400 hover:shadow-sm transition p-3.5 flex flex-col justify-between gap-2.5 h-full">
      <div className="space-y-2">
        {/* Hàng 1: Dự án + Mã + Trạng thái gọn */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: t.project.color }}
            />
            <span className="text-[11px] font-bold text-slate-600 truncate">
              {t.project.name}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
              {t.code}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold shrink-0 ${statusMeta.colorClass}`}
          >
            <CheckCircle2 className="w-2.5 h-2.5" />
            {statusMeta.shortLabel}
          </span>
        </div>

        {/* Hàng 2: Tiêu đề (tối đa 2 dòng) */}
        <button
          type="button"
          onClick={onInspect}
          title={t.title}
          className="text-left text-[13px] font-extrabold text-slate-900 hover:text-amber-700 leading-snug line-clamp-2 transition cursor-pointer w-full"
        >
          {t.title}
        </button>

        {/* Hàng 3: Số lượng + Loại video + Ngày hoàn thành */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${
              a.category === "VIDEO"
                ? "bg-violet-50 border-violet-200 text-violet-800"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {a.category === "VIDEO" ? (
              <Film className="w-3 h-3" />
            ) : (
              <ImageIcon className="w-3 h-3" />
            )}
            {Math.max(1, t.quantity || 1)} {a.unitLabel}
          </span>

          {primaryVideoKind && (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${VIDEO_ORDER_KIND_META[primaryVideoKind].badgeClass}`}
            >
              {VIDEO_ORDER_KIND_META[primaryVideoKind].badgeEmoji}{" "}
              {VIDEO_ORDER_KIND_META[primaryVideoKind].shortLabel}
            </span>
          )}

          {t.wasLate && (
            <span className="rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              Trễ
            </span>
          )}

          <span className="text-[10px] font-medium text-slate-400 ml-auto">
            {formatVnDateTime(finishedAt)}
          </span>
        </div>

        {/* Hàng 4: Link thành phẩm gọn 1 dòng */}
        {primaryAsset ? (
          <a
            href={primaryAsset.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${primaryAsset.label} (${getAssetDomainLabel(primaryAsset.url)})`}
            className="flex items-center justify-between gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-950 transition"
          >
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Link2 className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">{primaryAsset.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-amber-700">
              {extraAssetCount > 0 && <span>+{extraAssetCount}</span>}
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-[11px] text-slate-400 truncate">
            Chưa gắn link file thành phẩm
          </div>
        )}
      </div>

      {/* Hàng 5: 2 nút thao tác gọn */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onInspect}
          className="flex-1 rounded-xl bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          Xem Output
        </button>
        <button
          type="button"
          onClick={onOpenDrawer}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          Chi tiết
        </button>
      </div>
    </div>
  );
}
