import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getVnDateString } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import type { CheckinStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || getVnDateString();

  const checkins = await prisma.dailyCheckin.findMany({
    where:
      user.role === "LEADER"
        ? { checkinDate: dateStr }
        : { checkinDate: dateStr, userId: user.id },
    orderBy: { createdAt: "desc" },
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
      task: {
        select: { id: true, code: true, title: true },
      },
    },
  });

  return NextResponse.json({ checkins, date: dateStr });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const status = (body.status as CheckinStatus) || "ON_TRACK";
    const note = body.note ? String(body.note).trim() : null;
    const taskId = body.taskId ? String(body.taskId) : null;
    const checkinDate = getVnDateString();

    if (status === "AT_RISK" && !note) {
      return NextResponse.json(
        { error: "Vui lòng nhập lý do nguy cơ trễ để Leader nắm thông tin hỗ trợ." },
        { status: 400 }
      );
    }

    const existing = await prisma.dailyCheckin.findFirst({
      where: {
        userId: user.id,
        checkinDate,
        taskId: taskId,
      },
    });

    const saved = existing
      ? await prisma.dailyCheckin.update({
          where: { id: existing.id },
          data: { status, note },
        })
      : await prisma.dailyCheckin.create({
          data: {
            userId: user.id,
            taskId,
            checkinDate,
            status,
            note,
          },
        });

    // Nếu nhân viên báo "AT_RISK" (Nguy cơ trễ) -> bắn cảnh báo & email ngay cho Leader!
    if (status === "AT_RISK" && user.role !== "LEADER") {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        await createNotification({
          userId: leader.id,
          type: "AT_RISK_ALERT",
          title: `Cảnh báo nguy cơ trễ từ ${user.name}`,
          message: `${user.name} vừa báo trạng thái "Có nguy cơ trễ" ngày ${checkinDate}. Ghi chú: ${note}`,
          linkUrl: "/leader",
          sendEmailNow: true,
          actionLabel: "Mở Leader Control Center",
        });
      }
    }

    return NextResponse.json({ checkin: saved }, { status: 201 });
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json(
      { error: "Không thể lưu check-in." },
      { status: 500 }
    );
  }
}
