import { normalizeMediaBriefItems, type MediaBriefItem } from "@/lib/media-brief";
import type { AssetLinkItem, TaskItem } from "@/types/crm";
import type { TaskType } from "@/generated/prisma/client";

export type OutputCategoryKey = "CONTENT" | "IMAGE" | "VIDEO" | "OTHER";
export type OutputCategoryFilter = "ALL" | OutputCategoryKey;
export type OutputReadinessFilter =
  | "ALL"
  | "HAS_OUTPUT"
  | "NEEDS_REVIEW"
  | "APPROVED_OR_DONE"
  | "REVISION_NEEDED"
  | "MISSING_OUTPUT";

export const OUTPUT_CATEGORY_META: Record<
  OutputCategoryKey,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    accentBorder: string;
  }
> = {
  CONTENT: {
    label: "Nội dung Content",
    shortLabel: "Content",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    accentBorder: "border-sky-200/80",
  },
  IMAGE: {
    label: "Ấn phẩm Ảnh",
    shortLabel: "Ảnh",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    accentBorder: "border-amber-200/80",
  },
  VIDEO: {
    label: "Video / Quay dựng",
    shortLabel: "Video",
    badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
    accentBorder: "border-violet-200/80",
  },
  OTHER: {
    label: "Web / Ads / Seeding",
    shortLabel: "Khác",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    accentBorder: "border-slate-200",
  },
};

/** Phân loại đầu việc sang nhóm Output chính (Content, Ảnh, Video, Khác). */
export function getTaskOutputCategory(taskType: TaskType): OutputCategoryKey {
  if (
    taskType === "CONTENT_SOCIAL" ||
    taskType === "CONTENT_ADS" ||
    taskType === "CONTENT_WEB"
  ) {
    return "CONTENT";
  }
  if (taskType === "MEDIA_IMAGE") return "IMAGE";
  if (taskType === "MEDIA_VIDEO") return "VIDEO";
  return "OTHER";
}

/**
 * Chuyển đổi các URL ảnh trực tiếp hoặc link chia sẻ Google Drive sang URL
 * hiển thị được trực tiếp dưới dạng thumbnail xem trước.
 */
export function extractAssetPreviewImageUrl(rawUrl: string): string | null {
  const url = (rawUrl || "").trim();
  if (!url) return null;

  if (/^data:image\//i.test(url) || /^blob:/i.test(url)) return url;
  if (/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url)) return url;
  if (/lh3\.googleusercontent\.com\//i.test(url)) return url;

  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1000`;
  }

  const driveIdParam = url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveIdParam?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveIdParam[1]}&sz=w1000`;
  }

  return null;
}

/** Rút gọn tên nguồn/nền tảng của link sản phẩm để hiển thị rõ ràng. */
export function getAssetDomainLabel(rawUrl: string): string {
  const url = (rawUrl || "").trim();
  if (!url) return "Link";
  if (/^data:image\//i.test(url)) return "Ảnh tải lên";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("drive.google.com")) return "Google Drive";
    if (host.includes("docs.google.com")) return "Google Docs";
    if (host.includes("canva.com")) return "Canva";
    if (host.includes("figma.com")) return "Figma";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "Facebook";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("capcut.com")) return "CapCut";
    return host;
  } catch {
    return "Liên kết";
  }
}

export interface AnalyzedTaskOutput {
  category: OutputCategoryKey;
  hasCaption: boolean;
  hasDescription: boolean;
  demoAssets: AssetLinkItem[];
  finalAssets: AssetLinkItem[];
  publishedAssets: AssetLinkItem[];
  briefRefAssets: AssetLinkItem[];
  deliverableAssets: AssetLinkItem[];
  imagePreviews: Array<{ asset: AssetLinkItem; previewUrl: string }>;
  mediaBriefItems: MediaBriefItem[];
  hasSubmittedOutput: boolean;
  unitLabel: string;
}

/** Phân tích toàn diện sản phẩm đầu ra (caption, asset demo/final/đã đăng, ảnh xem trước). */
export function analyzeTaskOutputs(task: TaskItem): AnalyzedTaskOutput {
  const category = getTaskOutputCategory(task.taskType);
  const caption = (task.caption || "").trim();
  const description = (task.description || "").trim();
  const assets = task.assets ?? [];

  const finalAssets = assets.filter((a) => a.kind === "FINAL");
  const publishedAssets = assets.filter((a) => a.kind === "PUBLISHED_LINK");
  const demoAssets = assets.filter((a) => a.kind === "DEMO");
  const briefRefAssets = assets.filter((a) => a.kind === "BRIEF_REF");
  const deliverableAssets = [...finalAssets, ...publishedAssets, ...demoAssets];

  const seenPreviewUrls = new Set<string>();
  const imagePreviews: Array<{ asset: AssetLinkItem; previewUrl: string }> = [];
  for (const asset of deliverableAssets) {
    const previewUrl = extractAssetPreviewImageUrl(asset.url);
    if (previewUrl && !seenPreviewUrls.has(previewUrl)) {
      seenPreviewUrls.add(previewUrl);
      imagePreviews.push({ asset, previewUrl });
    }
  }

  const mediaBriefItems = normalizeMediaBriefItems(task.mediaBriefItemsJson);
  const hasProductLink = Boolean((task.productLink || "").trim());
  const hasSubmittedOutput =
    caption.length > 0 || deliverableAssets.length > 0 || hasProductLink;

  const unitLabel =
    category === "IMAGE"
      ? "ảnh"
      : category === "VIDEO"
        ? "video"
        : category === "CONTENT"
          ? "bài"
          : task.taskType === "SEEDING_SUPPORT"
            ? "lượt"
            : "sản phẩm";

  return {
    category,
    hasCaption: caption.length > 0,
    hasDescription: description.length > 0,
    demoAssets,
    finalAssets,
    publishedAssets,
    briefRefAssets,
    deliverableAssets,
    imagePreviews,
    mediaBriefItems,
    hasSubmittedOutput,
    unitLabel,
  };
}

/** Sắp xếp ưu tiên đầu việc chờ duyệt và đầu việc đã nộp output lên đầu để Leader check nhanh. */
export function sortTasksForOutputCheck(tasks: TaskItem[]): TaskItem[] {
  const getPriorityScore = (t: TaskItem): number => {
    if (t.status === "WAITING_APPROVAL") return 5;
    if (t.status === "BRIEF_REVIEW") return 4;
    if (t.status === "REVISION_NEEDED") return 3;
    const analyzed = analyzeTaskOutputs(t);
    if (analyzed.hasSubmittedOutput) return 2;
    return 1;
  };

  return [...tasks].sort((a, b) => {
    const scoreDiff = getPriorityScore(b) - getPriorityScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aTime = new Date(
      a.submittedAt ?? a.completedAt ?? a.approvedAt ?? a.createdAt
    ).getTime();
    const bTime = new Date(
      b.submittedAt ?? b.completedAt ?? b.approvedAt ?? b.createdAt
    ).getTime();
    return bTime - aTime;
  });
}
