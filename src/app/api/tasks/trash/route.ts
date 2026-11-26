import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const memberTrashWhere = {
    deletedAt: { not: null },
    OR: [
      { requesterId: user.id },
      { deletedById: user.id },
      {
        project: {
          members: {
            some: {
              userId: user.id,
              scope: "PROJECT_WIDE" as const,
            },
          },
        },
      },
    ],
  };

  const where =
    user.role === "LEADER"
      ? { deletedAt: { not: null } }
      : memberTrashWhere;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { deletedAt: "desc" },
    take: 50,
    include: {
      project: { select: { id: true, slug: true, name: true, color: true } },
      assignee: { select: { id: true, name: true } },
      deletedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const taskId = String(body.taskId ?? "");
    const action = String(body.action ?? "RESTORE");

    if (action === "RESTORE_ALL") {
      const scopeWhere =
        user.role === "LEADER"
          ? { deletedAt: { not: null } }
          : {
              deletedAt: { not: null },
              OR: [
                { requesterId: user.id },
                { deletedById: user.id },
                {
                  project: {
                    members: {
                      some: {
                        userId: user.id,
                        scope: "PROJECT_WIDE" as const,
                      },
                    },
                  },
                },
              ],
            };
      const restored = await prisma.task.updateMany({
        where: scopeWhere,
        data: { deletedAt: null, deletedById: null },
      });
      return NextResponse.json({
        ok: true,
        restoredCount: restored.count,
      });
    }

    if (action === "EMPTY_TRASH") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới được dọn sạch Thùng rác." },
          { status: 403 }
        );
      }
      const purged = await prisma.task.deleteMany({
        where: { deletedAt: { not: null } },
      });
      return NextResponse.json({
        ok: true,
        deletedCount: purged.count,
      });
    }

    if (!taskId) {
      return NextResponse.json({ error: "Thiếu taskId" }, { status: 400 });
    }

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        code: true,
        title: true,
        projectId: true,
        requesterId: true,
        deletedById: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy công việc trong Thùng rác." },
        { status: 404 }
      );
    }

    if (action === "PERMANENT_DELETE") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới được xóa vĩnh viễn khỏi Thùng rác." },
          { status: 403 }
        );
      }
      await prisma.task.delete({ where: { id: taskId } });
      return NextResponse.json({ ok: true, deleted: true });
    }

    let canRestore =
      user.role === "LEADER" ||
      existing.requesterId === user.id ||
      existing.deletedById === user.id;

    if (!canRestore) {
      const projectMembership = await prisma.projectMember.findFirst({
        where: {
          projectId: existing.projectId,
          userId: user.id,
          scope: "PROJECT_WIDE",
        },
        select: { id: true },
      });
      canRestore = Boolean(projectMembership);
    }

    if (!canRestore) {
      return NextResponse.json(
        { error: "Bạn không có quyền khôi phục công việc này." },
        { status: 403 }
      );
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: null, deletedById: null },
    });

    await recordActivity({
      entityType: "TASK",
      entityId: taskId,
      taskId,
      actorId: user.id,
      action: "RESTORE",
      summary: `${user.name} đã khôi phục công việc "${existing.title}" (${existing.code}) từ Thùng rác.`,
    });

    return NextResponse.json({ ok: true, restored: true });
  } catch (err) {
    console.error("Trash action error:", err);
    return NextResponse.json(
      { error: "Không thể xử lý Thùng rác." },
      { status: 500 }
    );
  }
}
