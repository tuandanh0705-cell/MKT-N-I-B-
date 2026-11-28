import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatUnreadCountForUser } from "@/lib/chat";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
} from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [projects, notifications, pendingReviewsCount, chatUnreadCount] =
    await Promise.all([
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        color: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    user.role === "LEADER"
      ? prisma.task.count({
          where: {
            AND: [
              buildTaskVisibilityWhere(user),
              { status: { in: ["WAITING_APPROVAL", "BRIEF_REVIEW"] } },
            ],
          },
        })
      : Promise.resolve(0),
    getChatUnreadCountForUser(user.id),
  ]);

  return (
    <AppShell
      user={user}
      projects={projects}
      initialNotifications={notifications}
      pendingReviewsCount={pendingReviewsCount}
      initialChatUnreadCount={chatUnreadCount}
    >
      {children}
    </AppShell>
  );
}
