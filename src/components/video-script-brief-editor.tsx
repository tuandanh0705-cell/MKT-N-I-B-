"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  ExternalLink,
  Maximize2,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  SHOOT_SECTION_META,
  VIDEO_ORDER_KIND_META,
  createDefaultEditScript,
  createDefaultShootScript,
  createEmptyEditSceneRow,
  createEmptyShootScriptRow,
  createSampleShootScript,
  type EditScriptBrief,
  type EditScriptSceneRow,
  type ShootScriptBrief,
  type ShootScriptRow,
  type VideoOrderKind,
  type VideoScriptSection,
} from "@/lib/media-brief";

interface VideoScriptBriefEditorProps {
  videoIndex: number;
  videoKind: VideoOrderKind;
  shootScript?: ShootScriptBrief;
  editScript?: EditScriptBrief;
  onChangeVideoKind?: (kind: VideoOrderKind) => void;
  onChangeShootScript: (next: ShootScriptBrief) => void;
  onChangeEditScript: (next: EditScriptBrief) => void;
  showKindSwitcher?: boolean;
  compact?: boolean;
}

const SECTION_OPTIONS: VideoScriptSection[] = ["HOOK", "BODY", "CTA"];

const SECTION_RANK: Record<VideoScriptSection, number> = {
  HOOK: 0,
  BODY: 1,
  CTA: 2,
};

function isHttpUrl(val: string): boolean {
  return /^https?:\/\/\S+/i.test(val.trim());
}

