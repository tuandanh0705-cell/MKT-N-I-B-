"use client";

import { createContext, useContext, useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Play,
  Repeat2,
  Search,
  Send,
  Share2,
  ThumbsUp,
  Users,
  X,
  ZoomIn,
} from "lucide-react";

const MockupLightboxContext = createContext<((src: string) => void) | null>(
  null
);

export function MockupLightboxProvider({
  onOpenImage,
  children,
}: {
  onOpenImage: (src: string) => void;
  children: React.ReactNode;
}) {
  return (
    <MockupLightboxContext.Provider value={onOpenImage}>
      {children}
    </MockupLightboxContext.Provider>
  );
}
import { FB_POST_LAYOUTS } from "@/lib/constants";
import { extractAssetPreviewImageUrl } from "@/lib/output-helpers";

export type SocialMockupPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TIKTOK"
  | "THREADS";

export type InstagramVariant = "FEED" | "REELS" | "STORY";

export interface SocialMockupData {
  pageName: string;
  pageColor?: string;
  handle?: string;
  title?: string;
  caption: string;
  description?: string | null;
  layout?: string;
  respectExplicitLayout?: boolean;
  postFormat?: string | null;
  timeLabel?: string;
  mediaUrls: string[];
  isVideo?: boolean;
  pillarLabel?: string | null;
  seedKey?: string;
}

export function normalizePlatformToMockup(
  rawPlatform?: string | null
): SocialMockupPlatform {
  const lower = (rawPlatform || "").trim().toLowerCase();
  if (lower.includes("insta") || lower === "ig") return "INSTAGRAM";
  if (lower.includes("tiktok") || lower.includes("reel") || lower.includes("douyin")) {
    return "TIKTOK";
  }
  if (lower.includes("thread")) return "THREADS";
  return "FACEBOOK";
}

export function deriveSocialHandle(pageName: string): string {
  const cleaned = pageName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return cleaned.slice(0, 22) || "metaecom.official";
}

export function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "ME";
}

export function resolvePreviewImages(rawUrls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const raw of rawUrls) {
    if (!raw) continue;
    const preview = extractAssetPreviewImageUrl(raw);
    if (preview && !out.includes(preview)) {
      out.push(preview);
    }
  }
  return out;
}

/** Sinh số tương tác giả lập ổn định theo seed (chỉ để xem trước trực quan). */
function stableHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function formatCompactCount(n: number): string {
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(".", ",");
    return `${val.endsWith(",0") ? val.slice(0, -2) : val}K`;
  }
  return String(n);
}

function getDemoMetrics(seedKey: string) {
  const h = stableHash(seedKey || "demo");
  const likes = 380 + (h % 2900);
  const comments = 32 + ((h >> 4) % 210);
  const shares = 12 + ((h >> 8) % 68);
  return {
    likesText: formatCompactCount(likes),
    likesExact: likes.toLocaleString("vi-VN"),
    comments,
    shares,
  };
}

