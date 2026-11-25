import { prisma } from "@/lib/prisma";
import type { ChatRoomType, DepartmentScope } from "@/generated/prisma/client";
import type { ChatMessageItem, ChatRoomSummary } from "@/types/crm";

export const ANONYMOUS_ALIASES = [
  "🎭 Hải Tặc Bí Ẩn",
  "🦉 Cú Đêm Trên Buồm",
  "👒 Bóng Ma Tàu Sunny",
  "🌊 Thủy Thủ Vô Danh",
  "🪙 Kho Báu Bí Mật",
  "🔥 Kẻ Giấu Mặt",
] as const;

export const CHAT_USER_SELECT = {
  id: true,
  name: true,
  title: true,
  avatarColor: true,
  pirateCharacter: true,
  departmentScope: true,
} as const;

interface RawChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isAnonymous: boolean;
  anonymousAlias: string | null;
  attachmentUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter: string | null;
    departmentScope: DepartmentScope;
  };
}

/**
 * Chuẩn hóa tin nhắn trước khi trả về client.
 * Đảm bảo tuyệt đối KHÔNG rò rỉ thông tin sender khi tin nhắn ở chế độ ẩn danh.
 */
export function serializeChatMessage(
  msg: RawChatMessage,
  viewerUserId: string
): ChatMessageItem {
  return {
    id: msg.id,
    roomId: msg.roomId,
    content: msg.isDeleted ? "" : msg.content,
    isAnonymous: msg.isAnonymous,
    anonymousAlias: msg.isAnonymous
      ? msg.anonymousAlias || ANONYMOUS_ALIASES[0]
      : null,
    attachmentUrl: msg.isDeleted ? null : msg.attachmentUrl,
    isDeleted: msg.isDeleted,
    isMine: msg.senderId === viewerUserId,
    createdAt: msg.createdAt.toISOString(),
    sender:
      msg.isAnonymous || msg.isDeleted
        ? null
        : {
            id: msg.sender.id,
            name: msg.sender.name,
            title: msg.sender.title,
            avatarColor: msg.sender.avatarColor,
            pirateCharacter: msg.sender.pirateCharacter,
            departmentScope: msg.sender.departmentScope,
          },
  };
}

/**
 * Tạo sẵn 2 kênh mặc định của Băng Mũ Rơm nếu hệ thống chưa có phòng chat nào.
 */
export async function ensureDefaultChatRooms() {
  const existingCount = await prisma.chatRoom.count();
  if (existingCount > 0) return;

  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, role: true },
  });

  if (activeUsers.length === 0) return;
  const leader =
    activeUsers.find((u) => u.role === "LEADER") ?? activeUsers[0];

  const participantData = activeUsers.map((u) => ({
    userId: u.id,
    isAdmin: u.id === leader.id,
  }));

  await prisma.chatRoom.create({
    data: {
      type: "GROUP",
      name: "⛵ Boong Tàu Sunny (Cả Băng)",
      description:
        "Kênh trao đổi chung toàn Team Marketing • Có thể nhắn công khai hoặc bật Ẩn danh.",
      allowAnonymous: true,
      isPinned: true,
      createdById: leader.id,
      participants: { create: participantData },
      messages: {
        create: {
          senderId: leader.id,
          content:
            "Chào cả băng lên tàu Sunny! Kênh chat nội bộ đã mở để trao đổi nhanh công việc, tạo nhóm theo dự án hoặc nhắn góp ý ẩn danh nhé!",
          isAnonymous: false,
        },
      },
    },
  });

  await prisma.chatRoom.create({
    data: {
      type: "GROUP",
      name: "🕵️ Hòm Thư Góp Ý Ẩn Danh",
      description:
        "Chia sẻ thẳng thắn ý tưởng, áp lực công việc hoặc feedback quy trình — 100% ẩn danh mặc định.",
      allowAnonymous: true,
      isPinned: true,
      createdById: leader.id,
      participants: { create: participantData },
      messages: {
        create: {
          senderId: leader.id,
          content:
            "Mọi tin nhắn bật chế độ Ẩn danh tại đây sẽ giữ bí mật hoàn toàn danh tính người gửi. Cứ thoải mái góp ý giúp team tốt hơn nhé!",
          isAnonymous: true,
          anonymousAlias: "👒 Bóng Ma Tàu Sunny",
        },
      },
    },
  });
}

/**
 * Khi tuyển nhân sự mới, tự động mời vào các phòng chung được ghim (Cả băng / Hòm thư ẩn danh).
 */
export async function joinPinnedChatRooms(userId: string) {
  const pinnedRooms = await prisma.chatRoom.findMany({
    where: { type: "GROUP", isPinned: true },
    select: { id: true },
  });

  for (const room of pinnedRooms) {
    await prisma.chatParticipant.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, isAdmin: false },
      update: {},
    });
  }
}

async function getUnreadCountMapByRoom(
  userId: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ roomId: string; cnt: bigint }>>`
    SELECT m."roomId" AS "roomId", COUNT(*)::bigint AS cnt
    FROM "ChatMessage" m
    INNER JOIN "ChatParticipant" cp
      ON cp."roomId" = m."roomId" AND cp."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND m."isDeleted" = false
      AND m."createdAt" > cp."lastReadAt"
    GROUP BY m."roomId"
  `;
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.roomId, Number(r.cnt));
  }
  return map;
}

export async function getUserChatRoomsWithMeta(
  userId: string,
  options?: { skipEnsure?: boolean }
): Promise<ChatRoomSummary[]> {
  if (!options?.skipEnsure) {
    await ensureDefaultChatRooms();
  }

  const [rooms, unreadMap] = await Promise.all([
    prisma.chatRoom.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
      include: {
        participants: {
          include: {
            user: { select: CHAT_USER_SELECT },
          },
          orderBy: { joinedAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: CHAT_USER_SELECT },
          },
        },
      },
    }),
    getUnreadCountMapByRoom(userId),
  ]);

  if (rooms.length === 0 && options?.skipEnsure) {
    await ensureDefaultChatRooms();
    return getUserChatRoomsWithMeta(userId, { skipEnsure: false });
  }

  return rooms.map((r) => {
    const lastMsgRaw = r.messages[0] ?? null;
    return {
      id: r.id,
      type: r.type as ChatRoomType,
      name: r.name,
      description: r.description,
      allowAnonymous: r.allowAnonymous,
      isPinned: r.isPinned,
      createdById: r.createdById,
      lastMessageAt: r.lastMessageAt.toISOString(),
      unreadCount: unreadMap.get(r.id) ?? 0,
      participants: r.participants.map((p) => ({
        userId: p.userId,
        isAdmin: p.isAdmin,
        user: p.user,
      })),
      lastMessage: lastMsgRaw ? serializeChatMessage(lastMsgRaw, userId) : null,
    };
  });
}

export async function getChatUnreadCountForUser(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM "ChatMessage" m
    INNER JOIN "ChatParticipant" cp
      ON cp."roomId" = m."roomId" AND cp."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND m."isDeleted" = false
      AND m."createdAt" > cp."lastReadAt"
  `;
  return Number(rows[0]?.total ?? 0);
}
