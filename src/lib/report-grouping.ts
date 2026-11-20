import { getVnDateString } from "@/lib/dates";
import type { TaskStatus, TaskType } from "@/generated/prisma/client";

export const COMPLETED_REPORT_STATUSES = new Set<string>([
  "APPROVED_FINAL",
  "PUBLISHED",
  "DONE",
]);

export const TASK_NATURE_META: Record<
  TaskType,
  { label: string; unit: string }
> = {
  CONTENT_SOCIAL: { label: "Viết bài Social", unit: "bài" },
  CONTENT_ADS: { label: "Content Ads", unit: "bài" },
  CONTENT_WEB: { label: "Bài Website / SEO", unit: "bài" },
  MEDIA_IMAGE: { label: "Thiết kế Ảnh", unit: "ảnh" },
  MEDIA_VIDEO: { label: "Quay / Dựng Video", unit: "video" },
  WEB_SEO: { label: "Kỹ thuật Web / SEO", unit: "việc" },
  ADS_CAMPAIGN: { label: "Chạy Ads / Tối ưu", unit: "chiến dịch" },
  SEEDING_SUPPORT: { label: "Seeding / Đăng Group", unit: "lượt" },
  OTHER: { label: "Công việc khác", unit: "việc" },
};

export interface ReportSourceTask {
  id: string;
  code: string;
  title: string;
  projectId: string;
  assigneeId: string | null;
  taskType: TaskType;
  status: TaskStatus;
  quantity: number;
  revisionCount: number;
  wasLate: boolean;
  platform: string;
  postFormat: string | null;
  dueAt: Date | null;
  scheduledPublishAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface MemberMergedWorkItem {
  mergeKey: string;
  title: string;
  taskType: TaskType;
  natureLabel: string;
  unit: string;
  taskCount: number;
  completedCount: number;
  totalQuantity: number;
  completedQuantity: number;
  projectNames: string[];
  codes: string[];
  latestStatus: TaskStatus;
}

export interface MemberNatureGroup {
  taskType: TaskType;
  natureLabel: string;
  unit: string;
  taskCount: number;
  completedTaskCount: number;
  totalQuantity: number;
  completedQuantity: number;
  mergedItems: MemberMergedWorkItem[];
}

export interface MemberDetailedTaskRow {
  id: string;
  code: string;
  title: string;
  taskType: TaskType;
  natureLabel: string;
  unit: string;
  status: TaskStatus;
  quantity: number;
  completedQuantity: number;
  projectName: string;
  projectColor: string;
  platform: string;
  postFormat: string | null;
  dateStr: string;
  wasLate: boolean;
}

function normalizeTitleKey(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function buildMemberWorkBreakdown(
  memberTasks: ReportSourceTask[],
  projectById: Map<string, { id: string; name: string; color: string }>
): {
  natureGroups: MemberNatureGroup[];
  detailedTasks: MemberDetailedTaskRow[];
  assignedQuantity: number;
  completedQuantity: number;
} {
  const detailedTasks: MemberDetailedTaskRow[] = [];
  const natureMap = new Map<
    TaskType,
    {
      taskType: TaskType;
      natureLabel: string;
      unit: string;
      taskCount: number;
      completedTaskCount: number;
      totalQuantity: number;
      completedQuantity: number;
      mergedMap: Map<string, MemberMergedWorkItem>;
    }
  >();

  let assignedQuantity = 0;
  let completedQuantity = 0;

  const sortedTasks = [...memberTasks].sort((a, b) => {
    const ta = new Date(
      a.completedAt ?? a.scheduledPublishAt ?? a.dueAt ?? a.createdAt
    ).getTime();
    const tb = new Date(
      b.completedAt ?? b.scheduledPublishAt ?? b.dueAt ?? b.createdAt
    ).getTime();
    return tb - ta;
  });

  for (const t of sortedTasks) {
    const meta = TASK_NATURE_META[t.taskType] ?? {
      label: "Công việc khác",
      unit: "việc",
    };
    const isDone = COMPLETED_REPORT_STATUSES.has(t.status);
    const qty = Math.max(1, Number(t.quantity || 1));
    const doneQty = isDone ? qty : 0;
    const proj = projectById.get(t.projectId);
    const projectName = proj?.name ?? "Dự án";
    const projectColor = proj?.color ?? "#64748b";
    const refDate = t.completedAt ?? t.scheduledPublishAt ?? t.dueAt ?? t.createdAt;
    const dateStr = getVnDateString(new Date(refDate));

    assignedQuantity += qty;
    completedQuantity += doneQty;

    detailedTasks.push({
      id: t.id,
      code: t.code,
      title: t.title,
      taskType: t.taskType,
      natureLabel: meta.label,
      unit: meta.unit,
      status: t.status,
      quantity: qty,
      completedQuantity: doneQty,
      projectName,
      projectColor,
      platform: t.platform,
      postFormat: t.postFormat,
      dateStr,
      wasLate: t.wasLate,
    });

    let group = natureMap.get(t.taskType);
    if (!group) {
      group = {
        taskType: t.taskType,
        natureLabel: meta.label,
        unit: meta.unit,
        taskCount: 0,
        completedTaskCount: 0,
        totalQuantity: 0,
        completedQuantity: 0,
        mergedMap: new Map(),
      };
      natureMap.set(t.taskType, group);
    }

    group.taskCount += 1;
    if (isDone) group.completedTaskCount += 1;
    group.totalQuantity += qty;
    group.completedQuantity += doneQty;

    const normTitle = normalizeTitleKey(t.title);
    const mergeKey = `${t.taskType}::${normTitle}`;
    const existingMerged = group.mergedMap.get(mergeKey);
    if (!existingMerged) {
      group.mergedMap.set(mergeKey, {
        mergeKey,
        title: t.title.trim(),
        taskType: t.taskType,
        natureLabel: meta.label,
        unit: meta.unit,
        taskCount: 1,
        completedCount: isDone ? 1 : 0,
        totalQuantity: qty,
        completedQuantity: doneQty,
        projectNames: [projectName],
        codes: [t.code],
        latestStatus: t.status,
      });
    } else {
      existingMerged.taskCount += 1;
      if (isDone) existingMerged.completedCount += 1;
      existingMerged.totalQuantity += qty;
      existingMerged.completedQuantity += doneQty;
      if (!existingMerged.projectNames.includes(projectName)) {
        existingMerged.projectNames.push(projectName);
      }
      existingMerged.codes.push(t.code);
    }
  }

  const natureGroups: MemberNatureGroup[] = Array.from(natureMap.values())
    .map((g) => ({
      taskType: g.taskType,
      natureLabel: g.natureLabel,
      unit: g.unit,
      taskCount: g.taskCount,
      completedTaskCount: g.completedTaskCount,
      totalQuantity: g.totalQuantity,
      completedQuantity: g.completedQuantity,
      mergedItems: Array.from(g.mergedMap.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity || b.taskCount - a.taskCount
      ),
    }))
    .sort(
      (a, b) => b.totalQuantity - a.totalQuantity || b.taskCount - a.taskCount
    );

  return {
    natureGroups,
    detailedTasks,
    assignedQuantity,
    completedQuantity,
  };
}
