import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppSecret } from "@/lib/webpush";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";
import { createNotification } from "@/lib/notifications";

import type { Prisma } from "@/generated/prisma/client";

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-ingest-secret",
    "Access-Control-Allow-Private-Network": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const expectedSecret = await getOrCreateAppSecret("fanpage_ingest_secret");
    const headerSecret = request.headers.get("x-ingest-secret") || "";
    const sessionUser = await getCurrentUser();

    if (!sessionUser && (!expectedSecret || headerSecret !== expectedSecret)) {
      return NextResponse.json(
        { error: "Thiếu xác thực Bookmarklet (x-ingest-secret)." },
        { status: 401, headers }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const channelId = body.channelId ? String(body.channelId) : "";
    const pageUrl = body.pageUrl ? String(body.pageUrl) : "";
    const pageTitle = body.pageTitle ? String(body.pageTitle) : "";

    let channel = channelId
      ? await prisma.fanpageChannel.findUnique({ where: { id: channelId } })
      : null;

    if (!channel && (pageUrl || pageTitle)) {
      const orConditions: Array<Record<string, unknown>> = [];
      if (pageUrl) {
        orConditions.push({ pageUrl: { contains: pageUrl.split("?")[0] } });
      }
      if (pageTitle) {
        orConditions.push({
          name: { contains: pageTitle.slice(0, 20), mode: "insensitive" },
        });
      }
      if (orConditions.length > 0) {
        channel = await prisma.fanpageChannel.findFirst({
          where: {
            isActive: true,
            OR: orConditions,
          },
        });
      }
    }

    if (!channel && !channelId && !pageUrl && !pageTitle) {
      const activeChannels = await prisma.fanpageChannel.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 2,
      });
      if (activeChannels.length === 1) {
        channel = activeChannels[0];
      }
    }

    if (!channel) {
      return NextResponse.json(
        {
          error:
            pageUrl || pageTitle
              ? `Không tìm thấy Fanpage nào trên CRM khớp với "${pageTitle || pageUrl}". Hãy khai báo đúng Tên / Link Fanpage trước khi đồng bộ.`
              : "Không xác định được Fanpage cần đồng bộ trên CRM.",
        },
        { status: 404, headers }
      );
    }

    const { weekStartStr } = getVnWeekBounds();
    const monthKey = getVnMonthKey();
    const followers = Math.max(0, Number(body.followers ?? channel.followers));
    const followersDelta =
      channel.followers > 0 ? followers - channel.followers : 0;

    const reach = Math.max(0, Number(body.reach ?? 0));
    const reactions = Math.max(0, Number(body.reactions ?? 0));
    const comments = Math.max(0, Number(body.comments ?? 0));
    const shares = Math.max(0, Number(body.shares ?? 0));
    const engagement = Math.max(
      reactions + comments + shares,
      Number(body.engagement ?? 0)
    );
    const engagementRate =
      reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;

    const snapshot = await prisma.fanpageMetricSnapshot.create({
      data: {
        channelId: channel.id,
        weekStart: weekStartStr,
        monthKey,
        followers,
        followersDelta,
        newFollowers: Math.max(0, Number(body.newFollowers ?? 0)),
        unfollows: Math.max(0, Number(body.unfollows ?? 0)),
        reach,
        impressions: Math.max(0, Number(body.impressions ?? 0)),
        pageViews: Math.max(0, Number(body.pageViews ?? 0)),
        videoViews: Math.max(0, Number(body.videoViews ?? 0)),
        linkClicks: Math.max(0, Number(body.linkClicks ?? 0)),
        inboxMessages: Math.max(0, Number(body.inboxMessages ?? 0)),
        engagement,
        engagementRate,
        reactions,
        comments,
        shares,
        postsCount: Math.max(0, Number(body.postsCount ?? 0)),
        topPostTitle: body.topPostTitle ? String(body.topPostTitle).slice(0, 140) : null,
        topPostUrl: body.topPostUrl ? String(body.topPostUrl) : null,
        topPostsJson: Array.isArray(body.topPosts)
          ? (body.topPosts as unknown as Prisma.InputJsonValue)
          : undefined,
        source: "BOOKMARKLET",
        sentToLeaderAt: body.sendToLeader ? new Date() : null,
        syncedById: sessionUser?.id ?? null,
        notes: `Cào realtime qua Bookmarklet (${pageUrl || channel.pageUrl})`,
      },
    });

    await prisma.fanpageChannel.update({
      where: { id: channel.id },
      data: {
        followers,
        likesCount: Math.max(channel.likesCount, Number(body.likesCount ?? followers)),
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncNote: "Đã cào thành công qua Bookmarklet trên trình duyệt.",
      },
    });

    if (body.sendToLeader) {
      const leaders = await prisma.user.findMany({
        where: { role: "LEADER", isActive: true },
        select: { id: true },
      });
      for (const l of leaders) {
        await createNotification({
          userId: l.id,
          type: "FANPAGE_REPORT",
          title: `Bookmarklet Fanpage: ${channel.name}`,
          message: `Số liệu realtime vừa cập nhật: ${followers.toLocaleString(
            "vi-VN"
          )} Followers • Engagement ${snapshot.engagement.toLocaleString("vi-VN")}.`,
          linkUrl: "/fanpage-reports",
        });
      }
    }

    return NextResponse.json(
      { ok: true, channelName: channel.name, snapshot },
      { status: 201, headers }
    );
  } catch (err) {
    console.error("Bookmarklet ingest error:", err);
    return NextResponse.json(
      { error: "Không thể tiếp nhận số liệu Fanpage." },
      { status: 500, headers }
    );
  }
}
