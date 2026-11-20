import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  CHAT_USER_SELECT,
  getUserChatRoomsWithMeta,
  serializeChatMessage,
} from "@/lib/chat";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const rooms = await getUserChatRoomsWithMeta(user.id);
  return NextResponse.json({ rooms });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const type = body.type === "DIRECT" ? "DIRECT" : "GROUP";

    if (type === "DIRECT") {
      const targetUserId = String(body.targetUserId ?? "").trim();
      if (!targetUserId || targetUserId === user.id) {
        return NextResponse.json(
          { error: "Chọn một đồng đội khác để bắt đầu chat riêng." },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId, isActive: true },
        select: CHAT_USER_SELECT,
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Không tìm thấy thành viên này." },
          { status: 404 }
        );
      }

      // Tìm phòng 1-1 đã có giữa đúng 2 người
      const existingDirectRooms = await prisma.chatRoom.findMany({
        where: {
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: CHAT_USER_SELECT } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: CHAT_USER_SELECT } },
          },
        },
      });

      const exactMatch = existingDirectRooms.find(
        (r) => r.participants.length === 2
      );
      if (exactMatch) {
        return NextResponse.json({
          room: {
            id: exactMatch.id,
            type: exactMatch.type,
            name: exactMatch.name,
            description: exactMatch.description,
            allowAnonymous: exactMatch.allowAnonymous,
            isPinned: exactMatch.isPinned,
            createdById: exactMatch.createdById,
            lastMessageAt: exactMatch.lastMessageAt.toISOString(),
            unreadCount: 0,
            participants: exactMatch.participants.map((p) => ({
              userId: p.userId,
              isAdmin: p.isAdmin,
              user: p.user,
            })),
            lastMessage: exactMatch.messages[0]
              ? serializeChatMessage(exactMatch.messages[0], user.id)
              : null,
          },
        });
      }

      const created = await prisma.chatRoom.create({
        data: {
          type: "DIRECT",
          allowAnonymous: true,
          createdById: user.id,
          participants: {
            create: [
              { userId: user.id, isAdmin: true },
              { userId: targetUserId, isAdmin: false },
            ],
          },
        },
        include: {
          participants: {
            include: { user: { select: CHAT_USER_SELECT } },
          },
        },
      });

      return NextResponse.json(
        {
          room: {
            id: created.id,
            type: created.type,
            name: created.name,
            description: created.description,
            allowAnonymous: created.allowAnonymous,
            isPinned: created.isPinned,
            createdById: created.createdById,
            lastMessageAt: created.lastMessageAt.toISOString(),
            unreadCount: 0,
            participants: created.participants.map((p) => ({
              userId: p.userId,
              isAdmin: p.isAdmin,
              user: p.user,
            })),
            lastMessage: null,
          },
        },
        { status: 201 }
      );
    }

    // Tạo nhóm chat mới (GROUP)
    const name = String(body.name ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    const allowAnonymous = body.allowAnonymous !== false;
    const rawIds = Array.isArray(body.participantIds)
      ? body.participantIds.map((x: unknown) => String(x))
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên nhóm chat." },
        { status: 400 }
      );
    }

    const uniqueMemberIds = Array.from(new Set([user.id, ...rawIds]));
    if (uniqueMemberIds.length < 2) {
      return NextResponse.json(
        { error: "Nhóm chat cần có ít nhất 2 thành viên." },
        { status: 400 }
      );
    }

    const validUsers = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds }, isActive: true },
      select: { id: true },
    });
    const validIds = validUsers.map((u) => u.id);

    if (!validIds.includes(user.id)) validIds.unshift(user.id);

    const createdGroup = await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        name,
        description,
        allowAnonymous,
        createdById: user.id,
        participants: {
          create: validIds.map((uid) => ({
            userId: uid,
            isAdmin: uid === user.id,
          })),
        },
        messages: {
          create: {
            senderId: user.id,
            content: `🎉 Đã lập nhóm "${name}"! Cả nhóm có thể trao đổi hoặc bật chế độ Ẩn danh khi cần.`,
            isAnonymous: false,
          },
        },
      },
      include: {
        participants: {
          include: { user: { select: CHAT_USER_SELECT } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: CHAT_USER_SELECT } },
        },
      },
    });

    return NextResponse.json(
      {
        room: {
          id: createdGroup.id,
          type: createdGroup.type,
          name: createdGroup.name,
          description: createdGroup.description,
          allowAnonymous: createdGroup.allowAnonymous,
          isPinned: createdGroup.isPinned,
          createdById: createdGroup.createdById,
          lastMessageAt: createdGroup.lastMessageAt.toISOString(),
          unreadCount: 0,
          participants: createdGroup.participants.map((p) => ({
            userId: p.userId,
            isAdmin: p.isAdmin,
            user: p.user,
          })),
          lastMessage: createdGroup.messages[0]
            ? serializeChatMessage(createdGroup.messages[0], user.id)
            : null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create chat room error:", err);
    return NextResponse.json(
      { error: "Không thể tạo phòng chat." },
      { status: 500 }
    );
  }
}
