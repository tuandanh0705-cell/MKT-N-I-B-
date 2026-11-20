import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/permissions";
import { formatVnDateTime } from "@/lib/dates";
import type { BookingStatus } from "@/generated/prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const bookings = await prisma.equipmentBooking.findMany({
    orderBy: [{ startAt: "desc" }],
    take: 80,
    include: {
      equipment: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          pirateCharacter: true,
        },
      },
      project: { select: { id: true, slug: true, name: true, color: true } },
    },
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const equipmentId = String(body.equipmentId ?? "");
    const purpose = String(body.purpose ?? "").trim();
    const projectId = body.projectId ? String(body.projectId) : null;
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;

    if (
      !equipmentId ||
      !purpose ||
      !startAt ||
      !endAt ||
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      startAt >= endAt
    ) {
      return NextResponse.json(
        { error: "Vui lòng chọn thiết bị, mục đích và khung giờ mượn hợp lệ." },
        { status: 400 }
      );
    }

    if (projectId) {
      const allowed = await canAccessProject(user, projectId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không thuộc dự án đã chọn." },
          { status: 403 }
        );
      }
    }

    const eq = await prisma.equipmentItem.findUnique({
      where: { id: equipmentId },
    });
    if (!eq) {
      return NextResponse.json(
        { error: "Không tìm thấy thiết bị." },
        { status: 404 }
      );
    }
    if (eq.status === "MAINTENANCE") {
      return NextResponse.json(
        { error: `${eq.name} hiện đang bảo trì, chưa thể đặt lịch.` },
        { status: 409 }
      );
    }

    // Kiểm tra trùng khung giờ mượn
    const conflict = await prisma.equipmentBooking.findFirst({
      where: {
        equipmentId,
        status: "BOOKED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: { user: { select: { name: true } } },
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: `Trùng lịch! ${conflict.user.name} đã đặt ${eq.name} từ ${formatVnDateTime(
            conflict.startAt
          )} đến ${formatVnDateTime(conflict.endAt)}.`,
        },
        { status: 409 }
      );
    }

    const created = await prisma.equipmentBooking.create({
      data: {
        equipmentId,
        userId: user.id,
        projectId,
        purpose,
        startAt,
        endAt,
        status: "BOOKED",
      },
      include: {
        equipment: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        project: { select: { id: true, slug: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ booking: created }, { status: 201 });
  } catch (err) {
    console.error("Create booking error:", err);
    return NextResponse.json(
      { error: "Không thể đặt lịch thiết bị." },
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
    const status = body.status as BookingStatus;
    const existing = await prisma.equipmentBooking.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch mượn." },
        { status: 404 }
      );
    }
    if (user.role !== "LEADER" && existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Chỉ người mượn hoặc Leader mới cập nhật lịch này." },
        { status: 403 }
      );
    }

    const updated = await prisma.equipmentBooking.update({
      where: { id },
      data: { status },
      include: {
        equipment: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        project: { select: { id: true, slug: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("Update booking error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật lịch mượn." },
      { status: 500 }
    );
  }
}
