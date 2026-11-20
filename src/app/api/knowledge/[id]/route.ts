import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { KNOWLEDGE_COURSE_INCLUDE } from "@/lib/knowledge-data";
import { normalizeCourseUrl } from "@/lib/knowledge";
import type { DepartmentScope } from "@/generated/prisma/client";

const VALID_CATEGORIES = new Set([
  "GENERAL",
  "CONTENT",
  "MEDIA_DESIGN",
  "MEDIA_VIDEO",
  "WEB_ADS",
  "AI_AUTOMATION",
]);

function canEditCourse(
  user: { id: string; role: string },
  course: { createdById: string; trackType: string }
) {
  if (user.role === "LEADER") return true;
  return course.createdById === user.id && course.trackType === "SHARED";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.knowledgeCourse.findUnique({
    where: { id },
    include: { lessons: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy khóa học." },
      { status: 404 }
    );
  }

  if (!canEditCourse(user, existing)) {
    return NextResponse.json(
      { error: "Bạn không có quyền chỉnh sửa khóa học này." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const isLeader = user.role === "LEADER";

    const nextCourseUrl =
      typeof body.courseUrl === "string" && body.courseUrl.trim()
        ? normalizeCourseUrl(body.courseUrl)
        : existing.courseUrl;

    const nextTitle =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : existing.title;

    const nextTrackType =
      isLeader && (body.trackType === "OFFICIAL" || body.trackType === "SHARED")
        ? body.trackType
        : existing.trackType;

    const nextMandatory =
      isLeader && body.isMandatory !== undefined
        ? Boolean(body.isMandatory) && nextTrackType === "OFFICIAL"
        : existing.isMandatory;

    const nextPinned =
      isLeader && body.isPinned !== undefined
        ? Boolean(body.isPinned)
        : existing.isPinned;

    const nextCategory =
      typeof body.category === "string" && VALID_CATEGORIES.has(body.category)
        ? body.category
        : existing.category;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.knowledgeCourse.update({
        where: { id },
        data: {
          title: nextTitle,
          description:
            body.description !== undefined
              ? typeof body.description === "string" && body.description.trim()
                ? body.description.trim()
                : null
              : existing.description,
          courseUrl: nextCourseUrl,
          trackType: nextTrackType,
          category: nextCategory,
          targetDepartment:
            body.targetDepartment !== undefined
              ? typeof body.targetDepartment === "string" &&
                body.targetDepartment.trim()
                ? (body.targetDepartment.trim() as DepartmentScope)
                : null
              : existing.targetDepartment,
          isMandatory: nextMandatory,
          isPinned: nextPinned,
          estimatedMinutes:
            body.estimatedMinutes !== undefined
              ? Math.max(5, Math.min(2000, Number(body.estimatedMinutes) || 30))
              : existing.estimatedMinutes,
          projectId:
            body.projectId !== undefined
              ? typeof body.projectId === "string" && body.projectId.trim()
                ? body.projectId.trim()
                : null
              : existing.projectId,
        },
      });

      // Đồng bộ bài học thông minh: giữ nguyên ID bài học cũ để không mất tiến độ đã học của team!
      if (Array.isArray(body.lessons)) {
        const incoming: Array<{
          id?: string;
          title?: string;
          lessonUrl?: string;
          summary?: string;
          durationMinutes?: number;
        }> = body.lessons.filter(
          (l: { title?: unknown }) =>
            typeof l?.title === "string" && l.title.trim().length > 0
        );

        const existingIds = new Set(existing.lessons.map((l) => l.id));
        const keptIds = new Set<string>();

        for (let idx = 0; idx < incoming.length; idx += 1) {
          const item = incoming[idx];
          const cleanLessonTitle = item.title!.trim();
          const cleanLessonUrl =
            typeof item.lessonUrl === "string" && item.lessonUrl.trim()
              ? normalizeCourseUrl(item.lessonUrl)
              : nextCourseUrl;
          const cleanSummary =
            typeof item.summary === "string" && item.summary.trim()
              ? item.summary.trim()
              : null;
          const cleanDuration = Math.max(
            5,
            Math.min(600, Number(item.durationMinutes) || 20)
          );

          if (item.id && existingIds.has(item.id)) {
            keptIds.add(item.id);
            await tx.knowledgeLesson.update({
              where: { id: item.id },
              data: {
                orderIndex: idx,
                title: cleanLessonTitle,
                lessonUrl: cleanLessonUrl,
                summary: cleanSummary,
                durationMinutes: cleanDuration,
              },
            });
          } else {
            const createdLesson = await tx.knowledgeLesson.create({
              data: {
                courseId: id,
                orderIndex: idx,
                title: cleanLessonTitle,
                lessonUrl: cleanLessonUrl,
                summary: cleanSummary,
                durationMinutes: cleanDuration,
              },
            });
            keptIds.add(createdLesson.id);
          }
        }

        const removedIds = existing.lessons
          .map((l) => l.id)
          .filter((oldId) => !keptIds.has(oldId));

        if (removedIds.length > 0 && keptIds.size > 0) {
          await tx.knowledgeLesson.deleteMany({
            where: { id: { in: removedIds }, courseId: id },
          });
        }
      }

      return tx.knowledgeCourse.findUnique({
        where: { id },
        include: KNOWLEDGE_COURSE_INCLUDE,
      });
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error("PATCH /api/knowledge/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật khóa học." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.knowledgeCourse.findUnique({
    where: { id },
    select: { id: true, createdById: true, trackType: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy khóa học." },
      { status: 404 }
    );
  }

  if (!canEditCourse(user, existing)) {
    return NextResponse.json(
      { error: "Bạn không có quyền xóa khóa học này." },
      { status: 403 }
    );
  }

  await prisma.knowledgeCourse.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
