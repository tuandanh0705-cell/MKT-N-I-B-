import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { formatVnDateTime } from "@/lib/dates";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { slug: true, name: true } },
      assignee: { select: { id: true, name: true } },
      assignees: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const targetIds = Array.from(
    new Set(
      [
        task?.assignee?.id,
        ...(task?.assignees.map((a) => a.user.id) ?? []),
      ].filter((uid): uid is string => Boolean(uid))
    )
  );

  if (!task || targetIds.length === 0) {
    return NextResponse.json(
      { error: "Công việc chưa gán nhân sự để gửi nhắc nhở." },
      { status: 400 }
    );
  }

  if (user.role !== "LEADER" && task.requesterId !== user.id) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc người giao việc mới có quyền gửi nhắc tiến độ." },
      { status: 403 }
    );
  }

  const isLeaderRemind = user.role === "LEADER";
  let anyEmailSent = false;
  for (const uid of targetIds) {
    const notif = await createNotification({
      userId: uid,
      type: "REMINDER",
      title: isLeaderRemind
        ? `🔔 Leader nhắc việc gấp: ${task.code}`
        : `🔔 ${user.name} nhắc tiến độ: ${task.code}`,
      message: `${user.name} nhắc bạn kiểm tra & cập nhật tiến độ đầu việc "${task.title}" (${task.project.name}) • Hạn: ${formatVnDateTime(task.dueAt)}.`,
      linkUrl: `/my-work?taskId=${task.id}&openChat=1`,
      sendEmailNow: isLeaderRemind,
      actionLabel: "Mở thẻ công việc & phản hồi",
    });
    if (notif?.emailSent) anyEmailSent = true;
  }

  return NextResponse.json({
    ok: true,
    remindedCount: targetIds.length,
    emailSent: anyEmailSent,
  });
}
