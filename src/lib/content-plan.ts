import type { TaskItem } from "@/types/crm";
import type { TaskStatus, TaskType } from "@/generated/prisma/client";

export interface ProjectOverviewData {
  productSummary: string;
  targetAudience: string;
  painPoints: string;
  usp: string;
  toneAndVoice: string;
  forbiddenNotes: string;
  planSheetUrl: string;
  hashtagsDefault: string;
}

export interface MatrixDepthRow {
  key: string;
  label: string;
  goal: string;
}

export interface ContentMatrixTopic {
  id: string;
  title: string;
}

export interface ContentMatrixIdea {
  id: string;
  topicId: string;
  depthKey: string;
  text: string;
  route?: string;
  format?: string;
  linkedTaskId?: string | null;
}

export interface ContentMatrixData {
  depths: MatrixDepthRow[];
  topics: ContentMatrixTopic[];
  ideas: ContentMatrixIdea[];
}

export const DEFAULT_MATRIX_DEPTHS: MatrixDepthRow[] = [
  {
    key: "DEFINITION",
    label: "Định Nghĩa",
    goal: "Giúp người mới hiểu đúng khái niệm nền tảng",
  },
  {
    key: "MISCONCEPTION",
    label: "Hiểu Lầm",
    goal: "Người mới thường hiểu sai gì",
  },
  {
    key: "SIGNS",
    label: "Dấu hiệu",
    goal: "Làm sao để nhận ra mình đang gặp vấn đề này",
  },
  {
    key: "CAUSE",
    label: "Nguyên nhân",
    goal: "Vì sao chuyện đó xảy ra",
  },
  {
    key: "METHOD",
    label: "Phương pháp",
    goal: "Hướng dẫn cụ thể, để làm",
  },
  {
    key: "CASE",
    label: "Case",
    goal: "Giải case",
  },
  {
    key: "OPINION",
    label: "Quan điểm",
    goal: "Tạo màu sắc, giúp kênh có lập trình và chiều sâu hơn",
  },
];

