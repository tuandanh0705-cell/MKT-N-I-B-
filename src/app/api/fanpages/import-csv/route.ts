import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/permissions";
import { parseMetaBusinessCsv } from "@/lib/meta-csv-parser";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const channelId = String(formData.get("channelId") ?? "");
    const sendToLeader = String(formData.get("sendToLeader") ?? "true") === "true";
    const file = formData.get("file");

    if (!channelId || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Thiếu ID Fanpage hoặc file CSV xuất từ Meta Business Suite." },
        { status: 400 }
      );
    }

    const channel = await prisma.fanpageChannel.findUnique({
      where: { id: channelId },
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

    const csvText = await file.text();
    const parsed = parseMetaBusinessCsv(csvText);

    const { weekStartStr } = getVnWeekBounds();
    const monthKey = getVnMonthKey();
    const nextFollowers =
      parsed.followers > 0 ? parsed.followers : channel.followers;
    const followersDelta =
      parsed.newFollowers > 0
        ? parsed.newFollowers - parsed.unfollows
        : channel.followers > 0 && nextFollowers > 0
          ? nextFollowers - channel.followers
          : 0;

    const snapshot = await prisma.fanpageMetricSnapshot.create({
      data: {
        channelId: channel.id,
        weekStart: weekStartStr,
        monthKey,
        followers: nextFollowers,
        followersDelta,
        newFollowers: parsed.newFollowers,
        unfollows: parsed.unfollows,
        reach: parsed.reach,
        impressions: parsed.impressions,
        pageViews: parsed.pageViews,
        videoViews: parsed.videoViews,
        linkClicks: parsed.linkClicks,
        inboxMessages: parsed.inboxMessages,
        engagement: parsed.engagement,
        engagementRate: parsed.engagementRate,
        reactions: parsed.reactions,
        comments: parsed.comments,
        shares: parsed.shares,
        postsCount: parsed.postsCount,
        topPostTitle: parsed.topPostTitle,
        topPostUrl: parsed.topPostUrl,
        topPostReach: parsed.topPostReach,
        topPostEngagement: parsed.topPostEngagement,
        topPostsJson:
          parsed.topPosts.length > 0
            ? (parsed.topPosts as unknown as Prisma.InputJsonValue)
            : undefined,
        source: "META_CSV",
        sentToLeaderAt: sendToLeader ? new Date() : null,
        syncedById: user.id,
        notes: `Import từ file CSV Meta Business Suite (${file.name}) • ${parsed.detectedMode}`,
      },
    });

    await prisma.fanpageChannel.update({
      where: { id: channel.id },
      data: {
        followers: nextFollowers,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncNote: `${user.name} đã import đầy đủ số liệu từ CSV Meta (${parsed.postsCount} bài, Reach ${parsed.reach.toLocaleString("vi-VN")}).`,
      },
    });

    if (sendToLeader) {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const leader of leaders) {
        if (leader.id === user.id) continue;
        await createNotification({
          userId: leader.id,
          type: "FANPAGE_REPORT",
          title: `Import Báo Cáo CSV Fanpage: ${channel.name}`,
          message: `${user.name} vừa cập nhật báo cáo chi tiết "${channel.name}": Reach ${parsed.reach.toLocaleString(
            "vi-VN"
          )} • Tương tác ${parsed.engagement.toLocaleString(
            "vi-VN"
          )} (${parsed.engagementRate}%) • Click ${parsed.linkClicks} • Inbox ${parsed.inboxMessages}.`,
          linkUrl: "/fanpage-reports",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      snapshot,
      parsedSummary: parsed,
    });
  } catch (err) {
    console.error("Import Meta CSV error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Không thể đọc file CSV Meta Business Suite.",
      },
      { status: 500 }
    );
  }
}
