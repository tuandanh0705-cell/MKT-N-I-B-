import { prisma } from "@/lib/prisma";
import { getVnDayBounds, getVnWeekBounds } from "@/lib/dates";

export interface AnonymizedCapacitySlot {
  userId: string;
  name: string;
  title: string;
  departmentScope: string;
  employmentType: string;
  avatarColor: string;
  pirateCharacter: string | null;
  periodLabel: string;
  used: number;
  limit: number | null;
  unit: string;
  utilizationPercent: number;
  status: "AVAILABLE" | "NEAR_LIMIT" | "FULL";
  activeTasksCount: number;
  secondaryMetric?: {
    periodLabel: string;
    used: number;
    limit: number;
    unit: string;
    utilizationPercent: number;
  } | null;
}

/**
 * Trả về công suất tổng ẩn danh của nhân sự.
 * Chỉ trả về số lượng (vd: Mai 12/16 ảnh tuần này, Hoàng 2/2 video hôm nay)
 * và tuyệt đối KHÔNG trả về tên hay nội dung công việc của dự án khác.
 */
export async function getAnonymizedTeamCapacity(
  targetDate: Date = new Date()
): Promise<AnonymizedCapacitySlot[]> {
  const { weekStart, weekEnd } = getVnWeekBounds(targetDate);
  const { start: dayStart, end: dayEnd } = getVnDayBounds(targetDate);

  const users = await prisma.user.findMany({
    where: { isActive: true, role: "MEMBER" },
    orderBy: [{ departmentScope: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      title: true,
      departmentScope: true,
      employmentType: true,
      avatarColor: true,
      pirateCharacter: true,
      weeklyImageLimit: true,
      dailyVideoLimit: true,
    },
  });

  const activeTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      dailyKpiKey: null,
      status: { notIn: ["DRAFT"] },
      AND: [
        { OR: [{ assigneeId: { not: null } }, { assignees: { some: {} } }] },
        {
          OR: [
            { status: { notIn: ["DONE", "PUBLISHED"] } },
            { dueAt: { gte: weekStart, lte: weekEnd } },
            { dueAt: null, createdAt: { gte: weekStart, lte: weekEnd } },
          ],
        },
      ],
    },
    select: {
      assigneeId: true,
      assignees: { select: { userId: true } },
      taskType: true,
      quantity: true,
      status: true,
      dueAt: true,
      createdAt: true,
    },
  });

  return users.map((user) => {
    const userTasks = activeTasks.filter(
      (t) =>
        t.assigneeId === user.id ||
        t.assignees.some((a) => a.userId === user.id)
    );
    const openCount = userTasks.filter(
      (t) => t.status !== "DONE" && t.status !== "PUBLISHED"
    ).length;

    const hasImageLimit = Boolean(user.weeklyImageLimit && user.weeklyImageLimit > 0);
    const hasVideoLimit = Boolean(user.dailyVideoLimit && user.dailyVideoLimit > 0);

    // Media Design (vd: Mai - 16 ảnh/tuần), hỗ trợ thêm cả dailyVideoLimit nếu nhân sự kiêm nhiệm
    if (hasImageLimit) {
      const imageLimit = user.weeklyImageLimit!;
      const usedImages = userTasks
        .filter((t) => {
          if (t.taskType !== "MEDIA_IMAGE") return false;
          const ref = t.dueAt ?? t.createdAt;
          return ref >= weekStart && ref <= weekEnd;
        })
        .reduce((sum, t) => sum + (t.quantity || 1), 0);

      const pct = Math.round((usedImages / imageLimit) * 100);
      let secondaryMetric: AnonymizedCapacitySlot["secondaryMetric"] = null;
      let combinedStatus: AnonymizedCapacitySlot["status"] =
        usedImages >= imageLimit
          ? "FULL"
          : pct >= 75
            ? "NEAR_LIMIT"
            : "AVAILABLE";

      if (hasVideoLimit) {
        const videoLimit = user.dailyVideoLimit!;
        const usedVideos = userTasks
          .filter((t) => {
            if (t.taskType !== "MEDIA_VIDEO") return false;
            const ref = t.dueAt ?? t.createdAt;
            return ref >= dayStart && ref <= dayEnd;
          })
          .reduce((sum, t) => sum + (t.quantity || 1), 0);
        const videoPct = Math.round((usedVideos / videoLimit) * 100);
        secondaryMetric = {
          periodLabel: "Ngày chọn",
          used: usedVideos,
          limit: videoLimit,
          unit: "video",
          utilizationPercent: videoPct,
        };
        if (usedVideos >= videoLimit) {
          combinedStatus = "FULL";
        } else if (videoPct >= 50 && combinedStatus === "AVAILABLE") {
          combinedStatus = "NEAR_LIMIT";
        }
      }

      return {
        userId: user.id,
        name: user.name,
        title: user.title,
        departmentScope: user.departmentScope,
        employmentType: user.employmentType,
        avatarColor: user.avatarColor,
        pirateCharacter: user.pirateCharacter,
        periodLabel: "Tuần này",
        used: usedImages,
        limit: imageLimit,
        unit: "ảnh",
        utilizationPercent: pct,
        status: combinedStatus,
        activeTasksCount: openCount,
        secondaryMetric,
      };
    }

    // Media Edit/Quay (vd: Hoàng - 2 video/ngày)
    if (hasVideoLimit) {
      const videoLimit = user.dailyVideoLimit!;
      const usedVideos = userTasks
        .filter((t) => {
          if (t.taskType !== "MEDIA_VIDEO") return false;
          const ref = t.dueAt ?? t.createdAt;
          return ref >= dayStart && ref <= dayEnd;
        })
        .reduce((sum, t) => sum + (t.quantity || 1), 0);

      const pct = Math.round((usedVideos / videoLimit) * 100);
      return {
        userId: user.id,
        name: user.name,
        title: user.title,
        departmentScope: user.departmentScope,
        employmentType: user.employmentType,
        avatarColor: user.avatarColor,
        pirateCharacter: user.pirateCharacter,
        periodLabel: "Ngày chọn",
        used: usedVideos,
        limit: videoLimit,
        unit: "video",
        utilizationPercent: pct,
        status:
          usedVideos >= videoLimit
            ? "FULL"
            : pct >= 50
              ? "NEAR_LIMIT"
              : "AVAILABLE",
        activeTasksCount: openCount,
        secondaryMetric: null,
      };
    }

    // Các nhân sự Content / Web / Support khác (tính theo số task đang mở)
    return {
      userId: user.id,
      name: user.name,
      title: user.title,
      departmentScope: user.departmentScope,
      employmentType: user.employmentType,
      avatarColor: user.avatarColor,
      pirateCharacter: user.pirateCharacter,
      periodLabel: "Đang xử lý",
      used: openCount,
      limit: null,
      unit: "đầu việc",
      utilizationPercent: Math.min(100, openCount * 20),
      status: openCount >= 5 ? "NEAR_LIMIT" : "AVAILABLE",
      activeTasksCount: openCount,
      secondaryMetric: null,
    };
  });
}
