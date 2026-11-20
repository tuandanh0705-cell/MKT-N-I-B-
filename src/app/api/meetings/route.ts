import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVnDateTime } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";

const MEETING_INCLUDE = {
  organizer: {
    select: {
      id: true,
      name: true,
      avatarColor: true,
      pirateCharacter: true,
    },
  },
  project: { select: { id: true, slug: true, name: true, color: true } },
  participants: {
    orderBy: { createdAt: "asc" as const },
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
    },
  },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const meetings = await prisma.teamMeeting.findMany({
    orderBy: { startAt: "desc" },
    take: 80,
    include: MEETING_INCLUDE,
  });

  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const agenda = body.agenda ? String(body.agenda).trim() : null;
    const location = body.location ? String(body.location).trim() : null;
    const meetingType = String(body.meetingType ?? "SYNC");
    const projectId = body.projectId ? String(body.projectId) : null;
    const startAt = new Date(String(body.startAt ?? ""));
    const endAt = new Date(String(body.endAt ?? ""));

    const rawParticipants = Array.isArray(body.participantIds)
      ? body.participantIds.map((x: unknown) => String(x))
      : [];
    const participantIds = Array.from(new Set([user.id, ...rawParticipants]));

    if (!title || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { error: "Vui lòng nhập tiêu đề và thời gian họp hợp lệ." },
        { status: 400 }
      );
    }

    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "Giờ kết thúc phải sau giờ bắt đầu." },
        { status: 400 }
      );
    }

    if (rawParticipants.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 thành viên tham gia họp." },
        { status: 400 }
      );
    }

    const created = await prisma.teamMeeting.create({
      data: {
        title,
        agenda,
        location,
        meetingType,
        projectId,
        startAt,
        endAt,
        organizerId: user.id,
        participants: {
          create: participantIds.map((uid) => ({
            userId: uid,
            rsvp: uid === user.id ? "ACCEPTED" : "INVITED",
          })),
        },
      },
      include: MEETING_INCLUDE,
    });

    // Bắn Thông báo + Web Push + Email ngay tới TẤT CẢ thành viên được mời
    const invitees = participantIds.filter((uid) => uid !== user.id);
    const timeText = formatVnDateTime(startAt);
    const placeText = location ? ` • Địa điểm/Link: ${location}` : "";

    await Promise.all(
      invitees.map((uid) =>
        createNotification({
          userId: uid,
          type: "MEETING_INVITE",
          title: `📅 Lịch họp mới: ${title}`,
          message: `${user.name} mời bạn họp lúc ${timeText}${placeText}`,
          linkUrl: "/schedule",
          sendEmailNow: true,
          actionLabel: "Xem & Xác nhận Lịch Họp",
        })
      )
    );

    return NextResponse.json({ meeting: created }, { status: 201 });
  } catch (err) {
    console.error("Create meeting error:", err);
    return NextResponse.json(
      { error: "Không tạo được lịch họp." },
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
    const existing = await prisma.teamMeeting.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch họp." },
        { status: 404 }
      );
    }

    // Nếu thành viên cập nhật xác nhận tham gia (RSVP)
    if (body.rsvp && ["ACCEPTED", "DECLINED", "INVITED"].includes(String(body.rsvp))) {
      const isParticipant = existing.participants.some((p) => p.userId === user.id);
      if (!isParticipant) {
        return NextResponse.json(
          { error: "Bạn không nằm trong danh sách buổi họp này." },
          { status: 403 }
        );
      }

      await prisma.teamMeetingParticipant.update({
        where: { meetingId_userId: { meetingId: id, userId: user.id } },
        data: { rsvp: String(body.rsvp) },
      });

      const updated = await prisma.teamMeeting.findUnique({
        where: { id },
        include: MEETING_INCLUDE,
      });
      return NextResponse.json({ meeting: updated });
    }

    // Organizer hoặc Leader đổi trạng thái buổi họp
    if (existing.organizerId !== user.id && user.role !== "LEADER") {
      return NextResponse.json(
        { error: "Chỉ người đặt lịch hoặc Leader được sửa trạng thái." },
        { status: 403 }
      );
    }

    const nextStatus = body.status ? String(body.status) : existing.status;
    const updated = await prisma.teamMeeting.update({
      where: { id },
      data: {
        status: nextStatus,
      },
      include: MEETING_INCLUDE,
    });

    if (nextStatus === "CANCELLED" && existing.status !== "CANCELLED") {
      const others = existing.participants.filter((p) => p.userId !== user.id);
      await Promise.all(
        others.map((p) =>
          createNotification({
            userId: p.userId,
            type: "MEETING_INVITE",
            title: `❌ Hủy lịch họp: ${existing.title}`,
            message: `${user.name} đã hủy buổi họp lúc ${formatVnDateTime(existing.startAt)}.`,
            linkUrl: "/schedule",
          })
        )
      );
    }

    return NextResponse.json({ meeting: updated });
  } catch (err) {
    console.error("Update meeting error:", err);
    return NextResponse.json(
      { error: "Không cập nhật được lịch họp." },
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
  const existing = await prisma.teamMeeting.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy lịch họp." },
      { status: 404 }
    );
  }
  if (existing.organizerId !== user.id && user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ người tạo hoặc Leader mới được xóa lịch họp." },
      { status: 403 }
    );
  }

  await prisma.teamMeeting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
