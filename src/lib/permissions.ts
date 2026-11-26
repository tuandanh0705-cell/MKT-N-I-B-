import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Trả về bộ lọc Prisma ProjectWhereInput theo nguyên tắc:
 * - LEADER: thấy toàn bộ dự án.
 * - MEMBER: chỉ thấy dự án mình tham gia (ProjectMember) hoặc có task gán cho mình.
 */
export function buildProjectVisibilityWhere(
  user: Pick<AuthUser, "id" | "role">
): Prisma.ProjectWhereInput {
  if (user.role === "LEADER") {
    return { isActive: true };
  }

  return {
    isActive: true,
    OR: [
      { members: { some: { userId: user.id } } },
      {
        tasks: {
          some: {
            deletedAt: null,
            OR: [
              { assigneeId: user.id },
              { assignees: { some: { userId: user.id } } },
              { requesterId: user.id },
            ],
          },
        },
      },
    ],
  };
}

/**
 * Trả về bộ lọc Prisma TaskWhereInput đảm bảo:
 * - Luôn ẩn task đã xóa mềm (deletedAt: null).
 * - LEADER: thấy mọi task của mọi dự án.
 * - MEMBER: thấy TẤT CẢ task của các dự án mình có scope PROJECT_WIDE
 *           + chỉ thấy task được gán/đặt bởi mình ở dự án scope ASSIGNED_ONLY;
 *           ẩn hoàn toàn các dự án khác!
 */
export function buildTaskVisibilityWhere(
  user: AuthUser,
  specificProjectId?: string
): Prisma.TaskWhereInput {
  if (user.role === "LEADER") {
    return specificProjectId
      ? { deletedAt: null, projectId: specificProjectId }
      : { deletedAt: null };
  }

  const visibilityRule: Prisma.TaskWhereInput = {
    deletedAt: null,
    OR: [
      { assigneeId: user.id },
      { assignees: { some: { userId: user.id } } },
      { requesterId: user.id },
      {
        project: {
          members: {
            some: {
              userId: user.id,
              scope: "PROJECT_WIDE",
            },
          },
        },
      },
    ],
  };

  if (!specificProjectId) {
    return visibilityRule;
  }

  return {
    AND: [{ projectId: specificProjectId, deletedAt: null }, visibilityRule],
  };
}

export async function canAccessProject(
  user: AuthUser,
  projectId: string
): Promise<boolean> {
  if (user.role === "LEADER") return true;

  const found = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...buildProjectVisibilityWhere(user),
    },
    select: { id: true },
  });

  return Boolean(found);
}

export async function canAccessTask(
  user: AuthUser,
  taskId: string
): Promise<boolean> {
  if (user.role === "LEADER") return true;

  const found = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...buildTaskVisibilityWhere(user),
    },
    select: { id: true },
  });

  return Boolean(found);
}
