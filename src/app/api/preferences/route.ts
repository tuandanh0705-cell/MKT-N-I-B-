import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: {
      preferredTone?: string;
      preferredIcon?: string | null;
      personalMotto?: string | null;
      birthDate?: string | null;
    } = {};

    if (
      body.preferredTone &&
      ["PIRATE", "GENZ", "OFFICE"].includes(String(body.preferredTone))
    ) {
      updateData.preferredTone = String(body.preferredTone);
    }

    if (body.preferredIcon !== undefined) {
      updateData.preferredIcon = body.preferredIcon
        ? String(body.preferredIcon).slice(0, 8)
        : null;
    }

    if (body.personalMotto !== undefined) {
      updateData.personalMotto = body.personalMotto
        ? String(body.personalMotto).trim().slice(0, 140)
        : null;
    }

    if (body.birthDate !== undefined) {
      const cleaned = body.birthDate ? String(body.birthDate).trim() : "";
      if (cleaned && !/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return NextResponse.json(
          { error: "Ngày sinh nhật cần đúng định dạng YYYY-MM-DD." },
          { status: 400 }
        );
      }
      updateData.birthDate = cleaned || null;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        preferredTone: true,
        preferredIcon: true,
        personalMotto: true,
        birthDate: true,
      },
    });

    return NextResponse.json({ preferences: updated });
  } catch (err) {
    console.error("Update preferences error:", err);
    return NextResponse.json(
      { error: "Không thể lưu tùy chỉnh cá nhân." },
      { status: 500 }
    );
  }
}
