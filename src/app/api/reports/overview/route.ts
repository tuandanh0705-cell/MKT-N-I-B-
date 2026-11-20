import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildProjectVisibilityWhere,
  buildTaskVisibilityWhere,
} from "@/lib/permissions";
import {
  getVnDateString,
  getVnMonthBounds,
  getVnWeekBounds,
  getVnWeekBoundsFromStart,
} from "@/lib/dates";
import {
  computeDailyKpiProgress,
  countKpiWorkingDays,
  resolveEffectiveDailyKpi,
  summarizeDailyKpiText,
} from "@/lib/daily-kpi";
import { getOrCreateAppSecret } from "@/lib/webpush";
import { buildMemberWorkBreakdown } from "@/lib/report-grouping";

const COMPLETED_STATUSES = new Set(["APPROVED_FINAL", "PUBLISHED", "DONE"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const currentUserId = user.id;
  const isLeader = user.role === "LEADER";

  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("weekStart");
  const monthParam = searchParams.get("month");

  const weekBounds = weekParam
    ? getVnWeekBoundsFromStart(weekParam)
    : getVnWeekBounds();
  const monthBounds = getVnMonthBounds(monthParam || undefined);
  const todayStr = getVnDateString();
  const minStartStr =
    weekBounds.weekStartStr < monthBounds.monthStartStr
      ? weekBounds.weekStartStr
      : monthBounds.monthStartStr;
  const maxEndStr =
    weekBounds.weekEndStr > monthBounds.monthEndStr
      ? weekBounds.weekEndStr
      : monthBounds.monthEndStr;

  const [projects, tasks, users, approvedLeaves, ingestSecret] = await Promise.all([
    prisma.project.findMany({
      where: buildProjectVisibilityWhere(user),
      orderBy: { createdAt: "asc" },
      include: {
        weeklyReportNotes: {
          where: { weekStart: weekBounds.weekStartStr },
          include: { author: { select: { name: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: buildTaskVisibilityWhere(user),
      select: {
        id: true,
        code: true,
        title: true,
        projectId: true,
        assigneeId: true,
        taskType: true,
        status: true,
        quantity: true,
        revisionCount: true,
        wasLate: true,
        platform: true,
        postFormat: true,
        dueAt: true,
        scheduledPublishAt: true,
        completedAt: true,
        createdAt: true,
        dailyKpiKey: true,
      },
    }),
    prisma.user.findMany({
      where: isLeader ? { isActive: true } : { isActive: true, id: user.id },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        departmentScope: true,
        employmentType: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        dailyKpiJson: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: maxEndStr },
        endDate: { gte: minStartStr },
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
        leaveType: true,
      },
    }),
    getOrCreateAppSecret("fanpage_ingest_secret"),
  ]);

  const visibleProjectIds = projects.map((p) => p.id);
  const projectById = new Map(
    projects.map((p) => [p.id, { id: p.id, name: p.name, color: p.color }])
  );

  const fanpages = await prisma.fanpageChannel.findMany({
    where: {
      isActive: true,
      OR: [{ projectId: null }, { projectId: { in: visibleProjectIds } }],
    },
    orderBy: { createdAt: "asc" },
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
        orderBy: { capturedAt: "desc" },
        take: 40,
        include: { syncedBy: { select: { id: true, name: true } } },
      },
    },
  });

  function buildWorkStats(
    start: Date,
    end: Date,
    startStr: string,
    endStr: string,
    weeksMultiplier = 1
  ) {
    const windowTasks = tasks.filter((t) => {
      const ref = t.completedAt ?? t.scheduledPublishAt ?? t.dueAt ?? t.createdAt;
      return ref >= start && ref <= end;
    });
    const effectiveEndStr =
      startStr <= todayStr && endStr > todayStr ? todayStr : endStr;

    const byProject = projects.map((p) => {
      const projectTasks = windowTasks.filter((t) => t.projectId === p.id);
      const doneTasks = projectTasks.filter((t) =>
        COMPLETED_STATUSES.has(t.status)
      );

      return {
        projectId: p.id,
        slug: p.slug,
        name: p.name,
        color: p.color,
        kpiNote: p.kpiNote,
        targets: {
          social: p.weeklySocialTarget * weeksMultiplier,
          ads: p.weeklyAdsTarget * weeksMultiplier,
          image: p.weeklyImageTarget * weeksMultiplier,
          video: p.weeklyVideoTarget * weeksMultiplier,
        },
        actuals: {
          totalTasks: projectTasks.length,
          doneTasks: doneTasks.length,
          socialDone: doneTasks
            .filter(
              (t) => t.taskType === "CONTENT_SOCIAL" || t.taskType === "CONTENT_WEB"
            )
            .reduce((s, t) => s + t.quantity, 0),
          adsDone: doneTasks
            .filter(
              (t) => t.taskType === "CONTENT_ADS" || t.taskType === "ADS_CAMPAIGN"
            )
            .reduce((s, t) => s + t.quantity, 0),
          imageDone: doneTasks
            .filter((t) => t.taskType === "MEDIA_IMAGE")
            .reduce((s, t) => s + t.quantity, 0),
          videoDone: doneTasks
            .filter((t) => t.taskType === "MEDIA_VIDEO")
            .reduce((s, t) => s + t.quantity, 0),
          onTimeCount: doneTasks.filter((t) => !t.wasLate).length,
          lateCount: projectTasks.filter((t) => t.wasLate).length,
        },
        note: p.weeklyReportNotes[0] ?? null,
      };
    });

    const byMember = users
      .filter((u) => (isLeader ? true : u.id === currentUserId))
      .map((u) => {
        const memberTasks = windowTasks.filter((t) => t.assigneeId === u.id);
        const doneTasks = memberTasks.filter((t) =>
          COMPLETED_STATUSES.has(t.status)
        );
        const onTimeCount = doneTasks.filter((t) => !t.wasLate).length;
        const lateCount = memberTasks.filter((t) => t.wasLate).length;
        const totalQty = doneTasks.reduce((s, t) => s + t.quantity, 0);
        const totalRevisions = memberTasks.reduce(
          (s, t) => s + t.revisionCount,
          0
        );
        const breakdown = buildMemberWorkBreakdown(memberTasks, projectById);
        const memberLeaves = approvedLeaves.filter((lv) => lv.userId === u.id);
        const kpiWorkingDays = countKpiWorkingDays(
          startStr,
          effectiveEndStr,
          memberLeaves
        );
        const effectiveKpi = resolveEffectiveDailyKpi(u);
        const scaledKpiItems = effectiveKpi.items.map((item) => ({
          ...item,
          target: Math.max(0, Math.round(item.target * kpiWorkingDays)),
        }));
        const kpiProgress = computeDailyKpiProgress(
          scaledKpiItems,
          memberTasks.map((mt) => ({
            id: mt.id,
            taskType: mt.taskType,
            status: mt.status,
            quantity: mt.quantity,
            dailyKpiKey: mt.dailyKpiKey,
          }))
        );

        return {
          userId: u.id,
          name: u.name,
          title: u.title,
          departmentScope: u.departmentScope,
          avatarColor: u.avatarColor,
          pirateCharacter: u.pirateCharacter,
          assignedCount: memberTasks.length,
          completedCount: doneTasks.length,
          activeCount: memberTasks.length - doneTasks.length,
          onTimeCount,
          lateCount,
          onTimeRate:
            doneTasks.length > 0
              ? Math.round((onTimeCount / doneTasks.length) * 100)
              : 100,
          dailyKpiTargetSummary: summarizeDailyKpiText(effectiveKpi.items),
          kpiWorkingDays,
          kpiExpectedQty: kpiProgress.totalTarget,
          kpiDoneQty: kpiProgress.totalDone,
          kpiCompletionRate:
            kpiProgress.totalTarget > 0 ? kpiProgress.donePercent : 0,
          totalQuantity: totalQty,
          assignedQuantity: breakdown.assignedQuantity,
          completedQuantity: breakdown.completedQuantity,
          natureGroups: breakdown.natureGroups,
          detailedTasks: breakdown.detailedTasks,
          revisionTotal: totalRevisions,
        };
      });

    return { byProject, byMember };
  }

  const workWeekly = buildWorkStats(
    weekBounds.weekStart,
    weekBounds.weekEnd,
    weekBounds.weekStartStr,
    weekBounds.weekEndStr,
    1
  );
  const workMonthly = buildWorkStats(
    monthBounds.monthStart,
    monthBounds.monthEnd,
    monthBounds.monthStartStr,
    monthBounds.monthEndStr,
    4
  );

  const fanpageWeekly = fanpages.map((ch) => {
    const weekSnaps = ch.snapshots.filter(
      (s) => s.weekStart === weekBounds.weekStartStr
    );
    const latestInWeek = weekSnaps[0] || null;
    const latestOverall = ch.snapshots[0] || null;
    const refSnap = latestInWeek || latestOverall;

    return {
      channelId: ch.id,
      name: ch.name,
      pageUrl: ch.pageUrl,
      project: ch.project,
      managedBy: ch.managedBy,
      hasDataInSelectedWeek: Boolean(latestInWeek),
      followers: refSnap?.followers ?? ch.followers,
      followersDelta: latestInWeek?.followersDelta ?? 0,
      newFollowers: latestInWeek?.newFollowers ?? 0,
      unfollows: latestInWeek?.unfollows ?? 0,
      reach: latestInWeek?.reach ?? 0,
      impressions: latestInWeek?.impressions ?? 0,
      pageViews: latestInWeek?.pageViews ?? 0,
      videoViews: latestInWeek?.videoViews ?? 0,
      linkClicks: latestInWeek?.linkClicks ?? 0,
      inboxMessages: latestInWeek?.inboxMessages ?? 0,
      engagement: latestInWeek?.engagement ?? 0,
      engagementRate: latestInWeek?.engagementRate ?? 0,
      reactions: latestInWeek?.reactions ?? 0,
      comments: latestInWeek?.comments ?? 0,
      shares: latestInWeek?.shares ?? 0,
      postsCount: latestInWeek?.postsCount ?? 0,
      topPostTitle: latestInWeek?.topPostTitle ?? null,
      topPostUrl: latestInWeek?.topPostUrl ?? null,
      topPosts: Array.isArray(latestInWeek?.topPostsJson)
        ? latestInWeek.topPostsJson
        : [],
      sentToLeaderAt: latestInWeek?.sentToLeaderAt ?? null,
      lastSyncedAt: ch.lastSyncedAt,
      source: latestInWeek?.source ?? null,
    };
  });

  const fanpageMonthly = fanpages.map((ch) => {
    const monthSnaps = ch.snapshots.filter(
      (s) => s.monthKey === monthBounds.monthKey
    );
    const newest = monthSnaps[0];
    const oldest = monthSnaps[monthSnaps.length - 1];
    const totalReach = monthSnaps.reduce((s, x) => s + x.reach, 0);
    const totalImpressions = monthSnaps.reduce((s, x) => s + x.impressions, 0);
    const totalPageViews = monthSnaps.reduce((s, x) => s + x.pageViews, 0);
    const totalVideoViews = monthSnaps.reduce((s, x) => s + x.videoViews, 0);
    const totalLinkClicks = monthSnaps.reduce((s, x) => s + x.linkClicks, 0);
    const totalInbox = monthSnaps.reduce((s, x) => s + x.inboxMessages, 0);
    const totalEngagement = monthSnaps.reduce((s, x) => s + x.engagement, 0);
    const totalReactions = monthSnaps.reduce((s, x) => s + x.reactions, 0);
    const totalComments = monthSnaps.reduce((s, x) => s + x.comments, 0);
    const totalShares = monthSnaps.reduce((s, x) => s + x.shares, 0);
    const totalPosts = monthSnaps.reduce((s, x) => s + x.postsCount, 0);
    const totalNewFollowers = monthSnaps.reduce((s, x) => s + x.newFollowers, 0);
    const followersGrowth = monthSnaps.reduce(
      (s, x) => s + x.followersDelta,
      0
    );
    const bestSnap = [...monthSnaps].sort(
      (a, b) => b.topPostEngagement - a.topPostEngagement
    )[0];

    return {
      channelId: ch.id,
      name: ch.name,
      pageUrl: ch.pageUrl,
      project: ch.project,
      managedBy: ch.managedBy,
      snapshotCount: monthSnaps.length,
      currentFollowers: newest?.followers ?? ch.followers,
      startFollowers: oldest?.followers ?? ch.followers,
      newFollowers: totalNewFollowers,
      followersGrowth,
      totalReach,
      totalImpressions,
      totalPageViews,
      totalVideoViews,
      totalLinkClicks,
      totalInbox,
      totalEngagement,
      avgEngagementRate:
        totalReach > 0
          ? Number(((totalEngagement / totalReach) * 100).toFixed(2))
          : 0,
      totalReactions,
      totalComments,
      totalShares,
      totalPosts,
      bestPostTitle: bestSnap?.topPostTitle ?? null,
      bestPostUrl: bestSnap?.topPostUrl ?? null,
      topPosts: Array.isArray(bestSnap?.topPostsJson)
        ? bestSnap.topPostsJson
        : [],
    };
  });

  return NextResponse.json({
    viewer: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    weekStart: weekBounds.weekStartStr,
    weekEnd: weekBounds.weekEndStr,
    monthKey: monthBounds.monthKey,
    monthStart: monthBounds.monthStartStr,
    monthEnd: monthBounds.monthEndStr,
    workReport: {
      weekly: workWeekly,
      monthly: workMonthly,
    },
    fanpageReport: {
      channels: fanpages.map((c) => ({
        ...c,
        accessToken: undefined,
        hasAccessToken: Boolean(c.accessToken),
      })),
      weekly: fanpageWeekly,
      monthly: fanpageMonthly,
      ingestSecret,
    },
  });
}
