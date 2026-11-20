import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: taskId } = await context.params;
  const allowed = await canAccessTask(user, taskId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Bạn không có quyền bình luận trên công việc này." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json(
      { error: "Nội dung bình luận không được để trống." },
      { status: 400 }
    );
  }

  const qcFlags: string[] = Array.isArray(body.qcFlags) ? body.qcFlags : [];

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: user.id,
      content,
      qcFlagsJson: qcFlags.length > 0 ? qcFlags : undefined,
    },
    include: {
      author: {
        select: { id: true, name: true, role: true, avatarColor: true, pirateCharacter: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      code: true,
      title: true,
      assigneeId: true,
      requesterId: true,
      project: { select: { slug: true } },
    },
  });

  if (task) {
    const targets = new Set(
      [task.assigneeId, task.requesterId].filter(
        (uid): uid is string => Boolean(uid) && uid !== user.id
      )
    );
    for (const tid of targets) {
      await createNotification({
        userId: tid,
        type: "SYSTEM",
        title: `Bình luận mới trên ${task.code}`,
        message: `${user.name}: ${content}`,
        linkUrl: `/projects/${task.project.slug}`,
      });
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}
