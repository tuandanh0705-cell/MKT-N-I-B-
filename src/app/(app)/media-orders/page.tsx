import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
} from "@/lib/permissions";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";
import { TASK_CARD_INCLUDE } from "@/lib/task-queries";
import { MediaOrdersPageClient } from "@/components/media-orders-page-client";

export default async function MediaOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tasks, projects, users, capacity] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          buildTaskVisibilityWhere(user),
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
