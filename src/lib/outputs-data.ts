import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { analyzeTaskOutputs, sortTasksForOutputCheck } from "@/lib/output-helpers";
import { getGeminiConfigStatus } from "@/lib/gemini-ai";
import { TASK_WITH_RECENT_COMMENTS_INCLUDE } from "@/lib/task-queries";
import type { AuthUser } from "@/lib/auth";
import type { TaskItem } from "@/types/crm";

/**
 * Truy vấn dữ liệu kiểm tra Output nhân viên theo phân quyền:
 * - LEADER: xem toàn bộ nhân sự active & tất cả task không bị xóa mềm.
 * - MEMBER: chỉ xem tài khoản & output do chính mình thực hiện (assigneeId = user.id).
 */
export async function getOutputsWorkspaceData(user: AuthUser) {
  const isLeader = user.role === "LEADER";

  const [rawTasks, projects, users, aiConfig] = await Promise.all([
    prisma.task.findMany({
      where: isLeader
        ? { deletedAt: null }
        : { deletedAt: null, assigneeId: user.id },
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      include: TASK_WITH_RECENT_COMMENTS_INCLUDE,
    }),
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        color: true,
        description: true,
        channelSummary: true,
        weeklySocialTarget: true,
        weeklyAdsTarget: true,
        weeklyVideoTarget: true,
        weeklyImageTarget: true,
        kpiNote: true,
      },
    }),
    prisma.user.findMany({
      where: isLeader ? { isActive: true } : { isActive: true, id: user.id },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        departmentScope: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        isActive: true,
      },
    }),
    getGeminiConfigStatus(),
  ]);

  const tasks = sortTasksForOutputCheck(rawTasks as unknown as TaskItem[]);

  let withOutputCount = 0;
  let contentCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let needsReviewCount = 0;

  for (const t of tasks) {
    const analyzed = analyzeTaskOutputs(t);
    if (analyzed.hasSubmittedOutput) withOutputCount += 1;
    if (analyzed.category === "CONTENT") contentCount += 1;
    if (analyzed.category === "IMAGE") imageCount += 1;
    if (analyzed.category === "VIDEO") videoCount += 1;
    if (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") {
      needsReviewCount += 1;
    }
  }

  return {
    tasks,
    projects,
    users,
    aiConfig,
    stats: {
      totalTasks: tasks.length,
      withOutputCount,
      contentCount,
      imageCount,
      videoCount,
      needsReviewCount,
    },
  };
}