function renderHashtagCaption(
  text: string,
  accentClass = "text-[#1877F2]"
) {
  const parts = text.split(/(#[\w\u00C0-\u024F_]+|https?:\/\/\S+)/gi);
  return parts.map((part, idx) => {
    if (part.startsWith("#") || /^https?:\/\//i.test(part)) {
      return (
        <span key={idx} className={`${accentClass} font-medium`}>
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function extractStoryPollQuestion(data: SocialMockupData): {
  question: string;
  optA: string;
  optB: string;
} {
  const lines = (data.caption || data.title || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const qLine =
    lines.find((l) => l.includes("?")) ||
    data.title ||
    lines[0] ||
    "Bạn thích nội dung nào nhất hôm nay?";
  const cleanQ = qLine.length > 52 ? `${qLine.slice(0, 50)}…` : qLine;
  return {
    question: cleanQ,
    optA: "Rất quan tâm • 68%",
    optB: "Gửi chi tiết giúp mình • 32%",
  };
}

/** Ảnh xem trước an toàn + poster editorial khi bài chưa gắn ảnh thật */
function MockupVisualTile({
  src,
  alt,
  className,
  fallbackTitle,
  fallbackSubtitle,
  fallbackTag,
  slotSizeBadge,
  compactTile = false,
  accentColor = "#A65D37",
  dark = false,
  overlayPlus = 0,
  isVideo = false,
  safeRightPad = false,
}: {
  src?: string | null;
  alt: string;
  className: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  fallbackTag?: string | null;
  slotSizeBadge?: string;
  compactTile?: boolean;
  accentColor?: string;
  dark?: boolean;
  overlayPlus?: number;
  isVideo?: boolean;
  safeRightPad?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const onOpenLightbox = useContext(MockupLightboxContext);
  const showImage = Boolean(src && !failed);
  const canZoom = Boolean(showImage && src && onOpenLightbox);
  const posClass = /\b(absolute|fixed)\b/.test(className) ? "" : "relative";

  return (
    <div
      role={canZoom ? "button" : undefined}
      tabIndex={canZoom ? 0 : undefined}
      title={canZoom ? "Bấm để phóng to xem ảnh chi tiết" : undefined}
      onClick={
        canZoom && src
          ? (e) => {
              e.stopPropagation();
              onOpenLightbox?.(src);
            }
          : undefined
      }
      onKeyDown={
        canZoom && src
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpenLightbox?.(src);
              }
            }
          : undefined
      }
      className={`${posClass} overflow-hidden select-none ${
        canZoom ? "cursor-zoom-in group" : ""
      } ${className}`}
      style={
        !showImage
          ? {
              background: dark
                ? `radial-gradient(circle at 25% 20%, ${accentColor}55, transparent 58%), linear-gradient(160deg, #1E1916 0%, #2C231D 55%, #12100E 100%)`
                : `radial-gradient(circle at 85% 18%, ${accentColor}26, transparent 55%), linear-gradient(155deg, #F5ECE2 0%, #EFE3D4 55%, #E7D6C2 100%)`,
            }
          : undefined
      }
    >
      {showImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          onError={() => setFailed(true)}
          className={`object-cover transition-transform duration-200 ${
            canZoom ? "group-hover:scale-[1.02]" : ""
          }`}
        />
      ) : (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-center ${
            compactTile ? "p-2 gap-1" : "p-4 sm:p-5 gap-2"
          } ${safeRightPad ? "pr-14" : ""} ${
            dark ? "text-[#FAF4EC]" : "text-[#3B2A1E]"
          }`}
        >
          {fallbackTag && !compactTile && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                dark
                  ? "bg-white/15 text-amber-200 border border-white/15"
                  : "bg-white/80 text-[#9A5531] border border-[#DECBB8]"
              }`}
            >
              {fallbackTag}
            </span>
          )}
          <div
            className={`font-serif font-bold leading-snug max-w-[92%] ${
              compactTile
                ? "text-[11px] sm:text-xs line-clamp-2"
                : "text-base sm:text-lg line-clamp-3"
            }`}
          >
            {fallbackTitle}
          </div>
          {fallbackSubtitle && !compactTile && (
            <div
              className={`text-[11px] line-clamp-2 max-w-[88%] ${
                dark ? "text-white/70" : "text-[#7A614D]"
              }`}
            >
              {fallbackSubtitle}
            </div>
          )}
          {slotSizeBadge && (
            <span
              className={`inline-flex items-center rounded-md font-mono font-extrabold tracking-tight shadow-2xs whitespace-nowrap ${
                compactTile ? "px-1 py-0.5 text-[8.5px]" : "px-2.5 py-0.5 text-[11px]"
              } ${
                dark
                  ? "bg-white/15 text-sky-200 border border-sky-300/35"
                  : "bg-white/95 text-[#1877F2] border border-[#1877F2]/30"
              }`}
            >
              {compactTile ? slotSizeBadge.replace(/\s*×\s*/g, "×") : slotSizeBadge}
            </span>
          )}
          {(!compactTile || !slotSizeBadge) && (
            <span
              className={`mt-0.5 text-[9.5px] font-semibold uppercase tracking-widest ${
                dark ? "text-white/45" : "text-[#9C826C]"
              }`}
            >
              {isVideo ? "🎬 Khung Video Demo" : "🖼️ Khung minh họa chuẩn tỉ lệ"}
            </span>
          )}
        </div>
      )}

      {isVideo && showImage && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
          <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xs border border-white/40 text-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </span>
        </div>
      )}

      {overlayPlus > 0 && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-2xl font-black">
          +{overlayPlus}
        </div>
      )}

      {canZoom && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-xs text-white px-2 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ZoomIn className="w-3 h-3" />
          <span className="hidden sm:inline">Phóng to</span>
        </span>
      )}
    </div>
  );
}

