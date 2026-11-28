import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
} from "@/lib/permissions";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";
import {
  SIMPLE_PROJECT_SELECT,
  TASK_CARD_INCLUDE,
  sanitizeTasksAssets,
} from "@/lib/task-queries";
import { MediaOrdersPageClient } from "@/components/media-orders-page-client";

export default async function MediaOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isMediaProductionUser(user.role, user.departmentScope)) {
    redirect("/my-work");
  }

  const [rawTasks, projects, users, capacity] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          buildTaskVisibilityWhere(user),
          { dailyKpiKey: null },
          {
            OR: [
              { isMediaOrder: true },
              { isOutsideDepartment: true },
              { taskType: { in: ["MEDIA_IMAGE", "MEDIA_VIDEO"] } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: TASK_CARD_INCLUDE,
    }),
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      select: SIMPLE_PROJECT_SELECT,
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
        isActive: true,
      },
    }),
    getAnonymizedTeamCapacity(),
  ]);

  const tasks = sanitizeTasksAssets(rawTasks);

  return (
    <MediaOrdersPageClient
      initialTasks={tasks}
      projects={projects}
      users={users}
      capacity={capacity}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
