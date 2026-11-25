import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ChatStickerItem } from "@/types/crm";

function normalizeStickerImageUrl(
  raw: unknown
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Vui lòng tải ảnh/GIF hoặc dán đường dẫn sticker.",
    };
  }

  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) {
    if (trimmed.length > 700_000) {
      return {
        ok: false,
        error: "Ảnh/GIF sticker quá nặng (tối đa ~500KB). Vui lòng chọn ảnh nhẹ hơn.",
      };
    }
    return { ok: true, url: trimmed };
  }

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Link sticker chỉ hỗ trợ đường dẫn http:// hoặc https://.",
      };
    }
    if (
      !parsed.hostname ||
      (parsed.hostname !== "localhost" && !parsed.hostname.includes("."))
    ) {
      return {
        ok: false,
        error: "Link sticker chưa đúng định dạng.",
      };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return {
      ok: false,
      error: "Link sticker chưa đúng định dạng.",
    };
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const rows = await prisma.chatSticker.findMany({
    where: {
      OR: [{ isShared: true }, { createdById: user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 240,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  const stickers: ChatStickerItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    packName: r.packName,
    imageUrl: r.imageUrl,
    isShared: r.isShared,
    isBuiltIn: false,
    createdById: r.createdById,
    createdByName: r.createdBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ stickers });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim().slice(0, 40);
    const packName =
      String(body.packName ?? "").trim().slice(0, 32) || "⭐ Sticker Team";
    const isShared = body.isShared !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Vui lòng đặt tên ngắn cho sticker (VD: Duyệt luôn, Haha...)." },
        { status: 400 }
      );
    }

    const parsedUrl = normalizeStickerImageUrl(body.imageUrl);
    if (!parsedUrl.ok) {
      return NextResponse.json({ error: parsedUrl.error }, { status: 400 });
    }

    const userCount = await prisma.chatSticker.count({
      where: { createdById: user.id },
    });
    if (userCount >= 120) {
      return NextResponse.json(
        { error: "Bạn đã đạt tối đa 120 sticker tự thêm. Hãy xóa bớt sticker cũ trước nhé." },
        { status: 400 }
      );
    }

    const created = await prisma.chatSticker.create({
      data: {
        name,
        packName,
        imageUrl: parsedUrl.url,
        isShared,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    const sticker: ChatStickerItem = {
      id: created.id,
      name: created.name,
      packName: created.packName,
      imageUrl: created.imageUrl,
      isShared: created.isShared,
      isBuiltIn: false,
      createdById: created.createdById,
      createdByName: created.createdBy?.name ?? null,
      createdAt: created.createdAt.toISOString(),
    };

    return NextResponse.json({ sticker }, { status: 201 });
  } catch (err) {
    console.error("Create chat sticker error:", err);
    return NextResponse.json(
      { error: "Không thể lưu sticker mới." },
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
  if (!id) {
    return NextResponse.json({ error: "Thiếu mã sticker." }, { status: 400 });
  }

  const existing = await prisma.chatSticker.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Sticker không tồn tại hoặc đã bị xóa." },
      { status: 404 }
    );
  }

  if (existing.createdById !== user.id && user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ người tạo sticker hoặc Leader mới có quyền xóa sticker này." },
      { status: 403 }
    );
  }

  await prisma.chatSticker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
