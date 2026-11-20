import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canAccessTask } from "@/lib/permissions";
import { runGeminiOutputQcCheck } from "@/lib/gemini-ai";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";
import type { Prisma, TaskType } from "@/generated/prisma/client";
import type { TaskItem } from "@/types/crm";

interface DraftCheckPayload {
  projectId?: string;
  title?: string;
  caption?: string;
  description?: string;
  platform?: string;
  publishChannel?: string | null;
  contentAngle?: string | null;
  contentPillar?: string | null;
  postFormat?: string | null;
  productLink?: string | null;
  taskType?: TaskType;
  demoAssetUrls?: string[];
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    const customFocus =
      typeof body.customFocus === "string" ? body.customFocus.trim() : "";
    const draft = (body.draft && typeof body.draft === "object"
      ? body.draft
      : undefined) as DraftCheckPayload | undefined;

    const demoAssetUrls = Array.isArray(draft?.demoAssetUrls)
      ? draft.demoAssetUrls
          .map((u) => String(u ?? "").trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    if (taskId) {
      const allowed = await canAccessTask(user, taskId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền kiểm tra đầu việc này." },
          { status: 403 }
        );
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        include: {
          ...TASK_CARD_INCLUDE,
          project: {
            select: {
              ...TASK_CARD_INCLUDE.project.select,
              description: true,
            },
          },
        },
      });

      if (!task) {
        return NextResponse.json(
          { error: "Không tìm thấy đầu việc hoặc đã bị xóa." },
          { status: 404 }
        );
      }

      // Cho phép kiểm tra bản nháp đang sửa dở trong popup Nội dung chi tiết (nếu truyền draft)
      const mergedTask: TaskItem = {
        ...(task as unknown as TaskItem),
        title:
          typeof draft?.title === "string" && draft.title.trim()
            ? draft.title.trim()
            : task.title,
        caption:
          draft?.caption !== undefined ? draft.caption : task.caption,
        description:
          draft?.description !== undefined
            ? draft.description
            : task.description,
        platform:
          typeof draft?.platform === "string" && draft.platform.trim()
            ? draft.platform
            : task.platform,
        publishChannel:
          draft?.publishChannel !== undefined
            ? draft.publishChannel
            : task.publishChannel,
        contentAngle:
          draft?.contentAngle !== undefined
            ? draft.contentAngle
            : task.contentAngle,
        contentPillar:
          draft?.contentPillar !== undefined
            ? draft.contentPillar
            : task.contentPillar,
        postFormat:
          draft?.postFormat !== undefined
            ? draft.postFormat
            : task.postFormat,
        productLink:
          draft?.productLink !== undefined
            ? draft.productLink
            : task.productLink,
      };

      const checkResult = await runGeminiOutputQcCheck(mergedTask, {
        customFocus,
        projectDescription: task.project.description,
        extraImageUrls: demoAssetUrls,
        viewerRole: user.role,
      });

      // Lưu kết quả AI QC gần nhất trực tiếp vào Task (loại bỏ standardsNames để bảo mật tài liệu Leader)
      const persistedPayload = {
        result: checkResult.result,
        meta: {
          ...checkResult.meta,
          standardsNames: undefined,
        },
      };
      const checkedAtDate = new Date(checkResult.meta.checkedAt || Date.now());
      await prisma.task.update({
        where: { id: task.id },
        data: {
          lastAiQcJson: persistedPayload as unknown as Prisma.InputJsonValue,
          lastAiQcAt: Number.isNaN(checkedAtDate.getTime()) ? new Date() : checkedAtDate,
        },
      });

      return NextResponse.json(checkResult);
    }

    // Kiểm tra bài viết mới chưa lưu từ khung soạn thảo Nội dung chi tiết
    const projectId =
      typeof draft?.projectId === "string" ? draft.projectId.trim() : "";
    if (!projectId) {
      return NextResponse.json(
        { error: "Thiếu mã đầu việc (taskId) hoặc mã dự án (projectId)." },
        { status: 400 }
      );
    }

    const projectAllowed = await canAccessProject(user, projectId);
    if (!projectAllowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền kiểm tra nội dung trong dự án này." },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        name: true,
        color: true,
        description: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Không tìm thấy dự án." },
        { status: 404 }
      );
    }

    const draftTask: TaskItem = {
      id: "draft-preview",
      code: "NHAP-MOI",
      title: (draft?.title || "").trim() || "Bài viết nháp chưa lưu",
      description: draft?.description || null,
      caption: draft?.caption || null,
      platform: draft?.platform || "Fanpage",
      publishChannel: draft?.publishChannel || null,
      taskType: draft?.taskType || "CONTENT_SOCIAL",
      status: "DRAFT",
      priority: "NORMAL",
      isMediaOrder: false,
      quantity: 1,
      isRushOrder: false,
      isOutsideDepartment: false,
      revisionCount: 0,
      maxRevisions: 3,
      scheduledPublishAt: null,
      dueAt: null,
      submittedAt: null,
      approvedAt: null,
      completedAt: null,
      wasLate: false,
      contentPillar: draft?.contentPillar || null,
      contentAngle: draft?.contentAngle || null,
      postFormat: draft?.postFormat || null,
      productLink: draft?.productLink || null,
      isAired: false,
      createdAt: new Date().toISOString(),
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        color: project.color,
      },
      assignee: {
        id: user.id,
        name: user.name,
        title: user.title,
        avatarColor: user.avatarColor,
        pirateCharacter: user.pirateCharacter,
        departmentScope: user.departmentScope,
      },
      requester: {
        id: user.id,
        name: user.name,
        title: user.title,
        avatarColor: user.avatarColor,
        pirateCharacter: user.pirateCharacter,
      },
      assets: [],
    };

    const checkResult = await runGeminiOutputQcCheck(draftTask, {
      customFocus,
      projectDescription: project.description,
      extraImageUrls: demoAssetUrls,
      viewerRole: user.role,
    });

    return NextResponse.json(checkResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể chạy AI Check QC.";
    const isConfigMissing = message.includes("Chưa cấu hình Google Gemini API Key");
    return NextResponse.json(
      { error: message },
      { status: isConfigMissing ? 400 : 500 }
    );
  }
}
