import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatVnDateTime } from "@/lib/dates";
import type { ChatRoomType, DepartmentScope } from "@/generated/prisma/client";
import type {
  ChatMessageItem,
  ChatMessageReplyPreview,
  ChatReminderItem,
  ChatReminderMeta,
  ChatReminderRepeatRule,
  ChatRoomSummary,
} from "@/types/crm";

export const ANONYMOUS_ALIASES = [
  "🎭 Hải Tặc Bí Ẩn",
  "🦉 Cú Đêm Trên Buồm",
  "👒 Bóng Ma Tàu Sunny",
  "🌊 Thủy Thủ Vô Danh",
  "🪙 Kho Báu Bí Mật",
  "🔥 Kẻ Giấu Mặt",
] as const;

export const ANONYMOUS_SENDER_USER_ID = "anonymous-sender";

export const CHAT_USER_SELECT = {
  id: true,
  name: true,
  title: true,
  avatarColor: true,
  pirateCharacter: true,
  departmentScope: true,
} as const;

export interface RawChatUser {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  pirateCharacter: string | null;
  departmentScope: DepartmentScope;
}

export const CHAT_MESSAGE_INCLUDE = {
  sender: { select: CHAT_USER_SELECT },
  replyTo: {
    select: {
      id: true,
      senderId: true,
      content: true,
      isAnonymous: true,
      anonymousAlias: true,
      attachmentUrl: true,
      isDeleted: true,
      sender: { select: { name: true } },
    },
  },
} as const;

export interface RawChatReplyTo {
  id: string;
  senderId: string;
  content: string;
  isAnonymous: boolean;
  anonymousAlias: string | null;
  attachmentUrl: string | null;
  isDeleted: boolean;
  sender: { name: string };
}

export interface RawChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isAnonymous: boolean;
  anonymousAlias: string | null;
  attachmentUrl: string | null;
  replyToId?: string | null;
  replyTo?: RawChatReplyTo | null;
  forwardedFrom?: string | null;
  reminderJson?: unknown;
  isDeleted: boolean;
  createdAt: Date;
  sender: RawChatUser;
}

export function parseChatReminderMeta(raw: unknown): ChatReminderMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const reminderId = String(obj.reminderId ?? "").trim();
  const title = String(obj.title ?? "").trim();
  const remindAt = String(obj.remindAt ?? "").trim();
  if (!reminderId || !title || !remindAt) return null;
  const repeatRaw = String(obj.repeatRule ?? "NONE").toUpperCase();
  const repeatRule: ChatReminderRepeatRule =
    repeatRaw === "DAILY" || repeatRaw === "WEEKLY" ? repeatRaw : "NONE";
  return { reminderId, title, remindAt, repeatRule };
}

export interface RawChatRoomForSerialization {
  id: string;
  type: ChatRoomType;
  name: string | null;
  description: string | null;
  allowAnonymous: boolean;
  isAnonymousThread: boolean;
  anonymousAlias: string | null;
  isPinned: boolean;
  createdById: string;
  lastMessageAt: Date;
  participants: {
    userId: string;
    isAdmin: boolean;
    user: RawChatUser;
  }[];
  messages?: RawChatMessage[];
}

/**
 * Chuẩn hóa tin nhắn trước khi trả về client.
 * Đảm bảo tuyệt đối KHÔNG rò rỉ thông tin sender khi tin nhắn ở chế độ ẩn danh
 * hoặc thuộc luồng hội thoại ẩn danh 1-1 do người khởi tạo gửi.
 */
