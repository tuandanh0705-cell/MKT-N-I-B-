import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới được phân quyền thành viên dự án." },
      { status: 403 }
    );
  }

  const { id: projectId } = await context.params;
  const body = await request.json();
  const targetUserId = String(body.userId ?? "");
  const scope = body.scope === "ASSIGNED_ONLY" ? "ASSIGNED_ONLY" : "PROJECT_WIDE";
  const roleLabel = body.roleLabel ? String(body.roleLabel) : null;

  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    update: { scope, roleLabel },
    create: { projectId, userId: targetUserId, scope, roleLabel },
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới được gỡ thành viên dự án." },
      { status: 403 }
    );
  }

  const { id: projectId } = await context.params;
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  await prisma.projectMember.deleteMany({
    where: { projectId, userId: targetUserId },
  });

  return NextResponse.json({ ok: true });
}
