import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getChatUnreadCountForUser } from "@/lib/chat";
import { buildTaskVisibilityWhere } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const [notifications, chatUnreadCount, pendingReviewsCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getChatUnreadCountForUser(user.id),
    prisma.task.count({
      where: {
        AND: [
          buildTaskVisibilityWhere(user),
          { status: { in: ["WAITING_APPROVAL", "BRIEF_REVIEW"] } },
        ],
      },
    }),
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({
    notifications,
    unreadCount,
    chatUnreadCount,
    pendingReviewsCount,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json();

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: String(body.id), userId: user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
}
