import { prisma } from "@/lib/prisma";
import { sendMktEmail } from "@/lib/mailer";
import { sendWebPushToUser } from "@/lib/webpush";
import { ensureDailyBirthdayCelebrations } from "@/lib/birthdays";
import { dispatchDueChatReminders } from "@/lib/chat";
import { getVnClock, getVnDayBounds, formatVnDateTime } from "@/lib/dates";

export type ReminderSlot =
  | "MORNING_CHECKIN"
  | "WEEKLY_PLAN"
  | "AFTERNOON_SUBMIT"
  | "LEADER_REVIEW"
  | "EVENING_HANDOVER";

/** Xác định khung giờ nhắc lịch phù hợp dựa theo giờ Việt Nam hiện tại. */
export function resolveSlotFromVnClock(now: Date = new Date()): ReminderSlot {
  const { hour, minute, dayOfWeek } = getVnClock(now);
  const totalMinutes = hour * 60 + minute;

  if (dayOfWeek === 5 && totalMinutes >= 11 * 60 + 30 && totalMinutes < 14 * 60) {
    return "WEEKLY_PLAN";
  }
  if (totalMinutes < 12 * 60) return "MORNING_CHECKIN";
  if (totalMinutes < 15 * 60 + 30) return "AFTERNOON_SUBMIT";
  if (totalMinutes < 17 * 60) return "LEADER_REVIEW";
  return "EVENING_HANDOVER";
}

