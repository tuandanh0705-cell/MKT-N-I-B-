import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
  canAccessProject,
} from "@/lib/permissions";
import { getVnWeekBounds } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { weekStart, weekEnd, weekStartStr, weekEndStr } = getVnWeekBounds();

  const projects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    include: {
      weeklyReportNotes: {
        where: { weekStart: weekStartStr },
        include: { author: { select: { name: true } } },
      },
    },
  });

  const tasks = await prisma.task.findMany({
    where: buildTaskVisibilityWhere(user),
    select: {
      id: true,
      projectId: true,
      taskType: true,
      status: true,
      quantity: true,
      revisionCount: true,
      wasLate: true,
      dueAt: true,
      scheduledPublishAt: true,
      createdAt: true,
    },
  });

  const summary = projects.map((p) => {
    const projectTasks = tasks.filter((t) => {
      if (t.projectId !== p.id) return false;
      const ref = t.scheduledPublishAt ?? t.dueAt ?? t.createdAt;
      return ref >= weekStart && ref <= weekEnd;
    });

    const completedStatuses = new Set(["APPROVED_FINAL", "PUBLISHED", "DONE"]);
    const doneTasks = projectTasks.filter((t) => completedStatuses.has(t.status));

    const socialDone = doneTasks
      .filter((t) => t.taskType === "CONTENT_SOCIAL" || t.taskType === "CONTENT_WEB")
      .reduce((s, t) => s + t.quantity, 0);
    const adsDone = doneTasks
      .filter((t) => t.taskType === "CONTENT_ADS" || t.taskType === "ADS_CAMPAIGN")
      .reduce((s, t) => s + t.quantity, 0);
    const imageDone = doneTasks
      .filter((t) => t.taskType === "MEDIA_IMAGE")
      .reduce((s, t) => s + t.quantity, 0);
    const videoDone = doneTasks
      .filter((t) => t.taskType === "MEDIA_VIDEO")
      .reduce((s, t) => s + t.quantity, 0);

    const lateCount = projectTasks.filter((t) => t.wasLate).length;
    const onTimeCount = doneTasks.filter((t) => !t.wasLate).length;

    return {
      projectId: p.id,
      slug: p.slug,
      name: p.name,
      color: p.color,
      kpiNote: p.kpiNote,
      targets: {
        social: p.weeklySocialTarget,
        ads: p.weeklyAdsTarget,
        image: p.weeklyImageTarget,
        video: p.weeklyVideoTarget,
      },
      actuals: {
        totalTasks: projectTasks.length,
        doneTasks: doneTasks.length,
        socialDone,
        adsDone,
        imageDone,
        videoDone,
        onTimeCount,
        lateCount,
      },
      note: p.weeklyReportNotes[0] ?? null,
    };
  });

  return NextResponse.json({
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    summary,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "SEND_TO_LEADER") {
      const period = body.period === "MONTHLY" ? "MONTHLY" : "WEEKLY";
      const periodLabel = String(body.periodLabel ?? "");
      const summaryText = String(body.summaryText ?? "").trim();

      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });

      for (const l of leaders) {
        await createNotification({
          userId: l.id,
          type: "SYSTEM",
          title: `📋 Báo cáo Công việc ${
            period === "WEEKLY" ? "Tuần" : "Tháng"
          } (${periodLabel}) — ${user.name}`,
          message:
            summaryText ||
            `${user.name} vừa gửi bảng tổng kết công việc kỳ ${periodLabel}. Bấm để xem chi tiết!`,
          linkUrl: "/reports",
        });
      }

      return NextResponse.json({
        ok: true,
        notifiedCount: leaders.length,
        message: "Đã gửi báo cáo công việc & bắn thông báo tới Leader!",
      });
    }

    const projectId = String(body.projectId ?? "");
    if (!projectId) {
      return NextResponse.json({ error: "Thiếu projectId" }, { status: 400 });
    }

    const allowed = await canAccessProject(user, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền ghi báo cáo dự án này." },
        { status: 403 }
      );
    }

    const { weekStartStr } = getVnWeekBounds();
    const weekStart = body.weekStart ? String(body.weekStart) : weekStartStr;

    const saved = await prisma.weeklyReportNote.upsert({
      where: { projectId_weekStart: { projectId, weekStart } },
      update: {
        authorId: user.id,
        highlights: body.highlights ? String(body.highlights) : null,
        blockers: body.blockers ? String(body.blockers) : null,
        proposals: body.proposals ? String(body.proposals) : null,
      },
      create: {
        projectId,
        authorId: user.id,
        weekStart,
        highlights: body.highlights ? String(body.highlights) : null,
        blockers: body.blockers ? String(body.blockers) : null,
        proposals: body.proposals ? String(body.proposals) : null,
      },
    });

    return NextResponse.json({ note: saved });
  } catch (err) {
    console.error("Save weekly note error:", err);
    return NextResponse.json(
      { error: "Không thể lưu ghi chú báo cáo tuần." },
      { status: 500 }
    );
  }
}
