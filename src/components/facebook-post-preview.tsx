"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Globe,
  ThumbsUp,
  MessageCircle,
  Share2,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Link2,
  ImagePlus,
  X,
} from "lucide-react";
import { FB_POST_LAYOUTS } from "@/lib/constants";

interface FacebookPostPreviewProps {
  pageName: string;
  pageColor?: string;
  caption: string;
  layout?: string;
  onChangeLayout?: (nextLayout: string) => void;
  onDemoImagesChange?: (urls: string[]) => void;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  title?: string;
}

function renderFormattedCaption(text: string) {
  const parts = text.split(/(#[\w\u00C0-\u024F_]+|https?:\/\/\S+)/gi);
  return parts.map((part, idx) => {
    if (part.startsWith("#") || /^https?:\/\//i.test(part)) {
      return (
        <span key={idx} className="text-[#1877F2] font-medium">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function looksLikeRenderableImage(url: string): boolean {
  if (/^data:image\//i.test(url) || /^blob:/i.test(url)) return true;
  if (/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url)) return true;
  if (/drive\.google\.com\/uc\?/i.test(url)) return true;
  return false;
}

function fileToSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("invalid image"));
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function PreviewMediaTile({
  src,
  fallbackEmoji,
  fallbackTitle,
  fallbackSub,
  className,
  dark = false,
  overlayCount = 0,
}: {
  src?: string | null;
  fallbackEmoji: string;
  fallbackTitle: string;
  fallbackSub?: string;
  className: string;
  dark?: boolean;
  overlayCount?: number;
}) {
  const [failed, setFailed] = useState(false);
  const canRenderImg = Boolean(src && looksLikeRenderableImage(src) && !failed);

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center ${className}`}
    >
      {canRenderImg && src ? (
        <Image
          src={src}
          alt={fallbackTitle}
          fill
          unoptimized
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <div className="p-3 flex flex-col items-center justify-center">
          <span className="text-xl mb-1">{fallbackEmoji}</span>
          <div
            className={`text-xs font-bold ${
              dark ? "text-white" : "text-slate-700"
            }`}
          >
            {fallbackTitle}
          </div>
          {fallbackSub && (
            <div
              className={`text-[11px] line-clamp-1 mt-0.5 ${
                dark ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {fallbackSub}
            </div>
          )}
        </div>
      )}

      {overlayCount > 0 && (
        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white text-xl font-black">
          +{overlayCount}
        </div>
      )}
    </div>
  );
}

export function FacebookPostPreview({
  pageName,
  pageColor = "#1877F2",
  caption,
  layout = "SINGLE_SQUARE",
  onChangeLayout,
  onDemoImagesChange,
  mediaUrl,
  mediaUrls,
  title,
}: FacebookPostPreviewProps) {
  const [device, setDevice] = useState<"MOBILE" | "DESKTOP">("MOBILE");
  const [expanded, setExpanded] = useState(false);
  const [demoImages, setDemoImages] = useState<string[]>([]);
  const [extraUrlInput, setExtraUrlInput] = useState("");
  const [showUrlAdd, setShowUrlAdd] = useState(false);

  const attachedUrls = useMemo(() => {
    const list: string[] = [];
    for (const u of mediaUrls || []) {
      if (u && !list.includes(u)) list.push(u);
    }
    if (mediaUrl && !list.includes(mediaUrl)) list.push(mediaUrl);
    return list;
  }, [mediaUrl, mediaUrls]);

  const previewMedia = useMemo(() => {
    const combined = [...demoImages];
    for (const u of attachedUrls) {
      if (looksLikeRenderableImage(u) && !combined.includes(u)) {
        combined.push(u);
      }
    }
    return combined;
  }, [demoImages, attachedUrls]);

  async function handleSelectDemoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const loaded: string[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        loaded.push(await fileToSmallDataUrl(file));
      } catch {
        // skip invalid image
      }
    }
    if (loaded.length > 0) {
      setDemoImages((prev) => {
        const next = [...prev, ...loaded];
        onDemoImagesChange?.(next);
        return next;
      });
      if (loaded.length >= 4 && layout === "SINGLE_SQUARE" && onChangeLayout) {
        onChangeLayout("ALBUM_4");
      } else if (loaded.length === 2 && layout === "SINGLE_SQUARE" && onChangeLayout) {
        onChangeLayout("ALBUM_2");
      }
    }
  }

  function handleAddImageUrl() {
    const cleaned = extraUrlInput.trim();
    if (!cleaned) return;
    setDemoImages((prev) => {
      const next = prev.includes(cleaned) ? prev : [...prev, cleaned];
      onDemoImagesChange?.(next);
      return next;
    });
    setExtraUrlInput("");
    setShowUrlAdd(false);
  }

  const safeCaption = caption.trim();
  const foldLimit = device === "MOBILE" ? 135 : 260;
  const lines = safeCaption.split("\n");
  const needsTruncate =
    safeCaption.length > foldLimit || lines.length > (device === "MOBILE" ? 3 : 5);

  let visibleCaption = safeCaption;
  if (!expanded && needsTruncate) {
    const byLines = lines.slice(0, device === "MOBILE" ? 3 : 5).join("\n");
    visibleCaption =
      byLines.length > foldLimit ? byLines.slice(0, foldLimit) : byLines;
  }

  const firstHook = lines[0]?.trim() || "";
  const hasHashtag = /#[\w\u00C0-\u024F_]+/i.test(safeCaption);
  const hasCtaOrLink =
    /inbox|comment|bình luận|nhắn tin|link|đăng ký|mua|http/i.test(safeCaption);

  const layoutMeta =
    FB_POST_LAYOUTS[layout] || FB_POST_LAYOUTS.SINGLE_SQUARE;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2] text-white text-xs font-black">
            f
          </span>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Xem trước Bố cục Bài đăng Facebook
            </div>
            <div className="text-[11px] text-slate-500">
              {layoutMeta.label} • {layoutMeta.ratioHint}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 px-2 py-1 text-[11px] font-bold text-[#1877F2] cursor-pointer">
            <ImagePlus className="w-3.5 h-3.5" />
            Chọn ảnh demo ({previewMedia.length})
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleSelectDemoFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowUrlAdd((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
          >
            <Link2 className="w-3 h-3" />
            + URL ảnh
          </button>

          {onChangeLayout && (
            <select
              value={layout}
              onChange={(e) => onChangeLayout(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
            >
              {Object.entries(FB_POST_LAYOUTS).map(([k, info]) => (
                <option key={k} value={k}>
                  {info.label}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setDevice("MOBILE")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                device === "MOBILE"
                  ? "bg-[#1877F2] text-white"
                  : "text-slate-600"
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setDevice("DESKTOP")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                device === "DESKTOP"
                  ? "bg-[#1877F2] text-white"
                  : "text-slate-600"
              }`}
            >
              <Monitor className="w-3 h-3" />
              PC
            </button>
          </div>
        </div>
      </div>

      {showUrlAdd && (
        <div className="flex gap-1.5">
          <input
            type="url"
            value={extraUrlInput}
            onChange={(e) => setExtraUrlInput(e.target.value)}
            placeholder="Dán link ảnh trực tiếp (.png, .jpg, .webp) để xem thử vào khung..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={handleAddImageUrl}
            className="rounded-lg bg-[#1877F2] text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
          >
            Thêm
          </button>
        </div>
      )}

      {demoImages.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {demoImages.map((imgSrc, i) => (
            <div key={`${imgSrc.slice(0, 32)}-${i}`} className="relative shrink-0">
              <Image
                src={imgSrc}
                alt={`Demo ${i + 1}`}
                width={48}
                height={48}
                unoptimized
                className="w-11 h-11 rounded-lg object-cover border border-slate-300"
              />
              <button
                type="button"
                onClick={() =>
                  setDemoImages((prev) => {
                    const next = prev.filter((_, idx) => idx !== i);
                    onDemoImagesChange?.(next);
                    return next;
                  })
                }
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                title="Gỡ ảnh demo"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Card Facebook Simulator */}
      <div
        className={`mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all ${
          device === "MOBILE" ? "max-w-[340px]" : "max-w-[500px]"
        }`}
      >
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
              style={{ backgroundColor: pageColor }}
            >
              {pageName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-900 truncate">
                {pageName}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>Vừa xong</span>
                <span>•</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-slate-400" />
        </div>

        <div className="px-3.5 pb-2.5 text-[13px] text-slate-900 whitespace-pre-wrap leading-relaxed break-words">
          {safeCaption ? (
            <>
              {renderFormattedCaption(visibleCaption)}
              {needsTruncate && !expanded && (
                <>
                  <span>... </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="text-slate-500 font-semibold hover:underline cursor-pointer"
                  >
                    Xem thêm
                  </button>
                </>
              )}
              {needsTruncate && expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="block mt-1 text-xs text-slate-500 font-semibold hover:underline cursor-pointer"
                >
                  Thu gọn
                </button>
              )}
            </>
          ) : (
            <span className="text-slate-400 italic">
              (Chưa nhập caption — nhập caption ở trên để xem điểm cắt &ldquo;Xem thêm...&rdquo;)
            </span>
          )}
        </div>

        {/* Media Visual Layout */}
        {layout === "SINGLE_SQUARE" && (
          <PreviewMediaTile
            src={previewMedia[0]}
            fallbackEmoji="🖼️"
            fallbackTitle="Khung 1 Ảnh Vuông (1:1 • 1080×1080)"
            fallbackSub={title || "Ảnh sản phẩm / Infographic"}
            className="aspect-square bg-gradient-to-br from-sky-50 via-blue-50 to-amber-50 border-y border-slate-100"
          />
        )}

        {layout === "SINGLE_PORTRAIT" && (
          <PreviewMediaTile
            src={previewMedia[0]}
            fallbackEmoji="📱"
            fallbackTitle="Khung 1 Ảnh Dọc (4:5 • 1080×1350)"
            fallbackSub={layoutMeta.aspectDesc}
            className="aspect-[4/5] bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 border-y border-slate-100"
          />
        )}

        {layout === "REELS_VERTICAL" && (
          <div className="relative">
            <PreviewMediaTile
              src={previewMedia[0]}
              fallbackEmoji="🎬"
              fallbackTitle="Video / Reels Dọc (9:16)"
              fallbackSub="Chừa vùng an toàn dưới cùng 25% cho caption & nút Reels"
              className="aspect-[9/16] max-h-[340px] w-full bg-slate-900 border-y border-slate-100"
              dark
            />
            {previewMedia[0] && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent flex items-end p-3 text-[10px] text-white/90">
                Vùng an toàn nút & caption Reels (25% dưới)
              </div>
            )}
          </div>
        )}

        {layout === "ALBUM_2" && (
          <div className="grid grid-cols-2 gap-1 bg-white border-y border-slate-100">
            {[0, 1].map((idx) => (
              <PreviewMediaTile
                key={idx}
                src={previewMedia[idx]}
                fallbackEmoji="🖼️"
                fallbackTitle={`Ảnh #${idx + 1}`}
                className="aspect-square bg-gradient-to-br from-sky-50 to-indigo-50"
              />
            ))}
          </div>
        )}

        {layout === "ALBUM_4" && (
          <div className="grid grid-cols-3 gap-1 bg-white border-y border-slate-100">
            <PreviewMediaTile
              src={previewMedia[0]}
              fallbackEmoji="📸"
              fallbackTitle="Ảnh Chính (Banner đầu Album)"
              className="col-span-3 aspect-[16/9] bg-gradient-to-br from-amber-50 to-sky-50"
            />
            {[1, 2, 3].map((idx) => (
              <PreviewMediaTile
                key={idx}
                src={previewMedia[idx]}
                fallbackEmoji="🖼️"
                fallbackTitle={`Ảnh #${idx + 1}`}
                className="aspect-square bg-slate-100"
                overlayCount={
                  idx === 3 && previewMedia.length > 4
                    ? previewMedia.length - 4
                    : 0
                }
              />
            ))}
          </div>
        )}

        {layout === "LINK_PREVIEW" && (
          <div className="border-y border-slate-200 bg-slate-50">
            <PreviewMediaTile
              src={previewMedia[0]}
              fallbackEmoji="🔗"
              fallbackTitle="Ảnh Link Thumbnail (1200×628)"
              className="aspect-[1.91/1] bg-gradient-to-r from-blue-50 to-emerald-50"
            />
            <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-100">
              <div className="text-[10px] uppercase text-slate-500">
                METAECOM.VN
              </div>
              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                {title || "Tiêu đề đường dẫn bài viết"}
              </div>
            </div>
          </div>
        )}

        {attachedUrls.length > 0 && (
          <div className="px-3.5 py-1.5 bg-blue-50/70 border-b border-blue-100 text-[11px] text-blue-700 truncate">
            📎 {attachedUrls.length} file đính kèm:{" "}
            <a
              href={attachedUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              {attachedUrls[0]}
            </a>
          </div>
        )}

        <div className="px-3.5 py-2 flex items-center justify-around text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5" /> Thích
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Bình luận
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Chia sẻ
          </span>
        </div>
      </div>

      {/* Checklist tối ưu bài đăng */}
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold border ${
            firstHook.length >= 10 && firstHook.length <= 125
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {firstHook.length >= 10 && firstHook.length <= 125 ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          Hook dòng 1 ({firstHook.length} ký tự
          {firstHook.length > 125 ? " — dễ bị cắt 'Xem thêm'" : " — vừa đẹp"})
        </span>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold border ${
            hasCtaOrLink
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {hasCtaOrLink ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {hasCtaOrLink ? "Có CTA kêu gọi" : "Chưa thấy CTA"}
        </span>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold border ${
            hasHashtag
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {hasHashtag ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {hasHashtag ? "Đã gắn #Hashtag" : "Thiếu #Hashtag"}
        </span>
      </div>
    </div>
  );
}
