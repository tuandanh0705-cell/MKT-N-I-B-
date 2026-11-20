import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MOTIVATIONAL_QUOTES } from "@/lib/tone";

async function ensureDefaultQuotes() {
  const count = await prisma.motivationalQuote.count();
  if (count > 0) return;
  await prisma.motivationalQuote.createMany({
    data: DEFAULT_MOTIVATIONAL_QUOTES.map((q, idx) => ({
      content: q.content,
      authorLabel: q.authorLabel,
      tone: q.tone,
      isPinned: idx === 0,
    })),
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await ensureDefaultQuotes();

  const quotes = await prisma.motivationalQuote.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
    take: 30,
  });

  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = String(body.content ?? "").trim();
    if (!content) {
      return NextResponse.json(
        { error: "Nội dung quote không được để trống." },
        { status: 400 }
      );
    }

    const pinNow = Boolean(body.isPinned);
    if (pinNow) {
      await prisma.motivationalQuote.updateMany({
        where: { isPinned: true },
        data: { isPinned: false },
      });
    }

    const created = await prisma.motivationalQuote.create({
      data: {
        content: content.slice(0, 260),
        authorLabel: String(body.authorLabel || user.name).trim().slice(0, 60),
        tone: ["PIRATE", "GENZ", "OFFICE", "ALL"].includes(String(body.tone))
          ? String(body.tone)
          : "ALL",
        isPinned: pinNow,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ quote: created }, { status: 201 });
  } catch (err) {
    console.error("Create quote error:", err);
    return NextResponse.json(
      { error: "Không thể thêm quote động lực." },
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
    const action = String(body.action ?? "");
    if (!id) {
      return NextResponse.json({ error: "Thiếu id quote." }, { status: 400 });
    }

    if (action === "LIKE") {
      const quote = await prisma.motivationalQuote.update({
        where: { id },
        data: { likes: { increment: 1 } },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ quote });
    }

    if (action === "PIN") {
      await prisma.motivationalQuote.updateMany({
        where: { isPinned: true },
        data: { isPinned: false },
      });
      const quote = await prisma.motivationalQuote.update({
        where: { id },
        data: { isPinned: true },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ quote });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    console.error("Patch quote error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật quote." },
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
    return NextResponse.json({ error: "Thiếu id quote." }, { status: 400 });
  }

  const found = await prisma.motivationalQuote.findUnique({ where: { id } });
  if (!found) {
    return NextResponse.json({ error: "Không tìm thấy quote." }, { status: 404 });
  }
  if (user.role !== "LEADER" && found.createdById !== user.id) {
    return NextResponse.json(
      { error: "Bạn chỉ xóa được quote do mình tạo." },
      { status: 403 }
    );
  }

  await prisma.motivationalQuote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
