import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { isBuiltInStickerUrl } from "@/lib/chat-stickers";

const COMMENT_AUTHOR_SELECT = {
  id: true,
  name: true,
  role: true,
  avatarColor: true,
  pirateCharacter: true,
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: taskId } = await context.params;
  const allowed = await canAccessTask(user, taskId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Bạn không có quyền xem trao đổi trên công việc này." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const afterParam = searchParams.get("after");
  const afterDate =
    afterParam && !Number.isNaN(new Date(afterParam).getTime())
      ? new Date(afterParam)
      : null;

  const comments = await prisma.taskComment.findMany({
    where: afterDate ? { taskId, createdAt: { gt: afterDate } } : { taskId },
    orderBy: { createdAt: "asc" },
    take: afterDate ? 60 : 120,
    include: {
      author: { select: COMMENT_AUTHOR_SELECT },
    },
  });

  return NextResponse.json({
    incremental: Boolean(afterDate),
    comments,
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      pirateCharacter: user.pirateCharacter,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: taskId } = await context.params;
  const allowed = await canAccessTask(user, taskId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Bạn không có quyền bình luận trên công việc này." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const content = String(body.content ?? "").trim();
  const attachmentUrl = body.attachmentUrl
    ? String(body.attachmentUrl).trim()
    : null;

  if (!content && !attachmentUrl) {
    return NextResponse.json(
      { error: "Nội dung feedback không được để trống." },
      { status: 400 }
    );
  }

  if (content.length > 4000) {
    return NextResponse.json(
      { error: "Nội dung trao đổi tối đa 4.000 ký tự." },
      { status: 400 }
    );
  }

  if (attachmentUrl) {
    const isHttpUrl = /^https?:\/\//i.test(attachmentUrl);
    const isInlineImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(
      attachmentUrl
    );
    const isBuiltInSticker = isBuiltInStickerUrl(attachmentUrl);
    if (!isHttpUrl && !isInlineImage && !isBuiltInSticker) {
      return NextResponse.json(
        { error: "Đính kèm chỉ hỗ trợ link http(s), ảnh tải lên hoặc sticker." },
        { status: 400 }
      );
    }
    if (isInlineImage && attachmentUrl.length > 950_000) {
      return NextResponse.json(
        { error: "Ảnh đính kèm quá lớn (vui lòng chọn ảnh nhẹ hơn ~700KB)." },
        { status: 400 }
      );
    }
  }

  const qcFlags: string[] = Array.isArray(body.qcFlags) ? body.qcFlags : [];
  const isDataImage = Boolean(
    attachmentUrl && /^data:image\//i.test(attachmentUrl)
  );
  const finalContent =
    content ||
    (isDataImage
      ? "🖼️ Đã gửi 1 ảnh minh họa feedback"
      : "📎 Đã gửi 1 liên kết tham khảo");

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: user.id,
      content: finalContent,
      attachmentUrl,
      qcFlagsJson: qcFlags.length > 0 ? qcFlags : undefined,
    },
    include: {
      author: { select: COMMENT_AUTHOR_SELECT },
    },
  });

  // Gửi thông báo & Web Push chạy nền sau khi đã trả HTTP 201 (phản hồi tức thì)
  after(async () => {
    try {
      const [task, priorCommenters, activeUsers] = await Promise.all([
        prisma.task.findUnique({
          where: { id: taskId },
          select: {
            code: true,
            title: true,
            status: true,
            assigneeId: true,
            requesterId: true,
            reviewerId: true,
            project: { select: { slug: true } },
          },
        }),
        prisma.taskComment.findMany({
          where: { taskId },
          distinct: ["authorId"],
          select: { authorId: true },
        }),
        prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, role: true, departmentScope: true },
        }),
      ]);

      if (!task) return;

      const targets = new Set<string>();
      for (const uid of [
        task.assigneeId,
        task.requesterId,
        task.reviewerId,
        ...priorCommenters.map((c) => c.authorId),
      ]) {
        if (uid && uid !== user.id) targets.add(uid);
      }

      // Nếu Member phản hồi trên bài đang chờ duyệt / cần sửa -> báo luôn cho Leader
      if (
        user.role !== "LEADER" &&
        (task.status === "WAITING_APPROVAL" ||
          task.status === "BRIEF_REVIEW" ||
          task.status === "REVISION_NEEDED")
      ) {
        for (const u of activeUsers) {
          if (u.role === "LEADER" && u.id !== user.id) {
            targets.add(u.id);
          }
        }
      }

      // Hỗ trợ @tag thành viên trực tiếp trong feedback
      if (finalContent.includes("@")) {
        const lower = finalContent.toLowerCase();
        for (const u of activeUsers) {
          if (u.id !== user.id && lower.includes(`@${u.name.toLowerCase()}`)) {
            targets.add(u.id);
          }
        }
      }

      const preview =
        finalContent.length > 100
          ? finalContent.slice(0, 100) + "..."
          : finalContent;
      const leaderIds = new Set(
        activeUsers.filter((u) => u.role === "LEADER").map((u) => u.id)
      );
      const mediaProdIds = new Set(
        activeUsers
          .filter(
            (u) =>
              u.role !== "LEADER" &&
              (u.departmentScope === "MEDIA_DESIGN" ||
                u.departmentScope === "MEDIA_VIDEO")
          )
          .map((u) => u.id)
      );

      await Promise.all(
        Array.from(targets).map((tid) => {
          const linkUrl =
            leaderIds.has(tid) &&
            (task.status === "WAITING_APPROVAL" ||
              task.status === "BRIEF_REVIEW" ||
              task.status === "REVISION_NEEDED")
              ? `/outputs?taskId=${taskId}`
              : mediaProdIds.has(tid)
                ? `/my-work?taskId=${taskId}&openChat=1`
                : `/projects/${task.project.slug}?taskId=${taskId}&openChat=1`;

          return createNotification({
            userId: tid,
            type: "CHAT_MESSAGE",
            title: `💬 Feedback mới trên ${task.code}`,
            message: `${user.name}: ${preview}`,
            linkUrl,
            actionLabel: "Mở task & phản hồi",
          });
        })
      );
    } catch (bgErr) {
      console.error("Background task comment notify error:", bgErr);
    }
  });

  return NextResponse.json({ comment }, { status: 201 });
}
