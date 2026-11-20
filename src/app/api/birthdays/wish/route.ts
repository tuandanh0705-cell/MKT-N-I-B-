import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const targetUserId = String(body.targetUserId ?? "");
    const message =
      String(body.message ?? "").trim() ||
      `🎂 Chúc mừng sinh nhật bạn! Chúc tuổi mới thật rực rỡ, tràn đầy năng lượng và gặt hái thật nhiều thành công nhé!`;

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, isActive: true },
    });

    if (!target || !target.isActive) {
      return NextResponse.json(
        { error: "Không tìm thấy thành viên nhận lời chúc." },
        { status: 404 }
      );
    }

    await createNotification({
      userId: target.id,
      type: "BIRTHDAY",
      title: `🎁 ${user.name} vừa gửi lời chúc sinh nhật bạn!`,
      message,
      linkUrl: "/schedule",
    });

    // Đồng thời gửi lời chúc vào phòng chat chung nếu tồn tại
    const teamRoom = await prisma.chatRoom.findFirst({
      where: { type: "GROUP", isPinned: true },
      orderBy: { createdAt: "asc" },
    });
    if (teamRoom) {
      await prisma.chatMessage.create({
        data: {
          roomId: teamRoom.id,
          senderId: user.id,
          content: `🎂 Chúc mừng sinh nhật @${target.name}! ${message}`,
        },
      });
      await prisma.chatRoom.update({
        where: { id: teamRoom.id },
        data: { lastMessageAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send birthday wish error:", err);
    return NextResponse.json(
      { error: "Không gửi được lời chúc sinh nhật." },
      { status: 500 }
    );
  }
}
