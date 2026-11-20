import type { ParsedTopPost } from "@/lib/meta-csv-parser";

export interface ScrapedFanpageResult {
  ok: boolean;
  source: "GRAPH_API" | "PUBLIC_SCRAPE";
  followers: number;
  likesCount: number;
  newFollowers: number;
  unfollows: number;
  reach: number;
  impressions: number;
  pageViews: number;
  videoViews: number;
  linkClicks: number;
  inboxMessages: number;
  engagement: number;
  engagementRate: number;
  reactions: number;
  comments: number;
  shares: number;
  postsCount: number;
  topPostTitle: string | null;
  topPostUrl: string | null;
  topPostReach: number;
  topPostEngagement: number;
  topPosts: ParsedTopPost[];
  pageNameFound?: string | null;
  statusMessage: string;
}

function parseVietnameseCompactCount(raw: string): number {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "");
  const multiplierMatch = cleaned.match(/^([\d.,]+)(k|n|m|tr|trieu|triệu)?$/i);
  if (!multiplierMatch) {
    const digitsOnly = cleaned.replace(/[^\d]/g, "");
    return digitsOnly ? Number(digitsOnly) : 0;
  }

  let numStr = multiplierMatch[1];
  const suffix = (multiplierMatch[2] || "").toLowerCase();

  if (suffix) {
    if (/^\d+[.,]\d{1,2}$/.test(numStr)) {
      numStr = numStr.replace(",", ".");
    } else {
      numStr = numStr.replace(/[.,]/g, "");
    }
    const base = parseFloat(numStr) || 0;
    if (suffix === "k" || suffix === "n") return Math.round(base * 1000);
    return Math.round(base * 1_000_000);
  }

  return Number(numStr.replace(/[.,]/g, "")) || 0;
}

function extractPageSlug(
  pageUrl: string,
  explicitPageId?: string | null
): string {
  if (explicitPageId?.trim()) return explicitPageId.trim();
  try {
    const u = new URL(pageUrl);
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;
    const segments = u.pathname.split("/").filter(Boolean);
    return segments[0] || "";
  } catch {
    return pageUrl.trim();
  }
}

