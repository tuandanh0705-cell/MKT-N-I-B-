import type { DepartmentScope, UserRole } from "@/generated/prisma/client";

export type KnowledgeTrackType = "OFFICIAL" | "SHARED";
export type KnowledgeCategoryKey =
  | "GENERAL"
  | "CONTENT"
  | "MEDIA_DESIGN"
  | "MEDIA_VIDEO"
  | "WEB_ADS"
  | "AI_AUTOMATION";
export type KnowledgeLessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const KNOWLEDGE_CATEGORY_META: Record<
  KnowledgeCategoryKey,
  {
    label: string;
    emoji: string;
    badgeClass: string;
  }
> = {
  GENERAL: {
    label: "Kiến thức Chung & SOP",
    emoji: "📚",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-800",
  },
  CONTENT: {
    label: "Content & Copywriting",
    emoji: "✍️",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
  },
  MEDIA_DESIGN: {
    label: "Design & Ấn phẩm Ảnh",
    emoji: "🎨",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  MEDIA_VIDEO: {
    label: "Quay Dựng & Video Short",
    emoji: "🎬",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-800",
  },
  WEB_ADS: {
    label: "Facebook Ads & Web SEO",
    emoji: "📈",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  AI_AUTOMATION: {
    label: "AI & Tối ưu Quy trình",
    emoji: "🤖",
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
};

export interface KnowledgeLessonItem {
  id: string;
  courseId: string;
  orderIndex: number;
  title: string;
  lessonUrl: string | null;
  summary: string | null;
  durationMinutes: number;
}

export interface KnowledgeProgressItem {
  id: string;
  courseId: string;
  lessonId: string;
  userId: string;
  status: KnowledgeLessonStatus;
  takeaways: string | null;
  practiceUrl: string | null;
  leaderNote: string | null;
  completedAt: string | Date | null;
  updatedAt: string | Date;
}

export interface KnowledgeCourseItem {
  id: string;
  title: string;
  description: string | null;
  courseUrl: string;
  trackType: KnowledgeTrackType;
  category: KnowledgeCategoryKey;
  targetDepartment: DepartmentScope | null;
  isMandatory: boolean;
  isPinned: boolean;
  estimatedMinutes: number;
  projectId: string | null;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  project: { id: string; slug: string; name: string; color: string } | null;
  createdBy: {
    id: string;
    name: string;
    role: UserRole;
    avatarColor: string;
    pirateCharacter?: string | null;
    departmentScope: DepartmentScope;
  };
  lessons: KnowledgeLessonItem[];
}

export interface KnowledgeTeamMember {
  id: string;
  name: string;
  role: UserRole;
  departmentScope: DepartmentScope;
  avatarColor: string;
  pirateCharacter?: string | null;
}

export interface CourseProgressSummary {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  percent: number;
  status: KnowledgeLessonStatus;
  hasTakeaways: boolean;
}

/** Chuẩn hóa link người dùng nhập (tự thêm https:// nếu thiếu). */
export function normalizeCourseUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Nhận diện nguồn khóa học (YouTube, Google Drive, Notion, Udemy, Coursera, Web...) để gắn nhãn trực quan. */
export function getCourseSourceMeta(rawUrl: string): {
  label: string;
  badgeClass: string;
  embedUrl: string | null;
} {
  const url = (rawUrl || "").trim();
  if (!url) {
    return {
      label: "Link",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
      embedUrl: null,
    };
  }
  try {
    const parsed = new URL(normalizeCourseUrl(url));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube embed support
    if (host.includes("youtube.com") || host === "youtu.be") {
      let videoId = "";
      if (host === "youtu.be") {
        videoId = parsed.pathname.replace(/^\//, "").split("/")[0] || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      } else {
        videoId = parsed.searchParams.get("v") || "";
      }
      return {
        label: "YouTube",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        embedUrl: videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : null,
      };
    }

    if (host.includes("drive.google.com")) {
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      return {
        label: "Google Drive",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
        embedUrl: fileMatch?.[1]
          ? `https://drive.google.com/file/d/${fileMatch[1]}/preview`
          : null,
      };
    }
    if (host.includes("docs.google.com")) {
      return {
        label: "Google Docs/Sheet",
        badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
        embedUrl: null,
      };
    }
    if (host.includes("notion.so") || host.includes("notion.site")) {
      return {
        label: "Notion",
        badgeClass: "border-slate-300 bg-slate-100 text-slate-800",
        embedUrl: null,
      };
    }
    if (host.includes("canva.com")) {
      return {
        label: "Canva",
        badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
        embedUrl: null,
      };
    }
    if (host.includes("udemy.com")) {
      return {
        label: "Udemy",
        badgeClass: "border-purple-200 bg-purple-50 text-purple-800",
        embedUrl: null,
      };
    }
    if (host.includes("coursera.org")) {
      return {
        label: "Coursera",
        badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
        embedUrl: null,
      };
    }
    if (host.includes("loom.com")) {
      return {
        label: "Loom",
        badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
        embedUrl: null,
      };
    }

    return {
      label: host,
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      embedUrl: null,
    };
  } catch {
    return {
      label: "Link khóa học",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      embedUrl: null,
    };
  }
}

/** Tính toán tiến độ của 1 user trên 1 khóa học dựa vào danh sách bài học & progress records. */
export function computeCourseProgress(
  course: Pick<KnowledgeCourseItem, "lessons">,
  userProgressMap: Map<string, KnowledgeProgressItem>
): CourseProgressSummary {
  const totalLessons = course.lessons.length;
  if (totalLessons === 0) {
    return {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      percent: 0,
      status: "NOT_STARTED",
      hasTakeaways: false,
    };
  }

  let completedLessons = 0;
  let inProgressLessons = 0;
  let hasTakeaways = false;

  for (const lesson of course.lessons) {
    const p = userProgressMap.get(lesson.id);
    if (!p) continue;
    if (p.status === "COMPLETED") completedLessons += 1;
    else if (p.status === "IN_PROGRESS") inProgressLessons += 1;
    if ((p.takeaways || "").trim().length > 0 || (p.practiceUrl || "").trim().length > 0) {
      hasTakeaways = true;
    }
  }

  const percent = Math.round((completedLessons / totalLessons) * 100);
  const status: KnowledgeLessonStatus =
    completedLessons === totalLessons
      ? "COMPLETED"
      : completedLessons > 0 || inProgressLessons > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED";

  return {
    totalLessons,
    completedLessons,
    inProgressLessons,
    percent,
    status,
    hasTakeaways,
  };
}
