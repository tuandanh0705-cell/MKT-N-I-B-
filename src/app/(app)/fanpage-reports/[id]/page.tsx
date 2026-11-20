import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { FanpageDetailView } from "@/components/fanpage-detail-view";

export default async function FanpageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const visibleProjects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    select: { id: true },
  });
  const visibleProjectIds = visibleProjects.map((p) => p.id);

  const [channel, allChannels] = await Promise.all([
    prisma.fanpageChannel.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ projectId: null }, { projectId: { in: visibleProjectIds } }],
      },
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        managedBy: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        snapshots: {
          orderBy: { capturedAt: "asc" },
          take: 60,
          include: { syncedBy: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.fanpageChannel.findMany({
      where: {
        isActive: true,
        OR: [{ projectId: null }, { projectId: { in: visibleProjectIds } }],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        project: { select: { name: true, color: true } },
      },
    }),
  ]);

  if (!channel) notFound();

  const sanitizedChannel = {
    ...channel,
    accessToken: undefined,
    hasAccessToken: Boolean(channel.accessToken),
  };

  return (
    <FanpageDetailView
      channel={sanitizedChannel}
      allChannels={allChannels}
      snapshotsChronological={channel.snapshots}
    />
  );
}
