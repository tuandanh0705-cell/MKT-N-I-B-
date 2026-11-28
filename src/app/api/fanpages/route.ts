import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildProjectVisibilityWhere,
  canAccessProject,
} from "@/lib/permissions";
import { getOrCreateAppSecret } from "@/lib/webpush";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";

async function ensureStarterFanpages(leaderId: string) {
  const count = await prisma.fanpageChannel.count();
  if (count > 0) return;

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { id: true, name: true, slug: true },
  });

  const { weekStartStr } = getVnWeekBounds();
  const monthKey = getVnMonthKey();

  const starterPages = [
    {
      name: "Meta Ecom Official Fanpage",
      pageId: "metaecom.official",
      pageUrl: "https://www.facebook.com/metaecom.official",
      projectId: projects[0]?.id ?? null,
      followers: 12480,
      likesCount: 11900,
    },
    ...(projects[1]
      ? [
          {
            name: `${projects[1].name} Fanpage`,
            pageId: projects[1].slug,
            pageUrl: `https://www.facebook.com/${projects[1].slug}`,
            projectId: projects[1].id,
            followers: 8650,
            likesCount: 8300,
          },
        ]
      : []),
  ];

  for (const item of starterPages) {
    const page = await prisma.fanpageChannel.create({
      data: {
        name: item.name,
        pageId: item.pageId,
        pageUrl: item.pageUrl,
        projectId: item.projectId,
        managedById: leaderId,
        followers: item.followers,
        likesCount: item.likesCount,
        lastSyncStatus: "READY",
        lastSyncNote:
          "Fanpage mẫu — hãy cập nhật đúng URL / Page Token hoặc dùng Bookmarklet để đồng bộ số liệu thật.",
      },
    });

    await prisma.fanpageMetricSnapshot.create({
      data: {
        channelId: page.id,
        weekStart: weekStartStr,
        monthKey,
        followers: item.followers,
        followersDelta: 120,
        reach: 18500,
        impressions: 24200,
        engagement: 1420,
        reactions: 980,
        comments: 260,
        shares: 180,
        postsCount: 5,
        topPostTitle: "Bài mẫu giới thiệu giải pháp nổi bật tuần này",
        source: "MANUAL",
        syncedById: leaderId,
        notes: "Dữ liệu khởi tạo ban đầu",
      },
    });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await ensureStarterFanpages(user.id);

  const visibleProjects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    select: { id: true },
  });
  const projectIds = visibleProjects.map((p) => p.id);

  const [channels, ingestSecret] = await Promise.all([
    prisma.fanpageChannel.findMany({
      where: {
        isActive: true,
        OR: [{ projectId: null }, { projectId: { in: projectIds } }],
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        managedBy: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 10,
          include: { syncedBy: { select: { id: true, name: true } } },
        },
      },
    }),
    user.role === "LEADER"
      ? getOrCreateAppSecret("fanpage_ingest_secret")
      : Promise.resolve(null),
  ]);

  const sanitized = channels.map((c) => ({
    ...c,
    accessToken: undefined,
    hasAccessToken: Boolean(c.accessToken),
  }));

  return NextResponse.json({ channels: sanitized, ingestSecret });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const pageUrl = String(body.pageUrl ?? "").trim();
    const projectId = body.projectId ? String(body.projectId) : null;

    if (!name || !pageUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tên Fanpage và Link Facebook Fanpage." },
        { status: 400 }
      );
    }

    if (projectId) {
      const allowed = await canAccessProject(user, projectId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không thuộc dự án này." },
          { status: 403 }
        );
      }
    }

    const created = await prisma.fanpageChannel.create({
      data: {
        name,
        pageId: body.pageId
          ? String(body.pageId).trim().replace(/^["']+|["']+$/g, "")
          : null,
        pageUrl,
        accessToken: body.accessToken
          ? String(body.accessToken).trim().replace(/^["']+|["']+$/g, "")
          : null,
        projectId,
        managedById: body.managedById ? String(body.managedById) : user.id,
        lastSyncStatus: "NEW",
        lastSyncNote: "Đã thêm kênh mới, sẵn sàng cào dữ liệu.",
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        managedBy: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        snapshots: { take: 5 },
      },
    });

    return NextResponse.json(
      {
        channel: {
          ...created,
          accessToken: undefined,
          hasAccessToken: Boolean(created.accessToken),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create fanpage error:", err);
    return NextResponse.json(
      { error: "Không thể thêm Fanpage mới." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const existing = await prisma.fanpageChannel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy Fanpage." },
        { status: 404 }
      );
    }

    if (existing.projectId) {
      const allowed = await canAccessProject(user, existing.projectId);
      if (!allowed && user.role !== "LEADER") {
        return NextResponse.json({ error: "Không có quyền sửa." }, { status: 403 });
      }
    }

    const updated = await prisma.fanpageChannel.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        pageId:
          body.pageId !== undefined
            ? body.pageId
              ? String(body.pageId).trim().replace(/^["']+|["']+$/g, "")
              : null
            : undefined,
        pageUrl: body.pageUrl ? String(body.pageUrl).trim() : undefined,
        accessToken:
          body.accessToken !== undefined
            ? body.accessToken
              ? String(body.accessToken).trim().replace(/^["']+|["']+$/g, "")
              : null
            : undefined,
        managedById:
          body.managedById !== undefined
            ? body.managedById
              ? String(body.managedById)
              : null
            : undefined,
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        managedBy: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
      },
    });

    return NextResponse.json({
      channel: {
        ...updated,
        accessToken: undefined,
        hasAccessToken: Boolean(updated.accessToken),
      },
    });
  } catch (err) {
    console.error("Update fanpage error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật Fanpage." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const existing = await prisma.fanpageChannel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy Fanpage." },
      { status: 404 }
    );
  }
  if (user.role !== "LEADER" && existing.managedById !== user.id) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc người phụ trách kênh mới được xóa." },
      { status: 403 }
    );
  }

  await prisma.fanpageChannel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
