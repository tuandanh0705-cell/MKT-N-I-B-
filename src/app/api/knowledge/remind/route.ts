import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền gửi nhắc nhở học tập." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const targetUserId =
      typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
    const courseId =
      typeof body.courseId === "string" ? body.courseId.trim() : "";
    const customMessage =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!targetUserId || !courseId) {
      return NextResponse.json(
        { error: "Thiếu thông tin người nhận hoặc khóa học." },
        { status: 400 }
      );
    }

    const course = await prisma.knowledgeCourse.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Không tìm thấy khóa học." },
        { status: 404 }
      );
    }

    const notification = await createNotification({
      userId: targetUserId,
      type: "REMINDER",
      title: `Nhắc học: ${course.title}`,
      message:
        customMessage ||
        `${user.name} nhắc bạn tranh thủ hoàn thành khóa học "${course.title}" và cập nhật phần Thu hoạch tại Khu Luyện Tập nhé!`,
      linkUrl: `/knowledge?courseId=${course.id}`,
      sendPushNow: true,
      sendEmailNow: false,
    });

    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    console.error("POST /api/knowledge/remind error:", error);
    return NextResponse.json(
      { error: "Không thể gửi nhắc học." },
      { status: 500 }
    );
  }
}