export const CONTENT_ROUTE_OPTIONS = [
  {
    value: "EDUCATE",
    label: "EDUCATE",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    value: "SO SÁNH",
    label: "SO SÁNH",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    value: "VẤN ĐỀ - GP",
    label: "VẤN ĐỀ - GP",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    value: "SỰ KIỆN",
    label: "SỰ KIỆN",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    value: "CASE",
    label: "CASE STUDY",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "BÁN HÀNG",
    label: "BÁN HÀNG / PR",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    value: "QUAN ĐIỂM",
    label: "QUAN ĐIỂM",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
] as const;

export const POST_FORMAT_OPTIONS = [
  "Ảnh",
  "Video",
  "Carousel",
  "Reels",
  "Bài chữ",
  "Livestream",
] as const;

export const CONTENT_PLATFORM_OPTIONS = [
  "Fanpage",
  "TikTok",
  "WEB",
  "Facebook",
  "Group",
  "Instagram",
  "YouTube",
  "Threads",
  "Zalo",
  "Shopee",
] as const;

export function getContentRouteMeta(route?: string | null): {
  label: string;
  badgeClass: string;
} {
  const raw = String(route ?? "").trim();
  if (!raw) {
    return {
      label: "Chưa gắn tuyến",
      badgeClass: "bg-slate-50 text-slate-500 border-slate-200",
    };
  }
  const upper = raw.toUpperCase();
  if (upper.includes("EDUCAT")) return CONTENT_ROUTE_OPTIONS[0];
  if (upper.includes("SO SÁNH") || upper.includes("SO SANH")) {
    return CONTENT_ROUTE_OPTIONS[1];
  }
  if (
    upper.includes("VẤN ĐỀ") ||
    upper.includes("VAN DE") ||
    upper.includes("VĐỀ") ||
    upper.includes("GP")
  ) {
    return CONTENT_ROUTE_OPTIONS[2];
  }
  if (upper.includes("SỰ KIỆN") || upper.includes("SU KIEN")) {
    return CONTENT_ROUTE_OPTIONS[3];
  }
  if (upper.includes("CASE")) return CONTENT_ROUTE_OPTIONS[4];
  if (upper.includes("BÁN") || upper.includes("PR") || upper.includes("SALE")) {
    return CONTENT_ROUTE_OPTIONS[5];
  }
  if (upper.includes("QUAN ĐIỂM") || upper.includes("QUAN DIEM")) {
    return CONTENT_ROUTE_OPTIONS[6];
  }
  return {
    label: raw,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  };
}

export function getPostFormatMeta(format?: string | null): {
  label: string;
  badgeClass: string;
} {
  const f = String(format ?? "").trim() || "Ảnh";
  const lower = f.toLowerCase();
  if (lower.includes("video") || lower.includes("reel")) {
    return {
      label: f,
      badgeClass: "bg-amber-100/90 text-amber-900 border-amber-300",
    };
  }
  if (lower.includes("carousel") || lower.includes("album")) {
    return {
      label: f,
      badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    };
  }
  if (lower.includes("live")) {
    return {
      label: f,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    };
  }
  if (lower.includes("chữ") || lower.includes("text")) {
    return {
      label: f,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    };
  }
  return {
    label: f,
    badgeClass: "bg-orange-100/80 text-orange-900 border-orange-200",
  };
}

export function getContentStatusDisplay(
  status: TaskStatus,
  isAired?: boolean
): { label: string; badgeClass: string } {
  if (isAired || status === "PUBLISHED") {
    return {
      label: "Đã Air / Đăng",
      badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
    };
  }
  switch (status) {
    case "DRAFT":
      return {
        label: "Nháp",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "BRIEF_REVIEW":
      return {
        label: "Chờ ảnh / Brief",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "IN_PROGRESS":
      return {
        label: "Đang viết",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "WAITING_APPROVAL":
      return {
        label: "Chờ Leader duyệt",
        badgeClass: "bg-violet-100 text-violet-800 border-violet-300",
      };
    case "REVISION_NEEDED":
      return {
        label: "Cần sửa lại",
        badgeClass: "bg-rose-100 text-rose-700 border-rose-300",
      };
    case "APPROVED_FINAL":
      return {
        label: "Đã duyệt Final",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    case "DONE":
      return {
        label: "Hoàn tất",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export function deriveDefaultFormat(task: Pick<TaskItem, "postFormat" | "taskType" | "fbPostLayout">): string {
  if (task.postFormat) return task.postFormat;
  if (task.taskType === "MEDIA_VIDEO" || task.fbPostLayout === "REELS_VERTICAL") {
    return "Video";
  }
  if (task.fbPostLayout === "ALBUM_2" || task.fbPostLayout === "ALBUM_4") {
    return "Carousel";
  }
  return "Ảnh";
}

export function isContentTaskItem(task: {
  taskType: TaskType;
  postFormat?: string | null;
  matrixIdeaId?: string | null;
  contentAngle?: string | null;
}): boolean {
  return (
    task.taskType === "CONTENT_SOCIAL" ||
    task.taskType === "CONTENT_ADS" ||
    task.taskType === "CONTENT_WEB" ||
    task.taskType === "SEEDING_SUPPORT" ||
    Boolean(task.postFormat || task.matrixIdeaId || task.contentAngle)
  );
}

export function normalizeProjectOverview(
  raw: unknown,
  fallbackDescription?: string | null
): ProjectOverviewData {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    productSummary: String(obj.productSummary ?? fallbackDescription ?? ""),
    targetAudience: String(obj.targetAudience ?? ""),
    painPoints: String(obj.painPoints ?? ""),
    usp: String(obj.usp ?? ""),
    toneAndVoice: String(obj.toneAndVoice ?? ""),
    forbiddenNotes: String(obj.forbiddenNotes ?? ""),
    planSheetUrl: String(obj.planSheetUrl ?? ""),
    hashtagsDefault: String(obj.hashtagsDefault ?? ""),
  };
}

export function normalizeContentMatrix(raw: unknown): ContentMatrixData {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const rawDepths = Array.isArray(obj.depths) ? obj.depths : [];
  const depths: MatrixDepthRow[] =
    rawDepths.length > 0
      ? rawDepths.map((d, idx) => {
          const item = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
          return {
            key: String(item.key || `DEPTH_${idx + 1}`),
            label: String(item.label || `Tầng ${idx + 1}`),
            goal: String(item.goal ?? ""),
          };
        })
      : DEFAULT_MATRIX_DEPTHS;

  const rawTopics = Array.isArray(obj.topics) ? obj.topics : [];
  const topics: ContentMatrixTopic[] =
    rawTopics.length > 0
      ? rawTopics.map((t, idx) => {
          const item = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
          return {
            id: String(item.id || `topic-${idx + 1}`),
            title: String(item.title || `TOPIC #${idx + 1}`),
          };
        })
      : [{ id: "topic-default-1", title: "TOPIC: Chủ đề trọng tâm #1" }];

  const rawIdeas = Array.isArray(obj.ideas) ? obj.ideas : [];
  const ideas: ContentMatrixIdea[] = rawIdeas
    .map((idea, idx) => {
      const item = (idea && typeof idea === "object" ? idea : {}) as Record<string, unknown>;
      return {
        id: String(item.id || `idea-${idx + 1}`),
        topicId: String(item.topicId || topics[0].id),
        depthKey: String(item.depthKey || depths[0].key),
        text: String(item.text ?? "").trim(),
        route: item.route ? String(item.route) : undefined,
        format: item.format ? String(item.format) : undefined,
        linkedTaskId: item.linkedTaskId ? String(item.linkedTaskId) : null,
      };
    })
    .filter((i) => i.text.length > 0);

  return { depths, topics, ideas };
}

export function inferRouteAndFormatFromText(
  text: string,
  fallbackRoute?: string,
  fallbackFormat?: string
): { route?: string; format?: string } {
  const lower = text.toLowerCase();
  let route = fallbackRoute;
  if (!route) {
    if (lower.includes("educate")) route = "EDUCATE";
    else if (lower.includes("so sánh") || lower.includes("so sanh")) route = "SO SÁNH";
    else if (lower.includes("vđề") || lower.includes("vấn đề") || lower.includes("vde-gp")) {
      route = "VẤN ĐỀ - GP";
    } else if (lower.includes("case")) route = "CASE";
    else if (lower.includes("sự kiện")) route = "SỰ KIỆN";
  }
  let format = fallbackFormat;
  if (!format) {
    if (lower.includes("video") || lower.includes("vid")) format = "Video";
    else if (lower.includes("reel")) format = "Reels";
    else if (lower.includes("carousel") || lower.includes("album")) format = "Carousel";
    else if (lower.includes("ảnh") || lower.includes("anh")) format = "Ảnh";
  }
  return { route, format };
}

export function parseShortVnDateToIso(raw: string, fallbackYear: number): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return `${cleaned}T09:00:00+07:00`;
  }
  const m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  let year = fallbackYear;
  if (m[3]) {
    year = m[3].length === 2 ? Number(`20${m[3]}`) : Number(m[3]);
  }
  return `${year}-${month}-${day}T09:00:00+07:00`;
}

export interface ParsedSheetTimelineRow {
  publishDateIso: string | null;
  route: string;
  title: string;
  platform: string;
  caption: string;
  format: string;
  mediaDueIso: string | null;
  contentDueIso: string | null;
  productLink: string;
}

/**
 * Parse các dòng copy từ Google Sheet TIMELINE ĐĂNG BÀI (phân tách bằng Tab):
 * Thứ tự cột chuẩn: Ngày đăng | Tuyến nội dung | Nội dung | Nền tảng | Bài viết | Format | Deadline ảnh | Deadline content | Tình trạng | Link sản phẩm
 */
export function parseGoogleSheetTimelineTsv(
  rawTsv: string,
  fallbackYear: number = new Date().getFullYear()
): ParsedSheetTimelineRow[] {
  const lines = rawTsv
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const rows: ParsedSheetTimelineRow[] = [];
  for (const line of lines) {
    const cols = line.split("\t").map((c) => c.trim());
    // Bỏ qua dòng header nếu copy dính tiêu đề Sheet
    if (
      cols[0]?.toUpperCase().includes("NGÀY ĐĂNG") ||
      cols[2]?.toUpperCase() === "NỘI DUNG"
    ) {
      continue;
    }
    const publishDateIso = parseShortVnDateToIso(cols[0] || "", fallbackYear);
    const route = cols[1] || "";
    const title = (cols[2] || cols[4] || "").replace(/^-\s*/, "").slice(0, 220);
    if (!title) continue;
    const platform = cols[3] || "Facebook";
    const caption = cols[4] || "";
    const format = cols[5] || "Ảnh";
    const mediaDueIso = parseShortVnDateToIso(cols[6] || "", fallbackYear);
    const contentDueIso = parseShortVnDateToIso(cols[7] || "", fallbackYear);
    const productLink = cols[9] || "";

    rows.push({
      publishDateIso,
      route,
      title,
      platform,
      caption,
      format,
      mediaDueIso,
      contentDueIso,
      productLink,
    });
  }
  return rows;
}
