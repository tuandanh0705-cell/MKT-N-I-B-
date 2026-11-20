import type {
  BudgetCategory,
  BudgetStatus,
  DepartmentScope,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/generated/prisma/client";

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; shortLabel: string; colorClass: string; order: number }
> = {
  DRAFT: {
    label: "📝 Bản thảo",
    shortLabel: "Bản thảo",
    colorClass: "bg-amber-50/70 text-amber-800 border-amber-200",
    order: 1,
  },
  BRIEF_REVIEW: {
    label: "🧭 Duyệt Brief",
    shortLabel: "Duyệt Brief",
    colorClass: "bg-orange-50 text-orange-800 border-orange-200",
    order: 2,
  },
  IN_PROGRESS: {
    label: "⛵ Đang ra khơi",
    shortLabel: "Đang làm",
    colorClass: "bg-sky-50 text-sky-800 border-sky-200",
    order: 3,
  },
  WAITING_APPROVAL: {
    label: "👀 Chờ Thuyền trưởng",
    shortLabel: "Chờ duyệt",
    colorClass: "bg-violet-50 text-violet-800 border-violet-200",
    order: 4,
  },
  REVISION_NEEDED: {
    label: "🔧 Vá buồm (Sửa)",
    shortLabel: "Cần sửa",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
    order: 5,
  },
  APPROVED_FINAL: {
    label: "⭐ Đã duyệt Final",
    shortLabel: "Đã duyệt",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    order: 6,
  },
  PUBLISHED: {
    label: "🚀 Đã lên sóng",
    shortLabel: "Đã đăng",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200",
    order: 7,
  },
  DONE: {
    label: "🏆 Cập bến xong",
    shortLabel: "Xong",
    colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    order: 8,
  },
};

export const TASK_TYPE_META: Record<
  TaskType,
  { label: string; isMediaOrderDefault: boolean }
> = {
  CONTENT_SOCIAL: { label: "Content Social", isMediaOrderDefault: false },
  CONTENT_ADS: { label: "Content Ads", isMediaOrderDefault: false },
  CONTENT_WEB: { label: "Content Website / SEO", isMediaOrderDefault: false },
  MEDIA_IMAGE: { label: "Brief Ảnh", isMediaOrderDefault: true },
  MEDIA_VIDEO: { label: "Brief Video", isMediaOrderDefault: true },
  WEB_SEO: { label: "Kỹ thuật Web / SEO", isMediaOrderDefault: false },
  ADS_CAMPAIGN: { label: "Chạy Ads / Tối ưu", isMediaOrderDefault: false },
  SEEDING_SUPPORT: { label: "Seeding / Đăng Group", isMediaOrderDefault: false },
  OTHER: { label: "Phát sinh khác", isMediaOrderDefault: false },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; colorClass: string }
> = {
  LOW: { label: "Thấp", colorClass: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "Bình thường", colorClass: "bg-sky-50 text-sky-700" },
  HIGH: { label: "Ưu tiên cao", colorClass: "bg-orange-50 text-orange-700" },
  URGENT: { label: "Gấp", colorClass: "bg-red-100 text-red-700" },
};

export const DEPARTMENT_SCOPE_LABEL: Record<DepartmentScope, string> = {
  LEADER: "Marketing Leader",
  CONTENT: "Content",
  CONTENT_DESIGN: "Content + Design",
  CONTENT_EDIT: "Content + Edit",
  MEDIA_DESIGN: "Media Design",
  MEDIA_VIDEO: "Media Quay / Dựng",
  WEB_ADS: "Web + AI + Ads",
  SUPPORT: "Support / Seeding",
};

export const ASSET_KIND_LABEL: Record<string, string> = {
  BRIEF_REF: "Brief / Tư liệu gốc",
  DEMO: "Bản Demo",
  FINAL: "Bản Final",
  PUBLISHED_LINK: "Link bài đã đăng",
};

export const BUDGET_CATEGORY_LABEL: Record<BudgetCategory, string> = {
  SHOOT_PRODUCTION: "Chi phí quay phim / Studio",
  EQUIPMENT: "Thiết bị / Đạo cụ",
  ADS_BUDGET: "Ngân sách chạy Ads",
  EVENT: "Sự kiện / Đi tỉnh",
  OTHER: "Chi phí phát sinh khác",
};

export const BUDGET_STATUS_META: Record<
  BudgetStatus,
  { label: string; colorClass: string }