export async function syncFanpageFromMeta({
  pageUrl,
  pageId,
  accessToken,
  previousFollowers = 0,
}: {
  pageUrl: string;
  pageId?: string | null;
  accessToken?: string | null;
  previousFollowers?: number;
}): Promise<ScrapedFanpageResult> {
  const targetId = extractPageSlug(pageUrl, pageId);

  // 1. Ưu tiên Facebook Graph API v21.0 — kéo đầy đủ Insights Trang + Top 10 Bài Viết
  if (accessToken && accessToken.trim() && targetId) {
    try {
      const fieldsWithInsights = [
        "name",
        "fan_count",
        "followers_count",
        "published_posts.limit(10){message,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true),insights.metric(post_impressions_unique,post_impressions,post_clicks)}",
      ].join(",");

      const infoUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        targetId
      )}?fields=${encodeURIComponent(fieldsWithInsights)}&access_token=${encodeURIComponent(
        accessToken.trim()
      )}`;

      let infoRes = await fetch(infoUrl, { cache: "no-store" });
      let infoJson = (await infoRes.json()) as {
        name?: string;
        fan_count?: number;
        followers_count?: number;
        published_posts?: {
          data?: Array<{
            message?: string;
            permalink_url?: string;
            created_time?: string;
            shares?: { count?: number };
            reactions?: { summary?: { total_count?: number } };
            comments?: { summary?: { total_count?: number } };
            insights?: {
              data?: Array<{
                name?: string;
                values?: Array<{ value?: number }>;
              }>;
            };
          }>;
        };
        error?: { message?: string };
      };

      // Nếu nested post insights lỗi trên Page mới / quyền hạn chế -> fallback query published_posts cơ bản
      if (!infoRes.ok || infoJson.error) {
        const basicFields =
          "name,fan_count,followers_count,published_posts.limit(10){message,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true)}";
        infoRes = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(
            targetId
          )}?fields=${encodeURIComponent(basicFields)}&access_token=${encodeURIComponent(
            accessToken.trim()
          )}`,
          { cache: "no-store" }
        );
        infoJson = await infoRes.json();
      }

      if (!infoRes.ok || infoJson.error) {
        return {
          ok: false,
          source: "GRAPH_API",
          followers: previousFollowers,
          likesCount: 0,
          newFollowers: 0,
          unfollows: 0,
          reach: 0,
          impressions: 0,
          pageViews: 0,
          videoViews: 0,
          linkClicks: 0,
          inboxMessages: 0,
          engagement: 0,
          engagementRate: 0,
          reactions: 0,
          comments: 0,
          shares: 0,
          postsCount: 0,
          topPostTitle: null,
          topPostUrl: null,
          topPostReach: 0,
          topPostEngagement: 0,
          topPosts: [],
          statusMessage: `Graph API báo lỗi: ${
            infoJson.error?.message || `HTTP ${infoRes.status}`
          }`,
        };
      }

      const posts = infoJson.published_posts?.data || [];
      let reactions = 0;
      let comments = 0;
      let shares = 0;
      let postClicksSum = 0;
      let postReachSum = 0;

      const parsedPosts: ParsedTopPost[] = posts.map((p) => {
        const r = p.reactions?.summary?.total_count || 0;
        const c = p.comments?.summary?.total_count || 0;
        const s = p.shares?.count || 0;
        let pReach = 0;
        let pImpr = 0;
        let pClicks = 0;
        for (const ins of p.insights?.data || []) {
          const val = ins.values?.[0]?.value || 0;
          if (ins.name === "post_impressions_unique") pReach = val;
          if (ins.name === "post_impressions") pImpr = val;
          if (ins.name === "post_clicks") pClicks = val;
        }
        const eng = r + c + s;
        reactions += r;
        comments += c;
        shares += s;
        postClicksSum += pClicks;
        postReachSum += pReach;

        return {
          title: (p.message || "Bài đăng Fanpage").slice(0, 140),
          url: p.permalink_url || null,
          createdAt: p.created_time || null,
          reach: pReach,
          impressions: pImpr,
          engagement: eng,
          reactions: r,
          comments: c,
          shares: s,
          clicks: pClicks,
        };
      });

      const topPosts = [...parsedPosts].sort(
        (a, b) => b.engagement - a.engagement || b.reach - a.reach
      );
      const bestPost = topPosts[0] || null;

      // Kéo thêm Page Insights 7 ngày (Reach, Impressions, Page Views, Video Views, Follower mới, Clicks, Inbox)
      let reach = postReachSum;
      let impressions = 0;
      let pageViews = 0;
      let videoViews = 0;
      let linkClicks = postClicksSum;
      let inboxMessages = 0;
      let newFollowers = 0;
      let unfollows = 0;
      let insightEngagement = reactions + comments + shares;

      const readMetric = async (
        metricName: string,
        periodMode: "week" | "day"
      ): Promise<number> => {
        try {
          const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
            targetId
          )}/insights?metric=${encodeURIComponent(
            metricName
          )}&period=${periodMode}&access_token=${encodeURIComponent(
            accessToken.trim()
          )}`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return 0;
          const json = (await res.json()) as {
            data?: Array<{ values?: Array<{ value?: number }> }>;
          };
          const values = json.data?.[0]?.values || [];
          if (values.length === 0) return 0;
          if (periodMode === "week") {
            return Number(values[values.length - 1]?.value || 0);
          }
          return values
            .slice(-7)
            .reduce((sum, v) => sum + Number(v.value || 0), 0);
        } catch {
          return 0;
        }
      };

      const [
        mReachLegacy,
        mMediaView,
        mImpressions,
        mEngagements,
        mViewsTotal,
        mFanAddsLegacy,
        mDailyFollows,
        mFanRemovesLegacy,
        mDailyUnfollows,
        mVideoViews,
        mTotalActions,
        mInbox,
      ] = await Promise.all([
        readMetric("page_impressions_unique", "week"),
        readMetric("page_media_view", "day"),
        readMetric("page_impressions", "week"),
        readMetric("page_post_engagements", "week"),
        readMetric("page_views_total", "week"),
        readMetric("page_fan_adds_unique", "week"),
        readMetric("page_daily_follows_unique", "day"),
        readMetric("page_fan_removes_unique", "week"),
        readMetric("page_daily_unfollows_unique", "day"),
        readMetric("page_video_views", "week"),
        readMetric("page_total_actions", "week"),
        readMetric("page_messages_new_conversations_unique", "week"),
      ]);

      reach = Math.max(reach, mReachLegacy, mMediaView);
      impressions = Math.max(impressions, mImpressions, mMediaView);
      if (mEngagements > 0) insightEngagement = Math.max(insightEngagement, mEngagements);
      pageViews = mViewsTotal;
      newFollowers = Math.max(mFanAddsLegacy, mDailyFollows);
      unfollows = Math.max(mFanRemovesLegacy, mDailyUnfollows);
      videoViews = mVideoViews;
      linkClicks = Math.max(linkClicks, mTotalActions);
      inboxMessages = mInbox;

      const followers =
        infoJson.followers_count || infoJson.fan_count || previousFollowers;
      const engagementRate =
        reach > 0
          ? Number(((insightEngagement / reach) * 100).toFixed(2))
          : 0;

      return {
        ok: true,
        source: "GRAPH_API",
        followers,
        likesCount: infoJson.fan_count || followers,
        newFollowers,
        unfollows,
        reach,
        impressions,
        pageViews,
        videoViews,
        linkClicks,
        inboxMessages,
        engagement: insightEngagement,
        engagementRate,
        reactions,
        comments,
        shares,
        postsCount: posts.length,
        topPostTitle: bestPost?.title ?? null,
        topPostUrl: bestPost?.url ?? null,
        topPostReach: bestPost?.reach ?? 0,
        topPostEngagement: bestPost?.engagement ?? 0,
        topPosts: topPosts.slice(0, 10),
        pageNameFound: infoJson.name || null,
        statusMessage: `Đã đồng bộ đầy đủ qua Graph API (${posts.length} bài gần nhất, Reach ${reach.toLocaleString("vi-VN")}, ER ${engagementRate}%).`,
      };
    } catch (err) {
      return {
        ok: false,
        source: "GRAPH_API",
        followers: previousFollowers,
        likesCount: 0,
        newFollowers: 0,
        unfollows: 0,
        reach: 0,
        impressions: 0,
        pageViews: 0,
        videoViews: 0,
        linkClicks: 0,
        inboxMessages: 0,
        engagement: 0,
        engagementRate: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        postsCount: 0,
        topPostTitle: null,
        topPostUrl: null,
        topPostReach: 0,
        topPostEngagement: 0,
        topPosts: [],
        statusMessage: `Không thể kết nối Graph API: ${
          err instanceof Error ? err.message : "Lỗi mạng"
        }`,
      };
    }
  }

  // 2. Public Meta Scrape (chỉ đọc thẻ công khai, không vượt login/CAPTCHA)
  try {
    const cleanUrl = pageUrl.startsWith("http")
      ? pageUrl
      : `https://www.facebook.com/${targetId}`;
    const res = await fetch(cleanUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      },
    });

    const html = await res.text();
    const titleMatch =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
      ) || html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    const ogDescMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    );

    const combinedDesc = `${descMatch?.[1] || ""} ${ogDescMatch?.[1] || ""}`;
    const title =
      titleMatch?.[1]?.replace(/\s*\|\s*Facebook.*/i, "").trim() || null;

    const likesMatch = combinedDesc.match(
      /([\d.,]+\s*(?:k|n|m|tr|triệu|trieu)?)\s*(?:likes?|lượt thích)/i
    );
    const followersMatch = combinedDesc.match(
      /([\d.,]+\s*(?:k|n|m|tr|triệu|trieu)?)\s*(?:followers?|người theo dõi)/i
    );
    const talkingMatch = combinedDesc.match(
      /([\d.,]+\s*(?:k|n|m|tr|triệu|trieu)?)\s*(?:talking about this|người đang nói về điều này)/i
    );

    const likesCount = likesMatch
      ? parseVietnameseCompactCount(likesMatch[1])
      : 0;
    const followers = followersMatch
      ? parseVietnameseCompactCount(followersMatch[1])
      : likesCount || previousFollowers;
    const engagement = talkingMatch
      ? parseVietnameseCompactCount(talkingMatch[1])
      : 0;

    if (followers > 0 || likesCount > 0 || engagement > 0) {
      return {
        ok: true,
        source: "PUBLIC_SCRAPE",
        followers,
        likesCount,
        newFollowers: 0,
        unfollows: 0,
        reach: 0,
        impressions: 0,
        pageViews: 0,
        videoViews: 0,
        linkClicks: 0,
        inboxMessages: 0,
        engagement,
        engagementRate: 0,
        reactions: engagement,
        comments: 0,
        shares: 0,
        postsCount: 0,
        topPostTitle: null,
        topPostUrl: null,
        topPostReach: 0,
        topPostEngagement: 0,
        topPosts: [],
        pageNameFound: title,
        statusMessage:
          "Đã đọc chỉ số công khai (Followers/Talking About). Để có đủ Reach, Click, Inbox, Video Views & Top 10 bài: gắn Page Token hoặc Import file CSV từ Meta Business Suite!",
      };
    }

    return {
      ok: false,
      source: "PUBLIC_SCRAPE",
      followers: previousFollowers,
      likesCount: 0,
      newFollowers: 0,
      unfollows: 0,
      reach: 0,
      impressions: 0,
      pageViews: 0,
      videoViews: 0,
      linkClicks: 0,
      inboxMessages: 0,
      engagement: 0,
      engagementRate: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      postsCount: 0,
      topPostTitle: null,
      topPostUrl: null,
      topPostReach: 0,
      topPostEngagement: 0,
      topPosts: [],
      pageNameFound: title,
      statusMessage:
        "Facebook yêu cầu đăng nhập cho dữ liệu chuyên sâu — bấm 'Import CSV Meta Business' (khuyên dùng) hoặc gắn Page Access Token.",
    };
  } catch (err) {
    return {
      ok: false,
      source: "PUBLIC_SCRAPE",
      followers: previousFollowers,
      likesCount: 0,
      newFollowers: 0,
      unfollows: 0,
      reach: 0,
      impressions: 0,
      pageViews: 0,
      videoViews: 0,
      linkClicks: 0,
      inboxMessages: 0,
      engagement: 0,
      engagementRate: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      postsCount: 0,
      topPostTitle: null,
      topPostUrl: null,
      topPostReach: 0,
      topPostEngagement: 0,
      topPosts: [],
      statusMessage: `Không thể cào trực tiếp Fanpage: ${
        err instanceof Error ? err.message : "Lỗi kết nối"
      }`,
    };
  }
}
