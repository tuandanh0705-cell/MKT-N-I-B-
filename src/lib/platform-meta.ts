import { getResourceLinks } from "@/lib/resource-links";
import type { ProjectChannelSuggestions } from "@/types/crm";

export type PlatformKind =
  | "TIKTOK"
  | "FANPAGE"
  | "GROUP"
  | "WEB"
  | "INSTAGRAM"
  | "YOUTUBE"
  | "THREADS"
  | "ZALO"
  | "SHOPEE"
  | "ADS"
  | "OTHER";

export interface PlatformChannelMeta {
  kind: PlatformKind;
  displayLabel: string;
  channelFieldLabel: string;
  channelShortLabel: string;
  channelPlaceholder: string;
  emptyChannelLabel: string;
  suggestionBucket: keyof ProjectChannelSuggestions;
  badgeClass: string;
}

export function normalizePlatformKind(platform?: string | null): PlatformKind {
  const lower = (platform || "Fanpage").trim().toLowerCase();
  if (lower.includes("tiktok")) return "TIKTOK";
  if (
    lower === "web" ||
    lower.includes("website") ||
    lower.includes("web seo") ||
    lower === "blog" ||
    lower === "seo"
  ) {
    return "WEB";
  }
  if (lower.includes("group") || lower.includes("nhóm")) return "GROUP";
  if (lower.includes("insta") || lower === "ig") return "INSTAGRAM";
  if (lower.includes("youtube") || lower === "yt") return "YOUTUBE";
  if (lower.includes("threads")) return "THREADS";
  if (lower.includes("zalo")) return "ZALO";
  if (lower.includes("shopee")) return "SHOPEE";
  if (lower.includes("ads")) return "ADS";
  if (lower.includes("fanpage") || lower.includes("facebook") || lower === "fb") {
    return "FANPAGE";
  }
  return "OTHER";
}

export function normalizePlatformSelectValue(platform?: string | null): string {
  const raw = (platform || "Fanpage").trim();
  const kind = normalizePlatformKind(raw);
  if (kind === "WEB" && raw.toLowerCase() === "website") return "WEB";
  return raw || "Fanpage";
}

export function getPlatformChannelMeta(
  platform?: string | null
): PlatformChannelMeta {
  const kind = normalizePlatformKind(platform);
  switch (kind) {
    case "TIKTOK":
      return {
        kind,
        displayLabel: "TikTok",
        channelFieldLabel: "Kênh TikTok đăng bài",
        channelShortLabel: "Kênh TikTok",
        channelPlaceholder: "VD: @metaecom.official hoặc tên kênh TikTok...",
        emptyChannelLabel: "Chưa chọn kênh TikTok",
        suggestionBucket: "tiktoks",
        badgeClass: "bg-slate-900 text-white border-slate-800",
      };
    case "WEB":
      return {
        kind,
        displayLabel: "WEB",
        channelFieldLabel: "Website đăng bài",
        channelShortLabel: "Website",
        channelPlaceholder: "VD: metaecom.vn hoặc blog.inpro.vn...",
        emptyChannelLabel: "Chưa chọn Website",
        suggestionBucket: "websites",
        badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
      };
    case "GROUP":
      return {
        kind,
        displayLabel: "Group Facebook",
        channelFieldLabel: "Group Facebook đăng bài",
        channelShortLabel: "Group",
        channelPlaceholder: "VD: Cộng đồng Review Meta Ecom...",
        emptyChannelLabel: "Chưa chọn Group",
        suggestionBucket: "fanpages",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "INSTAGRAM":
      return {
        kind,
        displayLabel: "Instagram",
        channelFieldLabel: "Tài khoản Instagram",
        channelShortLabel: "Instagram",
        channelPlaceholder: "VD: @metaecom.ig...",
        emptyChannelLabel: "Chưa chọn tài khoản IG",
        suggestionBucket: "others",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      };
    case "YOUTUBE":
      return {
        kind,
        displayLabel: "YouTube",
        channelFieldLabel: "Kênh YouTube",
        channelShortLabel: "Kênh YouTube",
        channelPlaceholder: "VD: Meta Ecom Official...",
        emptyChannelLabel: "Chưa chọn kênh YouTube",
        suggestionBucket: "others",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
      };
    case "THREADS":
      return {
        kind,
        displayLabel: "Threads",
        channelFieldLabel: "Tài khoản Threads",
        channelShortLabel: "Threads",
        channelPlaceholder: "VD: @metaecom.threads...",
        emptyChannelLabel: "Chưa chọn Threads",
        suggestionBucket: "others",
        badgeClass: "bg-slate-100 text-slate-900 border-slate-300",
      };
    case "ZALO":
      return {
        kind,
        displayLabel: "Zalo",
        channelFieldLabel: "Zalo OA / Nhóm Zalo",
        channelShortLabel: "Zalo",
        channelPlaceholder: "VD: Zalo OA Meta Ecom...",
        emptyChannelLabel: "Chưa chọn Zalo",
        suggestionBucket: "others",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
      };
    case "SHOPEE":
      return {
        kind,
        displayLabel: "Shopee",
        channelFieldLabel: "Gian hàng Shopee",
        channelShortLabel: "Gian hàng",
        channelPlaceholder: "VD: Meta Ecom Mall...",
        emptyChannelLabel: "Chưa chọn gian hàng",
        suggestionBucket: "others",
        badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
      };
    case "ADS":
      return {
        kind,
        displayLabel: "Ads Manager",
        channelFieldLabel: "Fanpage / Tài khoản chạy Ads",
        channelShortLabel: "Tài khoản Ads",
        channelPlaceholder: "VD: BM Meta Ecom / Fanpage chạy Ads...",
        emptyChannelLabel: "Chưa gắn Page / TKQC",
        suggestionBucket: "fanpages",
        badgeClass: "bg-blue-50 text-blue-900 border-blue-200",
      };
    case "OTHER": {
      const customLabel = (platform || "").trim() || "Kênh khác";
      return {
        kind: "OTHER",
        displayLabel: customLabel,
        channelFieldLabel: `Kênh ${customLabel}`,
        channelShortLabel: customLabel,
        channelPlaceholder: `VD: Tên kênh / link ${customLabel}...`,
        emptyChannelLabel: `Chưa gắn ${customLabel}`,
        suggestionBucket: "others",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
      };
    }
    default:
      return {
        kind: "FANPAGE",
        displayLabel: "Fanpage",
        channelFieldLabel: "Fanpage / Page đăng bài",
        channelShortLabel: "Fanpage",
        channelPlaceholder: "VD: Meta Ecom Official Fanpage...",
        emptyChannelLabel: "Chưa chọn Fanpage",
        suggestionBucket: "fanpages",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      };
  }
}

export function getSuggestionsForPlatform(
  platform: string | null | undefined,
  suggestions?: ProjectChannelSuggestions | null
): string[] {
  if (!suggestions) return [];
  const meta = getPlatformChannelMeta(platform);
  return suggestions[meta.suggestionBucket] ?? [];
}

function addUnique(set: Set<string>, val?: string | null) {
  const cleaned = String(val ?? "").trim();
  if (cleaned) set.add(cleaned);
}

function extractDomainOrHandle(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return rawUrl.trim();
  }
}

