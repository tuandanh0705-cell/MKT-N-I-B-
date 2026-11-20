"use client";

import { Film, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import {
  IMAGE_RATIO_OPTIONS,
  VIDEO_RATIO_OPTIONS,
  createEmptyMediaBriefItem,
  type MediaBriefItem,
} from "@/lib/media-brief";

interface MediaBriefItemsEditorProps {
  items: MediaBriefItem[];
  onChange: (next: MediaBriefItem[]) => void;
  isVideo: boolean;
  compact?: boolean;
}

export function MediaBriefItemsEditor({
  items,
  onChange,
  isVideo,
  compact = false,
}: MediaBriefItemsEditorProps) {
  const ratioPresets = isVideo ? VIDEO_RATIO_OPTIONS : IMAGE_RATIO_OPTIONS;
  const itemLabel = isVideo ? "Video" : "Ảnh";
  const unitLabel = isVideo ? "video" : "ảnh";

  function updateItem(id: string, patch: Partial<MediaBriefItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addItem() {
    onChange([...items, createEmptyMediaBriefItem(isVideo)]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800">
            Thông tin brief chi tiết cho từng {unitLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isVideo
                ? "bg-violet-50 text-violet-700 border border-violet-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            Tổng: {items.length} {unitLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={addItem}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer ${
            isVideo
              ? "bg-violet-600 hover:bg-violet-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm {unitLabel}
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const isPreset = (ratioPresets as readonly string[]).includes(
            item.ratio
          );
          const selectVal = isPreset ? item.ratio : "Khác";

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 space-y-2.5 ${
                isVideo
                  ? "border-violet-200/80 bg-violet-50/25"
                  : "border-blue-200/80 bg-blue-50/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                    isVideo ? "text-violet-900" : "text-blue-900"
                  }`}
                >
                  {isVideo ? (
                    <Film className="w-3.5 h-3.5 text-violet-600" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {itemLabel} {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title={`Xóa ${itemLabel} ${idx + 1}`}
                    className="rounded-md p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div
                className={`grid grid-cols-1 gap-2.5 text-xs ${
                  compact ? "sm:grid-cols-2" : "md:grid-cols-3"
                }`}
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isVideo ? "Tỷ lệ / Định dạng video" : "Tỷ lệ ảnh"}
                  </label>
                  <select
                    value={selectVal}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(item.id, {
                        ratio: v === "Khác" ? "" : v,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    {ratioPresets.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {!isPreset && (
                    <input
                      type="text"
                      value={item.ratio}
                      onChange={(e) =>
                        updateItem(item.id, { ratio: e.target.value })
                      }
                      placeholder={
                        isVideo
                          ? "VD: 9:16 • 30s, hoặc 16:9 • 2p..."
                          : "VD: 1200×628, Cover..."
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mẫu tham khảo
                  </label>
                  <input
                    type="text"
                    value={item.sampleUrl}
                    onChange={(e) =>
                      updateItem(item.id, { sampleUrl: e.target.value })
                    }
                    placeholder={
                      isVideo
                        ? "Link TikTok / Drive / video mẫu..."
                        : "Link Canva / Pinterest / ảnh mẫu..."
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {!compact && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ghi chú thêm
                    </label>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) =>
                        updateItem(item.id, { note: e.target.value })
                      }
                      placeholder="Font, màu sắc, safe-zone..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung chi tiết
                </label>
                <textarea
                  rows={2}
                  value={item.content}
                  onChange={(e) =>
                    updateItem(item.id, { content: e.target.value })
                  }
                  placeholder={
                    isVideo
                      ? "Hook 3s đầu, kịch bản từng cảnh, lời thoại/text overlay, CTA..."
                      : "Text trên ảnh (Headline, Subtext), bố cục, sản phẩm chính, CTA..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {compact && (
                <div className="text-xs">
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) =>
                      updateItem(item.id, { note: e.target.value })
                    }
                    placeholder="Ghi chú thêm (font, màu sắc, lưu ý safe-zone...)"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 text-[11.5px] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
