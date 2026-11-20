import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { getProjectCodePrefix, TASK_TYPE_META } from "@/lib/constants";
import { getVnDayBounds } from "@/lib/dates";
import {
  buildDailyKpiKey,
  computeDailyKpiProgress,
  isDailyKpiDayOff,
  resolveEffectiveDailyKpi,
  type ApprovedLeaveSpan,
} from "@/lib/daily-kpi";
import { createSubtaskId } from "@/lib/subtasks";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";
import { Prisma } from "@/generated/prisma/client";

type KpiSyncUser = Pick<
  AuthUser,
  | "id"
  | "role"
  | "departmentScope"
  | "employmentType"
  | "weeklyImageLimit"
  | "dailyVideoLimit"
  | "dailyKpiJson"
  | "lastKpiSyncDate"
>;

export async function syncDailyKpiTasksForDate({
  user,
  dateStr,
  markUserTodaySynced = false,
}: {
  user: KpiSyncUser;
  dateStr: string;
  markUserTodaySynced?: boolean;
}) {
  const { items } = resolveEffectiveDailyKpi(user);

  const visibleProjects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...buildProjectVisibilityWhere({ id: user.id, role: user.role }),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true },
  });

  if (visibleProjects.length === 0 || items.length === 0) {
    if (markUserTodaySynced) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastKpiSyncDate: dateStr },
      });
    }
    return { createdTasks: [] };
  }

  const projectById = new Map(visibleProjects.map((p) => [p.id, p]));
  const { start, end } = getVnDayBounds(dateStr);

  const existingDayTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      assigneeId: user.id,
      OR: [
        { dueAt: { gte: start, lte: end } },
        { scheduledPublishAt: { gte: start, lte: end } },
        { dailyKpiKey: { endsWith: `:${dateStr}` } },
      ],
    },
    select: {
      id: true,
      title: true,
      taskType: true,
      quantity: true,
      status: true,
      dailyKpiKey: true,
      subtasksJson: true,
    },
  });

  const existingKeys = new Set(
    existingDayTasks
      .map((t) => t.dailyKpiKey)
      .filter((k): k is string => Boolean(k))
  );

  const progress = computeDailyKpiProgress(items, existingDayTasks);
  const dueAt = new Date(`${dateStr}T17:30:00+07:00`);
  const createdTasks = [];

  for (const row of progress.breakdown) {
    if (row.remainingToPlan <= 0) continue;
    const kpiKey = buildDailyKpiKey(row.id, dateStr);
    if (existingKeys.has(kpiKey)) continue;

    const targetProject =
      (row.projectId && projectById.get(row.projectId)) || visibleProjects[0];
    const prefix = getProjectCodePrefix(targetProject.slug);
    const existingCount = await prisma.task.count({
      where: { projectId: targetProject.id },
    });
    const code = `${prefix}-${String(existingCount + 1).padStart(2, "0")}-${Math.floor(
      10 + Math.random() * 89
    )}`;

    const subtasksJson =
      row.remainingToPlan > 1
        ? Array.from({ length: row.remainingToPlan }, (_, idx) => ({
            id: createSubtaskId(),
            title: `${row.title} #${idx + 1}`,
            done: false,
            dueDate: null,
            assigneeId: null,
            assigneeName: null,
          }))
        : undefined;

    const created = await prisma.task.create({
      data: {
        code,
        title: row.title,
        description: "Đầu việc đồng bộ từ KPI hàng ngày.",
        platform: row.taskType === "CONTENT_WEB" || row.taskType === "WEB_SEO" ? "Website" : "Fanpage",
        taskType: row.taskType,
        status: "IN_PROGRESS",
        priority: "NORMAL",
        isMediaOrder: TASK_TYPE_META[row.taskType]?.isMediaOrderDefault ?? false,
        quantity: row.remainingToPlan,
        dueAt,
        dailyKpiKey: kpiKey,
        subtasksJson: subtasksJson
          ? (subtasksJson as unknown as Prisma.InputJsonValue)
          : undefined,
        projectId: targetProject.id,
        requesterId: user.id,
        assigneeId: user.id,
      },
      include: TASK_CARD_INCLUDE,
    });

    createdTasks.push(created);
    existingKeys.add(kpiKey);
  }

  if (markUserTodaySynced) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastKpiSyncDate: dateStr },
    });
  }

  return { createdTasks };
}

export async function ensureTodayDailyKpiSynced(
  user: KpiSyncUser,
  todayDate: string,
  approvedLeaves?: ApprovedLeaveSpan[]
) {
  if (user.lastKpiSyncDate === todayDate) {
    return { createdTasks: [] };
  }
  const leaves =
    approvedLeaves ??
    (await prisma.leaveRequest.findMany({
      where: {
        userId: user.id,
        status: "APPROVED",
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
      },
      select: { startDate: true, endDate: true, leaveType: true },
    }));

  if (isDailyKpiDayOff(todayDate, leaves).isOff) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastKpiSyncDate: todayDate },
    });
    return { createdTasks: [] };
  }

  return syncDailyKpiTasksForDate({
    user,
    dateStr: todayDate,
    markUserTodaySynced: true,
  });
}