export function serializeChatMessage(
  msg: RawChatMessage,
  viewerUserId: string,
  options?: {
    forceAnonymousSenderId?: string;
    fallbackAlias?: string | null;
  }
): ChatMessageItem {
  const effectiveAnonymous =
    msg.isAnonymous ||
    Boolean(
      options?.forceAnonymousSenderId &&
        msg.senderId === options.forceAnonymousSenderId
    );

  let replyTo: ChatMessageReplyPreview | null = null;
  if (!msg.isDeleted && msg.replyTo) {
    const r = msg.replyTo;
    const replyEffectiveAnon =
      r.isAnonymous ||
      Boolean(
        options?.forceAnonymousSenderId &&
          r.senderId === options.forceAnonymousSenderId
      );
    replyTo = {
      id: r.id,
      content: r.isDeleted ? "Tin nhắn đã được thu hồi" : r.content,
      senderName: replyEffectiveAnon
        ? r.anonymousAlias || options?.fallbackAlias || ANONYMOUS_ALIASES[0]
        : r.sender.name,
      isAnonymous: replyEffectiveAnon,
      attachmentUrl: r.isDeleted ? null : r.attachmentUrl,
      isDeleted: r.isDeleted,
    };
  }

  return {
    id: msg.id,
    roomId: msg.roomId,
    content: msg.isDeleted ? "" : msg.content,
    isAnonymous: effectiveAnonymous,
    anonymousAlias: effectiveAnonymous
      ? msg.anonymousAlias || options?.fallbackAlias || ANONYMOUS_ALIASES[0]
      : null,
    attachmentUrl: msg.isDeleted ? null : msg.attachmentUrl,
    replyToId: msg.isDeleted ? null : msg.replyToId ?? null,
    replyTo,
    forwardedFrom: msg.isDeleted ? null : msg.forwardedFrom ?? null,
    reminder: msg.isDeleted ? null : parseChatReminderMeta(msg.reminderJson),
    isDeleted: msg.isDeleted,
    isMine: msg.senderId === viewerUserId,
    createdAt: msg.createdAt.toISOString(),
    sender:
      effectiveAnonymous || msg.isDeleted
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
 * Chuẩn hóa thông tin phòng chat theo góc nhìn của từng người xem.
 * Với phòng ẩn danh 1-1 (isAnonymousThread = true):
 * - Người nhận (viewerUserId !== createdById): ẨN HOÀN TOÀN createdById và thay người gửi trong
 *   participants bằng nhân vật ẩn danh (ANONYMOUS_SENDER_USER_ID) để tuyệt đối không lộ tên/avatar/ID.
 * - Người gửi (viewerUserId === createdById): biết rõ mình đang nhắn ẩn danh tới ai (isAnonymousSender = true).
 */
export function serializeChatRoomForViewer(
  room: RawChatRoomForSerialization,
  viewerUserId: string,
  unreadCount = 0
): ChatRoomSummary {
  const isAnonymousThread = Boolean(room.isAnonymousThread);
  const isAnonymousSender =
    isAnonymousThread && room.createdById === viewerUserId;
  const shouldMaskCreator =
    isAnonymousThread && room.createdById !== viewerUserId;
  const aliasLabel = room.anonymousAlias || ANONYMOUS_ALIASES[0];

  const participants = room.participants.map((p) => {
    if (shouldMaskCreator && p.userId === room.createdById) {
      return {
        userId: ANONYMOUS_SENDER_USER_ID,
        isAdmin: false,
        user: {
          id: ANONYMOUS_SENDER_USER_ID,
          name: aliasLabel,
          title: "Người gửi ẩn danh",
          avatarColor: "#312e81",
          pirateCharacter: null,
          departmentScope: "SUPPORT" as DepartmentScope,
        },
      };
    }
    return {
      userId: p.userId,
      isAdmin: p.isAdmin,
      user: p.user,
    };
  });

  const lastMsgRaw = room.messages?.[0] ?? null;
  const serializedLastMsg = lastMsgRaw
    ? serializeChatMessage(lastMsgRaw, viewerUserId, {
        forceAnonymousSenderId: isAnonymousThread
          ? room.createdById
          : undefined,
        fallbackAlias: aliasLabel,
      })
    : null;
  // Cắt chuỗi Base64 data:image/ nặng khỏi lastMessage ở danh sách phòng chat (sidebar chỉ hiển thị chữ)
  const lightweightLastMsg =
    serializedLastMsg && serializedLastMsg.attachmentUrl?.startsWith("data:image/")
      ? { ...serializedLastMsg, attachmentUrl: null }
      : serializedLastMsg;

  return {
    id: room.id,
    type: room.type as ChatRoomType,
    name: room.name,
    description: room.description,
    allowAnonymous: room.allowAnonymous,
    isAnonymousThread,
    anonymousAlias: isAnonymousThread ? aliasLabel : room.anonymousAlias,
    isAnonymousSender,
    isPinned: room.isPinned,
    createdById: shouldMaskCreator ? "anonymous" : room.createdById,
    lastMessageAt: room.lastMessageAt.toISOString(),
    unreadCount,
    participants,
    lastMessage: lightweightLastMsg,
  };
}

/**
 * Tìm hoặc tạo phòng chat ẩn danh 1-1 chuyên biệt (tách hoàn toàn khỏi hội thoại có tên thật).
 * Mỗi chiều (A -> B và B -> A) có một luồng ẩn danh riêng biệt theo createdById = người giấu danh tính.
 */
export async function findOrCreateAnonymousDirectRoom(
  senderId: string,
  targetUserId: string,
  requestedAlias?: string | null
) {
  const cleanAlias = requestedAlias?.trim().slice(0, 40) || "";

  const existing = await prisma.chatRoom.findMany({
    where: {
      type: "DIRECT",
      isAnonymousThread: true,
      createdById: senderId,
      AND: [
        { participants: { some: { userId: senderId } } },
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

  const exactMatch = existing.find((r) => r.participants.length === 2);
  if (exactMatch) {
    if (cleanAlias && exactMatch.anonymousAlias !== cleanAlias) {
      const updated = await prisma.chatRoom.update({
        where: { id: exactMatch.id },
        data: { anonymousAlias: cleanAlias },
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
      return { room: updated, created: false };
    }
    return { room: exactMatch, created: false };
  }

  const resolvedAlias =
    cleanAlias ||
    ANONYMOUS_ALIASES[Math.floor(Math.random() * ANONYMOUS_ALIASES.length)];

  const created = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      allowAnonymous: true,
      isAnonymousThread: true,
      anonymousAlias: resolvedAlias,
      createdById: senderId,
      participants: {
        create: [
          { userId: senderId, isAdmin: true },
          { userId: targetUserId, isAdmin: false },
        ],
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

  return { room: created, created: true };
}

let legacyAnonymousMigrationPromise: Promise<void> | null = null;

/**
 * Tự động tách các tin nhắn ẩn danh 1-1 cũ (từng bị lưu nhầm vào phòng 1-1 có tên thật)
 * sang phòng ẩn danh riêng biệt để đảm bảo bảo mật danh tính cho cả dữ liệu cũ.
 */
export async function migrateLegacyDirectAnonymousMessagesOnce(): Promise<void> {
  if (!legacyAnonymousMigrationPromise) {
    legacyAnonymousMigrationPromise = (async () => {
      const legacyMessages = await prisma.chatMessage.findMany({
        where: {
          isAnonymous: true,
          room: {
            type: "DIRECT",
            isAnonymousThread: false,
          },
        },
        orderBy: { createdAt: "asc" },
        include: {
          room: {
            include: {
              participants: { select: { userId: true } },
            },
          },
        },
      });

      if (legacyMessages.length === 0) return;

      const grouped = new Map<
        string,
        {
          oldRoomId: string;
          senderId: string;
          recipientId: string;
          messageIds: string[];
          latestAlias: string | null;
          latestCreatedAt: Date;
        }
      >();

      const touchedOldRoomIds = new Set<string>();

      for (const msg of legacyMessages) {
        const peer = msg.room.participants.find(
          (p) => p.userId !== msg.senderId
        );
        if (!peer) continue;
        const key = `${msg.roomId}::${msg.senderId}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.messageIds.push(msg.id);
          if (msg.anonymousAlias) existing.latestAlias = msg.anonymousAlias;
          if (msg.createdAt > existing.latestCreatedAt) {
            existing.latestCreatedAt = msg.createdAt;
          }
        } else {
          grouped.set(key, {
            oldRoomId: msg.roomId,
            senderId: msg.senderId,
            recipientId: peer.userId,
            messageIds: [msg.id],
            latestAlias: msg.anonymousAlias,
            latestCreatedAt: msg.createdAt,
          });
        }
        touchedOldRoomIds.add(msg.roomId);
      }

      for (const group of grouped.values()) {
        const { room: secretRoom } = await findOrCreateAnonymousDirectRoom(
          group.senderId,
          group.recipientId,
          group.latestAlias
        );

        await prisma.chatMessage.updateMany({
          where: { id: { in: group.messageIds } },
          data: { roomId: secretRoom.id },
        });

        await prisma.chatRoom.update({
          where: { id: secretRoom.id },
          data: {
            lastMessageAt:
              secretRoom.lastMessageAt > group.latestCreatedAt
                ? secretRoom.lastMessageAt
                : group.latestCreatedAt,
          },
        });

        await prisma.notification.updateMany({
          where: {
            userId: group.recipientId,
            type: "CHAT_MESSAGE",
            linkUrl: `/chat?room=${group.oldRoomId}`,
            title: { contains: "ẩn danh", mode: "insensitive" },
          },
          data: {
            linkUrl: `/chat?room=${secretRoom.id}`,
          },
        });
      }

      for (const oldRoomId of touchedOldRoomIds) {
        const remainingLatest = await prisma.chatMessage.findFirst({
          where: { roomId: oldRoomId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        if (!remainingLatest) {
          // Phòng 1-1 cũ chỉ chứa đúng các tin ẩn danh vừa tách -> xóa vỏ rỗng để không lộ tên người gửi
          await prisma.chatRoom.delete({ where: { id: oldRoomId } });
        } else {
          await prisma.chatRoom.update({
            where: { id: oldRoomId },
            data: { lastMessageAt: remainingLatest.createdAt },
          });
        }
      }
    })().catch((err) => {
      console.error("Legacy direct anonymous chat migration error:", err);
      legacyAnonymousMigrationPromise = null;
    });
  }

  return legacyAnonymousMigrationPromise;
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
    await migrateLegacyDirectAnonymousMessagesOnce();
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

  return rooms
    .filter((r) => {
      // Không hiển thị phòng ẩn danh rỗng cho người nhận trước khi có tin nhắn đầu tiên
      if (r.isAnonymousThread && r.createdById !== userId && r.messages.length === 0) {
        return false;
      }
      return true;
    })
    .map((r) => serializeChatRoomForViewer(r, userId, unreadMap.get(r.id) ?? 0));
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

export const CHAT_REMINDER_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      name: true,
      avatarColor: true,
      pirateCharacter: true,
    },
  },
} as const;

export interface RawChatReminder {
  id: string;
  roomId: string;
  createdById: string;
  title: string;
  remindAt: Date;
  repeatRule: string;
  isCompleted: boolean;
  completedAt: Date | null;
  notifiedAt: Date | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter: string | null;
  };
}

export function serializeChatReminder(
  rem: RawChatReminder,
  viewerUserId: string,
  room?: {
    isAnonymousThread?: boolean;
    createdById?: string;
    anonymousAlias?: string | null;
  } | null
): ChatReminderItem {
  const shouldMaskCreator = Boolean(
    room?.isAnonymousThread &&
      room.createdById &&
      rem.createdById === room.createdById &&
      viewerUserId !== room.createdById
  );
  const repeatRaw = String(rem.repeatRule ?? "NONE").toUpperCase();
  const repeatRule: ChatReminderRepeatRule =
    repeatRaw === "DAILY" || repeatRaw === "WEEKLY" ? repeatRaw : "NONE";

  return {
    id: rem.id,
    roomId: rem.roomId,
    title: rem.title,
    remindAt: rem.remindAt.toISOString(),
    repeatRule,
    isCompleted: rem.isCompleted,
    completedAt: rem.completedAt ? rem.completedAt.toISOString() : null,
    notifiedAt: rem.notifiedAt ? rem.notifiedAt.toISOString() : null,
    createdAt: rem.createdAt.toISOString(),
    isMine: rem.createdById === viewerUserId,
    createdBy: shouldMaskCreator
      ? {
          id: ANONYMOUS_SENDER_USER_ID,
          name: room?.anonymousAlias || ANONYMOUS_ALIASES[0],
          avatarColor: "#312e81",
          pirateCharacter: null,
        }
      : {
          id: rem.createdBy.id,
          name: rem.createdBy.name,
          avatarColor: rem.createdBy.avatarColor,
          pirateCharacter: rem.createdBy.pirateCharacter,
        },
  };
}

let lastReminderDispatchAt = 0;

/**
 * Kiểm tra & gửi thông báo cho các Nhắc hẹn trong phòng chat vừa tới giờ.
 * Có throttle 20s trong process và khóa claim nguyên tử để tránh gửi trùng lặp.
 */
export async function dispatchDueChatReminders(force = false): Promise<number> {
  const nowMs = Date.now();
  if (!force && nowMs - lastReminderDispatchAt < 20_000) {
    return 0;
  }
  lastReminderDispatchAt = nowMs;

  const now = new Date();
  const dueReminders = await prisma.chatReminder.findMany({
    where: {
      isCompleted: false,
      notifiedAt: null,
      remindAt: { lte: now },
    },
    take: 15,
    include: {
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          isAnonymousThread: true,
          anonymousAlias: true,
          participants: { select: { userId: true } },
        },
      },
    },
  });

  let dispatched = 0;
  for (const rem of dueReminders) {
    const stepMs =
      rem.repeatRule === "DAILY"
        ? 24 * 60 * 60 * 1000
        : rem.repeatRule === "WEEKLY"
          ? 7 * 24 * 60 * 60 * 1000
          : 0;

    let nextRemindAt: Date | null = null;
    if (stepMs > 0) {
      let candidate = rem.remindAt.getTime() + stepMs;
      while (candidate <= now.getTime()) {
        candidate += stepMs;
      }
      nextRemindAt = new Date(candidate);
    }

    // Khóa nguyên tử: chỉ tiến trình claim được (notifiedAt: null + đúng remindAt) mới gửi thông báo
    const claim = await prisma.chatReminder.updateMany({
      where: {
        id: rem.id,
        notifiedAt: null,
        isCompleted: false,
        remindAt: rem.remindAt,
      },
      data: nextRemindAt
        ? { remindAt: nextRemindAt, notifiedAt: null }
        : { notifiedAt: now },
    });
    if (claim.count === 0) continue;

    const roomLabel = rem.room.isAnonymousThread
      ? rem.room.anonymousAlias || "Phòng ẩn danh"
      : rem.room.type === "GROUP"
        ? rem.room.name || "nhóm chat"
        : "cuộc trò chuyện";

    await Promise.all(
      rem.room.participants.map((p) =>
        createNotification({
          userId: p.userId,
          type: "REMINDER",
          title: `⏰ Đến giờ nhắc hẹn: ${rem.title}`,
          message: `Nhắc hẹn trong ${roomLabel} lúc ${formatVnDateTime(rem.remindAt)}.`,
          linkUrl: `/chat?room=${rem.roomId}`,
          actionLabel: "Mở phòng chat",
        })
      )
    );
    dispatched += 1;
  }

  return dispatched;
}
