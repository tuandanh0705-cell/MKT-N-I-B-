import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const msg = await prisma.chatMessage.findUnique({ where: { id } });

  if (!msg) {
    return NextResponse.json(
      { error: "Tin nhắn không tồn tại." },
      { status: 404 }
    );
  }

  if (msg.senderId !== user.id) {
    return NextResponse.json(
      { error: "Bạn chỉ có thể thu hồi tin nhắn do chính mình gửi." },
      { status: 403 }
    );
  }

  await prisma.chatMessage.update({
    where: { id },
    data: {
      isDeleted: true,
      content: "[Tin nhắn đã thu hồi]",
      attachmentUrl: null,
    },
  });

  return NextResponse.json({ ok: true });
}
