import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildProjectVisibilityWhere, canAccessProject } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              title: true,
              departmentScope: true,
              avatarColor: true,
            },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền tạo dự án mới." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Tên dự án không được để trống." },
        { status: 400 }
      );
    }

    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = body.slug
      ? String(body.slug).trim()
      : `${baseSlug || "du-an"}-${Date.now().toString(36).slice(-4)}`;

    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];

    const created = await prisma.project.create({
      data: {
        slug,
        name,
        description: body.description ? String(body.description) : null,
        channelSummary: body.channelSummary ? String(body.channelSummary) : null,
        weeklySocialTarget: Number(body.weeklySocialTarget || 0),
        weeklyAdsTarget: Number(body.weeklyAdsTarget || 0),
        weeklyVideoTarget: Number(body.weeklyVideoTarget || 0),
        weeklyImageTarget: Number(body.weeklyImageTarget || 0),
        kpiNote: body.kpiNote ? String(body.kpiNote) : null,
        color: body.color ? String(body.color) : "#2563eb",
        members: {
          create: memberIds.map((uid) => ({
            userId: uid,
            scope: "PROJECT_WIDE",
          })),
        },
      },
    });

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: "Không thể tạo dự án (có thể slug bị trùng)." },
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
    if (!id) {
      return NextResponse.json({ error: "Thiếu id dự án." }, { status: 400 });
    }

    const editingCoreFields =
      body.name !== undefined ||
      body.description !== undefined ||
      body.channelSummary !== undefined ||
      body.weeklySocialTarget !== undefined ||
      body.weeklyAdsTarget !== undefined ||
      body.weeklyVideoTarget !== undefined ||
      body.weeklyImageTarget !== undefined ||
      body.kpiNote !== undefined ||
      body.color !== undefined;

    if (editingCoreFields && user.role !== "LEADER") {
      return NextResponse.json(
        { error: "Chỉ Leader mới có quyền chỉnh sửa KPI và thông tin gốc dự án." },
        { status: 403 }
      );
    }

    if (!editingCoreFields) {
      const allowed = await canAccessProject(user, id);
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền chỉnh sửa kế hoạch dự án này." },
          { status: 403 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined && String(body.name).trim()) {
      data.name = String(body.name).trim();
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description) : null;
    }
    if (body.channelSummary !== undefined) {
      data.channelSummary = body.channelSummary ? String(body.channelSummary) : null;
    }
    if (body.weeklySocialTarget !== undefined) {
      data.weeklySocialTarget = Math.max(0, Number(body.weeklySocialTarget));
    }
    if (body.weeklyAdsTarget !== undefined) {
      data.weeklyAdsTarget = Math.max(0, Number(body.weeklyAdsTarget));
    }
    if (body.weeklyVideoTarget !== undefined) {
      data.weeklyVideoTarget = Math.max(0, Number(body.weeklyVideoTarget));
    }
    if (body.weeklyImageTarget !== undefined) {
      data.weeklyImageTarget = Math.max(0, Number(body.weeklyImageTarget));
    }
    if (body.kpiNote !== undefined) {
      data.kpiNote = body.kpiNote ? String(body.kpiNote) : null;
    }
    if (body.color !== undefined) {
      data.color = String(body.color);
    }
    if (body.campaignStartAt !== undefined) {
      data.campaignStartAt = body.campaignStartAt
        ? new Date(body.campaignStartAt)
        : null;
    }
    if (body.campaignEndAt !== undefined) {
      data.campaignEndAt = body.campaignEndAt
        ? new Date(body.campaignEndAt)
        : null;
    }
    if (body.campaignWeeks !== undefined) {
      data.campaignWeeks = Math.max(1, Math.min(52, Number(body.campaignWeeks) || 4));
    }
    if (body.contentPillarsJson !== undefined && Array.isArray(body.contentPillarsJson)) {
      data.contentPillarsJson = body.contentPillarsJson
        .map((s: unknown) => String(s).trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    if (body.overviewJson !== undefined) {
      data.overviewJson = body.overviewJson;
    }
    if (body.contentMatrixJson !== undefined) {
      data.contentMatrixJson = body.contentMatrixJson;
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("Update project error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin dự án." },
      { status: 500 }
    );
  }
}
