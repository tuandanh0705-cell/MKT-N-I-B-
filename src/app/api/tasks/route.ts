import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildTaskVisibilityWhere,
  canAccessProject,
} from "@/lib/permissions";
import { evaluateOrderTiming } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import { recordActivity } from "@/lib/activity";
import { TASK_TYPE_META, getProjectCodePrefix } from "@/lib/constants";
import { normalizeSubtasks } from "@/lib/subtasks";
import { normalizeMediaBriefItems } from "@/lib/media-brief";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";
import { parseAssigneeIdsFromBody } from "@/lib/task-assignees";
import type { AssetKind, Prisma, TaskPriority, TaskStatus, TaskType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || undefined;
  const status = searchParams.get("status") as TaskStatus | null;
  const assigneeId = searchParams.get("assigneeId") || undefined;
  const onlyMine = searchParams.get("onlyMine") === "1";
  const waitingReview = searchParams.get("waitingReview") === "1";

  const extraFilters: Prisma.TaskWhereInput[] = [];
  if (status) extraFilters.push({ status });
  if (assigneeId && user.role === "LEADER") {
    extraFilters.push({
      OR: [{ assigneeId }, { assignees: { some: { userId: assigneeId } } }],
    });
  }
  if (onlyMine) {
    extraFilters.push({
      OR: [
        { assigneeId: user.id },
        { assignees: { some: { userId: user.id } } },
        { requesterId: user.id },
      ],
    });
  }
  if (waitingReview) {
    extraFilters.push({
      status: { in: ["WAITING_APPROVAL", "BRIEF_REVIEW"] },
    });
  }

  const tasks = await prisma.task.findMany({
    where: {
      AND: [buildTaskVisibilityWhere(user, projectId), ...extraFilters],
    },
    orderBy: [{ scheduledPublishAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: TASK_CARD_INCLUDE,
  });

  return NextResponse.json({ tasks });
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

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Vui lòng chọn dự án và nhập tiêu đề công việc." },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(user, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo việc trong dự án này." },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án." }, { status: 404 });
    }

    const taskType = (body.taskType as TaskType) || "CONTENT_SOCIAL";
    const isMediaOrder =
      typeof body.isMediaOrder === "boolean"
        ? body.isMediaOrder
        : TASK_TYPE_META[taskType]?.isMediaOrderDefault ?? false;
    const isOutsideDepartment = Boolean(body.isOutsideDepartment);
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    const scheduledPublishAt = body.scheduledPublishAt
      ? new Date(body.scheduledPublishAt)
      : null;

    const timing = evaluateOrderTiming(dueAt, isOutsideDepartment);

    // Sinh mã code ngắn theo prefix dự án (vd: OAI-04, INP-04, LIV-04)
    const prefix = getProjectCodePrefix(project.slug);
    const countInProject = await prisma.task.count({ where: { projectId } });
    const code = `${prefix}-${String(countInProject + 1).padStart(2, "0")}-${Math.floor(
      10 + Math.random() * 89
    )}`;

    const initialStatus: TaskStatus =
      body.status &&
      ["DRAFT", "BRIEF_REVIEW", "IN_PROGRESS", "WAITING_APPROVAL"].includes(
        String(body.status)
      )
        ? (body.status as TaskStatus)
        : "IN_PROGRESS";

    const rawPlannedDate =
      typeof body.plannedDate === "string" ? body.plannedDate.trim() : "";
    const plannedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawPlannedDate)
      ? rawPlannedDate
      : null;

    const parsedAssigneeIds = parseAssigneeIdsFromBody(body) ?? [];
    const assigneeId = parsedAssigneeIds[0] ?? null;
    let parentTaskId: string | null = null;
    if (body.parentTaskId) {
      const parentCheck = await prisma.task.findFirst({
        where: {
          id: String(body.parentTaskId),
          projectId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (parentCheck) {
        parentTaskId = parentCheck.id;
      }
    }
    const briefLinkUrl = body.briefLinkUrl ? String(body.briefLinkUrl).trim() : "";
    const validAssetKinds = new Set<AssetKind>([
      "BRIEF_REF",
      "DEMO",
      "FINAL",
      "PUBLISHED_LINK",
    ]);
    const requestedBriefKind = validAssetKinds.has(body.briefLinkKind as AssetKind)
      ? (body.briefLinkKind as AssetKind)
      : "BRIEF_REF";

    const initialAssetsToCreate: Array<{
      kind: AssetKind;
      label: string;
      url: string;
      version: number;
      createdById: string;
    }> = [];
    const seenInitialUrls = new Set<string>();
    const kindCounters = new Map<AssetKind, number>();

    const pushInitialAsset = (
      rawUrl: string,
      kind: AssetKind,
      rawLabel?: string
    ) => {
      const cleanedUrl = rawUrl.trim();
      if (!cleanedUrl || seenInitialUrls.has(cleanedUrl)) return;
      if (cleanedUrl.startsWith("data:image/") && cleanedUrl.length > 650_000) {
        return;
      }
      seenInitialUrls.add(cleanedUrl);
      const nextVer = (kindCounters.get(kind) ?? 0) + 1;
      kindCounters.set(kind, nextVer);
      initialAssetsToCreate.push({
        kind,
        label:
          rawLabel?.trim() ||
          (kind === "DEMO"
            ? "Ảnh / Thành phẩm bài viết"
            : kind === "FINAL"
              ? `Link Final v${nextVer}`
              : kind === "PUBLISHED_LINK"
                ? "Link bài đã đăng"
                : "Brief & Tư liệu đính kèm"),
        url: cleanedUrl,
        version: nextVer,
        createdById: user.id,
      });
    };

    if (Array.isArray(body.initialAssets)) {
      for (const item of body.initialAssets.slice(0, 10)) {
        if (!item || typeof item !== "object") continue;
        const obj = item as { kind?: unknown; label?: unknown; url?: unknown };
        const url = typeof obj.url === "string" ? obj.url : "";
        const kind = validAssetKinds.has(obj.kind as AssetKind)
          ? (obj.kind as AssetKind)
          : "DEMO";
        const label = typeof obj.label === "string" ? obj.label : undefined;
        pushInitialAsset(url, kind, label);
      }
    }
    if (briefLinkUrl) {
      pushInitialAsset(
        briefLinkUrl,
        requestedBriefKind,
        body.briefLinkLabel ? String(body.briefLinkLabel) : undefined
      );
    }
    const mediaDueAt = body.mediaDueAt ? new Date(body.mediaDueAt) : null;
    const productLink = body.productLink ? String(body.productLink).trim() : null;
    const postFormat = body.postFormat ? String(body.postFormat).trim() : null;
    const isAired = Boolean(body.isAired);
    const matrixIdeaId = body.matrixIdeaId ? String(body.matrixIdeaId).trim() : null;
    const proposedBriefDueAt = body.proposedBriefDueAt
      ? new Date(body.proposedBriefDueAt)
      : dueAt;
    const proposedPublishAt = body.proposedPublishAt
      ? new Date(body.proposedPublishAt)
      : scheduledPublishAt;
    const normalizedMediaBriefItems = body.mediaBriefItemsJson
      ? normalizeMediaBriefItems(body.mediaBriefItemsJson)
      : [];
    const effectiveQuantity =
      normalizedMediaBriefItems.length > 0
        ? normalizedMediaBriefItems.length
        : Math.max(1, Number(body.quantity || 1));

    const minSortAgg = await prisma.task.aggregate({
      where: { projectId, deletedAt: null },
      _min: { sortOrder: true },
    });
    const nextTopSortOrder = (minSortAgg._min.sortOrder ?? 0) - 1;

    const created = await prisma.task.create({
      data: {
        code,
        title,
        sortOrder: nextTopSortOrder,
        description: body.description ? String(body.description) : null,
        caption: body.caption ? String(body.caption) : null,
        platform: body.platform ? String(body.platform) : "Fanpage",
        publishChannel: body.publishChannel
          ? String(body.publishChannel).trim()
          : null,
        taskType,
        status: initialStatus,
        submittedAt: initialStatus === "WAITING_APPROVAL" ? new Date() : null,
        priority: ((body.priority as TaskPriority) || (timing.isRushOrder ? "URGENT" : "NORMAL")),
        isMediaOrder,
        quantity: effectiveQuantity,
        isRushOrder: timing.isRushOrder,
        isOutsideDepartment,
        contentPillar: body.contentPillar ? String(body.contentPillar) : null,
        campaignWeek: body.campaignWeek ? Number(body.campaignWeek) : null,
        contentAngle: body.contentAngle ? String(body.contentAngle) : null,
        postFormat,
        mediaDueAt,
        productLink,
        isAired,
        matrixIdeaId,
        fbPostLayout: body.fbPostLayout ? String(body.fbPostLayout) : "SINGLE_SQUARE",
        subtasksJson: body.subtasksJson
          ? (normalizeSubtasks(body.subtasksJson) as unknown as Prisma.InputJsonValue)
          : undefined,
        mediaBriefItemsJson:
          normalizedMediaBriefItems.length > 0
            ? (normalizedMediaBriefItems as unknown as Prisma.InputJsonValue)
            : undefined,
        proposedBriefDueAt,
        proposedPublishAt,
        timelineNote: body.timelineNote ? String(body.timelineNote) : null,
        dueAt,
        plannedDate,
        scheduledPublishAt,
        projectId,
        requesterId: user.id,
        assigneeId,
        assignees:
          parsedAssigneeIds.length > 0
            ? {
                create: parsedAssigneeIds.map((uid) => ({ userId: uid })),
              }
            : undefined,
        parentTaskId,
        assets:
          initialAssetsToCreate.length > 0
            ? {
                create: initialAssetsToCreate,
              }
            : undefined,
      },
      include: TASK_CARD_INCLUDE,
    });

    await recordActivity({
      entityType: "TASK",
      entityId: created.id,
      taskId: created.id,
      actorId: user.id,
      action: "CREATE",
      summary: `${user.name} đã tạo đầu việc "${created.title}" (${created.code}) trong ${project.name}.`,
    });

    // Thông báo cho tất cả người được giao việc (mở thẳng tới thẻ việc trong Nhật Ký Hải Trình)
    const assignedSet = new Set(parsedAssigneeIds);
    for (const targetUid of assignedSet) {
      if (targetUid === user.id) continue;
      await createNotification({
        userId: targetUid,
        type: "TASK_ASSIGNED",
        title: `${isMediaOrder ? "📦 Order Media mới" : "📋 Việc mới được giao"}: ${created.code}`,
        message: `${user.name} vừa giao "${created.title}" (Dự án: ${project.name})${
          assignedSet.size > 1 ? ` • Cùng thực hiện: ${assignedSet.size} người` : ""
        }${timing.warningMessage ? ` • Lưu ý: ${timing.warningMessage}` : ""}.`,
        linkUrl: `/my-work?taskId=${created.id}`,
        sendEmailNow: created.priority === "URGENT" || isMediaOrder,
        actionLabel: "Mở việc & xếp lịch làm",
      });
    }

    // Nếu là Đơn ngoài team hoặc Order gấp do Member tạo -> thông báo Leader nắm tình hình ngay
    if (
      user.role !== "LEADER" &&
      initialStatus === "IN_PROGRESS" &&
      (isOutsideDepartment || timing.isRushOrder)
    ) {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        if (leader.id === user.id || assignedSet.has(leader.id)) continue;
        await createNotification({
          userId: leader.id,
          type: "TASK_ASSIGNED",
          title: `${isOutsideDepartment ? "📋 Đơn Ngoài Team mới" : "⚡ Order gấp mới"}: ${created.code}`,
          message: `${user.name} tạo "${created.title}" (${project.name}) • Đã chuyển thẳng sang Đang làm.`,
          linkUrl: `/projects/${project.slug}?taskId=${created.id}`,
          actionLabel: "Xem chi tiết",
        });
      }
    }

    // Nếu là Brief hoặc Bài viết gửi thẳng lên chờ Leader duyệt -> báo ngay cho Leader
    if (initialStatus === "BRIEF_REVIEW" || initialStatus === "WAITING_APPROVAL") {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      const isContentSubmit = initialStatus === "WAITING_APPROVAL";
      const notifyUrl = body.notifyUrl
        ? String(body.notifyUrl)
        : isContentSubmit
          ? `/projects/${project.slug}?tab=CONTENT_CALENDAR&taskId=${created.id}`
          : "/outputs?readiness=NEEDS_REVIEW";
      for (const leader of leaders) {
        if (leader.id === user.id) continue;
        await createNotification({
          userId: leader.id,
          type: "REVIEW_REQUESTED",
          title: isContentSubmit
            ? `Bài viết mới chờ duyệt: ${created.code}`
            : `Duyệt Brief mới: ${created.code}`,
          message: isContentSubmit
            ? `${user.name} vừa viết xong "${created.title}" (${project.name}) và gửi Leader duyệt.`
            : `${user.name} đã tạo Brief "${created.title}" (${project.name}) chờ Leader duyệt trước khi sản xuất.`,
          linkUrl: notifyUrl,
          sendEmailNow: timing.isRushOrder,
          actionLabel: isContentSubmit ? "Mở bài viết duyệt ngay" : "Mở Hàng đợi Duyệt",
        });
      }
    }

    return NextResponse.json(
      { task: created, warning: timing.warningMessage },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json(
      { error: "Không thể tạo công việc mới." },
      { status: 500 }
    );
  }
}
