import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";
import { getVnDateString } from "@/lib/dates";
import { computeBirthdayInfo, ensureDailyBirthdayCelebrations } from "@/lib/birthdays";
import { resolveEffectiveDailyKpi } from "@/lib/daily-kpi";
import { getUserPendingMandatoryCourses } from "@/lib/knowledge-data";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";
import { MyWorkView } from "@/components/my-work-view";

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string; openChat?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const todayDate = getVnDateString();
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { userId: user.id, status: "APPROVED" },
    select: { startDate: true, endDate: true, leaveType: true },
  });

  await ensureDailyBirthdayCelebrations().catch(() => {});

  const isMediaProduction = isMediaProductionUser(
    user.role,
    user.departmentScope
  );

  const [tasks, projects, users, capacity, initialCheckin, pendingCourses] =
    await Promise.all([
    prisma.task.findMany({
      where: isMediaProduction
        ? {
            deletedAt: null,
            dailyKpiKey: null,
            assigneeId: user.id,
          }
        : {
            deletedAt: null,
            OR: [{ assigneeId: user.id }, { requesterId: user.id }],
          },
      orderBy: [{ dueAt: "asc" }, { scheduledPublishAt: "asc" }, { createdAt: "desc" }],
      include: TASK_CARD_INCLUDE,
    }),
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        departmentScope: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        birthDate: true,
        isActive: true,
      },
    }),
    getAnonymizedTeamCapacity(),
    prisma.dailyCheckin.findFirst({
      where: { userId: user.id, checkinDate: todayDate },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarColor: true,
            departmentScope: true,
          },
        },
      },
    }),
    getUserPendingMandatoryCourses(user),
  ]);

  const { todayBirthdays } = computeBirthdayInfo(users, todayDate);
  const dailyKpi = resolveEffectiveDailyKpi(user);

  return (
    <MyWorkView
      currentUserId={user.id}
      currentUserRole={user.role}
      currentUserName={user.name}
      currentUserAvatarColor={user.avatarColor}
      currentUserScope={user.departmentScope}
      currentUserPirateCharacter={user.pirateCharacter}
      currentUserTone={user.preferredTone}
      currentUserIcon={user.preferredIcon}
      currentUserMotto={user.personalMotto}
      todayDate={todayDate}
      initialCheckin={initialCheckin}
      initialTasks={tasks}
      projects={projects}
      users={users}
      capacity={capacity}
      todayBirthdays={todayBirthdays}
      pendingCourses={pendingCourses}
      initialDailyKpi={dailyKpi.items}
      initialDailyKpiIsDefault={dailyKpi.isDefaultFallback}
      approvedLeaves={approvedLeaves}
      initialTaskId={resolvedParams.taskId}
      initialOpenChat={resolvedParams.openChat === "1"}
    />
  );
}
