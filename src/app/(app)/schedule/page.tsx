import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import {
  computeBirthdayInfo,
  ensureDailyBirthdayCelebrations,
} from "@/lib/birthdays";
import { getVnDateString } from "@/lib/dates";
import { ScheduleHubView } from "@/components/schedule-hub-view";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Tự động gửi thông báo & lời chúc sinh nhật 1 lần/ngày nếu hôm nay có thành viên sinh nhật
  await ensureDailyBirthdayCelebrations().catch(() => {});

  const todayStr = getVnDateString();

  const [leaves, meetings, teamMembers, projects] = await Promise.all([
    prisma.leaveRequest.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 80,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarColor: true,
            pirateCharacter: true,
            departmentScope: true,
          },
        },
        reviewedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.teamMeeting.findMany({
      orderBy: { startAt: "desc" },
      take: 80,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        project: { select: { id: true, slug: true, name: true, color: true } },
        participants: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                title: true,
                avatarColor: true,
                pirateCharacter: true,
                departmentScope: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        departmentScope: true,
        birthDate: true,
      },
    }),
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true, color: true },
    }),
  ]);

  const { todayBirthdays, upcomingBirthdays } = computeBirthdayInfo(
    teamMembers,
    todayStr
  );

  return (
    <ScheduleHubView
      currentUser={user}
      todayStr={todayStr}
      initialLeaves={leaves}
      initialMeetings={meetings}
      teamMembers={teamMembers}
      todayBirthdays={todayBirthdays}
      upcomingBirthdays={upcomingBirthdays}
      projects={projects}
    />
  );
}
