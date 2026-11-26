import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CHAT_MESSAGE_INCLUDE,
  CHAT_REMINDER_INCLUDE,
  CHAT_USER_SELECT,
  getUserChatRoomsWithMeta,
  serializeChatMessage,
  serializeChatReminder,
} from "@/lib/chat";
import { ChatWorkspace } from "@/components/chat-workspace";
import type { ChatReminderItem } from "@/types/crm";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const [rooms, teammates] = await Promise.all([
    getUserChatRoomsWithMeta(user.id),
    prisma.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: CHAT_USER_SELECT,
    }),
  ]);

  const initialRoomId =
    (resolvedParams.room &&
    rooms.some((r) => r.id === resolvedParams.room)
      ? resolvedParams.room
      : rooms[0]?.id) ?? null;

  let initialMessages: ReturnType<typeof serializeChatMessage>[] = [];
  let initialReminders: ChatReminderItem[] = [];
  if (initialRoomId) {
    const [rawMessagesDesc, initialRoomRaw, rawReminders] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId: initialRoomId },
        orderBy: { createdAt: "desc" },
        take: 80,
        include: CHAT_MESSAGE_INCLUDE,
      }),
      prisma.chatRoom.findUnique({
        where: { id: initialRoomId },
        select: {
          isAnonymousThread: true,
          createdById: true,
          anonymousAlias: true,
        },
      }),
      prisma.chatReminder.findMany({
        where: { roomId: initialRoomId },
        orderBy: [{ isCompleted: "asc" }, { remindAt: "asc" }],
        take: 30,
        include: CHAT_REMINDER_INCLUDE,
      }),
      prisma.chatParticipant.update({
        where: {
          roomId_userId: { roomId: initialRoomId, userId: user.id },
        },
        data: { lastReadAt: new Date() },
      }),
    ]);

    const msgSerializeOpts = initialRoomRaw?.isAnonymousThread
      ? {
          forceAnonymousSenderId: initialRoomRaw.createdById,
          fallbackAlias: initialRoomRaw.anonymousAlias,
        }
      : undefined;

    initialMessages = rawMessagesDesc
      .reverse()
      .map((m) => serializeChatMessage(m, user.id, msgSerializeOpts));

    initialReminders = rawReminders.map((rem) =>
      serializeChatReminder(rem, user.id, initialRoomRaw)
    );

    const targetRoom = rooms.find((r) => r.id === initialRoomId);
    if (targetRoom) targetRoom.unreadCount = 0;
  }

  return (
    <ChatWorkspace
      currentUser={{
        id: user.id,
        name: user.name,
        role: user.role,
        departmentScope: user.departmentScope,
        avatarColor: user.avatarColor,
        pirateCharacter: user.pirateCharacter,
      }}
      teammates={teammates}
      initialRooms={rooms}
      initialRoomId={initialRoomId}
      initialMessages={initialMessages}
      initialReminders={initialReminders}
      initialMobileShowChat={Boolean(resolvedParams.room)}
    />
  );
}
