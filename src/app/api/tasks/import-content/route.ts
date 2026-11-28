import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/permissions";
import { getProjectCodePrefix } from "@/lib/constants";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";

interface ImportRowInput {
  publishDateIso?: string | null;
  route?: string;
  title?: string;
  platform?: string;
  publishChannel?: string;
  caption?: string;
  format?: string;
  mediaDueIso?: string | null;
  contentDueIso?: string | null;
  productLink?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const rawRows = Array.isArray(body.rows) ? (body.rows as ImportRowInput[]) : [];

    if (!projectId || rawRows.length === 0) {
      return NextResponse.json(
        { error: "Thiếu dự án hoặc danh sách dòng bài viết." },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(user, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền thêm bài vào dự án này." },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án." }, { status: 404 });
    }

    const prefix = getProjectCodePrefix(project.slug);
    let countInProject = await prisma.task.count({ where: { projectId } });
    const rows = rawRows.slice(0, 60).filter((r) => String(r.title ?? "").trim());
    const minSortAgg = await prisma.task.aggregate({
      where: { projectId, deletedAt: null },
      _min: { sortOrder: true },
    });
    const baseSortOrder = (minSortAgg._min.sortOrder ?? 0) - rows.length;

    const createdTasks = [];
    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const title = String(row.title ?? "").trim();
      if (!title) continue;
      countInProject += 1;
      const code = `${prefix}-${String(countInProject).padStart(2, "0")}-${Math.floor(
        10 + Math.random() * 89
      )}`;
      const publishAt = row.publishDateIso ? new Date(row.publishDateIso) : null;
      const dueAt = row.contentDueIso ? new Date(row.contentDueIso) : null;
      const mediaDueAt = row.mediaDueIso ? new Date(row.mediaDueIso) : null;

      const created = await prisma.task.create({
        data: {
          code,
          title,
          sortOrder: baseSortOrder + idx,
          caption: row.caption ? String(row.caption) : null,
          platform: row.platform ? String(row.platform) : "Facebook",
          publishChannel: row.publishChannel
            ? String(row.publishChannel).trim()
            : null,
          taskType: "CONTENT_SOCIAL",
          status: row.caption && String(row.caption).trim() ? "IN_PROGRESS" : "DRAFT",
          isMediaOrder: false,
          contentAngle: row.route ? String(row.route).trim() : null,
          postFormat: row.format ? String(row.format).trim() : "Ảnh",
          mediaDueAt:
            mediaDueAt && !Number.isNaN(mediaDueAt.getTime()) ? mediaDueAt : null,
          dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
          scheduledPublishAt:
            publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : null,
          productLink: row.productLink ? String(row.productLink).trim() : null,
          projectId,
          requesterId: user.id,
          assigneeId: user.id,
          assignees: {
            create: [{ userId: user.id }],
          },
        },
        include: TASK_CARD_INCLUDE,
      });
      createdTasks.push(created);
    }

    return NextResponse.json({ tasks: createdTasks }, { status: 201 });
  } catch (err) {
    console.error("Import content rows error:", err);
    return NextResponse.json(
      { error: "Không thể import danh sách bài viết." },
      { status: 500 }
    );
  }
}
