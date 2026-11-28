import type { Prisma } from "@/generated/prisma/client";

/**
 * Prisma include dùng chung cho danh sách & thẻ công việc (Projects, Outputs, Media Orders, AI Check).
 * Tránh lặp lại hàng chục dòng `include` ở nhiều server component và API route.
 */
export const TASK_ASSIGNEE_USER_SELECT = {
  id: true,
  name: true,
  title: true,
  avatarColor: true,
  pirateCharacter: true,
  departmentScope: true,
} satisfies Prisma.UserSelect;

export const TASK_CARD_INCLUDE = {
  project: {
    select: { id: true, slug: true, name: true, color: true },
  },
  assignee: {
    select: TASK_ASSIGNEE_USER_SELECT,
  },
  assignees: {
    orderBy: { assignedAt: "asc" },
    include: {
      user: { select: TASK_ASSIGNEE_USER_SELECT },
    },
  },
  requester: {
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      avatarColor: true,
      pirateCharacter: true,
    },
  },
  reviewer: { select: { id: true, name: true } },
  assets: { orderBy: { createdAt: "desc" } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

/**
 * Phiên bản `TASK_CARD_INCLUDE` kèm thêm 5 bình luận gần nhất (dùng cho Outputs Hub & Review).
 */
export const TASK_WITH_RECENT_COMMENTS_INCLUDE = {
  ...TASK_CARD_INCLUDE,
  comments: {
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarColor: true,
          pirateCharacter: true,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

/**
 * Phiên bản đầy đủ nhất dùng cho Task Drawer / chi tiết đầu việc (`GET /api/tasks/[id]`).
 */
export const TASK_DETAIL_INCLUDE = {
  project: TASK_CARD_INCLUDE.project,
  assignee: TASK_CARD_INCLUDE.assignee,
  assignees: TASK_CARD_INCLUDE.assignees,
  requester: TASK_CARD_INCLUDE.requester,
  reviewer: TASK_CARD_INCLUDE.reviewer,
  parentTask: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      project: { select: { slug: true } },
    },
  },
  assets: {
    orderBy: [{ kind: "asc" }, { version: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  },
  comments: {
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarColor: true,
          pirateCharacter: true,
        },
      },
    },
  },
  activityLogs: {
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          pirateCharacter: true,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

/**
 * Rút gọn các `AssetLink` đang lưu ảnh dạng Base64 (`data:image/...`) thành URL nhị phân có cache
 * `/api/assets/[id]` trước khi trả xuống trình duyệt, giúp giảm hàng trăm KB payload JSON/SSR mỗi trang.
 */
export function rewriteInlineAssetUrl(assetId: string, url: string): string {
  if (url && url.startsWith("data:image/")) {
    return `/api/assets/${assetId}`;
  }
  return url;
}

export function sanitizeTaskAssets<
  T extends { assets?: Array<{ id: string; url: string }> },
>(task: T): T {
  if (!task.assets || task.assets.length === 0) return task;
  let changed = false;
  const nextAssets = task.assets.map((a) => {
    const rewritten = rewriteInlineAssetUrl(a.id, a.url);
    if (rewritten !== a.url) {
      changed = true;
      return { ...a, url: rewritten };
    }
    return a;
  });
  return changed ? { ...task, assets: nextAssets } : task;
}

export function sanitizeTasksAssets<
  T extends { assets?: Array<{ id: string; url: string }> },
>(tasks: T[]): T[] {
  return tasks.map((t) => sanitizeTaskAssets(t));
}

/**
 * Projection gọn cho danh sách `Project` ở các trang không cần JSON lớn (`overviewJson`, `contentMatrixJson`).
 */
export const SIMPLE_PROJECT_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  channelSummary: true,
  masterResourceUrl: true,
  masterResourceNote: true,
  weeklySocialTarget: true,
  weeklyAdsTarget: true,
  weeklyVideoTarget: true,
  weeklyImageTarget: true,
  kpiNote: true,
  color: true,
  isActive: true,
} satisfies Prisma.ProjectSelect;
