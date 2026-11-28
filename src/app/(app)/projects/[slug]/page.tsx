import { notFound, redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
  canAccessProject,
} from "@/lib/permissions";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";
import { getGeminiConfigStatus } from "@/lib/gemini-ai";
import { buildProjectChannelSuggestions } from "@/lib/platform-meta";
import {
  SIMPLE_PROJECT_SELECT,
  TASK_CARD_INCLUDE,
  sanitizeTasksAssets,
} from "@/lib/task-queries";
import { ProjectWorkspace } from "@/components/project-workspace";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; taskId?: string; openChat?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ slug }, { tab, taskId, openChat }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (isMediaProductionUser(user.role, user.departmentScope)) {
    if (taskId) {
      redirect(
        `/my-work?taskId=${encodeURIComponent(taskId)}${
          openChat === "1" ? "&openChat=1" : ""
        }`
      );
    }
    redirect("/my-work");
  }
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, title: true } },
        },
      },
    },
  });

  if (!project) notFound();

  const allowed = await canAccessProject(user, project.id);
  if (!allowed) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          Bạn không có quyền truy cập dự án này
        </h1>
        <p className="text-sm text-slate-500">
          Theo phân quyền bảo mật nội bộ, bạn chỉ xem được tiến độ của các dự án mình tham gia hoặc các đầu việc được giao.
        </p>
      </div>
    );
  }

  const [rawTasks, allAccessibleProjects, users, capacity, fanpages, resources, aiConfig] =
    await Promise.all([
      prisma.task.findMany({
        where: buildTaskVisibilityWhere(user, project.id),
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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
      prisma.fanpageChannel.findMany({
        where: {
          isActive: true,
          OR: [{ projectId: project.id }, { projectId: null }],
        },
        select: { name: true, pageUrl: true },
        orderBy: [{ projectId: "desc" }, { createdAt: "asc" }],
      }),
      prisma.workspaceResource.findMany({
        where: {
          OR: [{ projectId: project.id }, { scope: "GLOBAL" }],
        },
        select: { title: true, url: true, linksJson: true, tags: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      getGeminiConfigStatus(),
    ]);

  const tasks = sanitizeTasksAssets(rawTasks);
  const baseChannelSuggestions = buildProjectChannelSuggestions({
    fanpages,
    resources,
  });

  const membersLabel = project.members.map((m) => m.user.name);

  return (
    <ProjectWorkspace
      project={project}
      membersLabel={membersLabel}
      initialTasks={tasks}
      allAccessibleProjects={allAccessibleProjects}
      users={users}
      capacity={capacity}
      baseChannelSuggestions={baseChannelSuggestions}
      currentUserId={user.id}
      currentUserRole={user.role}
      initialAiConfig={aiConfig}
      initialTab={tab}
      initialTaskId={taskId}
      initialOpenChat={openChat === "1"}
    />
  );
}
