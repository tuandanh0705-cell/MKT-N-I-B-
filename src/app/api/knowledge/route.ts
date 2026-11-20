import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgeWorkspaceData, KNOWLEDGE_COURSE_INCLUDE } from "@/lib/knowledge-data";
import { normalizeCourseUrl } from "@/lib/knowledge";
import { createNotification } from "@/lib/notifications";
import type { DepartmentScope } from "@/generated/prisma/client";

const VALID_CATEGORIES = new Set([
  "GENERAL",
  "CONTENT",
  "MEDIA_DESIGN",
  "MEDIA_VIDEO",
  "WEB_ADS",
  "AI_AUTOMATION",
]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const data = await getKnowledgeWorkspaceData(user);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const rawUrl = typeof body.courseUrl === "string" ? body.courseUrl : "";
    const courseUrl = normalizeCourseUrl(rawUrl);

    if (!title || !courseUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tên khóa học và Link khóa học." },
        { status: 400 }
      );
    }

    const isLeader = user.role === "LEADER";
    const trackType =
      isLeader && body.trackType === "OFFICIAL" ? "OFFICIAL" : "SHARED";
    const isMandatory = isLeader && trackType === "OFFICIAL" ? Boolean(body.isMandatory) : false;
    const isPinned = isLeader ? Boolean(body.isPinned) : false;

    const category =
      typeof body.category === "string" && VALID_CATEGORIES.has(body.category)
        ? body.category
        : "GENERAL";

    const targetDepartment =
      typeof body.targetDepartment === "string" && body.targetDepartment.trim()
        ? (body.targetDepartment.trim() as DepartmentScope)
        : null;

    const projectId =
      typeof body.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : null;

    const estimatedMinutes = Math.max(
      5,
      Math.min(2000, Number(body.estimatedMinutes) || 30)
    );

    const rawLessons: Array<{
      title?: string;
      lessonUrl?: string;
      summary?: string;
      durationMinutes?: number;
    }> = Array.isArray(body.lessons) ? body.lessons : [];

    const normalizedLessons = rawLessons
      .map((l, idx) => ({
        orderIndex: idx,
        title: typeof l.title === "string" ? l.title.trim() : "",
        lessonUrl:
          typeof l.lessonUrl === "string" && l.lessonUrl.trim()
            ? normalizeCourseUrl(l.lessonUrl)
            : courseUrl,
        summary:
          typeof l.summary === "string" && l.summary.trim()
            ? l.summary.trim()
            : null,
        durationMinutes: Math.max(
          5,
          Math.min(600, Number(l.durationMinutes) || 20)
        ),
      }))
      .filter((l) => l.title.length > 0);

    const lessonsToCreate =
      normalizedLessons.length > 0
        ? normalizedLessons
        : [
            {
              orderIndex: 0,
              title: "Nội dung chính của khóa học",
              lessonUrl: courseUrl,
              summary:
                typeof body.description === "string" && body.description.trim()
                  ? body.description.trim()
                  : null,
              durationMinutes: estimatedMinutes,
            },
          ];

    const created = await prisma.knowledgeCourse.create({
      data: {
        title,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
        courseUrl,
        trackType,
        category,
        targetDepartment,
        isMandatory,
        isPinned,
        estimatedMinutes,
        projectId,
        createdById: user.id,
        lessons: {
          create: lessonsToCreate,
        },
      },
      include: KNOWLEDGE_COURSE_INCLUDE,
    });

    // Tùy chọn gửi thông báo cho team khi Leader phát hành khóa học bắt buộc
    if (isLeader && trackType === "OFFICIAL" && body.notifyTeam === true) {
      const recipients = await prisma.user.findMany({
        where: {
          isActive: true,
          id: { not: user.id },
          ...(targetDepartment ? { departmentScope: targetDepartment } : {}),
        },
        select: { id: true },
      });

      await Promise.all(
        recipients.map((r) =>
          createNotification({
            userId: r.id,
            type: "SYSTEM",
            title: isMandatory
              ? "Khóa học bắt buộc mới"
              : "Khóa học mới tại Khu Luyện Tập",
            message: `${user.name} vừa thêm khóa "${created.title}". Hãy vào học và cập nhật tiến độ nhé!`,
            linkUrl: `/knowledge?courseId=${created.id}`,
            sendPushNow: true,
            sendEmailNow: false,
          })
        )
      );
    }

    return NextResponse.json({ course: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/knowledge error:", error);
    return NextResponse.json(
      { error: "Không thể tạo khóa học mới." },
      { status: 500 }
    );
  }
}
