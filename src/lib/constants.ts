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

export interface FbPostLayoutSpec {
  group: string;
  label: string;
  ratioHint: string;
  slots: number;
  aspectDesc: string;
  slotSpecs: Array<{ label: string; size: string }>;
}

export const FB_POST_LAYOUT_GROUPS: string[] = [
  "Ảnh đơn",
  "Text + Hình",
  "2 Ảnh",
  "3 Ảnh",
  "4 Ảnh",
  "5 Ảnh trở lên",
  "Story, Reels & Share Link",
  "Hồ sơ & Ảnh bìa",
  "Quảng cáo Facebook Ads",
];

export const FB_POST_LAYOUTS: Record<string, FbPostLayoutSpec> = {
  // 1. Ảnh đơn
  SINGLE_SQUARE: {
    group: "Ảnh đơn",
    label: "1 Ảnh vuông (1200 × 1200)",
    ratioHint: "1200 × 1200 px (1:1)",
    slots: 1,
    aspectDesc: "Chuẩn bài Feed Fanpage đa thiết bị",
    slotSpecs: [{ label: "Ảnh vuông", size: "1200 × 1200" }],
  },
  SINGLE_LANDSCAPE: {
    group: "Ảnh đơn",
    label: "1 Ảnh ngang (1200 × 800)",
    ratioHint: "1200 × 800 px (3:2)",
    slots: 1,
    aspectDesc: "Phù hợp ảnh sự kiện, không gian, panorama",
    slotSpecs: [{ label: "Ảnh ngang", size: "1200 × 800" }],
  },
  SINGLE_PORTRAIT: {
    group: "Ảnh đơn",
    label: "1 Ảnh dọc (960 × 1200)",
    ratioHint: "960 × 1200 px (4:5)",
    slots: 1,
    aspectDesc: "Chiếm diện tích hiển thị lớn trên Mobile",
    slotSpecs: [{ label: "Ảnh dọc", size: "960 × 1200" }],
  },

  // 2. Text + Hình
  TEXT_IMAGE_1: {
    group: "Text + Hình",
    label: "Text + 1 Ảnh vuông (1440 × 1440)",
    ratioHint: "Text trên + 1 ảnh 1440 × 1440 px",
    slots: 1,
    aspectDesc: "Bài chia sẻ kiến thức / storytelling kèm 1 ảnh lớn",
    slotSpecs: [{ label: "Ảnh chính", size: "1440 × 1440" }],
  },
  TEXT_IMAGE_MULTI: {
    group: "Text + Hình",
    label: "Text + Nhiều ảnh (4 × 1440 × 1440)",
    ratioHint: "Text trên + lưới 2×2 (1440 × 1440 px)",
    slots: 4,
    aspectDesc: "Bài viết dài kèm chùm ảnh minh họa đồng đều 2×2",
    slotSpecs: [
      { label: "Ảnh #1", size: "1440 × 1440" },
      { label: "Ảnh #2", size: "1440 × 1440" },
      { label: "Ảnh #3", size: "1440 × 1440" },
      { label: "Ảnh #4", size: "1440 × 1440" },
    ],
  },

  // 3. 2 Ảnh
  ALBUM_2_HORIZONTAL: {
    group: "2 Ảnh",
    label: "2 Ảnh ngang xếp chồng (1200 × 600)",
    ratioHint: "2 ảnh 1200 × 600 px (trên / dưới)",
    slots: 2,
    aspectDesc: "Xếp chồng trên - dưới, hợp bố cục Trước / Sau ngang",
    slotSpecs: [
      { label: "Ảnh trên", size: "1200 × 600" },
      { label: "Ảnh dưới", size: "1200 × 600" },
    ],
  },
  ALBUM_2: {
    group: "2 Ảnh",
    label: "2 Ảnh dọc song song (600 × 1200)",
    ratioHint: "2 ảnh 600 × 1200 px (trái / phải)",
    slots: 2,
    aspectDesc: "Song song trái - phải, so sánh 2 góc sản phẩm",
    slotSpecs: [
      { label: "Ảnh trái", size: "600 × 1200" },
      { label: "Ảnh phải", size: "600 × 1200" },
    ],
  },

  // 4. 3 Ảnh
  ALBUM_3_HORIZONTAL: {
    group: "3 Ảnh",
    label: "3 Ảnh — Chính ngang (1920×960 + 2×1920)",
    ratioHint: "1 chính ngang 1920×960 + 2 phụ 1920×1920",
    slots: 3,
    aspectDesc: "1 ảnh chính ngang trên cùng + 2 ảnh vuông bên dưới",
    slotSpecs: [
      { label: "Ảnh chính ngang", size: "1920 × 960" },
      { label: "Ảnh phụ #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1920" },
    ],
  },
  ALBUM_3_VERTICAL: {
    group: "3 Ảnh",
    label: "3 Ảnh — Chính dọc (960×1920 + 2×1920)",
    ratioHint: "1 chính dọc 960×1920 + 2 phụ 1920×1920",
    slots: 3,
    aspectDesc: "1 ảnh chính dọc bên trái + 2 ảnh vuông xếp bên phải",
    slotSpecs: [
      { label: "Ảnh chính dọc", size: "960 × 1920" },
      { label: "Ảnh phụ #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1920" },
    ],
  },

  // 5. 4 Ảnh
  ALBUM_4_SQUARE: {
    group: "4 Ảnh",
    label: "4 Ảnh vuông 2×2 (1920 × 1920)",
    ratioHint: "4 ảnh vuông 1920 × 1920 px (lưới 2×2)",
    slots: 4,
    aspectDesc: "4 ô vuông đều nhau — tối ưu Showcase sản phẩm / Feedback",
    slotSpecs: [
      { label: "Ảnh vuông #1", size: "1920 × 1920" },
      { label: "Ảnh vuông #2", size: "1920 × 1920" },
      { label: "Ảnh vuông #3", size: "1920 × 1920" },
      { label: "Ảnh vuông #4", size: "1920 × 1920" },
    ],
  },
  ALBUM_4: {
    group: "4 Ảnh",
    label: "4 Ảnh — Chính ngang (1920×1280 + 3×1920)",
    ratioHint: "1 chính ngang 1920×1280 + 3 phụ 1920×1920",
    slots: 4,
    aspectDesc: "1 ảnh banner chính ngang trên + 3 ảnh vuông chi tiết dưới",
    slotSpecs: [
      { label: "Ảnh chính ngang", size: "1920 × 1280" },
      { label: "Ảnh phụ #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1920" },
      { label: "Ảnh phụ #4", size: "1920 × 1920" },
    ],
  },
  ALBUM_4_VERTICAL: {
    group: "4 Ảnh",
    label: "4 Ảnh — Chính dọc (1280×1920 + 3×1920)",
    ratioHint: "1 chính dọc 1280×1920 + 3 phụ 1920×1920",
    slots: 4,
    aspectDesc: "1 ảnh chính dọc bên trái + 3 ảnh vuông xếp dọc bên phải",
    slotSpecs: [
      { label: "Ảnh chính dọc", size: "1280 × 1920" },
      { label: "Ảnh phụ #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1920" },
      { label: "Ảnh phụ #4", size: "1920 × 1920" },
    ],
  },

  // 6. 5 Ảnh trở lên
  ALBUM_5_HORIZONTAL: {
    group: "5 Ảnh trở lên",
    label: "5+ Ảnh — 2 vuông ngang trên + 3 dưới",
    ratioHint: "2 chính 1920×1920 trên + 3 phụ 1920×1920 dưới",
    slots: 5,
    aspectDesc: "Album nhiều ảnh: 2 ảnh lớn hàng trên + 3 ảnh phụ hàng dưới",
    slotSpecs: [
      { label: "Ảnh chính #1", size: "1920 × 1920" },
      { label: "Ảnh chính #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1920" },
      { label: "Ảnh phụ #4", size: "1920 × 1920" },
      { label: "Ảnh phụ #5 (+N)", size: "1920 × 1920" },
    ],
  },
  ALBUM_5_VERTICAL: {
    group: "5 Ảnh trở lên",
    label: "5+ Ảnh — 2 vuông dọc trái + 3 phải (1920×1280)",
    ratioHint: "2 chính 1920×1920 trái + 3 phụ 1920×1280 phải",
    slots: 5,
    aspectDesc: "2 ảnh vuông cột trái + 3 ảnh ngang cột phải",
    slotSpecs: [
      { label: "Ảnh chính #1", size: "1920 × 1920" },
      { label: "Ảnh chính #2", size: "1920 × 1920" },
      { label: "Ảnh phụ #3", size: "1920 × 1280" },
      { label: "Ảnh phụ #4", size: "1920 × 1280" },
      { label: "Ảnh phụ #5 (+N)", size: "1920 × 1280" },
    ],
  },

  // 7. Story, Reels & Share Link
  REELS_VERTICAL: {
    group: "Story, Reels & Share Link",
    label: "Story & Reels dọc (1080 × 1920)",
    ratioHint: "1080 × 1920 px (9:16)",
    slots: 1,
    aspectDesc: "Chừa vùng an toàn trên/dưới cho thanh nút Story & Reels",
    slotSpecs: [{ label: "Story / Reels 9:16", size: "1080 × 1920" }],
  },
  LINK_PREVIEW: {
    group: "Story, Reels & Share Link",
    label: "Share Link (1200 × 628)",
    ratioHint: "1200 × 628 px (1.91:1)",
    slots: 1,
    aspectDesc: "Thumbnail chia sẻ Link Website / Landing Page",
    slotSpecs: [{ label: "Ảnh Share Link", size: "1200 × 628" }],
  },

  // 8. Hồ sơ & Ảnh bìa
  AVATAR: {
    group: "Hồ sơ & Ảnh bìa",
    label: "Ảnh đại diện / Avatar (1000 × 1000)",
    ratioHint: "1000 × 1000 px (Hiển thị khung tròn)",
    slots: 1,
    aspectDesc: "Đặt logo / nội dung trọng tâm trong vòng tròn an toàn",
    slotSpecs: [{ label: "Avatar tròn", size: "1000 × 1000" }],
  },
  COVER_FANPAGE: {
    group: "Hồ sơ & Ảnh bìa",
    label: "Ảnh bìa Fanpage (1920×1080 • Mobile 1920×710)",
    ratioHint: "Desktop 1920 × 1080 • Mobile 1920 × 710 px",
    slots: 1,
    aspectDesc: "Giữ chữ & thông điệp chính trong vùng an toàn Mobile 1920×710",
    slotSpecs: [
      { label: "Cover Fanpage (Desktop / Mobile safe)", size: "1920 × 1080 (safe 1920 × 710)" },
    ],
  },
  COVER_EVENT_GROUP: {
    group: "Hồ sơ & Ảnh bìa",
    label: "Ảnh bìa Group & Sự kiện (1920 × 1008)",
    ratioHint: "1920 × 1008 px",
    slots: 1,
    aspectDesc: "Chuẩn ảnh bìa Facebook Group & Facebook Event",
    slotSpecs: [{ label: "Cover Group / Sự kiện", size: "1920 × 1008" }],
  },

  // 9. Quảng cáo Facebook Ads
  ADS_SLIDESHOW: {
    group: "Quảng cáo Facebook Ads",
    label: "Quảng cáo Slide Show / Carousel (1080 × 1080)",
    ratioHint: "1080 × 1080 px (1:1 • Ads)",
    slots: 3,
    aspectDesc: "Quảng cáo trượt nhiều thẻ vuông 1080×1080 kèm nút CTA",
    slotSpecs: [
      { label: "Slide Ads #1", size: "1080 × 1080" },
      { label: "Slide Ads #2", size: "1080 × 1080" },
      { label: "Slide Ads #3", size: "1080 × 1080" },
    ],
  },
  ADS_SHARE_LINK: {
    group: "Quảng cáo Facebook Ads",
    label: "Quảng cáo Share Link (1200 × 628)",
    ratioHint: "1200 × 628 px (Ads CTA)",
    slots: 1,
    aspectDesc: "Quảng cáo kéo traffic Web / Form kèm nút Đăng ký / Tìm hiểu thêm",
    slotSpecs: [{ label: "Banner Ads Share Link", size: "1200 × 628" }],
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

export const APPROVAL_REQUIRED_TASK_TYPES = new Set<TaskType>([
  "CONTENT_SOCIAL",
  "CONTENT_ADS",
  "CONTENT_WEB",
  "MEDIA_IMAGE",
  "MEDIA_VIDEO",
]);

/**
 * Các đầu việc sản xuất Content, Thiết kế Ảnh, Quay/Dựng Video và Order Media
 * bắt buộc gửi Leader duyệt trước khi nhân sự được đánh dấu Hoàn tất / Đã đăng.
 */
export function taskRequiresLeaderApproval(task: {
  taskType: TaskType;
  isMediaOrder?: boolean | null;
}): boolean {
  return (
    Boolean(task.isMediaOrder) ||
    APPROVAL_REQUIRED_TASK_TYPES.has(task.taskType)
  );
}

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

/**
 * Nhân sự chuyên trách sản xuất Media (Design ảnh & Edit/Quay dựng video).
 * Giao diện riêng tập trung 100% vào nhận & trả Order từ các thành viên khác ngay trong Nhật Ký Hải Trình,
 * ẩn các mục quản trị dự án/content không liên quan (Hải đồ dự án, Order Media, Báo cáo dữ liệu Fanpage).
 */
export function isMediaProductionUser(
  role?: string | null,
  departmentScope?: string | null
): boolean {
  if (role === "LEADER") return false;
  return (
    departmentScope === "MEDIA_DESIGN" || departmentScope === "MEDIA_VIDEO"
  );
}
