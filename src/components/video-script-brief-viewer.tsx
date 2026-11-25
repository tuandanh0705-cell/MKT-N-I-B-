"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Clapperboard,
  Copy,
  ExternalLink,
  Maximize2,
  Scissors,
  X,
} from "lucide-react";
import {
  SHOOT_SECTION_META,
  VIDEO_ORDER_KIND_META,
  formatSingleBriefItemText,
  getItemVideoOrderKind,
  hasStructuredVideoScript,
  type MediaBriefItem,
} from "@/lib/media-brief";

interface VideoScriptBriefViewerProps {
  item: MediaBriefItem;
  index: number;
  compact?: boolean;
}

function renderTextWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 font-semibold underline break-all hover:text-blue-900"
        >
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function VideoScriptBriefViewer({
  item,
  index,
  compact = false,
}: VideoScriptBriefViewerProps) {
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const kind = getItemVideoOrderKind(item);
  const structured = hasStructuredVideoScript(item);

  function handleCopy() {
    const text = formatSingleBriefItemText(item, index, true);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (!kind || !structured) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900">
              Video {index + 1}
            </span>
            {kind && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${VIDEO_ORDER_KIND_META[kind].badgeClass}`}
              >
                {VIDEO_ORDER_KIND_META[kind].badgeEmoji}{" "}
                {VIDEO_ORDER_KIND_META[kind].shortLabel}
              </span>
            )}
          </div>
          <span className="rounded-full bg-sky-50 border border-sky-200 text-sky-800 px-2 py-0.5 text-[11px] font-bold">
            Tỷ lệ: {item.ratio}
          </span>
        </div>
        {item.content && (
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">
            {renderTextWithLinks(item.content)}
          </p>
        )}
        {item.note && (
          <p className="text-slate-500 italic">Ghi chú: {item.note}</p>
        )}
        {item.sampleUrl && (
          <a
            href={item.sampleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Mẫu tham khảo
          </a>
        )}
      </div>
    );
  }

  const kindMeta = VIDEO_ORDER_KIND_META[kind];

  function renderTableContent(inFullscreen: boolean) {
    if (kind === "SHOOT_AND_EDIT" && item.shootScript) {
      const s = item.shootScript;
      return (
        <div className="rounded-xl border border-[#8BB873] bg-white overflow-hidden shadow-2xs">
          {/* Header xanh lá đậm y hệt Ảnh 1 */}
          <div className="bg-[#2D6A1E] text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clapperboard className="w-4 h-4 text-lime-200 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wide truncate">
                  {s.scriptTitle || `KỊCH BẢN QUAY & DỰNG — VIDEO ${index + 1}`}
                </div>
                <div className="text-[10.5px] text-lime-100/90">
                  {kindMeta.label} • Tỷ lệ: {item.ratio} • {s.rows.length} cảnh
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-lime-300" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              {!inFullscreen && (
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  Xem full
                </button>
              )}
            </div>
          </div>

          {/* Khối Yêu cầu VJ */}
          {(s.vjGenderRole || s.vjVoiceMood || s.vjOutfit) && (
            <div className="bg-[#D5E8CB] border-b border-[#A5CA91] px-3.5 py-2 text-[11.5px] text-[#1C4711] space-y-0.5">
              <div className="font-extrabold uppercase tracking-wider text-[10.5px]">
                YÊU CẦU VJ / DIỄN VIÊN
              </div>
              {s.vjGenderRole && (
                <div>
                  <strong>Giới tính / Đối tượng:</strong> {s.vjGenderRole}
                </div>
              )}
              {s.vjVoiceMood && (
                <div>
                  <strong>Mood giọng:</strong> {s.vjVoiceMood}
                </div>
              )}
              {s.vjOutfit && (
                <div>
                  <strong>Trang phục:</strong> {s.vjOutfit}
                </div>
              )}
            </div>
          )}

          {/* Khối Thời lượng, Bố cục, Bối cảnh */}
          {(s.estimatedDuration || s.overallStructure || s.settingAndStyle) && (
            <div className="bg-[#C0DFAF]/80 border-b border-[#9AC284] px-3.5 py-2 text-[11.5px] text-[#1A3B10] space-y-0.5">
              {s.estimatedDuration && (
                <div>
                  <strong>Thời lượng:</strong> {s.estimatedDuration}
                </div>
              )}
              {s.overallStructure && (
                <div>
                  <strong>Bố cục:</strong> {s.overallStructure}
                </div>
              )}
              {s.settingAndStyle && (
                <div>
                  <strong>Bối cảnh &amp; Style chung:</strong>{" "}
                  {s.settingAndStyle}
                </div>
              )}
            </div>
          )}

          {/* Bảng 9 cột */}
          <div className="overflow-x-auto">
            <table
              className={`w-full border-collapse text-[11.5px] ${
                compact && !inFullscreen ? "min-w-[980px]" : "min-w-[1120px]"
              }`}
            >
              <thead>
                <tr className="bg-[#EBF4E7] text-[#1E3F14] border-b border-[#B7CFA9] text-[10.5px] font-extrabold text-left">
                  <th className="p-2 border-r border-[#C9DBC0] w-[68px] text-center">
                    Cấu trúc
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[36px] text-center">
                    STT
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[68px]">
                    Thời lượng
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[140px]">
                    Note order dựng
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[140px]">
                    Góc máy quay
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[180px]">
                    Hình ảnh / Bối cảnh
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[220px]">
                    Lời thoại VJ / Diễn viên
                  </th>
                  <th className="p-2 border-r border-[#C9DBC0] w-[170px]">
                    Text on Screen
                  </th>
                  <th className="p-2 w-[140px]">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {s.rows.map((row, idx) => {
                  const secMeta = SHOOT_SECTION_META[row.section];
                  return (
                    <tr key={row.id} className="align-top">
                      <td
                        className={`p-2 border-r border-slate-200 text-center font-extrabold text-[11px] ${secMeta.cellBg}`}
                      >
                        {row.section}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
                        {row.duration || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-pre-wrap text-slate-700 leading-snug">
                        {row.editNote || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-pre-wrap text-slate-700 leading-snug">
                        {row.cameraAngle || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-pre-wrap text-slate-800 leading-snug">
                        {row.visualContext || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-pre-wrap text-slate-900 leading-relaxed">
                        {row.dialogue || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 whitespace-pre-wrap font-semibold text-slate-900 leading-snug">
                        {row.textOnScreen || "—"}
                      </td>
                      <td className="p-2 whitespace-pre-wrap text-slate-600 leading-snug">
                        {row.comment || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(item.sampleUrl || item.note) && (
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {item.note && (
                <span className="text-slate-600 italic">
                  Ghi chú thêm: {item.note}
                </span>
              )}
              {item.sampleUrl && (
                <a
                  href={item.sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Link video mẫu tham khảo
                </a>
              )}
            </div>
          )}
        </div>
      );
    }

    if (kind === "EDIT_ONLY" && item.editScript) {
      const e = item.editScript;
      return (
        <div className="rounded-xl border border-[#8BB873] bg-white overflow-hidden shadow-2xs">
          {/* Header xanh lá đậm y hệt Ảnh 2 */}
          <div className="bg-[#2D6A1E] text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Scissors className="w-4 h-4 text-lime-200 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wide truncate">
                  {e.thumbnailTitle
                    ? `DỰNG VIDEO: ${e.thumbnailTitle}`
                    : `KỊCH BẢN DỰNG VIDEO CHI TIẾT — VIDEO ${index + 1}`}
                </div>
                <div className="text-[10.5px] text-lime-100/90">
                  {kindMeta.label} • Tỷ lệ: {item.ratio}
                  {e.editorDeadline ? ` • Deadline Editor: ${e.editorDeadline}` : ""}
                  {" • "}
                  {e.scenes.length} scene
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-lime-300" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
              {!inFullscreen && (
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  Xem full
                </button>
              )}
            </div>
          </div>

          {/* Thông tin đầu đơn dựng */}
          {(e.thumbnailTitle ||
            e.editorDeadline ||
            e.visualFolderUrl ||
            e.sourceVideoNote ||
            e.globalEditorNote) && (
            <div className="bg-[#D8ECCE] border-b border-[#A5CA91] px-3.5 py-2 text-[11.5px] text-[#1C4711] space-y-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {e.thumbnailTitle && (
                  <span>
                    <strong>Thumbnail:</strong> {e.thumbnailTitle}
                  </span>
                )}
                {e.editorDeadline && (
                  <span>
                    <strong>Deadline Editor:</strong> {e.editorDeadline}
                  </span>
                )}
              </div>
              {e.visualFolderUrl && (
                <div>
                  <strong>Link Visual / Canva Thumbnail:</strong>{" "}
                  {renderTextWithLinks(e.visualFolderUrl)}
                </div>
              )}
              {e.sourceVideoNote && (
                <div>
                  <strong>Video gốc / Ref:</strong>{" "}
                  {renderTextWithLinks(e.sourceVideoNote)}
                </div>
              )}
              {e.globalEditorNote && (
                <div className="text-rose-800 font-bold">
                  ⚠️ Lưu ý Editor: {e.globalEditorNote}
                </div>
              )}
            </div>
          )}

          {/* Bảng Scene chuẩn Ảnh 2 */}
          <div className="overflow-x-auto">
            <table
              className={`w-full border-collapse text-[11.5px] ${
                compact && !inFullscreen ? "min-w-[700px]" : "min-w-[820px]"
              }`}
            >
              <thead>
                <tr className="bg-[#C3E0B4] text-[#1C4711] border-b border-[#9CC288] text-[10.5px] font-extrabold uppercase text-left">
                  <th className="p-2 border-r border-[#A6CA94] w-[56px] text-center">
                    Scene
                  </th>
                  <th className="p-2 border-r border-[#A6CA94]">
                    Nội dung Voice / Lời bình / Note đoạn cut
                  </th>
                  <th className="p-2 border-r border-[#A6CA94] w-[180px]">
                    Visual
                  </th>
                  <th className="p-2 w-[220px]">Text Overlay (nếu có)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {e.scenes.map((sc, idx) => (
                  <tr key={sc.id} className="align-top">
                    <td className="p-2 border-r border-slate-200 bg-[#EEF7EA]/70 text-center font-extrabold text-[#1C4711]">
                      {sc.sceneLabel || idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200 whitespace-pre-wrap text-slate-900 leading-relaxed">
                      {sc.voiceOrCutNote
                        ? renderTextWithLinks(sc.voiceOrCutNote)
                        : "—"}
                    </td>
                    <td className="p-2 border-r border-slate-200 bg-[#F4FAF1]/50 whitespace-pre-wrap text-slate-800 leading-snug">
                      {sc.visualRef ? renderTextWithLinks(sc.visualRef) : "—"}
                    </td>
                    <td className="p-2 bg-[#EDF6E8]/60 whitespace-pre-wrap text-slate-800 leading-snug">
                      {sc.textOverlay
                        ? renderTextWithLinks(sc.textOverlay)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(item.sampleUrl || item.note) && (
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {item.note && (
                <span className="text-slate-600 italic">
                  Ghi chú thêm: {item.note}
                </span>
              )}
              {item.sampleUrl && (
                <a
                  href={item.sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Link tham khảo
                </a>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <>
      {renderTableContent(false)}

      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => setFullscreen(false)}
            />
            <div className="relative z-10 w-[96vw] max-w-[1560px] h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {kindMeta.badgeEmoji} Xem kịch bản đầy đủ — Video {index + 1} (
                  {kindMeta.label})
                </span>
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Đóng
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50">
                {renderTableContent(true)}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