export function buildProjectChannelSuggestions(params: {
  fanpages?: Array<{ name: string; pageUrl?: string | null }>;
  resources?: Array<{
    title: string;
    url: string;
    linksJson?: unknown;
    tags?: string | null;
  }>;
  tasks?: Array<{ platform?: string | null; publishChannel?: string | null }>;
}): ProjectChannelSuggestions {
  const fanpages = new Set<string>();
  const tiktoks = new Set<string>();
  const websites = new Set<string>();
  const others = new Set<string>();

  for (const fp of params.fanpages ?? []) {
    addUnique(fanpages, fp.name);
  }

  for (const res of params.resources ?? []) {
    const links = getResourceLinks({
      url: res.url,
      linksJson: res.linksJson,
    });
    const candidates =
      links.length > 0
        ? links.map((l) => ({
            url: l.url,
            label: l.label?.trim() || res.title,
          }))
        : [{ url: res.url, label: res.title }];
    for (const item of candidates) {
      const urlLower = (item.url || "").toLowerCase();
      const textLower = `${item.label} ${res.title} ${res.tags || ""}`.toLowerCase();
      if (urlLower.includes("tiktok.com") || textLower.includes("tiktok")) {
        const match = item.url.match(/tiktok\.com\/(@[\w.-]+)/i);
        addUnique(tiktoks, match ? match[1] : item.label);
      } else if (
        urlLower.includes("facebook.com") ||
        urlLower.includes("fb.com") ||
        textLower.includes("fanpage")
      ) {
        addUnique(fanpages, item.label);
      } else if (
        urlLower.startsWith("http") &&
        !urlLower.includes("drive.google.com") &&
        !urlLower.includes("docs.google.com") &&
        !urlLower.includes("canva.com") &&
        !urlLower.includes("figma.com")
      ) {
        if (
          textLower.includes("web") ||
          textLower.includes("site") ||
          textLower.includes("blog")
        ) {
          addUnique(websites, extractDomainOrHandle(item.url));
        }
      }
    }
  }

  for (const t of params.tasks ?? []) {
    if (!t.publishChannel?.trim()) continue;
    const bucket = getPlatformChannelMeta(t.platform).suggestionBucket;
    if (bucket === "fanpages") addUnique(fanpages, t.publishChannel);
    else if (bucket === "tiktoks") addUnique(tiktoks, t.publishChannel);
    else if (bucket === "websites") addUnique(websites, t.publishChannel);
    else addUnique(others, t.publishChannel);
  }

  return {
    fanpages: [...fanpages],
    tiktoks: [...tiktoks],
    websites: [...websites],
    others: [...others],
  };
}
