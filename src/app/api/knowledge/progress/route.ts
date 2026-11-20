import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeCourseUrl } from "@/lib/knowledge";
import { createNotification } from "@/lib/notifications";

const VALID_STATUSES = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Case 1: Leader ghi chú phản hồi / khích lệ trên bài học của nhân viên
    if (body.action === "LEADER_NOTE") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có thể thêm ghi chú kiểm tra học tập." },
          { status: 403 }
        );
      }

      const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
      const targetUserId =
        typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
      const leaderNote =
        typeof body.leaderNote === "string" ? body.leaderNote.trim() : "";

      if (!lessonId || !targetUserId) {
        return NextResponse.json(
          { error: "Thiếu lessonId hoặc targetUserId." },
          { status: 400 }
        );
      }

      const lesson = await prisma.knowledgeLesson.findUnique({
        where: { id: lessonId },
        include: { course: { select: { id: true, title: true } } },
      });
      if (!lesson) {
        return NextResponse.json(
          { error: "Không tìm thấy bài học." },
          { status: 404 }
        );
      }

      const progress = await prisma.knowledgeLessonProgress.upsert({
        where: {
          lessonId_userId: { lessonId, userId: targetUserId },
        },
        create: {
          courseId: lesson.courseId,
          lessonId,
          userId: targetUserId,
          status: "IN_PROGRESS",
          leaderNote: leaderNote || null,
        },
        update: {
          leaderNote: leaderNote || null,
        },
      });

      if (leaderNote && targetUserId !== user.id) {
        await createNotification({
          userId: targetUserId,
          type: "SYSTEM",
          title: `Leader góp ý bài học "${lesson.title}"`,
          message: leaderNote,
          linkUrl: `/knowledge?courseId=${lesson.course.id}`,
          sendPushNow: true,
          sendEmailNow: false,
        });
      }

      return NextResponse.json({ progress });
    }

    // Case 2: Thành viên tự cập nhật tiến độ, Thu hoạch & Link bài thực hành
    const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu mã bài học." }, { status: 400 });
    }

    const lesson = await prisma.knowledgeLesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    });
    if (!lesson) {
      return NextResponse.json(
        { error: "Không tìm thấy bài học." },
        { status: 404 }
      );
    }

    const existing = await prisma.knowledgeLessonProgress.findUnique({
      where: {
        lessonId_userId: { lessonId, userId: user.id },
      },
    });

    const nextStatus =
      typeof body.status === "string" && VALID_STATUSES.has(body.status)
        ? body.status
        : existing?.status || "IN_PROGRESS";

    const nextTakeaways =
      body.takeaways !== undefined
        ? typeof body.takeaways === "string" && body.takeaways.trim()
          ? body.takeaways.trim()
          : null
        : existing?.takeaways ?? null;

    const nextPracticeUrl =
      body.practiceUrl !== undefined
        ? typeof body.practiceUrl === "string" && body.practiceUrl.trim()
          ? normalizeCourseUrl(body.practiceUrl)
          : null
        : existing?.practiceUrl ?? null;

    const nextCompletedAt =
      nextStatus === "COMPLETED"
        ? existing?.completedAt ?? new Date()
        : null;

    const progress = await prisma.knowledgeLessonProgress.upsert({
      where: {
        lessonId_userId: { lessonId, userId: user.id },
      },
      create: {
        courseId: lesson.courseId,
        lessonId,
        userId: user.id,
        status: nextStatus,
        takeaways: nextTakeaways,
        practiceUrl: nextPracticeUrl,
        completedAt: nextCompletedAt,
      },
      update: {
        status: nextStatus,
        takeaways: nextTakeaways,
        practiceUrl: nextPracticeUrl,
        completedAt: nextCompletedAt,
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("POST /api/knowledge/progress error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật tiến độ học tập." },
      { status: 500 }
    );
  }
}
