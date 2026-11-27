"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Link2,
  Monitor,
  Smartphone,
  X,
  ZoomIn,
} from "lucide-react";
import { DemoImageLightbox } from "@/components/demo-image-lightbox";
import {
  FacebookMockupCard,
  InstagramMockupCard,
  MockupLightboxProvider,
  ThreadsMockupCard,
  TikTokMockupCard,
  normalizePlatformToMockup,
  resolvePreviewImages,
  type InstagramVariant,
  type SocialMockupData,
  type SocialMockupPlatform,
} from "@/components/social-mockup-cards";
import { FB_POST_LAYOUTS, FB_POST_LAYOUT_GROUPS } from "@/lib/constants";
import { extractAssetPreviewImageUrl } from "@/lib/output-helpers";

interface FacebookPostPreviewProps {
  pageName: string;
  pageColor?: string;
  caption: string;
  platform?: string;
  postFormat?: string | null;
  description?: string | null;
  layout?: string;
  onChangeLayout?: (nextLayout: string) => void;
  hideLayoutSelector?: boolean;
  draftDemoImages?: string[];
  onDemoImagesChange?: (urls: string[]) => void;
  onPersistNewImages?: (urls: string[]) => Promise<void> | void;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  title?: string;
}

const PREVIEW_PLATFORMS: Array<{
  id: SocialMockupPlatform;
  label: string;
  icon: string;
}> = [
  { id: "FACEBOOK", label: "Facebook", icon: "f" },
  { id: "INSTAGRAM", label: "Instagram", icon: "◎" },
  { id: "TIKTOK", label: "TikTok", icon: "♪" },
  { id: "THREADS", label: "Threads", icon: "@" },
];

function fileToSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("invalid image"));
      img.onload = () => {
        const maxDim = 1100;
        const scale = Math.min(
          1,
          maxDim / Math.max(img.width || 1, img.height || 1)
        );
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
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export function FacebookPostPreview({
  pageName,
  pageColor = "#3D2B1F",
  caption,
  platform,
  postFormat,
  description,
  layout = "SINGLE_SQUARE",
  onChangeLayout,
  hideLayoutSelector = false,
  draftDemoImages,
  onDemoImagesChange,
  onPersistNewImages,
  mediaUrl,
  mediaUrls,
  title,
}: FacebookPostPreviewProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialMockupPlatform>(() => normalizePlatformToMockup(platform));
  const [igVariant, setIgVariant] = useState<InstagramVariant>(() =>
    layout === "REELS_VERTICAL" ||
    (postFormat || "").toLowerCase().includes("video") ||
    (postFormat || "").toLowerCase().includes("reel")
      ? "REELS"
      : "FEED"
  );
  const [device, setDevice] = useState<"MOBILE" | "DESKTOP">("MOBILE");
  const [internalLayout, setInternalLayout] = useState<string>(layout);
  const [internalDemoImages, setInternalDemoImages] = useState<string[]>([]);
  const [savingDemoImages, setSavingDemoImages] = useState(false);
  const [extraUrlInput, setExtraUrlInput] = useState("");
  const [showUrlAdd, setShowUrlAdd] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const demoImages = draftDemoImages ?? internalDemoImages;
  const effectiveLayout = onChangeLayout ? layout : internalLayout;

  function setDemoImagesList(updater: (prev: string[]) => string[]) {
    const next = updater(demoImages);
    if (draftDemoImages === undefined) {
      setInternalDemoImages(next);
    }
    onDemoImagesChange?.(next);
  }

  function handleChangeLayout(next: string) {
    if (onChangeLayout) {
      onChangeLayout(next);
    } else {
      setInternalLayout(next);
    }
  }

  const attachedUrls = useMemo(() => {
    const list: string[] = [];
    for (const u of mediaUrls || []) {
      if (u && !list.includes(u)) list.push(u);
    }
    if (mediaUrl && !list.includes(mediaUrl)) list.push(mediaUrl);
    return list;
  }, [mediaUrl, mediaUrls]);

  const previewMedia = useMemo(() => {
    const resolved = resolvePreviewImages([...demoImages, ...attachedUrls]);
    return resolved;
  }, [demoImages, attachedUrls]);

  function autoUpgradeLayoutForCount(nextTotal: number) {
    if (effectiveLayout !== "SINGLE_SQUARE") return;
    if (nextTotal >= 5) {
      handleChangeLayout("ALBUM_5_HORIZONTAL");
    } else if (nextTotal === 4) {
      handleChangeLayout("ALBUM_4");
    } else if (nextTotal === 3) {
      handleChangeLayout("ALBUM_3_HORIZONTAL");
    } else if (nextTotal === 2) {
      handleChangeLayout("ALBUM_2");
    }
  }

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
    if (loaded.length === 0) return;

    const nextTotal = previewMedia.length + loaded.length;
    if (onPersistNewImages) {
      setSavingDemoImages(true);
      try {
        await onPersistNewImages(loaded);
        autoUpgradeLayoutForCount(nextTotal);
      } finally {
        setSavingDemoImages(false);
      }
      return;
    }

    setDemoImagesList((prev) => [...prev, ...loaded]);
    autoUpgradeLayoutForCount(nextTotal);
  }

  async function handleAddImageUrl() {
    const cleaned = extraUrlInput.trim();
    if (!cleaned) return;
    setExtraUrlInput("");
    setShowUrlAdd(false);

    if (onPersistNewImages) {
      setSavingDemoImages(true);
      try {
        await onPersistNewImages([cleaned]);
      } finally {
        setSavingDemoImages(false);
      }
      return;
    }

    setDemoImagesList((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
  }

  const safeCaption = caption.trim();
  const lines = safeCaption.split("\n");
  const firstHook = lines[0]?.trim() || "";
  const hasHashtag = /#[\w\u00C0-\u024F_]+/i.test(safeCaption);
  const hasCtaOrLink =
    /inbox|comment|bình luận|nhắn tin|link|đăng ký|mua|http/i.test(safeCaption);

  const mockupData: SocialMockupData = {
    pageName: pageName || "Meta Ecom",
    pageColor,
    title,
    caption: safeCaption,
    description,
    layout: effectiveLayout,
    respectExplicitLayout: true,
    postFormat,
    timeLabel: "Vừa xong",
    mediaUrls: previewMedia,
    isVideo:
      effectiveLayout === "REELS_VERTICAL" ||
      (postFormat || "").toLowerCase().includes("video") ||
      (postFormat || "").toLowerCase().includes("reel"),
    seedKey: `${pageName}-${title || "draft"}`,
  };

  const isVerticalMockup =
    selectedPlatform === "TIKTOK" ||
    (selectedPlatform === "INSTAGRAM" &&
      (igVariant === "REELS" || igVariant === "STORY"));

  return (
    <div className="rounded-2xl border border-[#E6DDD2] bg-[#FAF6F1] p-3.5 space-y-3">
      {/* Thanh chuyển 4 nền tảng chuẩn editorial */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#EFE8DF] p-1 border border-[#E6DDD2]">
        {PREVIEW_PLATFORMS.map((pt) => {
          const active = selectedPlatform === pt.id;
          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => setSelectedPlatform(pt.id)}
              className={`rounded-lg py-1.5 px-2 text-[11px] font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                active
                  ? "bg-white text-[#1E1611] shadow-xs"
                  : "text-[#6D5A4B] hover:text-[#1E1611]"
              }`}
            >
              <span className="font-black opacity-85">{pt.icon}</span>
              <span className="truncate">{pt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Thanh công cụ ảnh demo + tùy chọn kiểu hiển thị */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1 rounded-lg border border-[#DECBB8] bg-white hover:bg-[#F5ECE2] px-2 py-1 text-[11px] font-bold text-[#8A4624] cursor-pointer">
            <ImagePlus className="w-3.5 h-3.5" />
            {savingDemoImages ? "Đang lưu ảnh..." : `Ảnh demo (${previewMedia.length})`}
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={savingDemoImages}
              className="hidden"
              onChange={(e) => {
                void handleSelectDemoFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowUrlAdd((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E4D8CA] bg-white hover:bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
          >
            <Link2 className="w-3 h-3" />
            + URL ảnh
          </button>

          {selectedPlatform === "FACEBOOK" && !hideLayoutSelector && (
            <select
              value={effectiveLayout}
              onChange={(e) => handleChangeLayout(e.target.value)}
              className="rounded-lg border border-[#E4D8CA] bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 max-w-[235px]"
              title="Chọn bố cục & kích thước ảnh chuẩn Facebook"
            >
              {FB_POST_LAYOUT_GROUPS.map((grp) => (
                <optgroup key={grp} label={grp}>
                  {Object.entries(FB_POST_LAYOUTS)
                    .filter(([, info]) => info.group === grp)
                    .map(([k, info]) => (
                      <option key={k} value={k}>
                        {info.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}

          {selectedPlatform === "INSTAGRAM" && (
            <div className="inline-flex rounded-lg bg-white border border-[#E4D8CA] p-0.5 text-[11px] font-bold">
              {(
                [
                  ["FEED", "Feed"],
                  ["REELS", "Reels"],
                  ["STORY", "Story"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setIgVariant(v)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    igVariant === v
                      ? "bg-[#1E1611] text-[#FAF6F1]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isVerticalMockup && (
          <div className="inline-flex rounded-lg bg-white border border-[#E4D8CA] p-0.5">
            <button
              type="button"
              onClick={() => setDevice("MOBILE")}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                device === "MOBILE"
                  ? "bg-[#1E1611] text-white"
                  : "text-slate-600"
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setDevice("DESKTOP")}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                device === "DESKTOP"
                  ? "bg-[#1E1611] text-white"
                  : "text-slate-600"
              }`}
            >
              <Monitor className="w-3 h-3" />
              PC
            </button>
          </div>
        )}
      </div>

      {showUrlAdd && (
        <div className="flex gap-1.5">
          <input
            type="url"
            value={extraUrlInput}
            onChange={(e) => setExtraUrlInput(e.target.value)}
            placeholder="Dán link ảnh (.png, .jpg, .webp hoặc Google Drive) để xem thử..."
            className="flex-1 rounded-lg border border-[#DECBB8] bg-white px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={savingDemoImages}
            onClick={() => void handleAddImageUrl()}
            className="rounded-lg bg-[#A65D37] hover:bg-[#8E4D2B] disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
          >
            {savingDemoImages ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      )}

      {demoImages.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {demoImages.map((imgSrc, i) => {
              const resolvedThumb = extractAssetPreviewImageUrl(imgSrc) || imgSrc;
              return (
                <div key={`${imgSrc.slice(0, 32)}-${i}`} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const foundIdx = previewMedia.indexOf(resolvedThumb);
                      setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
                    }}
                    title="Bấm để phóng to ảnh"
                    className="block rounded-lg overflow-hidden cursor-zoom-in"
                  >
                    <Image
                      src={resolvedThumb}
                      alt={`Demo ${i + 1}`}
                      width={44}
                      height={44}
                      unoptimized
                      className="w-11 h-11 rounded-lg object-cover border border-[#DECBB8] hover:border-[#8A4624] transition"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDemoImagesList((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                    title="Gỡ ảnh demo"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
          {onDemoImagesChange && !onPersistNewImages && (
            <p className="text-[10.5px] font-medium text-[#8A4624]">
              ✨ {demoImages.length} ảnh mới thêm sẽ tự động lưu &amp; đồng bộ sang phần Output Check khi bấm <strong>Lưu nháp</strong> hoặc <strong>Gửi Leader duyệt</strong>.
            </p>
          )}
        </div>
      )}

      {/* Khung Demo Bài Đăng Đa Nền Tảng */}
      <MockupLightboxProvider
        onOpenImage={(src) => {
          const foundIdx = previewMedia.indexOf(src);
          setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
        }}
      >
        <div
          className={`mx-auto transition-all ${
            isVerticalMockup
              ? "max-w-[290px]"
              : device === "MOBILE"
                ? "max-w-[350px]"
                : "max-w-[500px]"
          }`}
        >
          {selectedPlatform === "FACEBOOK" && (
            <FacebookMockupCard
              data={mockupData}
              compactCaption={device === "MOBILE"}
            />
          )}
          {selectedPlatform === "INSTAGRAM" && (
            <InstagramMockupCard data={mockupData} variant={igVariant} />
          )}
          {selectedPlatform === "TIKTOK" && <TikTokMockupCard data={mockupData} />}
          {selectedPlatform === "THREADS" && (
            <ThreadsMockupCard data={mockupData} />
          )}
        </div>
      </MockupLightboxProvider>

      {previewMedia.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7D563A] hover:text-[#4E311C] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Bấm trực tiếp vào ảnh demo để xem phóng to ({previewMedia.length} ảnh)
          </button>
        </div>
      )}

      <DemoImageLightbox
        images={previewMedia}
        activeIndex={lightboxIndex}
        title={title || pageName}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={(nextIdx) => setLightboxIndex(nextIdx)}
      />

      {attachedUrls.length > 0 && (() => {
        const firstExternal = attachedUrls.find((u) => /^https?:\/\//i.test(u));
        return (
          <div className="rounded-xl px-3 py-1.5 bg-white/80 border border-[#E6DDD2] text-[11px] text-[#7D563A] truncate">
            📎 {attachedUrls.length} ảnh / file đính kèm
            {firstExternal ? (
              <>
                :{" "}
                <a
                  href={firstExternal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  {firstExternal}
                </a>
              </>
            ) : (
              " (đã đồng bộ)"
            )}
          </div>
        );
      })()}

      {/* Checklist tối ưu bài đăng */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
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
              : "bg-white text-slate-600 border-slate-200"
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
              : "bg-white text-slate-600 border-slate-200"
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
