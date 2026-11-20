import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildProjectVisibilityWhere,
  canAccessProject,
} from "@/lib/permissions";
import type { ResourceCategory, ResourceScope } from "@/generated/prisma/client";

async function ensureStarterResources(userId: string) {
  const count = await prisma.workspaceResource.count();
  if (count > 0) return;

  const firstProject = await prisma.project.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const starterData = [
    {
      scope: "GLOBAL" as const,
      projectId: null,
      category: "LOGO_BRAND" as const,
      title: "Bộ Logo Meta Ecom & Watermark Chuẩn",
      url: "https://drive.google.com",
      description: "File AI, PNG tách nền logo Meta Ecom dùng cho mọi ấn phẩm.",
      tags: "logo,png,watermark",
      updatedById: userId,
    },
    {
      scope: "GLOBAL" as const,
      projectId: null,
      category: "GUIDELINE_DOC" as const,
      title: "Brand Guideline & Quy Chuẩn Màu Chữ MKT",
      url: "https://www.canva.com",
      description: "Quy chuẩn font chữ, bảng màu, khung safe-zone TikTok/Reels/FB.",
      tags: "guideline,font,canva",
      updatedById: userId,
    },
    ...(firstProject
      ? [
          {
            scope: "PROJECT" as const,
            projectId: firstProject.id,
            category: "PHOTO_FOLDER" as const,
            title: `Kho Ảnh Studio & Sản Phẩm — ${firstProject.name}`,
            url: "https://drive.google.com",
            description: "Thư mục tổng hợp ảnh chụp gốc & ảnh cắt nền dự án.",
            tags: "anh,studio,drive",
            updatedById: userId,
          },
          {
            scope: "PROJECT" as const,
            projectId: firstProject.id,
            category: "FINISHED_MEDIA" as const,
            title: `Thư Mục Thành Phẩm Final — ${firstProject.name}`,
            url: "https://drive.google.com",
            description: "Nơi lưu các video/ảnh đã được Leader duyệt Final để đăng.",
            tags: "final,media",
            updatedById: userId,
          },
        ]
      : []),
  ];

  await prisma.workspaceResource.createMany({ data: starterData });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await ensureStarterResources(user.id);

  const visibleProjects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true, color: true },
  });
  const visibleProjectIds = visibleProjects.map((p) => p.id);

  const { searchParams } = new URL(request.url);
  const projectIdFilter = searchParams.get("projectId") || undefined;
  const categoryFilter = searchParams.get("category") as ResourceCategory | null;

  const resources = await prisma.workspaceResource.findMany({
    where: {
      AND: [
        {
          OR: [
            { scope: "GLOBAL" },
            { scope: "PROJECT", projectId: { in: visibleProjectIds } },
          ],
        },
        projectIdFilter
          ? projectIdFilter === "GLOBAL"
            ? { scope: "GLOBAL" }
            : { projectId: projectIdFilter }
          : {},
        categoryFilter ? { category: categoryFilter } : {},
      ],
    },
    orderBy: [{ scope: "asc" }, { category: "asc" }, { updatedAt: "desc" }],
    include: {
      project: { select: { id: true, slug: true, name: true, color: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ resources, projects: visibleProjects });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const url = String(body.url ?? "").trim();
    const scope = (body.scope as ResourceScope) || "PROJECT";
    const projectId =
      scope === "PROJECT" && body.projectId ? String(body.projectId) : null;
    const category = (body.category as ResourceCategory) || "OTHER";

    if (!title || !url) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tên tài nguyên và Đường dẫn Link." },
        { status: 400 }
      );
    }

    if (scope === "PROJECT") {
      if (!projectId) {
        return NextResponse.json(
          { error: "Vui lòng chọn Hải đồ (Dự án) cho tài nguyên dự án." },
          { status: 400 }
        );
      }
      const allowed = await canAccessProject(user, projectId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền thêm tài nguyên vào dự án này." },
          { status: 403 }
        );
      }
    }

    const created = await prisma.workspaceResource.create({
      data: {
        scope,
        projectId,
        category,
        title,
        url,
        description: body.description ? String(body.description).trim() : null,
        tags: body.tags ? String(body.tags).trim() : null,
        updatedById: user.id,
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ resource: created }, { status: 201 });
  } catch (err) {
    console.error("Create resource error:", err);
    return NextResponse.json(
      { error: "Không thể thêm tài nguyên mới." },
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
    const existing = await prisma.workspaceResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy tài nguyên." },
        { status: 404 }
      );
    }

    if (existing.projectId) {
      const allowed = await canAccessProject(user, existing.projectId);
      if (!allowed) {
        return NextResponse.json({ error: "Không có quyền sửa." }, { status: 403 });
      }
    }

    const updated = await prisma.workspaceResource.update({
      where: { id },
      data: {
        title: body.title ? String(body.title).trim() : existing.title,
        url: body.url ? String(body.url).trim() : existing.url,
        category: (body.category as ResourceCategory) || existing.category,
        description:
          body.description !== undefined
            ? body.description
              ? String(body.description).trim()
              : null
            : existing.description,
        tags:
          body.tags !== undefined
            ? body.tags
              ? String(body.tags).trim()
              : null
            : existing.tags,
        updatedById: user.id,
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ resource: updated });
  } catch (err) {
    console.error("Update resource error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật tài nguyên." },
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
  const existing = await prisma.workspaceResource.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy tài nguyên." },
      { status: 404 }
    );
  }

  if (existing.projectId) {
    const allowed = await canAccessProject(user, existing.projectId);
    if (!allowed && user.role !== "LEADER") {
      return NextResponse.json({ error: "Không có quyền xóa." }, { status: 403 });
    }
  } else if (user.role !== "LEADER" && existing.updatedById !== user.id) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc người tạo mới được xóa tài nguyên chung." },
      { status: 403 }
    );
  }

  await prisma.workspaceResource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
