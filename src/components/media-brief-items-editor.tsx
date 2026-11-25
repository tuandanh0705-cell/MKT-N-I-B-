"use client";

import { Film, Image as ImageIcon, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { FB_POST_LAYOUTS, FB_POST_LAYOUT_GROUPS } from "@/lib/constants";
import {
  IMAGE_RATIO_OPTIONS,
  VIDEO_ORDER_KIND_META,
  VIDEO_RATIO_OPTIONS,
  createDefaultEditScript,
  createDefaultShootScript,
  createEmptyMediaBriefItem,
  getItemVideoOrderKind,
  type MediaBriefItem,
  type VideoOrderKind,
} from "@/lib/media-brief";
import { VideoScriptBriefEditor } from "@/components/video-script-brief-editor";

interface MediaBriefItemsEditorProps {
  items: MediaBriefItem[];
  onChange: (next: MediaBriefItem[]) => void;
  isVideo: boolean;
  defaultVideoKind?: VideoOrderKind;
  showItemVideoKindSwitcher?: boolean;
  compact?: boolean;
}

export function MediaBriefItemsEditor({
  items,
  onChange,
  isVideo,
  defaultVideoKind = "SHOOT_AND_EDIT",
  showItemVideoKindSwitcher = true,
  compact = false,
}: MediaBriefItemsEditorProps) {
  const ratioPresets = isVideo ? VIDEO_RATIO_OPTIONS : IMAGE_RATIO_OPTIONS;
  const itemLabel = isVideo ? "Video" : "Ảnh";
  const unitLabel = isVideo ? "video" : "ảnh";

  function updateItem(id: string, patch: Partial<MediaBriefItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addItem() {
    onChange([
      ...items,
      createEmptyMediaBriefItem(
        isVideo,
        undefined,
        undefined,
        isVideo ? defaultVideoKind : undefined
      ),
    ]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    onChange(items.filter((it) => it.id !== id));
  }

  function applyFacebookLayoutTemplate(layoutKey: string) {
    const spec = FB_POST_LAYOUTS[layoutKey];
    if (!spec) return;
    const generated: MediaBriefItem[] = spec.slotSpecs.map((slot, idx) => {
      const existing = items[idx];
      return {
        id: existing?.id || createEmptyMediaBriefItem(false).id,
        ratio: `${slot.size} (${slot.label})`,
        content: existing?.content || "",
        sampleUrl: existing?.sampleUrl || "",
        note: existing?.note || `${spec.label} — ${slot.label}`,
      };
    });
    onChange(generated);
  }

  function handleChangeItemVideoKind(item: MediaBriefItem, nextKind: VideoOrderKind) {
    updateItem(item.id, {
      videoKind: nextKind,
      shootScript:
        nextKind === "SHOOT_AND_EDIT"
          ? item.shootScript ?? createDefaultShootScript()
          : item.shootScript,
      editScript:
        nextKind === "EDIT_ONLY"
          ? item.editScript ?? createDefaultEditScript()
          : item.editScript,
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800">
            {isVideo
              ? "Kịch bản & Thông tin brief chi tiết cho từng video"
              : "Thông tin brief chi tiết cho từng ảnh"}
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

      {!isVideo && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-sky-900">
            <LayoutGrid className="w-3.5 h-3.5 text-sky-600" />
            Tạo nhanh đủ slot &amp; kích thước chuẩn Facebook:
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                applyFacebookLayoutTemplate(e.target.value);
                e.target.value = "";
              }
            }}
            className="rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer max-w-full"
          >
            <option value="">
              -- Chọn bố cục Facebook (tự điền px từng ảnh) --
            </option>
            {FB_POST_LAYOUT_GROUPS.map((grp) => (
              <optgroup key={grp} label={grp}>
                {Object.entries(FB_POST_LAYOUTS)
                  .filter(([, meta]) => meta.group === grp)
                  .map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isPreset = (ratioPresets as readonly string[]).includes(
            item.ratio
          );
          const selectVal = isPreset ? item.ratio : "Khác";
          const itemVideoKind: VideoOrderKind =
            getItemVideoOrderKind(item) || defaultVideoKind;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 space-y-2.5 ${
                isVideo
                  ? itemVideoKind === "SHOOT_AND_EDIT"
                    ? "border-emerald-200/90 bg-emerald-50/25"
                    : "border-violet-200/90 bg-violet-50/25"
                  : "border-blue-200/80 bg-blue-50/25"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                      isVideo ? "text-slate-900" : "text-blue-900"
                    }`}
                  >
                    {isVideo ? (
                      <Film className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    {itemLabel} {idx + 1}
                  </span>
                  {isVideo &&
                    (showItemVideoKindSwitcher ? (
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                        {(["SHOOT_AND_EDIT", "EDIT_ONLY"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleChangeItemVideoKind(item, k)}
                            className={`rounded-md px-2 py-0.5 transition cursor-pointer ${
                              itemVideoKind === k
                                ? k === "SHOOT_AND_EDIT"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-violet-600 text-white"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {VIDEO_ORDER_KIND_META[k].label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${VIDEO_ORDER_KIND_META[itemVideoKind].badgeClass}`}
                      >
                        {VIDEO_ORDER_KIND_META[itemVideoKind].label}
                      </span>
                    ))}
                </div>

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
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {isVideo ? (
                <div className="space-y-2">
                  <VideoScriptBriefEditor
                    videoIndex={idx}
                    videoKind={itemVideoKind}
                    shootScript={item.shootScript}
                    editScript={item.editScript}
                    onChangeVideoKind={(nextKind) =>
                      handleChangeItemVideoKind(item, nextKind)
                    }
                    onChangeShootScript={(nextShoot) =>
                      updateItem(item.id, {
                        videoKind: "SHOOT_AND_EDIT",
                        shootScript: nextShoot,
                      })
                    }
                    onChangeEditScript={(nextEdit) =>
                      updateItem(item.id, {
                        videoKind: "EDIT_ONLY",
                        editScript: nextEdit,
                      })
                    }
                    showKindSwitcher={false}
                    compact={compact}
                  />

                  {item.content.trim() && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-900">
                          📝 Ghi chú nội dung cũ / tóm tắt nhanh:
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, { content: "" })}
                          className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                        >
                          Xóa tóm tắt này
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.content}
                        onChange={(e) =>
                          updateItem(item.id, { content: e.target.value })
                        }
                        className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  )}
                </div>
              ) : (
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {compact && (
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ghi chú thêm
                  </label>
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) =>
                      updateItem(item.id, { note: e.target.value })
                    }
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
