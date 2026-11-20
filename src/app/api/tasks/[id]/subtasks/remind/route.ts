import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { normalizeSubtasks } from "@/lib/subtasks";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const allowed = await canAccessTask(user, id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Bạn không có quyền gửi nhắc việc cho công việc này." },
      { status: 403 }
    );
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!task || task.deletedAt) {
    return NextResponse.json({ error: "Không tìm thấy công việc." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const subtaskId = body.subtaskId ? String(body.subtaskId) : "";
    const subtaskTitle = String(body.subtaskTitle ?? "").trim() || "Chi tiết đầu việc";
    const explicitRecipientId = body.recipientUserId ? String(body.recipientUserId) : "";
    const note = body.note ? String(body.note).trim() : "";

    const targetIds = new Set<string>();
    if (explicitRecipientId) {
      targetIds.add(explicitRecipientId);
    } else {
      if (task.assigneeId && task.assigneeId !== user.id) targetIds.add(task.assigneeId);
      if (task.requesterId && task.requesterId !== user.id) targetIds.add(task.requesterId);
      if (targetIds.size === 0) {
        const leaders = await prisma.user.findMany({
          where: { role: "LEADER", isActive: true },
          select: { id: true },
        });
        for (const l of leaders) {
          if (l.id !== user.id) targetIds.add(l.id);
        }
      }
    }

    if (targetIds.size === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn thành viên cần nhắc." },
        { status: 400 }
      );
    }

    let recipientNames: string[] = [];
    const recipients = await prisma.user.findMany({
      where: { id: { in: Array.from(targetIds) }, isActive: true },
      select: { id: true, name: true },
    });
    recipientNames = recipients.map((r) => r.name);

    for (const r of recipients) {
      await createNotification({
        userId: r.id,
        type: "REMINDER",
        title: `Nhắc đầu việc: ${subtaskTitle}`,
        message: note
          ? `${user.name} nhắc bạn "${subtaskTitle}" trong "${task.title}" (${task.project.name}): ${note}`
          : `${user.name} nhắc bạn kiểm tra/phối hợp "${subtaskTitle}" cho "${task.title}" (${task.project.name}).`,
        linkUrl: "/my-work",
        actionLabel: "Mở Nhật Ký Hải Trình",
      });
    }

    const nowIso = new Date().toISOString();
    const currentSubtasks = normalizeSubtasks(task.subtasksJson);
    const nextSubtasks = currentSubtasks.map((st) =>
      subtaskId && st.id === subtaskId ? { ...st, remindedAt: nowIso } : st
    );

    const updated = await prisma.task.update({
      where: { id },
      data: {
        subtasksJson: nextSubtasks as unknown as Prisma.InputJsonValue,
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        assignee: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarColor: true,
            pirateCharacter: true,
            departmentScope: true,
          },
        },
        requester: {
          select: { id: true, name: true, title: true, avatarColor: true, pirateCharacter: true },
        },
        reviewer: { select: { id: true, name: true } },
        assets: { orderBy: { createdAt: "desc" } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      remindedTo: recipientNames,
      task: updated,
    });
  } catch (err) {
    console.error("Subtask remind error:", err);
    return NextResponse.json(
      { error: "Không gửi được nhắc việc." },
      { status: 500 }
    );
  }
}