> = {
  PENDING: {
    label: "Chờ Leader duyệt",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Đã duyệt chi",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Từ chối",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const KNOWN_PREFIXES: Record<string, string> = {
  livestream: "LIV",
  inpro: "INP",
  "olympic-ai": "OAI",
  "tich-xanh": "TX",
  "livestream-ai": "LAI",
};

export function getProjectCodePrefix(slug: string): string {
  if (KNOWN_PREFIXES[slug]) return KNOWN_PREFIXES[slug];
  const parts = slug.split("-").filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .map((p) => p[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 3);
  }
  return slug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "MKT";
}

export const DEFAULT_CONTENT_PILLARS: string[] = [
  "Giáo dục / Giá trị",
  "Sản phẩm / Bán hàng",
  "Case Study / Kết quả",
  "Bắt Trend / Giải trí",
  "Minigame / Seeding",
];

export const FB_POST_LAYOUTS: Record<
  string,
  { label: string; ratioHint: string; slots: number; aspectDesc: string }
> = {
  SINGLE_SQUARE: {
    label: "1 Ảnh vuông (1:1)",
    ratioHint: "1080 × 1080px",
    slots: 1,
    aspectDesc: "Chuẩn bài Feed Fanpage đa thiết bị",
  },
  SINGLE_PORTRAIT: {
    label: "1 Ảnh dọc (4:5)",
    ratioHint: "1080 × 1350px",
    slots: 1,
    aspectDesc: "Chiếm diện tích lớn trên Mobile",
  },
  REELS_VERTICAL: {
    label: "Video / Reels (9:16)",
    ratioHint: "1080 × 1920px",
    slots: 1,
    aspectDesc: "Ưu tiên Hook 3s đầu + Sub rõ nét",
  },
  ALBUM_2: {
    label: "Album 2 ảnh song song",
    ratioHint: "2 ảnh 1:1 hoặc 4:5",
    slots: 2,
    aspectDesc: "So sánh Trước/Sau hoặc 2 góc sản phẩm",
  },
  ALBUM_4: {
    label: "Album 4 ảnh (1 lớn + 3 nhỏ)",
    ratioHint: "1 ảnh chính + 3 ảnh chi tiết",
    slots: 4,
    aspectDesc: "Tối ưu cho Feedback / Chùm ảnh sự kiện",
  },
  LINK_PREVIEW: {
    label: "Bài gắn Link Preview (1.91:1)",
    ratioHint: "1200 × 628px",
    slots: 1,
    aspectDesc: "Kéo traffic về Website / Landing Page",
  },
};

export const TIMELINE_STATUS_META: Record<
  string,
  { label: string; colorClass: string }
> = {
  SYNCED: {
    label: "Đã đồng bộ App",
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  PENDING_LEADER: {
    label: "Chờ Leader duyệt lịch Vy",
    colorClass: "bg-amber-50 text-amber-800 border-amber-300",
  },
  APPROVED: {
    label: "Leader đã chốt lịch mới",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Giữ nguyên lịch App",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export const LEAVE_TYPE_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  FULL_DAY: {
    label: "Nghỉ cả ngày",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
  },
  HALF_MORNING: {
    label: "Nghỉ buổi sáng",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  HALF_AFTERNOON: {
    label: "Nghỉ buổi chiều",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  REMOTE: {
    label: "Làm việc Online (WFH)",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
  },
  BUSINESS_TRIP: {
    label: "Đi quay / Công tác ngoài",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
  },
};

export const LEAVE_STATUS_META: Record<
  string,
  { label: string; colorClass: string }
> = {
  PENDING: {
    label: "Chờ duyệt",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Đã duyệt",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Từ chối",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export const EQUIPMENT_CATEGORY_META: Record<
  string,
  { label: string; emoji: string }
> = {
  CAMERA: { label: "Máy ảnh", emoji: "📷" },
  PHONE: { label: "Điện thoại quay", emoji: "📱" },
  CAMCORDER: { label: "Máy quay phim", emoji: "🎥" },
  MIC_LIGHT: { label: "Micro / Đèn / Gimbal", emoji: "🎙️" },
  OTHER: { label: "Phụ kiện khác", emoji: "🧰" },
};

export const RESOURCE_CATEGORY_META: Record<
  string,
  { label: string; emoji: string; badgeClass: string }
> = {
  LOGO_BRAND: {
    label: "Logo & Bộ Nhận Diện",
    emoji: "🎨",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
  },
  GUIDELINE_DOC: {
    label: "Brand Guideline & Quy Chuẩn",
    emoji: "📘",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  PARTNER_WORK: {
    label: "Link Đối Tác / Brief Khách",
    emoji: "🤝",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  PHOTO_FOLDER: {
    label: "Folder Ảnh Sản Phẩm / Studio",
    emoji: "🖼️",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  SOURCE_RAW: {
    label: "Folder Source Raw / Footage",
    emoji: "🎞️",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  FINISHED_MEDIA: {
    label: "Media Thành Phẩm (Final)",
    emoji: "✨",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  OTHER: {
    label: "Tài nguyên khác",
    emoji: "📦",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function isTaskOverdue(task: {
  status: string;
  dueAt: string | Date | null;
}): boolean {
  if (!task.dueAt) return false;
  if (
    task.status === "APPROVED_FINAL" ||
    task.status === "PUBLISHED" ||
    task.status === "DONE"
  ) {
    return false;
  }
  const due = typeof task.dueAt === "string" ? new Date(task.dueAt) : task.dueAt;
  return due.getTime() < Date.now();
}