/** 1. FACEBOOK MOCKUP CARD (Hỗ trợ đầy đủ 21 kích thước & bố cục chuẩn Facebook) */
export function FacebookMockupCard({
  data,
  compactCaption = true,
  className = "",
}: {
  data: SocialMockupData;
  compactCaption?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adSlideIdx, setAdSlideIdx] = useState(0);
  const metrics = getDemoMetrics(data.seedKey || data.title || data.caption);
  const initials = deriveInitials(data.pageName);
  const media = data.mediaUrls;
  const safeCaption = (data.caption || "").trim();
  const displayCaption =
    safeCaption ||
    (data.description || "").trim() ||
    data.title ||
    "Chưa có nội dung caption cho bài đăng này.";
  const limit = compactCaption ? 165 : 280;
  const needsMore =
    displayCaption.length > limit || displayCaption.split("\n").length > 4;
  const shownText =
    !expanded && needsMore
      ? displayCaption.split("\n").slice(0, 4).join("\n").slice(0, limit)
      : displayCaption;

  const domainText = `${deriveSocialHandle(data.pageName).replace(/\./g, "")}.vn`;

  // Xác định bố cục chính xác: tôn trọng layout chỉ định tường minh; nếu để mặc định SINGLE_SQUARE thì tự suy luận theo số ảnh
  const explicitKey =
    data.layout && FB_POST_LAYOUTS[data.layout] ? data.layout : undefined;
  let activeLayout: string;
  if (
    explicitKey &&
    (data.respectExplicitLayout || explicitKey !== "SINGLE_SQUARE")
  ) {
    activeLayout = explicitKey;
  } else if (media.length >= 5) {
    activeLayout = "ALBUM_5_HORIZONTAL";
  } else if (media.length === 4) {
    activeLayout = "ALBUM_4";
  } else if (media.length === 3) {
    activeLayout = "ALBUM_3_HORIZONTAL";
  } else if (media.length === 2) {
    activeLayout = "ALBUM_2";
  } else if (data.isVideo) {
    activeLayout = "REELS_VERTICAL";
  } else {
    activeLayout = "SINGLE_SQUARE";
  }

  // Case đặc biệt 1: Ảnh đại diện (Avatar tròn 1000 × 1000)
  if (activeLayout === "AVATAR") {
    return (
      <div
        className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.06)] overflow-hidden flex flex-col ${className}`}
      >
        <div
          className="h-20 w-full relative"
          style={{
            background: `linear-gradient(135deg, ${data.pageColor || "#1877F2"}DD 0%, #1C1E21 100%)`,
          }}
        >
          <span className="absolute top-2.5 right-3 rounded-full bg-black/45 backdrop-blur-xs text-white px-2.5 py-0.5 text-[10px] font-bold">
            Avatar Fanpage • 1000 × 1000 px
          </span>
        </div>

        <div className="px-4 pb-5 -mt-14 flex flex-col items-center text-center">
          <div className="w-40 h-40 rounded-full p-1.5 bg-white shadow-md border-2 border-dashed border-[#1877F2]/70">
            <MockupVisualTile
              src={media[0]}
              alt={data.title || data.pageName}
              className="w-full h-full rounded-full"
              fallbackTitle={initials}
              slotSizeBadge="1000 × 1000"
              compactTile
              accentColor={data.pageColor}
            />
          </div>
          <div className="mt-3 text-base font-extrabold text-[#1C1E21]">
            {data.pageName}
          </div>
          <div className="text-[11px] text-[#65676B] mt-0.5">
            Đặt logo &amp; nhận diện trong vòng tròn an toàn (cắt tròn trên News Feed)
          </div>
          {safeCaption && (
            <p className="mt-2.5 text-xs text-[#4B4F56] line-clamp-2 max-w-[92%]">
              {safeCaption}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Case đặc biệt 2: Ảnh bìa Fanpage (Desktop 1920 × 1080 • Mobile Safe 1920 × 710)
  if (activeLayout === "COVER_FANPAGE") {
    return (
      <div
        className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.06)] overflow-hidden flex flex-col ${className}`}
      >
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="w-full h-full"
            fallbackTitle={data.title || `Ảnh bìa ${data.pageName}`}
            slotSizeBadge="1920 × 1080"
            compactTile
            accentColor={data.pageColor}
          />
          {/* Vùng an toàn Mobile 1920 × 710 (chiếm 65.7% chiều cao ở giữa) */}
          <div className="pointer-events-none absolute inset-x-0 top-[17.1%] bottom-[17.1%] border-y-[1.5px] border-dashed border-[#1877F2]/85 bg-[#1877F2]/[0.04]" />
          <span className="pointer-events-none absolute top-1 left-1.5 rounded bg-black/65 text-white px-1.5 py-0.5 text-[8.5px] font-bold">
            Desktop: 1920×1080
          </span>
          <span className="pointer-events-none absolute bottom-1 right-1.5 rounded bg-[#1877F2]/90 text-white px-1.5 py-0.5 text-[8.5px] font-bold shadow-xs">
            Mobile Safe: 1920×710
          </span>
        </div>

        <div className="px-3.5 pb-3 pt-2 space-y-2 border-t border-slate-100">
          <div className="flex items-end gap-2.5 min-w-0">
            <div
              className="-mt-7 relative z-10 w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center text-white text-xs font-extrabold shadow-sm shrink-0"
              style={{ backgroundColor: data.pageColor || "#3D2B1F" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="text-[13px] font-extrabold text-[#1C1E21] truncate leading-tight">
                {data.pageName}
              </div>
              <div className="text-[10.5px] text-[#65676B] truncate">
                Trang chính thức · {metrics.likesText} theo dõi
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex-1 text-center rounded-lg bg-[#1877F2] text-white px-2.5 py-1 text-[11px] font-bold">
              Nhắn tin
            </span>
            <span className="flex-1 text-center rounded-lg bg-[#E4E6EB] text-[#1C1E21] px-2.5 py-1 text-[11px] font-bold">
              Thích trang
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Case đặc biệt 3: Ảnh bìa Group & Sự kiện (1920 × 1008)
  if (activeLayout === "COVER_EVENT_GROUP") {
    return (
      <div
        className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.06)] overflow-hidden flex flex-col ${className}`}
      >
        <div className="relative aspect-[1920/1008] w-full bg-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="w-full h-full"
            fallbackTitle={data.title || "Ảnh bìa Group / Sự kiện"}
            fallbackTag="Group & Sự kiện"
            slotSizeBadge="1920 × 1008 px"
            accentColor={data.pageColor}
          />
        </div>
        <div className="p-3.5 space-y-2 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#F02849] uppercase">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {data.timeLabel || "Sự kiện sắp diễn ra"}
            </span>
            <span className="inline-flex items-center gap-1 text-[#65676B] normal-case font-semibold">
              <Users className="w-3.5 h-3.5" />
              Nhóm / Sự kiện công khai
            </span>
          </div>
          <div className="text-sm font-extrabold text-[#1C1E21] leading-snug line-clamp-2">
            {data.title || data.pageName}
          </div>
          {safeCaption && (
            <p className="text-[11.5px] text-[#65676B] line-clamp-2">
              {safeCaption}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="flex-1 text-center rounded-lg bg-[#E7F3FF] text-[#1877F2] py-1.5 text-xs font-bold">
              Quan tâm / Tham gia
            </span>
            <span className="rounded-lg bg-[#E4E6EB] text-[#1C1E21] px-3 py-1.5 text-xs font-bold">
              Chia sẻ
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isSponsored =
    activeLayout === "ADS_SLIDESHOW" || activeLayout === "ADS_SHARE_LINK";
  const isTextEmphasized =
    activeLayout === "TEXT_IMAGE_1" || activeLayout === "TEXT_IMAGE_MULTI";
  const adTotalSlides = Math.max(3, media.length);
  const safeAdSlideIdx = Math.min(adSlideIdx, adTotalSlides - 1);

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.06)] overflow-hidden flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-xs"
            style={{ backgroundColor: data.pageColor || "#3D2B1F" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#1C1E21] truncate leading-tight">
              {data.pageName}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#65676B] mt-0.5">
              <span>{isSponsored ? "Được tài trợ" : data.timeLabel || "2 giờ"}</span>
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#65676B] shrink-0" />
      </div>

      {/* Caption */}
      <div
        className={`px-3.5 pb-2.5 text-[#1C1E21] whitespace-pre-wrap break-words ${
          isTextEmphasized
            ? "text-[13.5px] leading-[1.52] font-normal"
            : "text-[13px] leading-[1.45]"
        }`}
      >
        {renderHashtagCaption(shownText, "text-[#1877F2]")}
        {needsMore && !expanded && (
          <>
            <span>... </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="text-[#65676B] font-semibold hover:underline cursor-pointer"
            >
              Xem thêm
            </button>
          </>
        )}
        {needsMore && expanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            className="block mt-1 text-xs text-[#65676B] font-semibold hover:underline cursor-pointer"
          >
            Thu gọn
          </button>
        )}
      </div>

      {/* Media Area — Đầy đủ 18 bố cục Feed / Album / Story & Reels / Link / Ads */}
      {activeLayout === "TEXT_IMAGE_1" ? (
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="aspect-square w-full border-y border-slate-100"
          fallbackTitle={data.title || data.pageName}
          fallbackTag="Text + Hình"
          slotSizeBadge="1440 × 1440 px"
          accentColor={data.pageColor}
        />
      ) : activeLayout === "TEXT_IMAGE_MULTI" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          {[0, 1, 2, 3].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh #${idx + 1}`}
              slotSizeBadge="1440 × 1440"
              compactTile
              accentColor={data.pageColor}
              overlayPlus={idx === 3 && media.length > 4 ? media.length - 4 : 0}
            />
          ))}
        </div>
      ) : activeLayout === "SINGLE_LANDSCAPE" ? (
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="aspect-[3/2] w-full border-y border-slate-100"
          fallbackTitle={data.title || data.pageName}
          fallbackSubtitle={data.postFormat || undefined}
          fallbackTag={data.pillarLabel}
          slotSizeBadge="1200 × 800 px"
          accentColor={data.pageColor}
        />
      ) : activeLayout === "SINGLE_PORTRAIT" ? (
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="aspect-[4/5] w-full border-y border-slate-100"
          fallbackTitle={data.title || data.pageName}
          fallbackSubtitle={data.postFormat || undefined}
          fallbackTag={data.pillarLabel}
          slotSizeBadge="960 × 1200 px"
          accentColor={data.pageColor}
        />
      ) : activeLayout === "ALBUM_2_HORIZONTAL" ? (
        <div className="flex flex-col gap-0.5 bg-white border-y border-slate-100">
          {[0, 1].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-[2/1] w-full"
              fallbackTitle={idx === 0 ? "Ảnh ngang trên" : "Ảnh ngang dưới"}
              slotSizeBadge="1200 × 600 px"
              compactTile
              accentColor={data.pageColor}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_2" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          {[0, 1].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-[1/2] w-full"
              fallbackTitle={idx === 0 ? "Ảnh dọc trái" : "Ảnh dọc phải"}
              slotSizeBadge="600 × 1200"
              compactTile
              accentColor={data.pageColor}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_3_HORIZONTAL" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="col-span-2 aspect-[2/1] w-full"
            fallbackTitle={data.title || "Ảnh chính ngang"}
            slotSizeBadge="1920 × 960 px"
            compactTile
            accentColor={data.pageColor}
          />
          {[1, 2].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh phụ #${idx + 1}`}
              slotSizeBadge="1920 × 1920"
              compactTile
              accentColor={data.pageColor}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_3_VERTICAL" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="row-span-2 h-full w-full"
            fallbackTitle={data.title || "Ảnh chính dọc"}
            slotSizeBadge="960 × 1920"
            compactTile
            accentColor={data.pageColor}
          />
          {[1, 2].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh phụ #${idx + 1}`}
              slotSizeBadge="1920 × 1920"
              compactTile
              accentColor={data.pageColor}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_4_SQUARE" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          {[0, 1, 2, 3].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh vuông #${idx + 1}`}
              slotSizeBadge="1920 × 1920"
              compactTile
              accentColor={data.pageColor}
              overlayPlus={idx === 3 && media.length > 4 ? media.length - 4 : 0}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_4" ? (
        <div className="grid grid-cols-3 gap-0.5 bg-white border-y border-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="col-span-3 aspect-[3/2] w-full"
            fallbackTitle={data.title || "Ảnh chính ngang"}
            slotSizeBadge="1920 × 1280 px"
            compactTile
            accentColor={data.pageColor}
          />
          {[1, 2, 3].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh #${idx + 1}`}
              slotSizeBadge="1920 × 1920"
              compactTile
              accentColor={data.pageColor}
              overlayPlus={idx === 3 && media.length > 4 ? media.length - 4 : 0}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_4_VERTICAL" ? (
        <div className="grid grid-cols-3 gap-0.5 bg-white border-y border-slate-100">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="col-span-2 row-span-3 h-full w-full"
            fallbackTitle={data.title || "Ảnh chính dọc"}
            slotSizeBadge="1280 × 1920"
            compactTile
            accentColor={data.pageColor}
          />
          {[1, 2, 3].map((idx) => (
            <MockupVisualTile
              key={idx}
              src={media[idx]}
              alt={`${data.title || data.pageName} #${idx + 1}`}
              className="aspect-square"
              fallbackTitle={`Ảnh #${idx + 1}`}
              slotSizeBadge="1920 × 1920"
              compactTile
              accentColor={data.pageColor}
              overlayPlus={idx === 3 && media.length > 4 ? media.length - 4 : 0}
            />
          ))}
        </div>
      ) : activeLayout === "ALBUM_5_HORIZONTAL" ? (
        <div className="flex flex-col gap-0.5 bg-white border-y border-slate-100">
          <div className="grid grid-cols-2 gap-0.5">
            {[0, 1].map((idx) => (
              <MockupVisualTile
                key={idx}
                src={media[idx]}
                alt={`${data.title || data.pageName} #${idx + 1}`}
                className="aspect-square"
                fallbackTitle={`Ảnh chính #${idx + 1}`}
                slotSizeBadge="1920 × 1920"
                compactTile
                accentColor={data.pageColor}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {[2, 3, 4].map((idx) => (
              <MockupVisualTile
                key={idx}
                src={media[idx]}
                alt={`${data.title || data.pageName} #${idx + 1}`}
                className="aspect-square"
                fallbackTitle={`Ảnh #${idx + 1}`}
                slotSizeBadge="1920 × 1920"
                compactTile
                accentColor={data.pageColor}
                overlayPlus={
                  idx === 4 && media.length > 5 ? media.length - 5 : 0
                }
              />
            ))}
          </div>
        </div>
      ) : activeLayout === "ALBUM_5_VERTICAL" ? (
        <div className="grid grid-cols-2 gap-0.5 bg-white border-y border-slate-100">
          <div className="flex flex-col gap-0.5">
            {[0, 1].map((idx) => (
              <MockupVisualTile
                key={idx}
                src={media[idx]}
                alt={`${data.title || data.pageName} #${idx + 1}`}
                className="aspect-square w-full"
                fallbackTitle={`Ảnh chính #${idx + 1}`}
                slotSizeBadge="1920 × 1920"
                compactTile
                accentColor={data.pageColor}
              />
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            {[2, 3, 4].map((idx) => (
              <MockupVisualTile
                key={idx}
                src={media[idx]}
                alt={`${data.title || data.pageName} #${idx + 1}`}
                className="aspect-[3/2] w-full"
                fallbackTitle={`Ảnh phụ #${idx + 1}`}
                slotSizeBadge="1920 × 1280"
                compactTile
                accentColor={data.pageColor}
                overlayPlus={
                  idx === 4 && media.length > 5 ? media.length - 5 : 0
                }
              />
            ))}
          </div>
        </div>
      ) : activeLayout === "REELS_VERTICAL" ? (
        <div className="bg-[#12100E] border-y border-slate-100 flex justify-center">
          <div className="relative aspect-[9/16] w-full max-w-[260px]">
            <MockupVisualTile
              src={media[0]}
              alt={data.title || data.pageName}
              className="w-full h-full"
              fallbackTitle={data.title || data.pageName}
              fallbackSubtitle="Story & Reels dọc 9:16"
              fallbackTag="Story & Reels"
              slotSizeBadge="1080 × 1920 px"
              accentColor={data.pageColor}
              dark
              isVideo
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[12%] border-b border-dashed border-white/30 flex items-center justify-center text-[9px] text-white/60 font-semibold">
              Vùng thanh Story / Reels (Top)
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] border-t border-dashed border-white/30 flex items-center justify-center text-[9px] text-white/60 font-semibold">
              Vùng nút tương tác &amp; Caption (Bottom)
            </div>
          </div>
        </div>
      ) : activeLayout === "LINK_PREVIEW" ? (
        <div className="border-y border-slate-200 bg-[#F0F2F5]">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="aspect-[1200/628] w-full"
            fallbackTitle={data.title || "Bài viết chia sẻ Link"}
            fallbackTag="Share Link"
            slotSizeBadge="1200 × 628 px"
            accentColor={data.pageColor}
          />
          <div className="px-3.5 py-2.5 border-t border-slate-200/80">
            <div className="text-[10px] uppercase tracking-wide text-[#65676B]">
              {domainText}
            </div>
            <div className="text-xs font-bold text-[#1C1E21] line-clamp-1 mt-0.5">
              {data.title || "Xem chi tiết bài viết"}
            </div>
          </div>
        </div>
      ) : activeLayout === "ADS_SLIDESHOW" ? (
        <div className="border-y border-slate-200 bg-[#F0F2F5]">
          <div className="relative">
            <MockupVisualTile
              src={media[safeAdSlideIdx]}
              alt={`${data.title || data.pageName} Slide #${safeAdSlideIdx + 1}`}
              className="aspect-square w-full"
              fallbackTitle={
                safeAdSlideIdx === 0
                  ? data.title || "Quảng cáo Slide #1"
                  : `Slide Ads #${safeAdSlideIdx + 1}`
              }
              fallbackTag="Facebook Ads • Slide Show"
              slotSizeBadge="1080 × 1080 px"
              accentColor={data.pageColor}
            />
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/70 text-white px-2 py-0.5 text-[10px] font-bold">
              {safeAdSlideIdx + 1}/{adTotalSlides}
            </span>
            {safeAdSlideIdx > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAdSlideIdx((i) => Math.max(0, i - 1));
                }}
                aria-label="Slide trước"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {safeAdSlideIdx < adTotalSlides - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAdSlideIdx((i) => Math.min(adTotalSlides - 1, i + 1));
                }}
                aria-label="Slide tiếp"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1">
              {Array.from({ length: Math.min(5, adTotalSlides) }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === safeAdSlideIdx ? "bg-[#1877F2]" : "bg-white/75"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-t border-slate-200/80">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-[#65676B]">
                {domainText}
              </div>
              <div className="text-xs font-bold text-[#1C1E21] line-clamp-1">
                {data.title || "Ưu đãi đặc biệt hôm nay"}
              </div>
            </div>
            <span className="rounded-lg bg-[#E4E6EB] text-[#1C1E21] px-2.5 py-1.5 text-[11px] font-bold shrink-0">
              Tìm hiểu thêm
            </span>
          </div>
        </div>
      ) : activeLayout === "ADS_SHARE_LINK" ? (
        <div className="border-y border-slate-200 bg-[#F0F2F5]">
          <MockupVisualTile
            src={media[0]}
            alt={data.title || data.pageName}
            className="aspect-[1200/628] w-full"
            fallbackTitle={data.title || "Quảng cáo Share Link"}
            fallbackTag="Facebook Ads • Share Link"
            slotSizeBadge="1200 × 628 px"
            accentColor={data.pageColor}
          />
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-t border-slate-200/80">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-[#65676B]">
                {domainText}
              </div>
              <div className="text-xs font-bold text-[#1C1E21] line-clamp-1">
                {data.title || "Đăng ký nhận tư vấn ngay"}
              </div>
            </div>
            <span className="rounded-lg bg-[#E4E6EB] text-[#1C1E21] px-2.5 py-1.5 text-[11px] font-bold shrink-0">
              Tìm hiểu thêm
            </span>
          </div>
        </div>
      ) : (
        /* Mặc định: SINGLE_SQUARE (1200 × 1200) */
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="aspect-square w-full border-y border-slate-100"
          fallbackTitle={data.title || data.pageName}
          fallbackSubtitle={data.postFormat || undefined}
          fallbackTag={data.pillarLabel}
          slotSizeBadge="1200 × 1200 px"
          accentColor={data.pageColor}
        />
      )}

      {/* Reaction Summary Bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-1.5 text-[11px] text-[#65676B] border-b border-slate-100 whitespace-nowrap">
        <div className="inline-flex items-center gap-1 shrink-0">
          <span className="inline-flex items-center -space-x-1">
            <span className="w-[16px] h-[16px] rounded-full bg-[#1877F2] text-white inline-flex items-center justify-center ring-1 ring-white">
              <ThumbsUp className="w-2.5 h-2.5 fill-white" />
            </span>
            <span className="w-[16px] h-[16px] rounded-full bg-[#F33E58] text-white inline-flex items-center justify-center ring-1 ring-white">
              <Heart className="w-2.5 h-2.5 fill-white" />
            </span>
          </span>
          <span className="font-medium">{metrics.likesText}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] truncate">
          <span>{metrics.comments} bình luận</span>
          <span>·</span>
          <span>{metrics.shares} chia sẻ</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1.5 grid grid-cols-3 text-[12px] font-semibold text-[#65676B]">
        <div className="inline-flex items-center justify-center gap-1.5 py-1 rounded-lg hover:bg-slate-50">
          <ThumbsUp className="w-4 h-4" />
          <span>Thích</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1.5 py-1 rounded-lg hover:bg-slate-50">
          <MessageCircle className="w-4 h-4" />
          <span>Bình luận</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1.5 py-1 rounded-lg hover:bg-slate-50">
          <Share2 className="w-4 h-4" />
          <span>Chia sẻ</span>
        </div>
      </div>
    </div>
  );
}

/** 2. INSTAGRAM MOCKUP CARD (Hỗ trợ cả 3 kiểu y hệt Ảnh 3: Reels | Carousel Feed | Story) */
export function InstagramMockupCard({
  data,
  variant = "FEED",
  className = "",
}: {
  data: SocialMockupData;
  variant?: InstagramVariant;
  className?: string;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const handle = data.handle || deriveSocialHandle(data.pageName);
  const initials = deriveInitials(data.pageName);
  const metrics = getDemoMetrics(`ig-${data.seedKey || data.title || data.caption}`);
  const media = data.mediaUrls;
  const totalSlides = Math.max(1, media.length);
  const safeSlideIdx = Math.min(slideIdx, totalSlides - 1);
  const safeCaption = (data.caption || data.title || "").trim();

  if (variant === "REELS") {
    return (
      <div
        className={`relative aspect-[9/15] w-full rounded-2xl overflow-hidden bg-[#181412] shadow-[0_4px_20px_rgba(24,16,10,0.16)] border border-[#2B221D] text-white ${className}`}
      >
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="absolute inset-0 w-full h-full"
          fallbackTitle={data.title || data.pageName}
          fallbackSubtitle="Kịch bản Reels dọc 9:16"
          fallbackTag={data.pillarLabel}
          accentColor={data.pageColor}
          dark
          isVideo
          safeRightPad
        />

        {/* Top gradient + Reels header */}
        <div className="absolute inset-x-0 top-0 p-3.5 bg-gradient-to-b from-black/55 to-transparent flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-tight drop-shadow">
            Reels
          </span>
          <Camera className="w-4 h-4 text-white/95 drop-shadow" />
        </div>

        {/* Right vertical action bar */}
        <div className="absolute right-3 bottom-16 flex flex-col items-center gap-3.5 text-[11px] font-bold drop-shadow">
          <div className="flex flex-col items-center gap-0.5">
            <Heart className="w-5 h-5" />
            <span>{metrics.likesText}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <MessageCircle className="w-5 h-5" />
            <span>{metrics.comments}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Send className="w-5 h-5" />
            <span>{metrics.shares}</span>
          </div>
          <MoreHorizontal className="w-5 h-5" />
        </div>

        {/* Bottom gradient + Handle & Caption */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 pt-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent space-y-2 pr-12">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white ring-1 ring-white/50 shrink-0"
              style={{ backgroundColor: data.pageColor || "#3D2B1F" }}
            >
              {initials}
            </div>
            <span className="text-xs font-bold truncate">{handle}</span>
            <span className="rounded-md border border-white/60 px-2 py-0.5 text-[10px] font-bold">
              Theo dõi
            </span>
          </div>
          <p className="text-[11.5px] leading-snug text-white/95 line-clamp-2">
            {renderHashtagCaption(safeCaption || "Nội dung Reels...", "text-sky-300")}
          </p>
          <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
            <Music2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{handle} · Âm thanh gốc</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "STORY") {
    const poll = extractStoryPollQuestion(data);
    return (
      <div
        className={`relative aspect-[9/15] w-full rounded-2xl overflow-hidden bg-[#1D1815] shadow-[0_4px_20px_rgba(24,16,10,0.16)] border border-[#2D241E] text-white flex flex-col justify-between ${className}`}
      >
        <MockupVisualTile
          src={media[0]}
          alt={data.title || data.pageName}
          className="absolute inset-0 w-full h-full"
          fallbackTitle={data.title || data.pageName}
          fallbackTag={data.pillarLabel}
          accentColor={data.pageColor}
          dark
        />

        {/* Top story progress bars + header */}
        <div className="relative z-10 p-3 bg-gradient-to-b from-black/65 to-transparent space-y-2">
          <div className="grid grid-cols-3 gap-1">
            <div className="h-[2.5px] rounded-full bg-white" />
            <div className="h-[2.5px] rounded-full bg-white/40" />
            <div className="h-[2.5px] rounded-full bg-white/40" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white ring-1 ring-white/70 shrink-0"
                style={{ backgroundColor: data.pageColor || "#3D2B1F" }}
              >
                {initials}
              </div>
              <span className="text-xs font-bold truncate">{handle}</span>
              <span className="text-[11px] text-white/75 shrink-0">
                {data.timeLabel || "4 giờ"}
              </span>
            </div>
            <X className="w-4 h-4 text-white/90 shrink-0" />
          </div>
        </div>

        {/* Center interactive Poll/CTA sticker */}
        <div className="relative z-10 px-4 my-auto">
          <div className="rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 p-3.5 shadow-xl space-y-2 border border-white">
            <div className="text-xs font-extrabold text-center text-[#1F1A17] leading-snug">
              {poll.question}
            </div>
            <div className="space-y-1.5 text-[11px] font-bold">
              <div className="rounded-xl bg-[#F3E2D4] text-[#5D331B] px-3 py-1.5 text-center">
                {poll.optA}
              </div>
              <div className="rounded-xl bg-[#F6F3EE] text-[#4C433C] px-3 py-1.5 text-center">
                {poll.optB}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom message reply pill */}
        <div className="relative z-10 p-3 bg-gradient-to-t from-black/75 to-transparent flex items-center gap-2">
          <div className="flex-1 rounded-full border border-white/60 bg-black/25 px-3.5 py-1.5 text-[11px] text-white/85">
            Gửi tin nhắn...
          </div>
          <Heart className="w-5 h-5 text-white shrink-0" />
          <Send className="w-5 h-5 text-white shrink-0" />
        </div>
      </div>
    );
  }

  // Default: INSTAGRAM FEED / CAROUSEL
  return (
    <div
      className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.06)] overflow-hidden flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold ring-2 ring-white"
              style={{ backgroundColor: data.pageColor || "#3D2B1F" }}
            >
              {initials}
            </div>
          </div>
          <span className="text-[12.5px] font-bold text-[#1C1E21] truncate">
            {handle}
          </span>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#262626] shrink-0" />
      </div>

      {/* Square / 4:5 Media with Carousel Counter & Arrows */}
      <div className="relative">
        <MockupVisualTile
          src={media[safeSlideIdx]}
          alt={data.title || data.pageName}
          className="aspect-[4/5] w-full"
          fallbackTitle={data.title || data.pageName}
          fallbackSubtitle={data.postFormat || undefined}
          fallbackTag={data.pillarLabel}
          accentColor={data.pageColor}
          isVideo={Boolean(data.isVideo) && media.length <= 1}
        />

        {totalSlides > 1 && (
          <>
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/70 text-white px-2 py-0.5 text-[10.5px] font-bold">
              {safeSlideIdx + 1}/{totalSlides}
            </span>
            {safeSlideIdx > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((i) => Math.max(0, i - 1));
                }}
                aria-label="Ảnh trước"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/85 hover:bg-white text-slate-800 flex items-center justify-center shadow cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {safeSlideIdx < totalSlides - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((i) => Math.min(totalSlides - 1, i + 1));
                }}
                aria-label="Ảnh tiếp"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/85 hover:bg-white text-slate-800 flex items-center justify-center shadow cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Instagram Icon Bar + Dots */}
      <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between text-[#262626]">
        <div className="flex items-center gap-3.5">
          <Heart className="w-5 h-5" />
          <MessageCircle className="w-5 h-5" />
          <Send className="w-5 h-5" />
        </div>

        {totalSlides > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalSlides) }).map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i === safeSlideIdx ? "bg-[#0095F6]" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        )}

        <Bookmark className="w-5 h-5" />
      </div>

      {/* Likes & Caption */}
      <div className="px-3.5 pb-3.5 space-y-1 text-[12px] text-[#262626]">
        <div className="font-bold">{metrics.likesExact} lượt thích</div>
        <p className="leading-snug line-clamp-3">
          <span className="font-bold mr-1.5">{handle}</span>
          {renderHashtagCaption(safeCaption || "Nội dung bài đăng Instagram...", "text-[#00376B]")}
        </p>
        <div className="text-[11px] text-slate-400">
          Xem tất cả {metrics.comments} bình luận
        </div>
      </div>
    </div>
  );
}

/** 3. TIKTOK MOCKUP CARD (Chuẩn giao diện Feed 9:16 dọc TikTok) */
export function TikTokMockupCard({
  data,
  className = "",
}: {
  data: SocialMockupData;
  className?: string;
}) {
  const handle = data.handle || deriveSocialHandle(data.pageName);
  const initials = deriveInitials(data.pageName);
  const metrics = getDemoMetrics(`tt-${data.seedKey || data.title || data.caption}`);
  const safeCaption = (data.caption || data.title || "").trim();

  return (
    <div
      className={`relative aspect-[9/15] w-full rounded-2xl overflow-hidden bg-[#0F0F12] shadow-[0_4px_20px_rgba(12,12,18,0.22)] border border-slate-800 text-white ${className}`}
    >
      <MockupVisualTile
        src={data.mediaUrls[0]}
        alt={data.title || data.pageName}
        className="absolute inset-0 w-full h-full"
        fallbackTitle={data.title || data.pageName}
        fallbackSubtitle="Video TikTok 9:16 • Hook 3 giây đầu"
        fallbackTag={data.pillarLabel}
        accentColor={data.pageColor}
        dark
        isVideo
        safeRightPad
      />

      {/* Top TikTok tabs */}
      <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between text-[11px]">
        <span className="w-4" />
        <div className="flex items-center gap-3 font-bold">
          <span className="text-white/65">Đang Follow</span>
          <span className="text-white border-b-2 border-white pb-0.5">
            Dành cho bạn
          </span>
        </div>
        <Search className="w-4 h-4 text-white/90" />
      </div>

      {/* Right TikTok action stack */}
      <div className="absolute right-2.5 bottom-14 flex flex-col items-center gap-3 text-[10.5px] font-bold drop-shadow">
        <div className="relative mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold ring-2 ring-white"
            style={{ backgroundColor: data.pageColor || "#111827" }}
          >
            {initials}
          </div>
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FE2C55] text-white text-[10px] font-black flex items-center justify-center">
            +
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Heart className="w-5 h-5 fill-white" />
          <span>{metrics.likesText}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-5 h-5 fill-white/90" />
          <span>{metrics.comments}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Bookmark className="w-5 h-5 fill-white/90" />
          <span>{Math.max(15, Math.round(metrics.shares * 1.4))}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Share2 className="w-5 h-5" />
          <span>{metrics.shares}</span>
        </div>
      </div>

      {/* Bottom caption & sound */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 pt-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent space-y-1.5 pr-12">
        <div className="text-xs font-extrabold">@{handle}</div>
        <p className="text-[11.5px] leading-snug text-white/95 line-clamp-2">
          {renderHashtagCaption(safeCaption || "Kịch bản TikTok...", "text-cyan-300")}
        </p>
        <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
          <Music2 className="w-3 h-3 shrink-0" />
          <span className="truncate">Nhạc nền gốc - {data.pageName}</span>
        </div>
      </div>
    </div>
  );
}

/** 4. THREADS MOCKUP CARD (Chuẩn giao diện Threads tối giản, thanh lịch) */
export function ThreadsMockupCard({
  data,
  className = "",
}: {
  data: SocialMockupData;
  className?: string;
}) {
  const handle = data.handle || deriveSocialHandle(data.pageName);
  const initials = deriveInitials(data.pageName);
  const metrics = getDemoMetrics(`th-${data.seedKey || data.title || data.caption}`);
  const safeCaption = (
    data.caption ||
    data.description ||
    data.title ||
    "Nội dung bài đăng Threads..."
  ).trim();
  const media = data.mediaUrls;

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E8E0D6] shadow-[0_2px_14px_rgba(38,24,12,0.05)] p-4 flex gap-3 ${className}`}
    >
      {/* Left Avatar + Thread line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-xs"
          style={{ backgroundColor: data.pageColor || "#18181B" }}
        >
          {initials}
        </div>
        <div className="w-[2px] flex-1 bg-slate-200 my-2 rounded-full min-h-[24px]" />
        <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
          {initials[0]}
        </div>
      </div>

      {/* Right Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-bold text-[#101010] truncate">
              {handle}
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">
              {data.timeLabel || "3 giờ"}
            </span>
          </div>
          <MoreHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <p className="text-[13px] text-[#101010] whitespace-pre-wrap leading-relaxed line-clamp-6 break-words">
          {renderHashtagCaption(safeCaption, "text-sky-600")}
        </p>

        {media.length > 0 ? (
          media.length === 1 ? (
            <MockupVisualTile
              src={media[0]}
              alt={data.title || data.pageName}
              className="aspect-[4/3] w-full rounded-xl border border-slate-200/80"
              fallbackTitle={data.title || data.pageName}
              accentColor={data.pageColor}
              isVideo={Boolean(data.isVideo)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {media.slice(0, 2).map((u, idx) => (
                <MockupVisualTile
                  key={idx}
                  src={u}
                  alt={`${data.title || data.pageName} #${idx + 1}`}
                  className="aspect-square rounded-xl border border-slate-200/80"
                  fallbackTitle={`Ảnh #${idx + 1}`}
                  accentColor={data.pageColor}
                  overlayPlus={idx === 1 && media.length > 2 ? media.length - 2 : 0}
                />
              ))}
            </div>
          )
        ) : (
          <MockupVisualTile
            src={null}
            alt={data.title || data.pageName}
            className="aspect-[16/9] w-full rounded-xl border border-[#EAE0D5]"
            fallbackTitle={data.title || data.pageName}
            fallbackTag={data.pillarLabel}
            accentColor={data.pageColor}
          />
        )}

        {/* Threads Actions */}
        <div className="flex items-center gap-4 pt-1 text-[#262626]">
          <Heart className="w-4 h-4" />
          <MessageCircle className="w-4 h-4" />
          <Repeat2 className="w-4 h-4" />
          <Send className="w-4 h-4" />
        </div>

        <div className="text-[11px] text-slate-400">
          {metrics.comments} trả lời · {metrics.likesText} lượt thích
        </div>
      </div>
    </div>
  );
}
