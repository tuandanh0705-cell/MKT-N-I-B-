import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject } from "@/lib/permissions";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body.projectId ?? "").trim();
    const rawIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
    const orderedIds = Array.from(
      new Set(
        rawIds
          .map((x: unknown) => String(x ?? "").trim())
          .filter(Boolean)
      )
    ) as string[];

    if (!projectId || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "Thiếu dự án hoặc danh sách thứ tự bài viết." },
        { status: 400 }
      );
    }
    if (orderedIds.length > 500) {
      return NextResponse.json(
        { error: "Danh sách sắp xếp vượt quá giới hạn 500 dòng." },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(user, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền sắp xếp bài viết trong dự án này." },
        { status: 403 }
      );
    }

    const validRows = await prisma.task.findMany({
      where: {
        id: { in: orderedIds },
        projectId,
        deletedAt: null,
      },
      select: { id: true },
    });
    const validSet = new Set(validRows.map((r) => r.id));
    const filteredIds = orderedIds.filter((id) => validSet.has(id));

    if (filteredIds.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy bài viết hợp lệ để sắp xếp." },
        { status: 404 }
      );
    }

    await prisma.$transaction(
      filteredIds.map((id, idx) =>
        prisma.task.update({
          where: { id },
          data: { sortOrder: idx },
        })
      )
    );

    const orders: Record<string, number> = {};
    filteredIds.forEach((id, idx) => {
      orders[id] = idx;
    });

    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    console.error("Reorder tasks error:", error);
    return NextResponse.json(
      { error: "Không thể lưu thứ tự sắp xếp." },
      { status: 500 }
    );
  }
}
