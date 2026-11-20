import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppSecret } from "@/lib/webpush";
import { evaluateOrderTiming } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import { recordActivity } from "@/lib/activity";
import { TASK_TYPE_META, getProjectCodePrefix } from "@/lib/constants";
import type { TaskType } from "@/generated/prisma/client";

function buildAppsScriptSnippet(endpointUrl: string, secret: string) {
  return `function onFormSubmit(e) {
  var named = e.namedValues || {};
  function pick(keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      var val = named[keys[i]];
      if (val && val[0]) return String(val[0]).trim();
    }
    return fallback || "";
  }

  var payload = {
    senderName: pick(["Họ và tên", "Người yêu cầu", "Name"], "Phòng ban ngoài"),
    senderDepartment: pick(["Phòng ban", "Bộ phận", "Department"], "Đối tác / Ngoài team MKT"),
    senderContact: pick(["Email", "SĐT / Zalo", "Liên hệ"], ""),
    projectSlug: pick(["Dự án", "Mã dự án", "Project"], ""),
    title: pick(["Tên công việc", "Tiêu đề yêu cầu", "Yêu cầu"], "Yêu cầu từ Google Form"),
    description: pick(["Mô tả chi tiết", "Nội dung yêu cầu", "Mô tả"], ""),
    briefUrl: pick(["Link tài liệu / Drive", "Link tham khảo", "Tài liệu"], ""),
    platform: pick(["Kênh đăng", "Nền tảng"], "Fanpage"),
    taskType: pick(["Loại công việc"], "MEDIA_IMAGE"),
    quantity: Number(pick(["Số lượng"], "1")) || 1,
    dueAt: pick(["Deadline mong muốn", "Ngày cần hàng"], "")
  };

  UrlFetchApp.fetch("${endpointUrl}", {
    method: "post",
    contentType: "application/json",
    headers: { "x-intake-secret": "${secret}" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới xem được cấu hình Google Form Intake." },
      { status: 403 }
    );
  }

  const secret = await getOrCreateAppSecret(
    "google_form_intake_secret",
    "INTAKE_SECRET"
  );
  const origin =
    process.env.APP_URL ||
    new URL(request.url).origin ||
    "http://localhost:3000";
  const endpointUrl = `${origin.replace(/\/$/, "")}/api/intake/google-form`;

  return NextResponse.json({
    endpointUrl,
    secret,
    appsScriptSnippet: buildAppsScriptSnippet(endpointUrl, secret),
  });
}

export async function POST(request: Request) {
  try {
    const expectedSecret = await getOrCreateAppSecret(
      "google_form_intake_secret",
      "INTAKE_SECRET"
    );
    const { searchParams } = new URL(request.url);
    const headerSecret = request.headers.get("x-intake-secret") || "";
    const querySecret = searchParams.get("secret") || "";

    let sessionUser = null;
    const secretValid =
      Boolean(expectedSecret) &&
      (headerSecret === expectedSecret || querySecret === expectedSecret);

    if (!secretValid) {
      sessionUser = await getCurrentUser();
      if (!sessionUser || sessionUser.role !== "LEADER") {
        return NextResponse.json(
          { error: "Sai hoặc thiếu x-intake-secret cho Google Form Webhook." },
          { status: 401 }
        );
      }
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Thiếu tiêu đề công việc từ Google Form." },
        { status: 400 }
      );
    }

    const senderName = String(body.senderName ?? "Phòng ban ngoài").trim();
    const senderDepartment = String(
      body.senderDepartment ?? "Phòng ban khác"
    ).trim();
    const senderContact = String(body.senderContact ?? "").trim();
    const briefUrl = String(body.briefUrl ?? "").trim();
    const platform = String(body.platform ?? "Fanpage").trim() || "Fanpage";
    const rawType = String(body.taskType ?? "MEDIA_IMAGE") as TaskType;
    const taskType: TaskType =
      rawType in TASK_TYPE_META ? rawType : "OTHER";

    const dueAtRaw = body.dueAt ? new Date(String(body.dueAt)) : null;
    const dueAt =
      dueAtRaw && !Number.isNaN(dueAtRaw.getTime()) ? dueAtRaw : null;
    const timing = evaluateOrderTiming(dueAt, true);

    // Tìm dự án khớp hoặc tạo/dùng Hải đồ "don-ngoai-team"
    const requestedProjectRef = String(
      body.projectId ?? body.projectSlug ?? ""
    ).trim();

    let project = requestedProjectRef
      ? await prisma.project.findFirst({
          where: {
            isActive: true,
            OR: [
              { id: requestedProjectRef },
              { slug: requestedProjectRef },
              { name: { contains: requestedProjectRef, mode: "insensitive" } },
            ],
          },
        })
      : null;

    if (!project) {
      project = await prisma.project.upsert({
        where: { slug: "don-ngoai-team" },
        update: {},
        create: {
          slug: "don-ngoai-team",
          name: "Đơn Ngoài Team (Google Form)",
          description:
            "Tiếp nhận yêu cầu thiết kế/quay dựng từ phòng ban khác qua Google Form (quy định đặt trước tối thiểu 7 ngày).",
          channelSummary: "Google Form Intake",
          color: "#ea580c",
          kpiNote: "Đặt trước >= 7 ngày làm việc",
        },
      });
    }

    const leader =
      sessionUser ||
      (await prisma.user.findFirst({
        where: { role: "LEADER", isActive: true },
        orderBy: { createdAt: "asc" },
      }));

    if (!leader) {
      return NextResponse.json(
        { error: "Hệ thống chưa có tài khoản Leader tiếp nhận đơn." },
        { status: 500 }
      );
    }

    const prefix = getProjectCodePrefix(project.slug);
    const countInProject = await prisma.task.count({
      where: { projectId: project.id },
    });
    const code = `${prefix}-EXT-${String(countInProject + 1).padStart(
      2,
      "0"
    )}`;

    const fullDesc = [
      `📋 Nguồn: Google Form Ngoài Team MKT`,
      `• Người gửi: ${senderName} (${senderDepartment})`,
      senderContact ? `• Liên hệ: ${senderContact}` : null,
      timing.warningMessage ? `• Cảnh báo thời gian: ${timing.warningMessage}` : null,
      body.description ? `\nNội dung yêu cầu:\n${String(body.description)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const created = await prisma.task.create({
      data: {
        code,
        title: `[Ngoài Team] ${title}`,
        description: fullDesc,
        platform,
        taskType,
        status: "BRIEF_REVIEW",
        priority: timing.isRushOrder ? "URGENT" : "NORMAL",
        isMediaOrder: TASK_TYPE_META[taskType]?.isMediaOrderDefault ?? false,
        quantity: Math.max(1, Number(body.quantity || 1)),
        isRushOrder: timing.isRushOrder,
        isOutsideDepartment: true,
        externalSenderName: senderName,
        externalDepartment: senderDepartment,
        externalContact: senderContact || null,
        dueAt,
        projectId: project.id,
        requesterId: leader.id,
        assets: briefUrl
          ? {
              create: {
                kind: "BRIEF_REF",
                label: `Tài liệu từ ${senderName}`,
                url: briefUrl,
                version: 1,
                createdById: leader.id,
              },
            }
          : undefined,
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
      },
    });

    await recordActivity({
      entityType: "TASK",
      entityId: created.id,
      taskId: created.id,
      actorId: leader.id,
      action: "CREATE",
      summary: `Tiếp nhận đơn Google Form từ ${senderName} (${senderDepartment})${
        timing.isRushOrder ? " — CẢNH BÁO GẤP < 7 NGÀY" : ""
      }.`,
    });

    const allLeaders = await prisma.user.findMany({
      where: { role: "LEADER", isActive: true },
      select: { id: true },
    });

    for (const l of allLeaders) {
      await createNotification({
        userId: l.id,
        type: "EXTERNAL_INTAKE",
        title: `Đơn Google Form mới: ${created.code}`,
        message: `${senderName} (${senderDepartment}) vừa gửi yêu cầu "${title}"${
          timing.warningMessage ? ` • ⚠️ ${timing.warningMessage}` : ""
        }.`,
        linkUrl: "/outputs?readiness=NEEDS_REVIEW",
        sendEmailNow: timing.isRushOrder,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        task: created,
        ruleD7Warning: timing.warningMessage,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Google form intake error:", err);
    return NextResponse.json(
      { error: "Không thể tiếp nhận dữ liệu từ Google Form." },
      { status: 500 }
    );
  }
}
