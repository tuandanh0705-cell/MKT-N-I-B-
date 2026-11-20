import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildProjectVisibilityWhere, canAccessProject } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { formatVnd } from "@/lib/dates";
import type { BudgetCategory, BudgetStatus } from "@/generated/prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const budgets = await prisma.budgetRequest.findMany({
    where:
      user.role === "LEADER"
        ? {}
        : {
            OR: [
              { requesterId: user.id },
              { project: buildProjectVisibilityWhere(user) },
            ],
          },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      project: { select: { id: true, name: true, slug: true, color: true } },
      requester: { select: { id: true, name: true, avatarColor: true, pirateCharacter: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ budgets });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const title = String(body.title ?? "").trim();
    const amount = Math.max(0, Math.round(Number(body.amount || 0)));

    if (!projectId || !title || amount <= 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn dự án, nhập hạng mục chi và số tiền > 0." },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(user, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền đề xuất chi phí cho dự án này." },
        { status: 403 }
      );
    }

    const count = await prisma.budgetRequest.count();
    const code = `CHI-${String(count + 1).padStart(2, "0")}-${Math.floor(
      10 + Math.random() * 89
    )}`;

    const created = await prisma.budgetRequest.create({
      data: {
        code,
        title,
        category: (body.category as BudgetCategory) || "SHOOT_PRODUCTION",
        amount,
        neededBy: body.neededBy ? new Date(body.neededBy) : null,
        note: body.note ? String(body.note).trim() : null,
        status: user.role === "LEADER" ? "APPROVED" : "PENDING",
        reviewerId: user.role === "LEADER" ? user.id : null,
        projectId,
        requesterId: user.id,
      },
      include: {
        project: { select: { id: true, name: true, slug: true, color: true } },
        requester: { select: { id: true, name: true, avatarColor: true, pirateCharacter: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    if (user.role !== "LEADER") {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        await createNotification({
          userId: leader.id,
          type: "SYSTEM",
          title: `Đề xuất chi phí ${created.code}: ${formatVnd(amount)}`,
          message: `${user.name} xin duyệt dự trù "${title}" (${created.project.name}).`,
          linkUrl: "/budgets",
          sendEmailNow: true,
        });
      }
    }

    return NextResponse.json({ budget: created }, { status: 201 });
  } catch (err) {
    console.error("Create budget error:", err);
    return NextResponse.json(
      { error: "Không thể tạo phiếu dự trù chi phí." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền duyệt chi phí." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const status = body.status as BudgetStatus;

    if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Tham số duyệt không hợp lệ." }, { status: 400 });
    }

    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: {
        status,
        reviewNote: body.reviewNote ? String(body.reviewNote).trim() : null,
        reviewerId: user.id,
      },
      include: {
        project: { select: { id: true, name: true, slug: true, color: true } },
        requester: { select: { id: true, name: true, avatarColor: true, pirateCharacter: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    if (updated.requesterId !== user.id) {
      await createNotification({
        userId: updated.requesterId,
        type: status === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
        title: `${status === "APPROVED" ? "Đã duyệt chi phí" : "Từ chối chi phí"} ${updated.code}`,
        message: `Leader ${status === "APPROVED" ? "đã duyệt" : "từ chối"} khoản "${updated.title}" (${formatVnd(updated.amount)}).`,
        linkUrl: "/budgets",
        sendEmailNow: true,
      });
    }

    return NextResponse.json({ budget: updated });
  } catch (err) {
    console.error("Update budget error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật trạng thái chi phí." },
      { status: 500 }
    );
  }
}
