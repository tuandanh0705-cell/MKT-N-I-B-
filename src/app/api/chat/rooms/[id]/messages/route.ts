import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  ANONYMOUS_ALIASES,
  CHAT_USER_SELECT,
  findOrCreateAnonymousDirectRoom,
  serializeChatMessage,
  serializeChatRoomForViewer,
} from "@/lib/chat";
import { createNotification } from "@/lib/notifications";
import { isBuiltInStickerUrl } from "@/lib/chat-stickers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId: user.id } },
    select: {
      id: true,
      room: {
        select: {
          isAnonymousThread: true,
          createdById: true,
          anonymousAlias: true,
        },
      },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Bạn không có quyền truy cập phòng chat này." },
      { status: 403 }
    );
  }

  const msgSerializeOpts = participant.room.isAnonymousThread
    ? {
        forceAnonymousSenderId: participant.room.createdById,
        fallbackAlias: participant.room.anonymousAlias,
      }
    : undefined;

  const { searchParams } = new URL(request.url);
  const markRead = searchParams.get("peek") !== "1";
  const afterParam = searchParams.get("after");
  const afterDate =
    afterParam && !Number.isNaN(new Date(afterParam).getTime())
      ? new Date(afterParam)
      : null;

  if (afterDate) {
    // Polling tăng tốc: chỉ lấy tin mới sau mốc `after` + ID các tin vừa thu hồi
    const [newMessagesRaw, deletedRows] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId: id, createdAt: { gt: afterDate } },
        orderBy: { createdAt: "asc" },
        take: 60,
        include: {
          sender: { select: CHAT_USER_SELECT },
        },
      }),
      prisma.chatMessage.findMany({
        where: { roomId: id, isDeleted: true },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true },
      }),
    ]);

    if (markRead && newMessagesRaw.length > 0) {
      await prisma.chatParticipant.update({
        where: { roomId_userId: { roomId: id, userId: user.id } },
        data: { lastReadAt: new Date() },
      });
    }

    return NextResponse.json({
      incremental: true,
      messages: newMessagesRaw.map((m) =>
        serializeChatMessage(m, user.id, msgSerializeOpts)
      ),
      deletedIds: deletedRows.map((d) => d.id),
    });
  }

  // Tải lần đầu / mở phòng: lấy 80 tin mới nhất theo thứ tự thời gian tăng dần
  const [messagesDesc] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { roomId: id },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        sender: { select: CHAT_USER_SELECT },
      },
    }),
    markRead
      ? prisma.chatParticipant.update({
          where: { roomId_userId: { roomId: id, userId: user.id } },
          data: { lastReadAt: new Date() },
        })
      : Promise.resolve(null),
  ]);

  const messagesRaw = messagesDesc.reverse();

  return NextResponse.json({
    incremental: false,
    messages: messagesRaw.map((m) =>
      serializeChatMessage(m, user.id, msgSerializeOpts)
    ),
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

  const { id } = await context.params;
  const room = await prisma.chatRoom.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json(
      { error: "Phòng chat không tồn tại." },
      { status: 404 }
    );
  }

  const isMember = room.participants.some((p) => p.userId === user.id);
  if (!isMember) {
    return NextResponse.json(
      { error: "Bạn không có quyền gửi tin vào phòng này." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const content = String(body.content ?? "").trim();
    const attachmentUrl = body.attachmentUrl
      ? String(body.attachmentUrl).trim()
      : null;

    if (!content && !attachmentUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung tin nhắn." },
        { status: 400 }
      );
    }

    if (content.length > 4000) {
      return NextResponse.json(
        { error: "Tin nhắn tối đa 4.000 ký tự." },
        { status: 400 }
      );
    }

    if (attachmentUrl) {
      const isHttpUrl = /^https?:\/\//i.test(attachmentUrl);
      const isInlineImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(
        attachmentUrl
      );
      const isBuiltInSticker = isBuiltInStickerUrl(attachmentUrl);
      if (!isHttpUrl && !isInlineImage && !isBuiltInSticker) {
        return NextResponse.json(
          { error: "Đính kèm chỉ hỗ trợ link http(s), ảnh tải lên hoặc sticker." },
          { status: 400 }
        );
      }
      if (isInlineImage && attachmentUrl.length > 950_000) {
        return NextResponse.json(
          { error: "Ảnh đính kèm quá lớn (vui lòng chọn ảnh nhẹ hơn ~700KB)." },
          { status: 400 }
        );
      }
    }

    const isInitiatorOfAnonymousThread =
      room.isAnonymousThread && room.createdById === user.id;

    // Nếu người khởi tạo luồng ẩn danh 1-1 gửi tin -> BẮT BUỘC luôn ẩn danh để không bao giờ lộ tên thật
    const wantAnonymous = isInitiatorOfAnonymousThread
      ? true
      : Boolean(body.isAnonymous);

    if (wantAnonymous && !room.allowAnonymous) {
      return NextResponse.json(
        { error: "Nhóm chat này đang tắt chế độ nhắn ẩn danh." },
        { status: 400 }
      );
    }

    const requestedAlias = body.anonymousAlias
      ? String(body.anonymousAlias).trim().slice(0, 40)
      : "";
    const resolvedAlias = wantAnonymous
      ? requestedAlias ||
        (isInitiatorOfAnonymousThread ? room.anonymousAlias : null) ||
        ANONYMOUS_ALIASES[
          Math.floor(Math.random() * ANONYMOUS_ALIASES.length)
        ]
      : null;

    const now = new Date();
    const isDataImage = Boolean(
      attachmentUrl && /^data:image\//i.test(attachmentUrl)
    );
    const finalContent =
      content ||
      (isDataImage
        ? "🖼️ Đã gửi 1 hình ảnh"
        : "📎 Đã gửi 1 liên kết tài liệu");

    // TRƯỜNG HỢP QUAN TRỌNG: Gửi ẩn danh trong phòng 1-1 có tên thật -> TỰ ĐỘNG TÁCH SANG PHÒNG ẨN DANH RIÊNG BIỆT!
    // Tuyệt đối KHÔNG ghi tin ẩn danh vào cuộc hội thoại có tên thật giữa 2 người.
    if (room.type === "DIRECT" && !room.isAnonymousThread && wantAnonymous) {
      const peer = room.participants.find((p) => p.userId !== user.id);
      if (!peer) {
        return NextResponse.json(
          { error: "Không xác định được người nhận tin nhắn ẩn danh." },
          { status: 400 }
        );
      }

      const { room: secretRoom } = await findOrCreateAnonymousDirectRoom(
        user.id,
        peer.userId,
        resolvedAlias
      );

      const created = await prisma.chatMessage.create({
        data: {
          roomId: secretRoom.id,
          senderId: user.id,
          content: finalContent,
          isAnonymous: true,
          anonymousAlias: resolvedAlias,
          attachmentUrl,
        },
        include: {
          sender: { select: CHAT_USER_SELECT },
        },
      });

      await Promise.all([
        prisma.chatRoom.update({
          where: { id: secretRoom.id },
          data: {
            lastMessageAt: now,
            anonymousAlias: resolvedAlias || secretRoom.anonymousAlias,
          },
        }),
        prisma.chatParticipant.update({
          where: { roomId_userId: { roomId: secretRoom.id, userId: user.id } },
          data: { lastReadAt: now },
        }),
      ]);

      const previewText =
        created.content.length > 90
          ? created.content.slice(0, 90) + "..."
          : created.content;

      after(async () => {
        try {
          await createNotification({
            userId: peer.userId,
            type: "CHAT_MESSAGE",
            title: `🕵️ Tin nhắn ẩn danh mới (${resolvedAlias})`,
            message: previewText,
            linkUrl: `/chat?room=${secretRoom.id}`,
          });
        } catch (bgErr) {
          console.error("Background anonymous chat notify error:", bgErr);
        }
      });

      const serializedMessage = serializeChatMessage(created, user.id, {
        forceAnonymousSenderId: user.id,
        fallbackAlias: resolvedAlias,
      });

      const serializedSecretRoom = serializeChatRoomForViewer(
        {
          ...secretRoom,
          anonymousAlias: resolvedAlias || secretRoom.anonymousAlias,
          lastMessageAt: now,
          messages: [created],
        },
        user.id,
        0
      );

      return NextResponse.json(
        {
          message: serializedMessage,
          redirectedRoom: serializedSecretRoom,
        },
        { status: 201 }
      );
    }

    // Các trường hợp còn lại: Group chat, 1-1 công khai, hoặc đang chat trực tiếp trong phòng ẩn danh 1-1
    const created = await prisma.chatMessage.create({
      data: {
        roomId: id,
        senderId: user.id,
        content: finalContent,
        isAnonymous: wantAnonymous,
        anonymousAlias: resolvedAlias,
        attachmentUrl,
      },
      include: {
        sender: { select: CHAT_USER_SELECT },
      },
    });

    await Promise.all([
      prisma.chatRoom.update({
        where: { id },
        data: {
          lastMessageAt: now,
          ...(isInitiatorOfAnonymousThread && resolvedAlias
            ? { anonymousAlias: resolvedAlias }
            : {}),
        },
      }),
      prisma.chatParticipant.update({
        where: { roomId_userId: { roomId: id, userId: user.id } },
        data: { lastReadAt: now },
      }),
    ]);

    // Đẩy thông báo & Web Push chạy nền sau khi đã trả response về cho người gửi (giảm độ trễ 1-3 giây)
    const previewText =
      created.content.length > 90
        ? created.content.slice(0, 90) + "..."
        : created.content;

    after(async () => {
      try {
        if (room.type === "DIRECT") {
          const peer = room.participants.find((p) => p.userId !== user.id);
          if (peer) {
            const notifTitle = room.isAnonymousThread
              ? isInitiatorOfAnonymousThread
                ? `🕵️ Tin nhắn ẩn danh mới (${resolvedAlias})`
                : wantAnonymous
                  ? `🕵️ Phản hồi ẩn danh mới (${resolvedAlias})`
                  : `💬 ${user.name} vừa phản hồi tin nhắn ẩn danh của bạn`
              : wantAnonymous
                ? `🕵️ Tin nhắn ẩn danh mới (${resolvedAlias})`
                : `💬 ${user.name} vừa nhắn tin cho bạn`;

            await createNotification({
              userId: peer.userId,
              type: "CHAT_MESSAGE",
              title: notifTitle,
              message: previewText,
              linkUrl: `/chat?room=${id}`,
            });
          }
        } else if (content.includes("@")) {
          const lower = content.toLowerCase();
          const mentioned = room.participants.filter(
            (p) =>
              p.userId !== user.id &&
              lower.includes(`@${p.user.name.toLowerCase()}`)
          );
          await Promise.all(
            mentioned.map((target) =>
              createNotification({
                userId: target.userId,
                type: "CHAT_MESSAGE",
                title: wantAnonymous
                  ? `🕵️ ${resolvedAlias} đã nhắc đến bạn trong ${room.name || "nhóm chat"}`
                  : `📢 ${user.name} đã @tag bạn trong ${room.name || "nhóm chat"}`,
                message: previewText,
                linkUrl: `/chat?room=${id}`,
              })
            )
          );
        }
      } catch (bgErr) {
        console.error("Background chat notify error:", bgErr);
      }
    });

    return NextResponse.json(
      {
        message: serializeChatMessage(
          created,
          user.id,
          room.isAnonymousThread
            ? {
                forceAnonymousSenderId: room.createdById,
                fallbackAlias: resolvedAlias || room.anonymousAlias,
              }
            : undefined
        ),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Send chat message error:", err);
    return NextResponse.json(
      { error: "Không thể gửi tin nhắn." },
      { status: 500 }
    );
  }
}
