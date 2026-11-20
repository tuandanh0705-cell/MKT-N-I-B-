import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOutputsWorkspaceData } from "@/lib/outputs-data";
import { getTaskOutputCategory } from "@/lib/output-helpers";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const projectId = searchParams.get("projectId");
  const category = searchParams.get("category");

  const data = await getOutputsWorkspaceData(user);

  let tasks = data.tasks;
  if (user.role === "LEADER" && memberId) {
    tasks =
      memberId === "UNASSIGNED"
        ? tasks.filter((t) => !t.assignee?.id)
        : tasks.filter((t) => t.assignee?.id === memberId);
  }
  if (projectId && projectId !== "ALL") {
    tasks = tasks.filter((t) => t.project.id === projectId);
  }
  if (category && category !== "ALL") {
    tasks = tasks.filter(
      (t) => getTaskOutputCategory(t.taskType) === category.toUpperCase()
    );
  }

  return NextResponse.json({
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    tasks,
    projects: data.projects,
    users: data.users,
    aiConfig: data.aiConfig,
    stats: data.stats,
  });
}
