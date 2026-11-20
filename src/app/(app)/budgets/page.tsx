import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { BudgetsView } from "@/components/budgets-view";

export default async function BudgetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [budgets, projects] = await Promise.all([
    prisma.budgetRequest.findMany({
      where:
        user.role === "LEADER"
          ? {}
          : {
              OR: [
                { requesterId: user.id },
                { project: buildProjectVisibilityWhere(user) },
              ],
            },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, slug: true, color: true } },
        requester: { select: { id: true, name: true, avatarColor: true, pirateCharacter: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <BudgetsView
      initialBudgets={budgets}
      projects={projects}
      currentUserRole={user.role}
    />
  );
}
