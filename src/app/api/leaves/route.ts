import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getVnDateString } from "@/lib/dates";
import type { LeaveStatus, LeaveType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  const leaves = await prisma.leaveRequest.findMany({
    where: dateParam
      ? {
          status: { in: ["APPROVED", "PENDING"] },
          startDate: { lte: dateParam },
          endDate: { gte: dateParam },
        }
      : undefined,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          title: true,
          avatarColor: true,
          pirateCharacter: true,
          departmentScope: true,
        },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ leaves, todayStr: getVnDateString() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const leaveType = (body.leaveType as LeaveType) || "FULL_DAY";
    const startDate = String(body.startDate ?? "").slice(0, 10);
    const endDate = String(body.endDate ?? startDate).slice(0, 10);
    const targetUserId =
      user.role === "LEADER" && body.userId ? String(body.userId) : user.id;

    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json(
        { error: "Ngày bắt đầu và ngày kết thúc không hợp lệ." },
        { status: 400 }
      );
    }

    const status: LeaveStatus =
      user.role === "LEADER" ? "APPROVED" : "PENDING";

    const created = await prisma.leaveRequest.create({
      data: {
        userId: targetUserId,
        leaveType,
        startDate,
        endDate,
        reason: body.reason ? String(body.reason).trim() : null,
        status,
        reviewedById: user.role === "LEADER" ? user.id : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarColor: true,
            pirateCharacter: true,
            departmentScope: true,
          },
        },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (status === "PENDING") {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const l of leaders) {
        await createNotification({
          userId: l.id,
          type: "LEAVE_REQUEST",
          title: `Đơn xin nghỉ / báo bận: ${user.name}`,
          message: `${user.name} đăng ký lịch từ ${startDate} đến ${endDate}${
            created.reason ? ` (${created.reason})` : ""
          }.`,
          linkUrl: "/schedule",
        });
      }
    }

    return NextResponse.json({ leave: created }, { status: 201 });
  } catch (err) {
    console.error("Create leave error:", err);
    return NextResponse.json(
      { error: "Không thể đăng ký lịch nghỉ." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền duyệt đơn nghỉ." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const status = body.status as LeaveStatus;
    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Thiếu id hoặc trạng thái duyệt." },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewedById: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarColor: true,
            pirateCharacter: true,
            departmentScope: true,
          },
        },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (updated.userId !== user.id) {
      await createNotification({
        userId: updated.userId,
        type: "LEAVE_REQUEST",
        title:
          status === "APPROVED"
            ? `Đã duyệt lịch nghỉ (${updated.startDate})`
            : `Leader từ chối lịch nghỉ (${updated.startDate})`,
        message: `${user.name} đã ${
          status === "APPROVED" ? "duyệt" : "từ chối"
        } lịch từ ${updated.startDate} đến ${updated.endDate}.`,
        linkUrl: "/schedule",
      });
    }

    return NextResponse.json({ leave: updated });
  } catch (err) {
    console.error("Review leave error:", err);
    return NextResponse.json(
      { error: "Không thể duyệt lịch nghỉ." },
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
  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy đơn nghỉ." },
      { status: 404 }
    );
  }
  if (user.role !== "LEADER" && existing.userId !== user.id) {
    return NextResponse.json(
      { error: "Bạn không có quyền xóa đơn nghỉ của người khác." },
      { status: 403 }
    );
  }

  await prisma.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
