import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
} from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({
      tasks: [],
      projects: [],
      resources: [],
      equipment: [],
      users: [],
    });
  }

  const isMedia = isMediaProductionUser(user.role, user.departmentScope);
  const visibleProjects = await prisma.project.findMany({
    where:
      user.role === "LEADER" || isMedia
        ? { isActive: true }
        : buildProjectVisibilityWhere(user),
    select: { id: true, slug: true, name: true, color: true, masterResourceUrl: true },
  });
  const visibleProjectIds = visibleProjects.map((p) => p.id);

  const qLower = q.toLowerCase();
  const matchedProjects = visibleProjects
    .filter((p) => p.name.toLowerCase().includes(qLower) || p.slug.toLowerCase().includes(qLower))
    .slice(0, 6);

  const [tasks, resources, equipment, users] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          buildTaskVisibilityWhere(user),
          {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { caption: { contains: q, mode: "insensitive" } },
              { contentPillar: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        taskType: true,
        isMediaOrder: true,
        project: { select: { id: true, slug: true, name: true, color: true } },
        assignee: { select: { name: true } },
        assignees: {
          orderBy: { assignedAt: "asc" },
          select: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.workspaceResource.findMany({
      where: {
        AND: [
          {
            OR: [
              { scope: "GLOBAL" },
              { scope: "PROJECT", projectId: { in: visibleProjectIds } },
            ],
          },
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tags: { contains: q, mode: "insensitive" } },
              { url: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        url: true,
        scope: true,
        project: { select: { name: true, color: true } },
      },
    }),
    prisma.equipmentItem.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { managerName: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { code: "asc" },
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        managerName: true,
        status: true,
      },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        title: true,
        role: true,
        avatarColor: true,
      },
    }),
  ]);

  return NextResponse.json({
    tasks,
    projects: matchedProjects,
    resources,
    equipment,
    users,
  });
}
