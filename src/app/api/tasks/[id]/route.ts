import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canAccessTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { evaluateOrderTiming } from "@/lib/dates";
import { buildFieldDiffs, recordActivity } from "@/lib/activity";
import { normalizeSubtasks } from "@/lib/subtasks";
import { normalizeMediaBriefItems } from "@/lib/media-brief";
import { taskRequiresLeaderApproval } from "@/lib/constants";
import { TASK_DETAIL_INCLUDE } from "@/lib/task-queries";
import type {
  ActivityAction,
  AssetKind,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/generated/prisma/client";

export async function GET(
  _request: Request,
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
      { error: "Không tìm thấy công việc hoặc bạn không có quyền xem." },
      { status: 403 }
    );
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: TASK_DETAIL_INCLUDE,
  });

  if (!task || task.deletedAt) {
    return NextResponse.json(
      { error: "Không tìm thấy công việc hoặc đã bị xóa." },
      { status: 404 }
    );
  }

  return NextResponse.json({ task });
}

export async function PATCH(
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
      { error: "Bạn không có quyền cập nhật công việc này." },
      { status: 403 }
    );
  }

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { project: { select: { id: true, slug: true, name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy công việc." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const action = body.action as string | undefined;

    // 0. Xóa Link đính kèm (nếu yêu cầu)
    if (body.deleteAssetId) {
      await prisma.assetLink.deleteMany({
        where: {
          id: String(body.deleteAssetId),
          taskId: id,
          ...(user.role === "LEADER"
            ? {}
            : {
                OR: [
                  { createdById: user.id },
                  { task: { requesterId: user.id } },
                  { task: { assigneeId: user.id } },
                ],
              }),
        },
      });
    }

    // 1. Thêm link Google Drive / Canva / Link bài đăng mới (tự tăng version v1, v2, v3)
    if (body.newAsset && body.newAsset.url) {
      const kind = (body.newAsset.kind as AssetKind) || "DEMO";
      const url = String(body.newAsset.url).trim();
      const existingSameKind = await prisma.assetLink.count({
        where: { taskId: id, kind },
      });
      const version = existingSameKind + 1;
      const defaultLabel =
        kind === "DEMO"
          ? `Link Demo v${version}`
          : kind === "FINAL"
            ? `Link Final v${version}`
            : kind === "PUBLISHED_LINK"
              ? "Link bài đã đăng"
              : "Brief / Tư liệu";

      await prisma.assetLink.create({
        data: {
          taskId: id,
          kind,
          label: body.newAsset.label ? String(body.newAsset.label).trim() : defaultLabel,
          url,
          version,
          createdById: user.id,
        },
      });
    }

    // 2. Xử lý các action nghiệp vụ chuẩn quy trình Team MKT
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined && String(body.title).trim()) {
      updateData.title = String(body.title).trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description) : null;
    }
    if (body.caption !== undefined) {
      updateData.caption = body.caption ? String(body.caption) : null;
    }
    if (body.platform !== undefined) updateData.platform = String(body.platform);
    if (body.publishChannel !== undefined) {
      updateData.publishChannel = body.publishChannel
        ? String(body.publishChannel).trim()
        : null;
    }
    if (body.taskType !== undefined) updateData.taskType = body.taskType as TaskType;
    if (body.isMediaOrder !== undefined) updateData.isMediaOrder = Boolean(body.isMediaOrder);
    if (body.isOutsideDepartment !== undefined) {
      updateData.isOutsideDepartment = Boolean(body.isOutsideDepartment);
    }
    if (body.priority !== undefined) updateData.priority = body.priority as TaskPriority;
    if (body.quantity !== undefined) updateData.quantity = Math.max(1, Number(body.quantity));

    if (body.projectId !== undefined && body.projectId !== existing.projectId) {
      const nextProjAllowed = await canAccessProject(user, String(body.projectId));
      if (!nextProjAllowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền chuyển việc sang dự án này." },
          { status: 403 }
        );
      }
      updateData.projectId = String(body.projectId);
    }

    const nextAssigneeId =
      body.assigneeId !== undefined
        ? body.assigneeId
          ? String(body.assigneeId)
          : null
        : existing.assigneeId;

    if (body.assigneeId !== undefined) {
      updateData.assigneeId = nextAssigneeId;
      if (nextAssigneeId && nextAssigneeId !== existing.assigneeId && nextAssigneeId !== user.id) {
        await createNotification({
          userId: nextAssigneeId,
          type: "TASK_ASSIGNED",
          title: `📋 Được giao việc ${existing.code}`,
          message: `${user.name} đã chuyển giao "${existing.title}" (${existing.project.name}) cho bạn.`,
          linkUrl: `/my-work?taskId=${id}`,
          sendEmailNow: true,
          actionLabel: "Mở việc & xếp lịch làm",
        });
      }
    }

    if (body.plannedDate !== undefined) {
      if (body.plannedDate === null || body.plannedDate === "") {
        updateData.plannedDate = null;
      } else {
        const cleanedPlan = String(body.plannedDate).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanedPlan)) {
          return NextResponse.json(
            { error: "Định dạng ngày dự kiến làm không hợp lệ (YYYY-MM-DD)." },
            { status: 400 }
          );
        }
        updateData.plannedDate = cleanedPlan;
      }
    }

    if (body.dueAt !== undefined) {
      const parsedDue = body.dueAt ? new Date(body.dueAt) : null;
      updateData.dueAt = parsedDue;
      const outside =
        body.isOutsideDepartment !== undefined
          ? Boolean(body.isOutsideDepartment)
          : existing.isOutsideDepartment;
      const timing = evaluateOrderTiming(parsedDue, outside);
      updateData.isRushOrder = timing.isRushOrder;
    }

    if (body.scheduledPublishAt !== undefined) {
      updateData.scheduledPublishAt = body.scheduledPublishAt
        ? new Date(body.scheduledPublishAt)
        : null;
    }
    if (body.qcChecklistJson !== undefined) {
      updateData.qcChecklistJson = body.qcChecklistJson;
    }
    if (body.subtasksJson !== undefined) {
      updateData.subtasksJson = normalizeSubtasks(
        body.subtasksJson
      ) as unknown as Prisma.InputJsonValue;
    }
    if (body.mediaBriefItemsJson !== undefined) {
      const normalizedBriefItems = normalizeMediaBriefItems(
        body.mediaBriefItemsJson
      );
      updateData.mediaBriefItemsJson =
        normalizedBriefItems as unknown as Prisma.InputJsonValue;
      if (normalizedBriefItems.length > 0 && body.quantity === undefined) {
        updateData.quantity = normalizedBriefItems.length;
      }
    }
    if (body.contentPillar !== undefined) {
      updateData.contentPillar = body.contentPillar ? String(body.contentPillar) : null;
    }
    if (body.campaignWeek !== undefined) {
      updateData.campaignWeek = body.campaignWeek ? Number(body.campaignWeek) : null;
    }
    if (body.contentAngle !== undefined) {
      updateData.contentAngle = body.contentAngle ? String(body.contentAngle) : null;
    }
    if (body.postFormat !== undefined) {
      updateData.postFormat = body.postFormat ? String(body.postFormat) : null;
    }
    if (body.mediaDueAt !== undefined) {
      updateData.mediaDueAt = body.mediaDueAt ? new Date(body.mediaDueAt) : null;
    }
    if (body.productLink !== undefined) {
      updateData.productLink = body.productLink ? String(body.productLink).trim() : null;
    }
    if (body.isAired !== undefined) {
      updateData.isAired = Boolean(body.isAired);
    }
    if (body.matrixIdeaId !== undefined) {
      updateData.matrixIdeaId = body.matrixIdeaId ? String(body.matrixIdeaId) : null;
    }
    if (body.fbPostLayout !== undefined) {
      updateData.fbPostLayout = String(body.fbPostLayout || "SINGLE_SQUARE");
    }
    if (body.proposedBriefDueAt !== undefined) {
      updateData.proposedBriefDueAt = body.proposedBriefDueAt
        ? new Date(body.proposedBriefDueAt)
        : null;
    }
    if (body.proposedPublishAt !== undefined) {
      updateData.proposedPublishAt = body.proposedPublishAt
        ? new Date(body.proposedPublishAt)
        : null;
    }
    if (body.timelineNote !== undefined) {
      updateData.timelineNote = body.timelineNote ? String(body.timelineNote) : null;
    }

    if (action === "PROPOSE_TIMELINE") {
      if (body.proposedBriefDueAt !== undefined) {
        updateData.proposedBriefDueAt = body.proposedBriefDueAt
          ? new Date(body.proposedBriefDueAt)
          : null;
      }
      if (body.proposedPublishAt !== undefined) {
        updateData.proposedPublishAt = body.proposedPublishAt
          ? new Date(body.proposedPublishAt)
          : null;
      }
      if (body.timelineNote !== undefined) {
        updateData.timelineNote = body.timelineNote ? String(body.timelineNote) : null;
      }
      updateData.timelineStatus = "PENDING_LEADER";
      updateData.timelineSubmittedAt = new Date();
      updateData.timelineSubmittedById = user.id;

      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        if (leader.id === user.id) continue;
        await createNotification({
          userId: leader.id,
          type: "TIMELINE_UPDATE",
          title: `Đề xuất Timeline bài đăng: ${existing.code}`,
          message: `${user.name} vừa cập nhật timeline chi tiết cho "${existing.title}" (${existing.project.name}) và gửi Leader duyệt.`,
          linkUrl: `/projects/${existing.project.slug}`,
        });
      }
    } else if (action === "APPROVE_TIMELINE") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có quyền duyệt đồng bộ Timeline chính thức." },
          { status: 403 }
        );
      }
      const nextDue = existing.proposedBriefDueAt ?? existing.dueAt;
      const nextPublish = existing.proposedPublishAt ?? existing.scheduledPublishAt;
      if (nextDue) updateData.dueAt = nextDue;
      if (nextPublish) updateData.scheduledPublishAt = nextPublish;
      updateData.timelineStatus = "APPROVED";

      const notifyUserId = existing.timelineSubmittedById || existing.assigneeId || existing.requesterId;
      if (notifyUserId && notifyUserId !== user.id) {
        await createNotification({
          userId: notifyUserId,
          type: "TIMELINE_UPDATE",
          title: `Leader đã duyệt Timeline: ${existing.code}`,
          message: `Lịch chi tiết bài "${existing.title}" đã được đồng bộ sang Timeline chính thức trên App.`,
          linkUrl: `/projects/${existing.project.slug}`,
        });
      }
    } else if (action === "REJECT_TIMELINE") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có quyền từ chối đề xuất Timeline." },
          { status: 403 }
        );
      }
      updateData.timelineStatus = "REJECTED";
      const notifyUserId = existing.timelineSubmittedById || existing.assigneeId || existing.requesterId;
      if (notifyUserId && notifyUserId !== user.id) {
        await createNotification({
          userId: notifyUserId,
          type: "TIMELINE_UPDATE",
          title: `Giữ nguyên lịch App cho ${existing.code}`,
          message: `Leader giữ nguyên Timeline gốc cho "${existing.title}"${
            body.timelineNote ? `: ${String(body.timelineNote)}` : ""
          }.`,
          linkUrl: `/projects/${existing.project.slug}`,
        });
      }
    } else if (action === "APPROVE_BRIEF") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có quyền duyệt Brief." },
          { status: 403 }
        );
      }
      updateData.status = "IN_PROGRESS";
      updateData.reviewerId = user.id;

      if (existing.assigneeId && existing.assigneeId !== user.id) {
        await createNotification({
          userId: existing.assigneeId,
          type: "APPROVED",
          title: `Brief đã duyệt — Bắt đầu làm ${existing.code}`,
          message: `Leader đã duyệt Brief "${existing.title}" (${existing.project.name}). Bạn có thể tiến hành sản xuất.`,
          linkUrl: `/projects/${existing.project.slug}`,
          sendEmailNow: true,
        });
      }
    } else if (action === "SUBMIT_FOR_REVIEW") {
      updateData.status = "WAITING_APPROVAL";
      updateData.submittedAt = new Date();

      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        if (leader.id === user.id) continue;
        await createNotification({
          userId: leader.id,
          type: "REVIEW_REQUESTED",
          title: `Chờ Leader duyệt: ${existing.code}`,
          message: `${user.name} đã gửi "${existing.title}" (${existing.project.name}) lên hàng đợi duyệt.`,
          linkUrl: body.notifyUrl
            ? String(body.notifyUrl)
            : "/outputs?readiness=NEEDS_REVIEW",
          actionLabel: body.notifyUrl ? "Mở bài viết duyệt ngay" : "Mở Hàng đợi Duyệt",
        });
      }
    } else if (action === "APPROVE") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có quyền duyệt Final." },
          { status: 403 }
        );
      }
      updateData.status = "APPROVED_FINAL";
      updateData.approvedAt = new Date();
      updateData.reviewerId = user.id;

      const recipients = new Set(
        [existing.assigneeId, existing.requesterId].filter(
          (uid): uid is string => Boolean(uid) && uid !== user.id
        )
      );
      for (const rid of recipients) {
        await createNotification({
          userId: rid,
          type: "APPROVED",
          title: `⭐ Đã duyệt Final: ${existing.code}`,
          message: `Leader đã duyệt Final "${existing.title}" (${existing.project.name}). Sẵn sàng lên lịch đăng / hoàn tất!`,
          linkUrl:
            rid === existing.assigneeId
              ? `/my-work?taskId=${id}`
              : `/projects/${existing.project.slug}?taskId=${id}`,
          sendEmailNow: true,
          actionLabel: "Mở đầu việc đã duyệt",
        });
      }
    } else if (action === "REQUEST_REVISION") {
      if (user.role !== "LEADER") {
        return NextResponse.json(
          { error: "Chỉ Leader mới có quyền yêu cầu chỉnh sửa chính thức." },
          { status: 403 }
        );
      }
      const nextRevCount = existing.revisionCount + 1;
      updateData.status = "REVISION_NEEDED";
      updateData.revisionCount = nextRevCount;
      updateData.reviewerId = user.id;

      const qcFlags: string[] = Array.isArray(body.qcFlags) ? body.qcFlags : [];
      if (qcFlags.length > 0) {
        updateData.qcChecklistJson = qcFlags;
      }

      const feedbackNote = String(body.feedback ?? "").trim() || "Cần chỉnh sửa theo checklist QC đính kèm.";

      await prisma.taskComment.create({
        data: {
          taskId: id,
          authorId: user.id,
          content: `[Yêu cầu sửa lần ${nextRevCount}/${existing.maxRevisions}] ${feedbackNote}`,
          qcFlagsJson: qcFlags.length > 0 ? qcFlags : undefined,
        },
      });

      const recipients = new Set(
        [existing.assigneeId, existing.requesterId].filter(
          (uid): uid is string => Boolean(uid) && uid !== user.id
        )
      );
      for (const rid of recipients) {
        await createNotification({
          userId: rid,
          type: "REVISION_REQUESTED",
          title: `🔧 Cần sửa (${nextRevCount}/${existing.maxRevisions}): ${existing.code}`,
          message: `Leader phản hồi "${existing.title}": ${feedbackNote}`,
          linkUrl:
            rid === existing.assigneeId
              ? `/my-work?taskId=${id}&openChat=1`
              : `/projects/${existing.project.slug}?taskId=${id}&openChat=1`,
          sendEmailNow: true,
          actionLabel: "Xem feedback & sửa ngay",
        });
      }
    } else if (action === "MARK_PUBLISHED" || action === "MARK_DONE") {
      const effectiveType =
        (updateData.taskType as TaskType | undefined) ?? existing.taskType;
      const effectiveIsMedia =
        (updateData.isMediaOrder as boolean | undefined) ?? existing.isMediaOrder;
      const needsApproval = taskRequiresLeaderApproval({
        taskType: effectiveType,
        isMediaOrder: effectiveIsMedia,
      });

      if (
        user.role !== "LEADER" &&
        needsApproval &&
        existing.status !== "APPROVED_FINAL" &&
        existing.status !== "PUBLISHED"
      ) {
        return NextResponse.json(
          {
            error:
              action === "MARK_PUBLISHED"
                ? "Cần được Leader duyệt Final trước khi đánh dấu Đã đăng."
                : "Bài Content / Ấn phẩm Ảnh & Video cần gửi Leader duyệt trước khi đánh dấu Hoàn tất. Hãy bấm 'Gửi Leader duyệt'.",
          },
          { status: 400 }
        );
      }

      const now = new Date();
      updateData.status = action === "MARK_PUBLISHED" ? "PUBLISHED" : "DONE";
      updateData.completedAt = now;
      if (existing.dueAt && now > existing.dueAt) {
        updateData.wasLate = true;
      }
    } else if (body.status !== undefined) {
      const nextStatus = body.status as TaskStatus;
      if (
        (nextStatus === "APPROVED_FINAL" || nextStatus === "REVISION_NEEDED") &&
        user.role !== "LEADER"
      ) {
        return NextResponse.json(
          { error: "Chỉ Leader mới được đổi sang trạng thái duyệt hoặc trả sửa." },
          { status: 403 }
        );
      }
      const effectiveType =
        (updateData.taskType as TaskType | undefined) ?? existing.taskType;
      const effectiveIsMedia =
        (updateData.isMediaOrder as boolean | undefined) ?? existing.isMediaOrder;
      if (
        (nextStatus === "DONE" || nextStatus === "PUBLISHED") &&
        user.role !== "LEADER" &&
        taskRequiresLeaderApproval({
          taskType: effectiveType,
          isMediaOrder: effectiveIsMedia,
        }) &&
        existing.status !== "APPROVED_FINAL" &&
        existing.status !== "PUBLISHED"
      ) {
        return NextResponse.json(
          {
            error:
              "Bài Content / Ấn phẩm Ảnh & Video cần gửi Leader duyệt trước khi chuyển sang Hoàn tất / Đã đăng.",
          },
          { status: 400 }
        );
      }
      updateData.status = nextStatus;
      if (nextStatus === "DONE" || nextStatus === "PUBLISHED") {
        const now = new Date();
        updateData.completedAt = now;
        if (existing.dueAt && now > existing.dueAt) {
          updateData.wasLate = true;
        }
      }
    }

    const diffs = buildFieldDiffs(
      existing as unknown as Record<string, unknown>,
      updateData
    );

    const activityAction: ActivityAction =
      action === "PROPOSE_TIMELINE"
        ? "TIMELINE_PROPOSE"
        : action === "APPROVE_TIMELINE"
          ? "TIMELINE_APPROVE"
          : action === "REJECT_TIMELINE"
            ? "TIMELINE_REJECT"
            : diffs.some((d) => d.field === "status")
              ? "STATUS_CHANGE"
              : "UPDATE";

    if (diffs.length > 0 || action || body.newAsset || body.deleteAssetId) {
      const nextTitle =
        typeof updateData.title === "string"
          ? updateData.title
          : existing.title;
      const summary = action
        ? `${user.name} thực hiện ${action} trên "${nextTitle}".`
        : body.newAsset
          ? `${user.name} gắn link ${body.newAsset.label || "tư liệu"} mới.`
          : body.deleteAssetId
            ? `${user.name} gỡ một link đính kèm.`
            : `${user.name} chỉnh sửa ${diffs.map((d) => d.label).join(", ")}.`;

      await recordActivity({
        entityType: "TASK",
        entityId: id,
        taskId: id,
        actorId: user.id,
        action: activityAction,
        summary,
        changes: diffs,
      });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_DETAIL_INCLUDE,
    });

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("Update task error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật công việc." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "1";

  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, code: true, title: true, requesterId: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy công việc." }, { status: 404 });
  }

  const canDelete =
    user.role === "LEADER" ||
    (existing.requesterId === user.id && existing.status === "DRAFT");

  if (!canDelete) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc người tạo bản nháp mới có quyền xóa." },
      { status: 403 }
    );
  }

  if (permanent && user.role === "LEADER") {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true, permanent: true });
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  await recordActivity({
    entityType: "TASK",
    entityId: id,
    taskId: id,
    actorId: user.id,
    action: "SOFT_DELETE",
    summary: `${user.name} đã chuyển "${existing.title}" (${existing.code}) vào Thùng rác.`,
  });

  return NextResponse.json({ ok: true, softDeleted: true });
}
