import { prisma } from "@/lib/prisma";
import { getVnDateString } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import type { BirthdayMemberInfo } from "@/types/crm";
import type { DepartmentScope } from "@/generated/prisma/client";

export interface BirthdayCandidate {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  departmentScope: DepartmentScope;
  birthDate?: string | null;
}

export function computeBirthdayInfo(
  users: BirthdayCandidate[],
  todayStr: string = getVnDateString()
): {
  todayBirthdays: BirthdayMemberInfo[];
  upcomingBirthdays: BirthdayMemberInfo[];
} {
  const [tYear, tMonth, tDay] = todayStr.split("-").map(Number);
  const todayUtc = Date.UTC(tYear, tMonth - 1, tDay);

  const todayBirthdays: BirthdayMemberInfo[] = [];
  const upcomingBirthdays: BirthdayMemberInfo[] = [];

  for (const u of users) {
    if (!u.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(u.birthDate)) continue;
    const [bYear, bMonth, bDay] = u.birthDate.split("-").map(Number);
    if (!bMonth || !bDay) continue;

    // Năm hiện tại (hoặc năm sau nếu đã qua)
    let nextUtc = Date.UTC(tYear, bMonth - 1, bDay);
    let targetYear = tYear;
    if (nextUtc < todayUtc) {
      targetYear = tYear + 1;
      nextUtc = Date.UTC(targetYear, bMonth - 1, bDay);
    }

    const daysUntil = Math.round((nextUtc - todayUtc) / (1000 * 60 * 60 * 24));
    const displayDayMonth = `${String(bDay).padStart(2, "0")}/${String(bMonth).padStart(2, "0")}`;
    const turningAge = bYear > 1940 ? targetYear - bYear : null;

    const item: BirthdayMemberInfo = {
      id: u.id,
      name: u.name,
      title: u.title,
      avatarColor: u.avatarColor,
      pirateCharacter: u.pirateCharacter,
      departmentScope: u.departmentScope,
      birthDate: u.birthDate,
      displayDayMonth,
      daysUntil,
      turningAge,
    };

    if (daysUntil === 0) {
      todayBirthdays.push(item);
    } else if (daysUntil <= 45) {
      upcomingBirthdays.push(item);
    }
  }

  upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  return { todayBirthdays, upcomingBirthdays };
}

/**
 * Tự động gửi lời chúc sinh nhật qua Thông báo, Web Push ĐT & Chat chung
 * tối đa 1 lần mỗi ngày (dùng CronRunLog slot BIRTHDAY_WISH để chống lặp).
 */
export async function ensureDailyBirthdayCelebrations(): Promise<void> {
  const todayStr = getVnDateString();

  const existingLog = await prisma.cronRunLog.findUnique({
    where: { slot_runDate: { slot: "BIRTHDAY_WISH", runDate: todayStr } },
  });
  if (existingLog) return;

  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      title: true,
      avatarColor: true,
      pirateCharacter: true,
      departmentScope: true,
      birthDate: true,
    },
  });

  const { todayBirthdays } = computeBirthdayInfo(activeUsers, todayStr);
  if (todayBirthdays.length === 0) return;

  // Khóa slot hôm nay trước khi bắn thông báo (tránh race condition 2 request đồng thời)
  try {
    await prisma.cronRunLog.create({
      data: {
        slot: "BIRTHDAY_WISH",
        runDate: todayStr,
        emailsSent: 0,
        notificationsCreated: activeUsers.length,
        summary: `Chúc mừng sinh nhật: ${todayBirthdays.map((b) => b.name).join(", ")}`,
      },
    });
  } catch {
    return;
  }

  const namesList = todayBirthdays.map((b) => b.name).join(", ");
  const birthdayIds = new Set(todayBirthdays.map((b) => b.id));

  for (const u of activeUsers) {
    const isBirthdayPerson = birthdayIds.has(u.id);
    await createNotification({
      userId: u.id,
      type: "BIRTHDAY",
      title: isBirthdayPerson
        ? `🎂 Chúc mừng sinh nhật bạn ${u.name}!`
        : `🎉 Hôm nay là sinh nhật của ${namesList}!`,
      message: isBirthdayPerson
        ? "Băng Mũ Rơm chúc bạn tuổi mới thật nhiều sức khỏe, năng lượng và bùng nổ KPI!"
        : `Đừng quên gửi lời chúc mừng sinh nhật tới ${namesList} trong Lịch Hoạt Động Băng hoặc Chat nhé!`,
      linkUrl: "/schedule",
    });
  }

  // Thả 1 lời chúc lên kênh chat chung của Băng (nếu có)
  const teamRoom = await prisma.chatRoom.findFirst({
    where: { type: "GROUP", isPinned: true },
    orderBy: { createdAt: "asc" },
  });

  if (teamRoom && todayBirthdays[0]) {
    const organizer = activeUsers.find((u) => !birthdayIds.has(u.id)) || activeUsers[0];
    const wishTags = todayBirthdays.map((b) => `@${b.name}`).join(" ");
    await prisma.chatMessage.create({
      data: {
        roomId: teamRoom.id,
        senderId: organizer.id,
        content: `🎂🎉 HAPPY BIRTHDAY ${wishTags}! Chúc đồng đội hôm nay sinh nhật thật vui vẻ, nhiều niềm vui và luôn cháy hết mình cùng Băng Mũ Rơm! 🏴‍☠️🥳`,
      },
    });
    await prisma.chatRoom.update({
      where: { id: teamRoom.id },
      data: { lastMessageAt: new Date() },
    });
  }
}
