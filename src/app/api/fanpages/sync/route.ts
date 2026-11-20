import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/permissions";
import { syncFanpageFromMeta } from "@/lib/fanpage-scraper";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const channelId = String(body.channelId ?? "");
    const sendToLeader = Boolean(body.sendToLeader);
    const mode = String(body.mode ?? "AUTO");

    const channel = await prisma.fanpageChannel.findUnique({
      where: { id: channelId },
      include: { project: { select: { name: true, slug: true } } },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Không tìm thấy Fanpage." },
        { status: 404 }
      );
    }

    if (channel.projectId) {
      const allowed = await canAccessProject(user, channel.projectId);
      if (!allowed && user.role !== "LEADER") {
        return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
      }
    }

    const { weekStartStr } = getVnWeekBounds();
    const monthKey = getVnMonthKey();
    const sentAt = sendToLeader ? new Date() : null;

    if (mode === "MANUAL" && body.manualSnapshot) {
      const m = body.manualSnapshot as Record<string, unknown>;
      const followers = Math.max(0, Number(m.followers ?? channel.followers));
      const followersDelta =
        m.followersDelta !== undefined
          ? Number(m.followersDelta)
          : channel.followers > 0
            ? followers - channel.followers
            : 0;
      const reactions = Math.max(0, Number(m.reactions ?? 0));
      const comments = Math.max(0, Number(m.comments ?? 0));
      const shares = Math.max(0, Number(m.shares ?? 0));
      const engagement = Math.max(
        reactions + comments + shares,
        Number(m.engagement ?? 0)
      );

      const reach = Math.max(0, Number(m.reach ?? 0));
      const engagementRate =
        reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;

      const snapshot = await prisma.fanpageMetricSnapshot.create({
        data: {
          channelId: channel.id,
          weekStart: weekStartStr,
          monthKey,
          followers,
          followersDelta,
          newFollowers: Math.max(0, Number(m.newFollowers ?? 0)),
          unfollows: Math.max(0, Number(m.unfollows ?? 0)),
          reach,
          impressions: Math.max(0, Number(m.impressions ?? 0)),
          pageViews: Math.max(0, Number(m.pageViews ?? 0)),
          videoViews: Math.max(0, Number(m.videoViews ?? 0)),
          linkClicks: Math.max(0, Number(m.linkClicks ?? 0)),
          inboxMessages: Math.max(0, Number(m.inboxMessages ?? 0)),
          engagement,
          engagementRate,
          reactions,
          comments,
          shares,
          postsCount: Math.max(0, Number(m.postsCount ?? 0)),
          topPostTitle: m.topPostTitle ? String(m.topPostTitle).trim() : null,
          topPostUrl: m.topPostUrl ? String(m.topPostUrl).trim() : null,
          topPostReach: Math.max(0, Number(m.topPostReach ?? 0)),
          topPostEngagement: Math.max(0, Number(m.topPostEngagement ?? 0)),
          source: "MANUAL",
          sentToLeaderAt: sentAt,
          syncedById: user.id,
          notes: m.notes ? String(m.notes).trim() : null,
        },
        include: { syncedBy: { select: { id: true, name: true } } },
      });

      await prisma.fanpageChannel.update({
        where: { id: channel.id },
        data: {
          followers,
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
          lastSyncNote: `${user.name} đã cập nhật số liệu Fanpage${
            sendToLeader ? " & gửi Leader" : ""
          }.`,
        },
      });

      if (sendToLeader) {
        await notifyLeadersFanpage(user.name, channel.name, snapshot);
      }

      return NextResponse.json({
        ok: true,
        snapshot,
        message: "Đã lưu số liệu Fanpage và cập nhật báo cáo.",
      });
    }

    // Chế độ Cào Realtime (Graph API hoặc Public Meta Scrape)
    const scrape = await syncFanpageFromMeta({
      pageUrl: channel.pageUrl,
      pageId: channel.pageId,
      accessToken: channel.accessToken,
      previousFollowers: channel.followers,
    });

    if (!scrape.ok) {
      await prisma.fanpageChannel.update({
        where: { id: channel.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "NEEDS_TOKEN_OR_BOOKMARKLET",
          lastSyncNote: scrape.statusMessage,
        },
      });
      return NextResponse.json({
        ok: false,
        status: "BLOCKED",
        message: scrape.statusMessage,
      });
    }

    const followersDelta =
      channel.followers > 0 ? scrape.followers - channel.followers : 0;

    const snapshot = await prisma.fanpageMetricSnapshot.create({
      data: {
        channelId: channel.id,
        weekStart: weekStartStr,
        monthKey,
        followers: scrape.followers,
        followersDelta,
        newFollowers: scrape.newFollowers,
        unfollows: scrape.unfollows,
        reach: scrape.reach,
        impressions: scrape.impressions,
        pageViews: scrape.pageViews,
        videoViews: scrape.videoViews,
        linkClicks: scrape.linkClicks,
        inboxMessages: scrape.inboxMessages,
        engagement: scrape.engagement,
        engagementRate: scrape.engagementRate,
        reactions: scrape.reactions,
        comments: scrape.comments,
        shares: scrape.shares,
        postsCount: scrape.postsCount,
        topPostTitle: scrape.topPostTitle,
        topPostUrl: scrape.topPostUrl,
        topPostReach: scrape.topPostReach,
        topPostEngagement: scrape.topPostEngagement,
        topPostsJson:
          scrape.topPosts.length > 0
            ? (scrape.topPosts as unknown as Prisma.InputJsonValue)
            : undefined,
        source: scrape.source,
        sentToLeaderAt: sentAt,
        syncedById: user.id,
        notes: scrape.statusMessage,
      },
      include: { syncedBy: { select: { id: true, name: true } } },
    });

    await prisma.fanpageChannel.update({
      where: { id: channel.id },
      data: {
        followers: scrape.followers,
        likesCount: scrape.likesCount || scrape.followers,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncNote: scrape.statusMessage,
      },
    });

    if (sendToLeader) {
      await notifyLeadersFanpage(user.name, channel.name, snapshot);
    }

    return NextResponse.json({
      ok: true,
      snapshot,
      message: scrape.statusMessage,
    });
  } catch (err) {
    console.error("Fanpage sync error:", err);
    return NextResponse.json(
      { error: "Lỗi đồng bộ số liệu Fanpage." },
      { status: 500 }
    );
  }
}

async function notifyLeadersFanpage(
  senderName: string,
  pageName: string,
  snapshot: { followers: number; reach: number; engagement: number }
) {
  const leaders = await prisma.user.findMany({
    where: { role: "LEADER", isActive: true },
    select: { id: true },
  });
  for (const leader of leaders) {
    await createNotification({
      userId: leader.id,
      type: "FANPAGE_REPORT",
      title: `Số liệu Fanpage mới: ${pageName}`,
      message: `${senderName} vừa đồng bộ & gửi số liệu "${pageName}": ${snapshot.followers.toLocaleString(
        "vi-VN"
      )} Followers • Reach ${snapshot.reach.toLocaleString(
        "vi-VN"
      )} • Tương tác ${snapshot.engagement.toLocaleString("vi-VN")}.`,
      linkUrl: "/fanpage-reports",
    });
  }
}
