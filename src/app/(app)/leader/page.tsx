import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";
import { getVnDateString } from "@/lib/dates";
import { computeBirthdayInfo, ensureDailyBirthdayCelebrations } from "@/lib/birthdays";
import { getLeaderLearningOverview } from "@/lib/knowledge-data";
import {
  SIMPLE_PROJECT_SELECT,
  TASK_CARD_INCLUDE,
  sanitizeTasksAssets,
} from "@/lib/task-queries";
import { LeaderDashboard } from "@/components/leader-dashboard";

export default async function LeaderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "LEADER") redirect("/my-work");

  const todayDate = getVnDateString();

  const [
    rawTasks,
    projects,
    users,
    capacity,
    todayCheckins,
    todayLeaves,
    learningOverview,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: [{ scheduledPublishAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      include: TASK_CARD_INCLUDE,
    }),
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: SIMPLE_PROJECT_SELECT,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentScope: true,
        employmentType: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        birthDate: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        isActive: true,
      },
    }),
    getAnonymizedTeamCapacity(),
    prisma.dailyCheckin.findMany({
      where: { checkinDate: todayDate },
      orderBy: { createdAt: "desc" },
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
        task: { select: { id: true, code: true, title: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
      },
      include: { user: { select: { id: true, name: true } } },
    }),
    getLeaderLearningOverview(user.id),
    ensureDailyBirthdayCelebrations().catch(() => {}),
  ]);

  const tasks = sanitizeTasksAssets(rawTasks);

  const { todayBirthdays } = computeBirthdayInfo(users, todayDate);

  return (
    <LeaderDashboard
      initialTasks={tasks}
      projects={projects}
      users={users}
      capacity={capacity}
      todayCheckins={todayCheckins}
      todayLeaves={todayLeaves.map((l) => ({
        userId: l.userId,
        userName: l.user.name,
        leaveType: l.leaveType,
      }))}
      todayBirthdays={todayBirthdays}
      learningOverview={learningOverview}
      currentUserId={user.id}
      todayDate={todayDate}
      leaderTone={user.preferredTone}
      leaderIcon={user.preferredIcon}
    />
  );
}
