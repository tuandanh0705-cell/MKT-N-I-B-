import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CHAT_USER_SELECT,
  getUserChatRoomsWithMeta,
  serializeChatMessage,
} from "@/lib/chat";
import { ChatWorkspace } from "@/components/chat-workspace";

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
  if (initialRoomId) {
    const rawMessages = await prisma.chatMessage.findMany({
      where: { roomId: initialRoomId },
      orderBy: { createdAt: "asc" },
      take: 120,
      include: { sender: { select: CHAT_USER_SELECT } },
    });
    initialMessages = rawMessages.map((m) => serializeChatMessage(m, user.id));

    await prisma.chatParticipant.update({
      where: {
        roomId_userId: { roomId: initialRoomId, userId: user.id },
      },
      data: { lastReadAt: new Date() },
    });

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
    />
  );
}