export async function runScheduledReminder(
  requestedSlot?: ReminderSlot,
  options: { force?: boolean } = {}
) {
  const now = new Date();
  await dispatchDueChatReminders(true).catch(() => 0);
  const { dateStr, dayOfWeek } = getVnClock(now);
  const slot = requestedSlot ?? resolveSlotFromVnClock(now);

  if (!options.force) {
    const existing = await prisma.cronRunLog.findUnique({
      where: { slot_runDate: { slot, runDate: dateStr } },
    });
    if (existing) {
      return {
        skipped: true,
        reason: `Slot ${slot} đã chạy trong ngày ${dateStr}.`,
        slot,
        runDate: dateStr,
      };
    }
  }

  const { end: todayEnd } = getVnDayBounds(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { end: tomorrowEnd } = getVnDayBounds(tomorrow);

  let notificationsCreated = 0;
  let emailsSent = 0;
  const details: string[] = [];

  const members = await prisma.user.findMany({
    where: { isActive: true, role: "MEMBER" },
    select: { id: true, name: true, email: true, departmentScope: true },
  });

  const leaders = await prisma.user.findMany({
    where: { isActive: true, role: "LEADER" },
    select: { id: true, name: true, email: true },
  });

  if (slot === "MORNING_CHECKIN") {
    await ensureDailyBirthdayCelebrations().catch(() => {});
    // 09:00 hàng ngày: nhắc từng nhân sự check-in các đầu việc đến hạn hôm nay / ngày mai
    for (const member of members) {
      const dueTasks = await prisma.task.findMany({
        where: {
          deletedAt: null,
          AND: [
            {
              OR: [
                { assigneeId: member.id },
                { assignees: { some: { userId: member.id } } },
              ],
            },
            {
              OR: [
                { dueAt: { lte: tomorrowEnd } },
                { scheduledPublishAt: { lte: tomorrowEnd } },
              ],
            },
          ],
          status: { notIn: ["DRAFT", "PUBLISHED", "DONE"] },
        },
        include: { project: { select: { name: true } } },
        orderBy: { dueAt: "asc" },
      });

      const taskSummary =
        dueTasks.length > 0
          ? dueTasks
              .slice(0, 5)
              .map(
                (t) =>
                  `• [${t.project.name}] ${t.title} (Hạn: ${formatVnDateTime(t.dueAt ?? t.scheduledPublishAt)})`
              )
          : ["• Hôm nay chưa có đầu việc gấp đến hạn, hãy vào xác nhận Check-in sáng."];

      const mailRes = await sendMktEmail({
        to: member.email,
        subject: `[09:00 Check-in] Bạn có ${dueTasks.length} đầu việc cần chú ý hôm nay`,
        title: "Nhắc Check-in đầu ngày (09:00)",
        bodyLines: [
          `Chào ${member.name}, dưới đây là các công việc của bạn hôm nay / sắp đến hạn:`,
          ...taskSummary,
          "Vui lòng bấm nút bên dưới để Check-in 'Đúng tiến độ' hoặc báo 'Có nguy cơ trễ' thay cho báo cáo thủ công.",
        ],
        actionLabel: "Check-in ngay trên MKT Hub",
        actionUrl: "/my-work",
      });

      await prisma.notification.create({
        data: {
          userId: member.id,
          type: "REMINDER",
          title: "09:00 — Check-in tiến độ đầu ngày",
          message: `Bạn có ${dueTasks.length} đầu việc cần kiểm tra tiến độ hôm nay.`,
          linkUrl: "/my-work",
          emailSent: mailRes.sent,
          emailError: mailRes.error,
        },
      });
      await sendWebPushToUser(member.id, {
        title: "09:00 — Check-in tiến độ đầu ngày",
        body: `Bạn có ${dueTasks.length} đầu việc cần kiểm tra tiến độ hôm nay.`,
        url: "/my-work",
      });
      notificationsCreated++;
      if (mailRes.sent) emailsSent++;
    }
    details.push(`Đã nhắc Check-in sáng cho ${members.length} nhân sự.`);
  } else if (slot === "AFTERNOON_SUBMIT") {
    // 15:00 hàng ngày: nhắc Content kiểm tra và đẩy bài đăng ngày mai vào hàng đợi Leader duyệt
    const pendingContent = await prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: ["IN_PROGRESS", "REVISION_NEEDED", "DRAFT"] },
        scheduledPublishAt: { lte: tomorrowEnd },
        OR: [{ assigneeId: { not: null } }, { assignees: { some: {} } }],
      },
      include: {
        project: { select: { name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const byUser = new Map<
      string,
      { user: { id: string; name: string; email: string }; tasks: typeof pendingContent }
    >();
    for (const task of pendingContent) {
      const assignedUsers = new Map<string, { id: string; name: string; email: string }>();
      if (task.assignee) assignedUsers.set(task.assignee.id, task.assignee);
      for (const a of task.assignees) assignedUsers.set(a.user.id, a.user);
      for (const u of assignedUsers.values()) {
        const entry = byUser.get(u.id) ?? { user: u, tasks: [] };
        entry.tasks.push(task);
        byUser.set(u.id, entry);
      }
    }

    for (const [, { user, tasks: userTasks }] of byUser) {
      const mailRes = await sendMktEmail({
        to: user.email,
        subject: `[15:00 Nộp duyệt] Còn ${userTasks.length} bài sắp đăng chưa gửi Leader duyệt`,
        title: "Nhắc nộp ấn phẩm chờ Leader duyệt (15:00)",
        bodyLines: [
          `Chào ${user.name}, bạn có ${userTasks.length} đầu việc có lịch đăng hôm nay/ngày mai nhưng chưa ở trạng thái Chờ duyệt:`,
          ...userTasks
            .slice(0, 6)
            .map((t) => `• [${t.project.name}] ${t.title} — ${t.platform}`),
          "Hãy cập nhật Caption + Link Drive/Canva và chuyển trạng thái sang 'Chờ Leader duyệt' trước 16:00.",
        ],
        actionLabel: "Mở việc của tôi",
        actionUrl: "/my-work",
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "REMINDER",
          title: "15:00 — Nộp ấn phẩm ngày mai để Leader duyệt",
          message: `Còn ${userTasks.length} bài cần gửi duyệt trước khung 16:00.`,
          linkUrl: "/my-work",
          emailSent: mailRes.sent,
          emailError: mailRes.error,
        },
      });
      await sendWebPushToUser(user.id, {
        title: "15:00 — Nộp ấn phẩm ngày mai",
        body: `Còn ${userTasks.length} bài cần gửi Leader duyệt trước 16:00.`,
        url: "/my-work",
      });
      notificationsCreated++;
      if (mailRes.sent) emailsSent++;
    }
    details.push(`Nhắc nộp bài 15:00 cho ${byUser.size} nhân sự.`);
  } else if (slot === "LEADER_REVIEW") {
    // 16:00 hàng ngày: tổng hợp hàng đợi chờ duyệt gửi cho Leader
    const waitingTasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: ["WAITING_APPROVAL", "BRIEF_REVIEW"] },
      },
      include: {
        project: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
        assignees: {
          orderBy: { assignedAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { scheduledPublishAt: "asc" },
    });

    for (const leader of leaders) {
      const lines =
        waitingTasks.length > 0
          ? waitingTasks
              .slice(0, 10)
              .map((t) => {
                const names = new Map<string, string>();
                for (const a of t.assignees) names.set(a.user.id, a.user.name);
                if (t.assignee) names.set(t.assignee.id, t.assignee.name);
                const picLabel =
                  names.size > 0 ? [...names.values()].join(", ") : "Chưa gán";
                return `• [${t.project.name}] ${t.title} (${picLabel})`;
              })
          : ["• Hiện không có ấn phẩm hay brief nào tồn đọng chờ duyệt."];

      const mailRes = await sendMktEmail({
        to: leader.email,
        subject: `[16:00 Leader Duyệt] ${waitingTasks.length} ấn phẩm/brief đang chờ phản hồi`,
        title: "Hàng đợi Duyệt bài & Brief (16:00)",
        bodyLines: [
          `Chào ${leader.name}, hiện có ${waitingTasks.length} mục đang chờ bạn duyệt:`,
          ...lines,
        ],
        actionLabel: "Mở Hàng đợi Duyệt bài",
        actionUrl: "/outputs?readiness=NEEDS_REVIEW",
      });

      await prisma.notification.create({
        data: {
          userId: leader.id,
          type: "REMINDER",
          title: "16:00 — Hàng đợi duyệt ấn phẩm",
          message: `Có ${waitingTasks.length} ấn phẩm/brief đang chờ Leader phản hồi.`,
          linkUrl: "/outputs?readiness=NEEDS_REVIEW",
          emailSent: mailRes.sent,
          emailError: mailRes.error,
        },
      });
      await sendWebPushToUser(leader.id, {
        title: "16:00 — Hàng đợi duyệt ấn phẩm",
        body: `Có ${waitingTasks.length} ấn phẩm/brief đang chờ Leader duyệt.`,
        url: "/outputs?readiness=NEEDS_REVIEW",
      });
      notificationsCreated++;
      if (mailRes.sent) emailsSent++;
    }
    details.push(`Đã gửi tổng hợp duyệt 16:00 (${waitingTasks.length} mục) cho Leader.`);
  } else if (slot === "EVENING_HANDOVER") {
    // 17:30 hàng ngày: nhắc Media bàn giao đơn hạn hôm nay & nhắc T6 tổng kết tuần
    const dueMediaToday = await prisma.task.findMany({
      where: {
        deletedAt: null,
        isMediaOrder: true,
        status: { in: ["IN_PROGRESS", "REVISION_NEEDED"] },
        dueAt: { lte: todayEnd },
        OR: [{ assigneeId: { not: null } }, { assignees: { some: {} } }],
      },
      include: {
        project: { select: { name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const byMedia = new Map<
      string,
      { user: { id: string; name: string; email: string }; tasks: typeof dueMediaToday }
    >();
    for (const t of dueMediaToday) {
      const assignedUsers = new Map<string, { id: string; name: string; email: string }>();
      if (t.assignee) assignedUsers.set(t.assignee.id, t.assignee);
      for (const a of t.assignees) assignedUsers.set(a.user.id, a.user);
      for (const u of assignedUsers.values()) {
        const entry = byMedia.get(u.id) ?? { user: u, tasks: [] };
        entry.tasks.push(t);
        byMedia.set(u.id, entry);
      }
    }

    for (const [, { user, tasks: list }] of byMedia) {
      const mailRes = await sendMktEmail({
        to: user.email,
        subject: `[17:30 Bàn giao Media] Còn ${list.length} order đến hạn hôm nay`,
        title: "Nhắc bàn giao ấn phẩm cuối ngày (17:30)",
        bodyLines: [
          `Chào ${user.name}, vui lòng gắn link Demo/Final lên thẻ công việc cho ${list.length} order sau:`,
          ...list.map((t) => `• [${t.project.name}] ${t.title}`),
        ],
        actionLabel: "Cập nhật Link bàn giao",
        actionUrl: "/my-work",
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "REMINDER",
          title: "17:30 — Bàn giao ấn phẩm cuối ngày",
          message: `Còn ${list.length} order Media đến hạn hôm nay cần gắn link.`,
          linkUrl: "/my-work",
          emailSent: mailRes.sent,
          emailError: mailRes.error,
        },
      });
      await sendWebPushToUser(user.id, {
        title: "17:30 — Bàn giao ấn phẩm cuối ngày",
        body: `Còn ${list.length} order Media đến hạn hôm nay cần gắn link.`,
        url: "/my-work",
      });
      notificationsCreated++;
      if (mailRes.sent) emailsSent++;
    }

    // Nếu là Thứ 6 -> nhắc thêm cả team hoàn thiện Báo cáo Tuần
    if (dayOfWeek === 5) {
      for (const leader of leaders) {
        await prisma.notification.create({
          data: {
            userId: leader.id,
            type: "REMINDER",
            title: "Tổng kết Weekly Operations (Thứ 6)",
            message: "Đã đến giờ tổng kết tiến độ tuần & vướng mắc của các dự án.",
            linkUrl: "/reports",
          },
        });
        await sendWebPushToUser(leader.id, {
          title: "Tổng kết Weekly Operations (Thứ 6)",
          body: "Đã đến giờ tổng kết tiến độ tuần & số liệu Fanpage.",
          url: "/reports",
        });
        notificationsCreated++;
      }
    }

    details.push(`Đã kiểm tra bàn giao cuối ngày (${dueMediaToday.length} order chưa nộp).`);
  } else if (slot === "WEEKLY_PLAN") {
    // 12:00 Thứ 6: nhắc Content lên Plan tuần sau & đặt Order trước 2 ngày
    for (const member of members) {
      if (!member.departmentScope.startsWith("CONTENT")) continue;
      const mailRes = await sendMktEmail({
        to: member.email,
        subject: "[Thứ 6 - 12:00] Nhắc chốt Plan Content tuần tới & Brief Order Media",
        title: "Chốt kế hoạch tuần mới (Thứ 6)",
        bodyLines: [
          `Chào ${member.name}, hôm nay là Thứ 6 — vui lòng cập nhật các task/bài đăng tuần tới vào dự án để Leader duyệt trước 16:00 và đặt Brief cho Media (trước ít nhất 2 ngày, tránh T7/CN).`,
        ],
        actionLabel: "Mở Báo cáo & Kế hoạch tuần",
        actionUrl: "/reports",
      });

      await prisma.notification.create({
        data: {
          userId: member.id,
          type: "REMINDER",
          title: "Thứ 6 — Chốt Plan tuần sau",
          message: "Cập nhật kế hoạch tuần tới và tạo Brief Order trước 16:00.",
          linkUrl: "/reports",
          emailSent: mailRes.sent,
          emailError: mailRes.error,
        },
      });
      await sendWebPushToUser(member.id, {
        title: "Thứ 6 — Chốt Plan tuần sau",
        body: "Cập nhật kế hoạch tuần tới và tạo Brief Order trước 16:00.",
        url: "/reports",
      });
      notificationsCreated++;
      if (mailRes.sent) emailsSent++;
    }
    details.push("Đã gửi nhắc chốt Plan Thứ 6 cho nhóm Content.");
  }

  const summary = details.join(" ") || `Hoàn tất slot ${slot}`;

  await prisma.cronRunLog.upsert({
    where: { slot_runDate: { slot, runDate: dateStr } },
    update: { emailsSent, notificationsCreated, summary },
    create: { slot, runDate: dateStr, emailsSent, notificationsCreated, summary },
  });

  return {
    skipped: false,
    slot,
    runDate: dateStr,
    notificationsCreated,
    emailsSent,
    summary,
  };
}
