import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  CHAT_USER_SELECT,
  findOrCreateAnonymousDirectRoom,
  getUserChatRoomsWithMeta,
  serializeChatRoomForViewer,
} from "@/lib/chat";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isPoll = searchParams.get("poll") === "1";
  const rooms = await getUserChatRoomsWithMeta(user.id, { skipEnsure: isPoll });
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
      const isAnonymousThread = Boolean(body.isAnonymousThread);
      const anonymousAlias = body.anonymousAlias
        ? String(body.anonymousAlias).trim().slice(0, 40)
        : null;

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

      // Phòng chat ẩn danh 1-1: tách hoàn toàn khỏi phòng 1-1 có tên thật
      if (isAnonymousThread) {
        const { room: secretRoom, created } =
          await findOrCreateAnonymousDirectRoom(
            user.id,
            targetUserId,
            anonymousAlias
          );
        return NextResponse.json(
          {
            room: serializeChatRoomForViewer(secretRoom, user.id, 0),
          },
          { status: created ? 201 : 200 }
        );
      }

      // Tìm phòng 1-1 công khai (KHÔNG ẩn danh) đã có giữa đúng 2 người
      const existingDirectRooms = await prisma.chatRoom.findMany({
        where: {
          type: "DIRECT",
          isAnonymousThread: false,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: CHAT_USER_SELECT } },
            orderBy: { joinedAt: "asc" },
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
          room: serializeChatRoomForViewer(exactMatch, user.id, 0),
        });
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
              { userId: targetUserId, isAdmin: false },
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

      return NextResponse.json(
        {
          room: serializeChatRoomForViewer({ ...created, messages: [] }, user.id, 0),
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
        isAnonymousThread: false,
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
          orderBy: { joinedAt: "asc" },
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
        room: serializeChatRoomForViewer(createdGroup, user.id, 0),
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
