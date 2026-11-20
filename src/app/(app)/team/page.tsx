import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSmtpConfigured } from "@/lib/mailer";
import { TeamAdminView } from "@/components/team-admin-view";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "LEADER") redirect("/my-work");

  const [users, projects, cronLogs] = await Promise.all([
    prisma.user.findMany({
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
        dailyKpiJson: true,
        isActive: true,
        projectMemberships: {
          include: {
            project: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        channelSummary: true,
        kpiNote: true,
        color: true,
      },
    }),
    prisma.cronRunLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <TeamAdminView
      initialUsers={users}
      initialProjects={projects}
      smtpConfigured={isSmtpConfigured()}
      smtpUserPreview={process.env.SMTP_USER || null}
      initialCronLogs={cronLogs}
    />
  );
}
