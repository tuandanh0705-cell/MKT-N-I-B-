import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CHAT_USER_SELECT } from "@/lib/chat";

export async function PATCH(
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
    include: { participants: true },
  });

  if (!room) {
    return NextResponse.json(
      { error: "Phòng chat không tồn tại." },
      { status: 404 }
    );
  }

  const myMembership = room.participants.find((p) => p.userId === user.id);
  if (!myMembership) {
    return NextResponse.json(
      { error: "Bạn không thuộc phòng chat này." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (body.leaveRoom) {
      if (room.type === "DIRECT" || room.isPinned) {
        return NextResponse.json(
          { error: "Không thể rời khỏi cuộc trò chuyện này." },
          { status: 400 }
        );
      }
      await prisma.chatParticipant.delete({
        where: { roomId_userId: { roomId: id, userId: user.id } },
      });
      return NextResponse.json({ left: true });
    }

    if (room.type !== "GROUP") {
      return NextResponse.json(
        { error: "Chỉ nhóm chat mới hỗ trợ chỉnh sửa thành viên/cài đặt." },
        { status: 400 }
      );
    }

    const canManage = myMembership.isAdmin || user.role === "LEADER";
    if (!canManage) {
      return NextResponse.json(
        { error: "Chỉ trưởng nhóm hoặc Leader mới sửa được cài đặt nhóm." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined && String(body.name).trim()) {
      updateData.name = String(body.name).trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description
        ? String(body.description).trim()
        : null;
    }
    if (body.allowAnonymous !== undefined) {
      updateData.allowAnonymous = Boolean(body.allowAnonymous);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.chatRoom.update({
        where: { id },
        data: updateData,
      });
    }

    if (Array.isArray(body.addUserIds) && body.addUserIds.length > 0) {
      const idsToAdd = body.addUserIds.map((x: unknown) => String(x));
      for (const uid of idsToAdd) {
        await prisma.chatParticipant.upsert({
          where: { roomId_userId: { roomId: id, userId: uid } },
          create: { roomId: id, userId: uid, isAdmin: false },
          update: {},
        });
      }
    }

    if (body.removeUserId) {
      const targetId = String(body.removeUserId);
      if (targetId !== room.createdById) {
        await prisma.chatParticipant.deleteMany({
          where: { roomId: id, userId: targetId },
        });
      }
    }

    const refreshed = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: CHAT_USER_SELECT } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      room: refreshed
        ? {
            id: refreshed.id,
            type: refreshed.type,
            name: refreshed.name,
            description: refreshed.description,
            allowAnonymous: refreshed.allowAnonymous,
            isPinned: refreshed.isPinned,
            createdById: refreshed.createdById,
            lastMessageAt: refreshed.lastMessageAt.toISOString(),
            participants: refreshed.participants.map((p) => ({
              userId: p.userId,
              isAdmin: p.isAdmin,
              user: p.user,
            })),
          }
        : null,
    });
  } catch (err) {
    console.error("Update chat room error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật nhóm chat." },
      { status: 500 }
    );
  }
}
