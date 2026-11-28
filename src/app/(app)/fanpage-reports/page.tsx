import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";
import { FanpageReportsView } from "@/components/fanpage-reports-view";

export default async function FanpageReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ bm?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isMediaProductionUser(user.role, user.departmentScope)) {
    redirect("/my-work");
  }

  const { bm } = await searchParams;
  const { weekStartStr, weekEndStr } = getVnWeekBounds();
  const monthKey = getVnMonthKey();

  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true, color: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        title: true,
        departmentScope: true,
        avatarColor: true,
        pirateCharacter: true,
      },
    }),
  ]);

  return (
    <FanpageReportsView
      initialWeekStart={weekStartStr}
      initialWeekEnd={weekEndStr}
      initialMonthKey={monthKey}
      projects={projects}
      users={users}
      currentUserId={user.id}
      currentUserRole={user.role}
      toneMode={user.preferredTone}
      initialBookmarkletJson={bm || null}
    />
  );
}
