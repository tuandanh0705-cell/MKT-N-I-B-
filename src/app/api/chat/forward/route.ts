import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import {
  ANONYMOUS_ALIASES,
  CHAT_MESSAGE_INCLUDE,
  CHAT_USER_SELECT,
  serializeChatMessage,
  serializeChatRoomForViewer,
} from "@/lib/chat";
import type { Prisma } from "@/generated/prisma/client";
import type { ChatMessageItem, ChatRoomSummary } from "@/types/crm";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const messageId = String(body.messageId ?? "").trim();
    const rawRoomIds: string[] = Array.isArray(body.targetRoomIds)
      ? Array.from(
          new Set(
            body.targetRoomIds
              .map((x: unknown) => String(x ?? "").trim())
              .filter(Boolean)
          )
        )
      : [];
    const rawUserIds: string[] = Array.isArray(body.targetUserIds)
      ? Array.from(
          new Set(
            body.targetUserIds
              .map((x: unknown) => String(x ?? "").trim())
              .filter((id: string) => Boolean(id) && id !== user.id)
          )
        )
      : [];
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

    if (!messageId) {
      return NextResponse.json(
        { error: "Thiếu mã tin nhắn cần chia sẻ." },
        { status: 400 }
      );
    }
    if (rawRoomIds.length === 0 && rawUserIds.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 người nhận hoặc nhóm chat." },
        { status: 400 }
      );
    }
    if (rawRoomIds.length + rawUserIds.length > 20) {
      return NextResponse.json(
        { error: "Chỉ có thể chia sẻ tối đa 20 cuộc trò chuyện mỗi lần." },
        { status: 400 }
      );
    }

    const sourceMsg = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true } },
        room: {
          select: {
            id: true,
            isAnonymousThread: true,
            createdById: true,
            anonymousAlias: true,
            participants: {
              where: { userId: user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!sourceMsg || sourceMsg.room.participants.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tin nhắn hoặc bạn không có quyền truy cập." },
        { status: 404 }
      );
    }
    if (sourceMsg.isDeleted) {
      return NextResponse.json(
        { error: "Không thể chia sẻ tin nhắn đã bị thu hồi." },
        { status: 400 }
      );
    }

    // Bảo toàn tuyệt đối ẩn danh: nếu tin gốc là ẩn danh (hoặc của người khởi tạo phòng ẩn danh)
    // thì `forwardedFrom` PHẢI là biệt danh ẩn danh, không bao giờ lộ tên thật.
    const sourceIsAnonymous =
      sourceMsg.isAnonymous ||
      (sourceMsg.room.isAnonymousThread &&
        sourceMsg.senderId === sourceMsg.room.createdById);

    const forwardedFrom = sourceIsAnonymous
      ? sourceMsg.anonymousAlias ||
        sourceMsg.room.anonymousAlias ||
        ANONYMOUS_ALIASES[0]
      : sourceMsg.sender.name;

    // 1) Thu thập các phòng đích hợp lệ mà user đang tham gia
    const targetRoomMap = new Map<
      string,
      {
        id: string;
        type: "DIRECT" | "GROUP";
        name: string | null;
        isAnonymousThread: boolean;
        createdById: string;
        anonymousAlias: string | null;
        participantIds: string[];
      }
    >();

    if (rawRoomIds.length > 0) {
      const existingRooms = await prisma.chatRoom.findMany({
        where: {
          id: { in: rawRoomIds },
          participants: { some: { userId: user.id } },
        },
        include: {
          participants: { select: { userId: true } },
        },
      });
      for (const r of existingRooms) {
        targetRoomMap.set(r.id, {
          id: r.id,
          type: r.type,
          name: r.name,
          isAnonymousThread: r.isAnonymousThread,
          createdById: r.createdById,
          anonymousAlias: r.anonymousAlias,
          participantIds: r.participants.map((p) => p.userId),
        });
      }
    }

    // 2) Tìm hoặc tạo phòng 1-1 công khai cho từng đồng đội được chọn
    const createdRooms: ChatRoomSummary[] = [];
    if (rawUserIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: { id: { in: rawUserIds }, isActive: true },
        select: { id: true },
      });

      for (const target of validUsers) {
        const candidates = await prisma.chatRoom.findMany({
          where: {
            type: "DIRECT",
            isAnonymousThread: false,
            AND: [
              { participants: { some: { userId: user.id } } },
              { participants: { some: { userId: target.id } } },
            ],
          },
          include: {
            participants: { select: { userId: true } },
          },
        });
        const exact = candidates.find((r) => r.participants.length === 2);
        if (exact) {
          targetRoomMap.set(exact.id, {
            id: exact.id,
            type: exact.type,
            name: exact.name,
            isAnonymousThread: exact.isAnonymousThread,
            createdById: exact.createdById,
            anonymousAlias: exact.anonymousAlias,
            participantIds: exact.participants.map((p) => p.userId),
          });
          continue;
        }

        const created = await prisma.chatRoom.create({
          data: {
            type: "DIRECT",
            allowAnonymous: true,
            isAnonymousThread: false,
            createdById: user.id,
            participants: {
              create: [
                { userId: user.id, isAdmin: true },
                { userId: target.id, isAdmin: false },
              ],
            },
          },
          include: {
            participants: {
              include: { user: { select: CHAT_USER_SELECT } },
              orderBy: { joinedAt: "asc" },
            },
          },
        });
        targetRoomMap.set(created.id, {
          id: created.id,
          type: created.type,
          name: created.name,
          isAnonymousThread: created.isAnonymousThread,
          createdById: created.createdById,
          anonymousAlias: created.anonymousAlias,
          participantIds: created.participants.map((p) => p.userId),
        });
        createdRooms.push(
          serializeChatRoomForViewer({ ...created, messages: [] }, user.id, 0)
        );
      }
    }

    if (targetRoomMap.size === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc trò chuyện hợp lệ để chia sẻ." },
        { status: 400 }
      );
    }

    const messagesByRoom: Record<string, ChatMessageItem[]> = {};
    const pendingNotifs: Array<{
      userId: string;
      title: string;
      message: string;
      linkUrl: string;
    }> = [];

    const reminderJsonData =
      sourceMsg.reminderJson !== null && sourceMsg.reminderJson !== undefined
        ? (sourceMsg.reminderJson as Prisma.InputJsonValue)
        : undefined;

    for (const targetRoom of targetRoomMap.values()) {
      const isAnonSenderInTarget =
        targetRoom.isAnonymousThread && targetRoom.createdById === user.id;
      const anonAliasInTarget = isAnonSenderInTarget
        ? targetRoom.anonymousAlias || ANONYMOUS_ALIASES[0]
        : null;

      const fwdMsg = await prisma.chatMessage.create({
        data: {
          roomId: targetRoom.id,
          senderId: user.id,
          content: sourceMsg.content,
          attachmentUrl: sourceMsg.attachmentUrl,
          forwardedFrom,
          reminderJson: reminderJsonData,
          isAnonymous: isAnonSenderInTarget,
          anonymousAlias: anonAliasInTarget,
        },
        include: CHAT_MESSAGE_INCLUDE,
      });

      const createdForRoom = [fwdMsg];
      let latestCreatedAt = fwdMsg.createdAt;

      if (note) {
        const noteMsg = await prisma.chatMessage.create({
          data: {
            roomId: targetRoom.id,
            senderId: user.id,
            content: note,
            isAnonymous: isAnonSenderInTarget,
            anonymousAlias: anonAliasInTarget,
          },
          include: CHAT_MESSAGE_INCLUDE,
        });
        createdForRoom.push(noteMsg);
        latestCreatedAt = noteMsg.createdAt;
      }

      await Promise.all([
        prisma.chatRoom.update({
          where: { id: targetRoom.id },
          data: { lastMessageAt: latestCreatedAt },
        }),
        prisma.chatParticipant.update({
          where: {
            roomId_userId: { roomId: targetRoom.id, userId: user.id },
          },
          data: { lastReadAt: latestCreatedAt },
        }),
      ]);

      const serializeOpts = targetRoom.isAnonymousThread
        ? {
            forceAnonymousSenderId: targetRoom.createdById,
            fallbackAlias: targetRoom.anonymousAlias,
          }
        : undefined;

      const serialized = createdForRoom.map((m) =>
        serializeChatMessage(m, user.id, serializeOpts)
      );
      messagesByRoom[targetRoom.id] = serialized;

      // Update newly created room summary with lastMessage
      const createdSummary = createdRooms.find((r) => r.id === targetRoom.id);
      if (createdSummary) {
        const lastS = serialized[serialized.length - 1];
        createdSummary.lastMessage = lastS;
        createdSummary.lastMessageAt = lastS.createdAt;
      }

      // Gửi thông báo cho người nhận (chat 1-1 hoặc tin chia sẻ có ghi chú)
      const senderLabel = isAnonSenderInTarget
        ? anonAliasInTarget || ANONYMOUS_ALIASES[0]
        : user.name;
      const preview = (note || sourceMsg.content).slice(0, 90);
      if (targetRoom.type === "DIRECT") {
        for (const pid of targetRoom.participantIds) {
          if (pid === user.id) continue;
          pendingNotifs.push({
            userId: pid,
            title: isAnonSenderInTarget
              ? `🕵️ ${senderLabel} vừa chia sẻ 1 tin nhắn ẩn danh`
              : `↪ ${senderLabel} đã chia sẻ 1 tin nhắn cho bạn`,
            message: preview,
            linkUrl: `/chat?room=${targetRoom.id}`,
          });
        }
      }
    }

    if (pendingNotifs.length > 0) {
      after(async () => {
        try {
          await Promise.all(
            pendingNotifs.map((n) =>
              createNotification({
                userId: n.userId,
                type: "CHAT_MESSAGE",
                title: n.title,
                message: n.message,
                linkUrl: n.linkUrl,
                actionLabel: "Mở phòng chat",
              })
            )
          );
        } catch (err) {
          console.error("Chat forward notification error:", err);
        }
      });
    }

    return NextResponse.json({
      forwardedCount: targetRoomMap.size,
      targetRoomIds: Array.from(targetRoomMap.keys()),
      createdRooms,
      messagesByRoom,
    });
  } catch (error) {
    console.error("Forward chat message error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi chia sẻ tin nhắn." },
      { status: 500 }
    );
  }
}
