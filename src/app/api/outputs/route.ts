import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOutputsWorkspaceData } from "@/lib/outputs-data";
import { analyzeTaskOutputs, getTaskOutputCategory } from "@/lib/output-helpers";
import { getTaskAssigneeIds } from "@/lib/task-assignees";

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
        ? tasks.filter((t) => getTaskAssigneeIds(t).length === 0)
        : tasks.filter((t) => getTaskAssigneeIds(t).includes(memberId));
  }
  if (projectId && projectId !== "ALL") {
    tasks = tasks.filter((t) => t.project.id === projectId);
  }
  if (category && category !== "ALL") {
    tasks = tasks.filter(
      (t) => getTaskOutputCategory(t.taskType) === category.toUpperCase()
    );
  }

  let withOutputCount = 0;
  let contentCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let needsReviewCount = 0;
  for (const t of tasks) {
    const analyzed = analyzeTaskOutputs(t);
    if (analyzed.hasSubmittedOutput) withOutputCount += 1;
    if (analyzed.category === "CONTENT") contentCount += 1;
    if (analyzed.category === "IMAGE") imageCount += 1;
    if (analyzed.category === "VIDEO") videoCount += 1;
    if (t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW") {
      needsReviewCount += 1;
    }
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
    stats: {
      totalTasks: tasks.length,
      withOutputCount,
      contentCount,
      imageCount,
      videoCount,
      needsReviewCount,
    },
  });
}
