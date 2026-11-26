import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { formatVnDateTime } from "@/lib/dates";
import {
  ANONYMOUS_ALIASES,
  CHAT_MESSAGE_INCLUDE,
  CHAT_REMINDER_INCLUDE,
  dispatchDueChatReminders,
  serializeChatMessage,
  serializeChatReminder,
} from "@/lib/chat";
import type { ChatReminderRepeatRule } from "@/types/crm";

function normalizeRepeatRule(raw: unknown): ChatReminderRepeatRule {
  const val = String(raw ?? "NONE").toUpperCase();
  if (val === "DAILY" || val === "WEEKLY") return val;
  return "NONE";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: roomId } = await context.params;
  const [membership, room] = await Promise.all([
    prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      select: { id: true },
    }),
    prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        isAnonymousThread: true,
        createdById: true,
        anonymousAlias: true,
      },
    }),
  ]);

  if (!membership || !room) {
    return NextResponse.json(
      { error: "Bạn không thuộc phòng chat này." },
      { status: 403 }
    );
  }

  await dispatchDueChatReminders().catch(() => 0);

  const rawReminders = await prisma.chatReminder.findMany({
    where: { roomId },
    orderBy: [{ isCompleted: "asc" }, { remindAt: "asc" }],
    take: 50,
    include: CHAT_REMINDER_INCLUDE,
  });

  return NextResponse.json({
    reminders: rawReminders.map((r) => serializeChatReminder(r, user.id, room)),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: roomId } = await context.params;
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { select: { userId: true, isAdmin: true } },
    },
  });

  if (!room || !room.participants.some((p) => p.userId === user.id)) {
    return NextResponse.json(
      { error: "Bạn không thuộc phòng chat này." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim().slice(0, 240);
    const remindAtRaw = String(body.remindAt ?? "").trim();
    const repeatRule = normalizeRepeatRule(body.repeatRule);

    if (!title) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung nhắc hẹn." },
        { status: 400 }
      );
    }

    const remindAt = new Date(remindAtRaw);
    if (!remindAtRaw || Number.isNaN(remindAt.getTime())) {
      return NextResponse.json(
        { error: "Thời gian nhắc hẹn không hợp lệ." },
        { status: 400 }
      );
    }

    const createdRem = await prisma.chatReminder.create({
      data: {
        roomId,
        createdById: user.id,
        title,
        remindAt,
        repeatRule,
      },
      include: CHAT_REMINDER_INCLUDE,
    });

    const isAnonInitiator =
      room.isAnonymousThread && room.createdById === user.id;
    const effectiveAlias = isAnonInitiator
      ? room.anonymousAlias || ANONYMOUS_ALIASES[0]
      : null;

    const cardMessage = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: user.id,
        content: `⏰ Nhắc hẹn: ${title} (${formatVnDateTime(remindAt)})`,
        isAnonymous: isAnonInitiator,
        anonymousAlias: effectiveAlias,
        reminderJson: {
          reminderId: createdRem.id,
          title: createdRem.title,
          remindAt: createdRem.remindAt.toISOString(),
          repeatRule,
        },
      },
      include: CHAT_MESSAGE_INCLUDE,
    });

    await Promise.all([
      prisma.chatRoom.update({
        where: { id: roomId },
        data: { lastMessageAt: cardMessage.createdAt },
      }),
      prisma.chatParticipant.update({
        where: { roomId_userId: { roomId, userId: user.id } },
        data: { lastReadAt: cardMessage.createdAt },
      }),
    ]);

    const serializeOpts = room.isAnonymousThread
      ? {
          forceAnonymousSenderId: room.createdById,
          fallbackAlias: room.anonymousAlias,
        }
      : undefined;

    const serializedReminder = serializeChatReminder(createdRem, user.id, room);
    const serializedMessage = serializeChatMessage(
      cardMessage,
      user.id,
      serializeOpts
    );

    const creatorLabel = isAnonInitiator
      ? effectiveAlias || ANONYMOUS_ALIASES[0]
      : user.name;
    const roomLabel = room.isAnonymousThread
      ? room.anonymousAlias || "Phòng ẩn danh"
      : room.type === "GROUP"
        ? room.name || "nhóm chat"
        : "cuộc trò chuyện";

    const otherParticipantIds = room.participants
      .map((p) => p.userId)
      .filter((pid) => pid !== user.id);

    if (otherParticipantIds.length > 0) {
      after(async () => {
        try {
          await Promise.all(
            otherParticipantIds.map((pid) =>
              createNotification({
                userId: pid,
                type: "REMINDER",
                title: `⏰ ${creatorLabel} vừa tạo nhắc hẹn mới`,
                message: `"${title}" lúc ${formatVnDateTime(remindAt)} trong ${roomLabel}.`,
                linkUrl: `/chat?room=${roomId}`,
                actionLabel: "Xem nhắc hẹn",
              })
            )
          );
        } catch (err) {
          console.error("Chat reminder create notification error:", err);
        }
      });
    }

    return NextResponse.json(
      { reminder: serializedReminder, message: serializedMessage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create chat reminder error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi tạo nhắc hẹn." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: roomId } = await context.params;
  const [membership, room] = await Promise.all([
    prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      select: { id: true },
    }),
    prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        isAnonymousThread: true,
        createdById: true,
        anonymousAlias: true,
      },
    }),
  ]);

  if (!membership || !room) {
    return NextResponse.json(
      { error: "Bạn không thuộc phòng chat này." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const reminderId = String(body.reminderId ?? "").trim();
    if (!reminderId) {
      return NextResponse.json(
        { error: "Thiếu mã nhắc hẹn." },
        { status: 400 }
      );
    }

    const existing = await prisma.chatReminder.findFirst({
      where: { id: reminderId, roomId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy nhắc hẹn trong phòng này." },
        { status: 404 }
      );
    }

    const data: {
      isCompleted?: boolean;
      completedAt?: Date | null;
      title?: string;
      remindAt?: Date;
      repeatRule?: ChatReminderRepeatRule;
      notifiedAt?: Date | null;
    } = {};

    if (typeof body.isCompleted === "boolean") {
      data.isCompleted = body.isCompleted;
      data.completedAt = body.isCompleted ? new Date() : null;
      if (!body.isCompleted && existing.remindAt > new Date()) {
        data.notifiedAt = null;
      }
    }
    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim().slice(0, 240);
    }
    if (typeof body.remindAt === "string" && body.remindAt.trim()) {
      const parsed = new Date(body.remindAt.trim());
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Thời gian nhắc hẹn không hợp lệ." },
          { status: 400 }
        );
      }
      data.remindAt = parsed;
      if (parsed > new Date()) {
        data.notifiedAt = null;
      }
    }
    if (body.repeatRule !== undefined) {
      data.repeatRule = normalizeRepeatRule(body.repeatRule);
    }

    const updated = await prisma.chatReminder.update({
      where: { id: reminderId },
      data,
      include: CHAT_REMINDER_INCLUDE,
    });

    return NextResponse.json({
      reminder: serializeChatReminder(updated, user.id, room),
    });
  } catch (error) {
    console.error("Update chat reminder error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi cập nhật nhắc hẹn." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: roomId } = await context.params;
  const membership = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
    select: { isAdmin: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Bạn không thuộc phòng chat này." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const reminderId = searchParams.get("reminderId")?.trim() || "";
  if (!reminderId) {
    return NextResponse.json(
      { error: "Thiếu mã nhắc hẹn cần xóa." },
      { status: 400 }
    );
  }

  const existing = await prisma.chatReminder.findFirst({
    where: { id: reminderId, roomId },
    select: { id: true, createdById: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy nhắc hẹn." },
      { status: 404 }
    );
  }

  const canDelete =
    existing.createdById === user.id ||
    membership.isAdmin ||
    user.role === "LEADER";
  if (!canDelete) {
    return NextResponse.json(
      { error: "Chỉ người tạo nhắc hẹn, Admin nhóm hoặc Leader mới có quyền xóa." },
      { status: 403 }
    );
  }

  await prisma.chatReminder.delete({ where: { id: reminderId } });
  return NextResponse.json({ ok: true });
}