export function VideoScriptBriefEditor({
  videoIndex,
  videoKind,
  shootScript,
  editScript,
  onChangeVideoKind,
  onChangeShootScript,
  onChangeEditScript,
  showKindSwitcher = true,
  compact = false,
}: VideoScriptBriefEditorProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const activeShoot: ShootScriptBrief =
    shootScript ?? createDefaultShootScript();
  const activeEdit: EditScriptBrief = editScript ?? createDefaultEditScript();

  function updateShootField<K extends keyof ShootScriptBrief>(
    field: K,
    value: ShootScriptBrief[K]
  ) {
    onChangeShootScript({ ...activeShoot, [field]: value });
  }

  function updateShootRow(rowId: string, patch: Partial<ShootScriptRow>) {
    onChangeShootScript({
      ...activeShoot,
      rows: activeShoot.rows.map((r) =>
        r.id === rowId ? { ...r, ...patch } : r
      ),
    });
  }

  function addShootRow(section: VideoScriptSection) {
    const targetRank = SECTION_RANK[section];
    let insertIdx = activeShoot.rows.length;
    for (let i = 0; i < activeShoot.rows.length; i++) {
      if (SECTION_RANK[activeShoot.rows[i].section] > targetRank) {
        insertIdx = i;
        break;
      }
    }
    const next = [...activeShoot.rows];
    next.splice(insertIdx, 0, createEmptyShootScriptRow(section));
    onChangeShootScript({
      ...activeShoot,
      rows: next,
    });
  }

  function removeShootRow(rowId: string) {
    if (activeShoot.rows.length <= 1) return;
    onChangeShootScript({
      ...activeShoot,
      rows: activeShoot.rows.filter((r) => r.id !== rowId),
    });
  }

  function moveShootRow(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= activeShoot.rows.length) return;
    const next = [...activeShoot.rows];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChangeShootScript({ ...activeShoot, rows: next });
  }

  function updateEditField<K extends keyof EditScriptBrief>(
    field: K,
    value: EditScriptBrief[K]
  ) {
    onChangeEditScript({ ...activeEdit, [field]: value });
  }

  function updateEditScene(
    sceneId: string,
    patch: Partial<EditScriptSceneRow>
  ) {
    onChangeEditScript({
      ...activeEdit,
      scenes: activeEdit.scenes.map((sc) =>
        sc.id === sceneId ? { ...sc, ...patch } : sc
      ),
    });
  }

  function addEditScene(template?: "VOICE" | "CUT") {
    const nextNum = activeEdit.scenes.length + 1;
    const row =
      template === "CUT"
        ? createEmptyEditSceneRow(nextNum, {
            voiceOrCutNote:
              "Cut các đoạn từ video: [Tên file nguồn .mp4]\nCheck đối chiếu cùng bản gốc: [Link/Tên bản gốc]\n\nNote đoạn cut:\n- Từ 0:00 (...) đến 0:30 (...)\n- Từ 0:45 (...) đến 1:15 (...)\n\nCTA cuối video: ...",
            visualRef: "Ảnh CTA + Thumbnail (Drive / Canva)",
            textOverlay: "Chèn text, bold keywords (những từ in đậm)\nLưu ý che mờ / tắt tiếng (nếu có): ...",
          })
        : createEmptyEditSceneRow(nextNum);
    onChangeEditScript({
      ...activeEdit,
      scenes: [...activeEdit.scenes, row],
    });
  }

  function removeEditScene(sceneId: string) {
    if (activeEdit.scenes.length <= 1) return;
    onChangeEditScript({
      ...activeEdit,
      scenes: activeEdit.scenes.filter((sc) => sc.id !== sceneId),
    });
  }

  function moveEditScene(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= activeEdit.scenes.length) return;
    const next = [...activeEdit.scenes];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChangeEditScript({ ...activeEdit, scenes: next });
  }

  function renderShootEditor(isFullscreen: boolean) {
    return (
      <div className="rounded-xl border border-[#8BB873] bg-white overflow-hidden shadow-2xs">
        {/* Header Xanh Lá Đậm chuẩn Ảnh 1 */}
        <div className="bg-[#2D6A1E] text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Clapperboard className="w-4 h-4 text-lime-200 shrink-0" />
            <input
              type="text"
              value={activeShoot.scriptTitle}
              onChange={(e) => updateShootField("scriptTitle", e.target.value)}
              placeholder={`KỊCH BẢN ${videoIndex + 1}: Nhập tên kịch bản quay dựng (VD: KỊCH BẢN NHÂN SỰ)...`}
              className="w-full bg-white/15 hover:bg-white/20 focus:bg-white focus:text-slate-900 placeholder:text-lime-100/80 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide outline-none transition"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangeShootScript(createSampleShootScript())}
              title="Điền nhanh bộ kịch bản mẫu 3 phần HOOK / BODY / CTA"
              className="rounded-lg bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-200" />
              Điền mẫu
            </button>
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setFullscreenOpen(true)}
                title="Mở rộng toàn màn hình để viết kịch bản 9 cột rộng rãi"
                className="rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Phóng to bảng
              </button>
            )}
          </div>
        </div>

        {/* Khối YÊU CẦU VJ (Nền xanh pastel chuẩn Ảnh 1) */}
        <div className="bg-[#D5E8CB] border-b border-[#A5CA91] px-3.5 py-2.5 space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#1C4711]">
            YÊU CẦU VJ / DIỄN VIÊN
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[10.5px] font-bold text-[#254D1A] mb-0.5">
                Giới tính / Đối tượng
              </label>
              <input
                type="text"
                value={activeShoot.vjGenderRole}
                onChange={(e) =>
                  updateShootField("vjGenderRole", e.target.value)
                }
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-[#254D1A] mb-0.5">
                Mood giọng
              </label>
              <input
                type="text"
                value={activeShoot.vjVoiceMood}
                onChange={(e) =>
                  updateShootField("vjVoiceMood", e.target.value)
                }
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-[#254D1A] mb-0.5">
                Trang phục
              </label>
              <input
                type="text"
                value={activeShoot.vjOutfit}
                onChange={(e) => updateShootField("vjOutfit", e.target.value)}
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Khối Bối cảnh & Style dựng chung */}
        <div className="bg-[#C0DFAF]/80 border-b border-[#9AC284] px-3.5 py-2.5 text-xs">
          <div>
            <label className="block text-[10.5px] font-bold text-[#1C4711] mb-0.5">
              Bối cảnh &amp; Style dựng chung
            </label>
            <input
              type="text"
              value={activeShoot.settingAndStyle}
              onChange={(e) =>
                updateShootField("settingAndStyle", e.target.value)
              }
              className="w-full rounded-lg border border-[#9AC284] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
            />
          </div>
        </div>

        {/* Bảng phân cảnh 9 cột chuẩn Ảnh 1 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[1180px]">
            <thead>
              <tr className="bg-[#EBF4E7] text-[#1E3F14] border-b border-[#B7CFA9] text-[11px] font-extrabold text-left">
                <th className="p-2 border-r border-[#C9DBC0] w-[86px] text-center">
                  Cấu trúc
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[42px] text-center">
                  STT
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[84px]">
                  Thời lượng
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[155px]">
                  Note để order dựng video
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[155px]">
                  Góc máy để order quay
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[190px]">
                  Hình ảnh / Bối cảnh
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[235px]">
                  Lời thoại VJ / Diễn viên
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[180px]">
                  Text on Screen
                </th>
                <th className="p-2 border-r border-[#C9DBC0] w-[145px]">
                  Comment
                </th>
                <th className="p-2 w-[56px] text-center">Xếp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeShoot.rows.map((row, idx) => {
                const secMeta = SHOOT_SECTION_META[row.section];
                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50/60">
                    <td
                      className={`p-1.5 border-r border-slate-200 text-center font-extrabold ${secMeta.cellBg}`}
                    >
                      <select
                        value={row.section}
                        onChange={(e) =>
                          updateShootRow(row.id, {
                            section: e.target.value as VideoScriptSection,
                          })
                        }
                        aria-label={`Cấu trúc cảnh ${idx + 1}`}
                        className="w-full rounded-md border border-black/10 bg-white/80 px-1 py-1 text-[11px] font-extrabold text-center cursor-pointer"
                      >
                        {SECTION_OPTIONS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        aria-label={`Thời lượng cảnh ${idx + 1}`}
                        value={row.duration}
                        onChange={(e) =>
                          updateShootRow(row.id, { duration: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Note để order dựng video cảnh ${idx + 1}`}
                        value={row.editNote}
                        onChange={(e) =>
                          updateShootRow(row.id, { editNote: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Góc máy để order quay cảnh ${idx + 1}`}
                        value={row.cameraAngle}
                        onChange={(e) =>
                          updateShootRow(row.id, {
                            cameraAngle: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Hình ảnh / Bối cảnh cảnh ${idx + 1}`}
                        value={row.visualContext}
                        onChange={(e) =>
                          updateShootRow(row.id, {
                            visualContext: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Lời thoại VJ / Diễn viên cảnh ${idx + 1}`}
                        value={row.dialogue}
                        onChange={(e) =>
                          updateShootRow(row.id, { dialogue: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Text on Screen cảnh ${idx + 1}`}
                        value={row.textOnScreen}
                        onChange={(e) =>
                          updateShootRow(row.id, {
                            textOnScreen: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <textarea
                        rows={isFullscreen ? 4 : 3}
                        aria-label={`Comment cảnh ${idx + 1}`}
                        value={row.comment}
                        onChange={(e) =>
                          updateShootRow(row.id, { comment: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveShootRow(idx, -1)}
                          title="Đưa lên"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === activeShoot.rows.length - 1}
                          onClick={() => moveShootRow(idx, 1)}
                          title="Đưa xuống"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        {activeShoot.rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeShootRow(row.id)}
                            title="Xóa cảnh này"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Thanh thêm nhanh dòng theo cấu trúc HOOK / BODY / CTA */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500">Thêm cảnh nhanh:</span>
            <button
              type="button"
              onClick={() => addShootRow("HOOK")}
              className="rounded-lg border border-[#E7AAB6] bg-[#F8D7DD] hover:bg-[#F3C1CA] text-[#8B1E35] px-2.5 py-1 font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              HOOK
            </button>
            <button
              type="button"
              onClick={() => addShootRow("BODY")}
              className="rounded-lg border border-[#EBBE8D] bg-[#FCE8D2] hover:bg-[#F9D8B5] text-[#8C4A0E] px-2.5 py-1 font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              BODY
            </button>
            <button
              type="button"
              onClick={() => addShootRow("CTA")}
              className="rounded-lg border border-[#9FD5A6] bg-[#D9F0DC] hover:bg-[#C3E7C8] text-[#1A5E29] px-2.5 py-1 font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              CTA
            </button>
          </div>
          <span className="text-slate-500 font-semibold">
            Tổng: {activeShoot.rows.length} cảnh • Cuộn ngang hoặc bấm{" "}
            <strong>Phóng to bảng</strong> để viết thoải mái
          </span>
        </div>
      </div>
    );
  }

  function renderEditOnlyEditor(isFullscreen: boolean) {
    return (
      <div className="rounded-xl border border-[#8BB873] bg-white overflow-hidden shadow-2xs">
        {/* Header Xanh Lá Đậm chuẩn Ảnh 2 */}
        <div className="bg-[#2D6A1E] text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-lime-200 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider">
              KỊCH BẢN DỰNG VIDEO CHI TIẾT — VIDEO {videoIndex + 1} (ORDER EDITOR)
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => addEditScene("CUT")}
              title="Chèn thêm 1 scene theo mẫu Cut từ Video gốc (ghi mốc thời gian cut)"
              className="rounded-lg bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Scissors className="w-3 h-3 text-amber-200" />
              + Mẫu Cut video gốc
            </button>
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setFullscreenOpen(true)}
                title="Phóng to toàn màn hình để soạn kịch bản dựng"
                className="rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Phóng to bảng
              </button>
            )}
          </div>
        </div>

        {/* Khối Metadata đầu đơn dựng */}
        <div className="bg-[#D8ECCE] border-b border-[#A5CA91] px-3.5 py-2.5 space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5">
              <label className="block text-[10.5px] font-extrabold text-[#1C4711] uppercase mb-0.5">
                Thumbnail
              </label>
              <input
                type="text"
                value={activeEdit.thumbnailTitle}
                onChange={(e) =>
                  updateEditField("thumbnailTitle", e.target.value)
                }
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10.5px] font-extrabold text-[#1C4711] uppercase mb-0.5">
                Deadline cho Editor
              </label>
              <input
                type="text"
                value={activeEdit.editorDeadline}
                onChange={(e) =>
                  updateEditField("editorDeadline", e.target.value)
                }
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[10.5px] font-extrabold text-[#1C4711] uppercase mb-0.5">
                Link Visual / Design Thumbnail
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={activeEdit.visualFolderUrl}
                  onChange={(e) =>
                    updateEditField("visualFolderUrl", e.target.value)
                  }
                  className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
                />
                {isHttpUrl(activeEdit.visualFolderUrl) && (
                  <a
                    href={activeEdit.visualFolderUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white border border-[#A5CA91] text-[#2D6A1E] hover:bg-emerald-50 shrink-0"
                    title="Mở link Visual"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] font-bold text-[#254D1A] mb-0.5">
                Video gốc / Link tham khảo
              </label>
              <input
                type="text"
                value={activeEdit.sourceVideoNote}
                onChange={(e) =>
                  updateEditField("sourceVideoNote", e.target.value)
                }
                className="w-full rounded-lg border border-[#A5CA91] bg-white px-2.5 py-1.5 text-xs focus:border-[#2D6A1E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-rose-800 mb-0.5">
                Lưu ý đặc biệt cho Editor
              </label>
              <input
                type="text"
                value={activeEdit.globalEditorNote}
                onChange={(e) =>
                  updateEditField("globalEditorNote", e.target.value)
                }
                className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bảng phân cảnh theo Scene chuẩn Ảnh 2 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[820px]">
            <thead>
              <tr className="bg-[#C3E0B4] text-[#1C4711] border-b border-[#9CC288] text-[11px] font-extrabold uppercase text-left">
                <th className="p-2 border-r border-[#A6CA94] w-[68px] text-center">
                  Scene
                </th>
                <th className="p-2 border-r border-[#A6CA94] min-w-[320px]">
                  Nội dung Voice / Lời bình / Note đoạn cut
                </th>
                <th className="p-2 border-r border-[#A6CA94] w-[205px]">
                  Visual (Ảnh / Drive / Gif / Ref)
                </th>
                <th className="p-2 border-r border-[#A6CA94] w-[240px]">
                  Text Overlay (nếu có)
                </th>
                <th className="p-2 w-[56px] text-center">Xếp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeEdit.scenes.map((sc, idx) => (
                <tr
                  key={sc.id}
                  className="align-top hover:bg-emerald-50/25"
                >
                  <td className="p-1.5 border-r border-slate-200 bg-[#EEF7EA]/70 text-center">
                    <input
                      type="text"
                      value={sc.sceneLabel}
                      onChange={(e) =>
                        updateEditScene(sc.id, { sceneLabel: e.target.value })
                      }
                      aria-label={`Số Scene ${idx + 1}`}
                      className="w-full rounded-md border border-[#BBD6AC] bg-white px-1 py-1 text-xs font-extrabold text-center text-[#1C4711]"
                    />
                  </td>
                  <td className="p-1.5 border-r border-slate-200">
                    <textarea
                      rows={isFullscreen ? 4 : 3}
                      aria-label={`Nội dung Voice / Note đoạn cut Scene ${idx + 1}`}
                      value={sc.voiceOrCutNote}
                      onChange={(e) =>
                        updateEditScene(sc.id, {
                          voiceOrCutNote: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11.5px] leading-relaxed focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 border-r border-slate-200 bg-[#F4FAF1]/50">
                    <textarea
                      rows={isFullscreen ? 4 : 3}
                      aria-label={`Visual Scene ${idx + 1}`}
                      value={sc.visualRef}
                      onChange={(e) =>
                        updateEditScene(sc.id, { visualRef: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 border-r border-slate-200 bg-[#EDF6E8]/60">
                    <textarea
                      rows={isFullscreen ? 4 : 3}
                      aria-label={`Text Overlay Scene ${idx + 1}`}
                      value={sc.textOverlay}
                      onChange={(e) =>
                        updateEditScene(sc.id, { textOverlay: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] leading-snug focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveEditScene(idx, -1)}
                        title="Đưa lên"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === activeEdit.scenes.length - 1}
                        onClick={() => moveEditScene(idx, 1)}
                        title="Đưa xuống"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      {activeEdit.scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditScene(sc.id)}
                          title="Xóa scene này"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Thanh thêm Scene */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => addEditScene("VOICE")}
              className="rounded-lg bg-[#2D6A1E] hover:bg-[#245617] text-white px-2.5 py-1 font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Thêm Scene {activeEdit.scenes.length + 1}
            </button>
            <button
              type="button"
              onClick={() => addEditScene("CUT")}
              className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2.5 py-1 font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Scissors className="w-3 h-3" />
              Thêm Scene Cut từ Video gốc
            </button>
          </div>
          <span className="text-slate-500 font-semibold">
            Tổng: {activeEdit.scenes.length} scene
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {showKindSwitcher && onChangeVideoKind && (
        <div
          role="radiogroup"
          aria-label={`Chọn phân loại cho Video ${videoIndex + 1}`}
          className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}
        >
          {(["SHOOT_AND_EDIT", "EDIT_ONLY"] as const).map((k) => {
            const meta = VIDEO_ORDER_KIND_META[k];
            const active = videoKind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeVideoKind(k)}
                className={`rounded-xl border-2 px-3 py-2 text-left transition cursor-pointer flex items-start gap-2.5 ${
                  active
                    ? k === "SHOOT_AND_EDIT"
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-2xs"
                      : "border-violet-600 bg-violet-50/80 text-violet-950 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-base leading-none shrink-0">
                  {meta.badgeEmoji}
                </span>
                <span className="text-xs font-extrabold">{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {videoKind === "SHOOT_AND_EDIT"
        ? renderShootEditor(false)
        : renderEditOnlyEditor(false)}

      {/* Modal Phóng to toàn màn hình (Portal ra document.body để tràn full viewport kể cả khi đang mở trong Modal/Drawer) */}
      {fullscreenOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => setFullscreenOpen(false)}
            />
            <div className="relative z-10 w-[96vw] max-w-[1560px] h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900">
                  <span>
                    {VIDEO_ORDER_KIND_META[videoKind].badgeEmoji}{" "}
                    Soạn thảo toàn màn hình — Video {videoIndex + 1} (
                    {VIDEO_ORDER_KIND_META[videoKind].label})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(false)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Xong &amp; Thu gọn
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50">
                {videoKind === "SHOOT_AND_EDIT"
                  ? renderShootEditor(true)
                  : renderEditOnlyEditor(true)}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
