export interface ParsedTopPost {
  title: string;
  url: string | null;
  createdAt?: string | null;
  postType?: string | null;
  reach: number;
  impressions: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
}

export interface ParsedMetaCsvReport {
  postsCount: number;
  followers: number;
  newFollowers: number;
  unfollows: number;
  reach: number;
  impressions: number;
  pageViews: number;
  videoViews: number;
  linkClicks: number;
  inboxMessages: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
  engagementRate: number;
  topPostTitle: string | null;
  topPostUrl: string | null;
  topPostReach: number;
  topPostEngagement: number;
  topPosts: ParsedTopPost[];
  detectedMode: "CONTENT_EXPORT" | "OVERVIEW_EXPORT";
}

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  const cleaned = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(current.trim());
      current = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      if (ch === "\r") i++;
    } else if (ch === "\r") {
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function toNum(val: string | undefined): number {
  if (!val) return 0;
  const normalized = val.replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const lowered = headers.map((h) => h.toLowerCase());
  for (const cand of candidates) {
    const idx = lowered.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Tự động phân tích file CSV tải từ Meta Business Suite (cả bản Export Bài viết/Content lẫn Tổng quan Insights, tiếng Anh & tiếng Việt).
 */
export function parseMetaBusinessCsv(csvText: string): ParsedMetaCsvReport {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) {
    throw new Error("File CSV không có đủ dữ liệu (cần ít nhất dòng tiêu đề + 1 dòng số liệu).");
  }

  // Một số file CSV của Meta có 1-2 dòng metadata trên cùng -> tìm dòng chứa nhiều cột tên quen thuộc
  let headerIdx = 0;
  for (let i = 0; i < Math.min(4, rows.length - 1); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (
      joined.includes("reach") ||
      joined.includes("tiếp cận") ||
      joined.includes("impression") ||
      joined.includes("hiển thị") ||
      joined.includes("title") ||
      joined.includes("tiêu đề") ||
      joined.includes("follows") ||
      joined.includes("date") ||
      joined.includes("ngày")
    ) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const idxTitle = findColumnIndex(headers, ["title", "description", "tiêu đề", "nội dung", "message"]);
  const idxUrl = findColumnIndex(headers, ["permalink", "link bài", "liên kết", "post url", "url"]);
  const idxDate = findColumnIndex(headers, ["publish time", "thời gian đăng", "created", "date", "ngày"]);
  const idxType = findColumnIndex(headers, ["post type", "loại bài", "type"]);

  const idxReach = findColumnIndex(headers, ["reach", "người tiếp cận", "tiếp cận"]);
  const idxImpr = findColumnIndex(headers, ["impression", "lượt xem", "hiển thị"]);
  const idxPageViews = findColumnIndex(headers, ["page visit", "profile visit", "lượt truy cập trang", "xem trang"]);
  const idxVideoViews = findColumnIndex(headers, ["3-second", "video view", "lượt xem video", "3 giây"]);
  const idxClicks = findColumnIndex(headers, ["link click", "total clicks", "lượt click", "nhấp vào liên kết"]);
  const idxInbox = findColumnIndex(headers, ["messaging", "tin nhắn", "cuộc trò chuyện"]);

  const idxReactions = findColumnIndex(headers, ["reaction", "cảm xúc", "lượt thích bài"]);
  const idxComments = findColumnIndex(headers, ["comment", "bình luận"]);
  const idxShares = findColumnIndex(headers, ["share", "chia sẻ"]);
  const idxEngagement = findColumnIndex(headers, ["engagement", "tương tác"]);

  const idxNewFollowers = findColumnIndex(headers, [
    "new follow",
    "new like",
    "follows",
    "người theo dõi mới",
    "lượt thích mới",
  ]);
  const idxUnfollows = findColumnIndex(headers, ["unfollow", "unlike", "bỏ theo dõi"]);
  const idxTotalFollowers = findColumnIndex(headers, [
    "total follower",
    "lifetime likes",
    "tổng số người theo dõi",
    "followers",
  ]);

  const isContentExport = idxTitle !== -1 || idxUrl !== -1;

  let reach = 0;
  let impressions = 0;
  let pageViews = 0;
  let videoViews = 0;
  let linkClicks = 0;
  let inboxMessages = 0;
  let reactions = 0;
  let comments = 0;
  let shares = 0;
  let engagement = 0;
  let newFollowers = 0;
  let unfollows = 0;
  let maxFollowers = 0;

  const parsedPosts: ParsedTopPost[] = [];

  for (const r of dataRows) {
    const rowReach = idxReach !== -1 ? toNum(r[idxReach]) : 0;
    const rowImpr = idxImpr !== -1 ? toNum(r[idxImpr]) : 0;
    const rowViews = idxPageViews !== -1 ? toNum(r[idxPageViews]) : 0;
    const rowVideo = idxVideoViews !== -1 ? toNum(r[idxVideoViews]) : 0;
    const rowClicks = idxClicks !== -1 ? toNum(r[idxClicks]) : 0;
    const rowInbox = idxInbox !== -1 ? toNum(r[idxInbox]) : 0;
    const rowReact = idxReactions !== -1 ? toNum(r[idxReactions]) : 0;
    const rowCmt = idxComments !== -1 ? toNum(r[idxComments]) : 0;
    const rowShare = idxShares !== -1 ? toNum(r[idxShares]) : 0;
    const rowEngRaw = idxEngagement !== -1 ? toNum(r[idxEngagement]) : 0;
    const rowEng = Math.max(rowEngRaw, rowReact + rowCmt + rowShare);

    reach += rowReach;
    impressions += rowImpr;
    pageViews += rowViews;
    videoViews += rowVideo;
    linkClicks += rowClicks;
    inboxMessages += rowInbox;
    reactions += rowReact;
    comments += rowCmt;
    shares += rowShare;
    engagement += rowEng;

    if (idxNewFollowers !== -1) newFollowers += toNum(r[idxNewFollowers]);
    if (idxUnfollows !== -1) unfollows += toNum(r[idxUnfollows]);
    if (idxTotalFollowers !== -1) {
      maxFollowers = Math.max(maxFollowers, toNum(r[idxTotalFollowers]));
    }

    if (isContentExport) {
      const title =
        (idxTitle !== -1 ? r[idxTitle] : "") ||
        (idxUrl !== -1 ? r[idxUrl] : "") ||
        "Bài đăng Fanpage";
      parsedPosts.push({
        title: title.slice(0, 140),
        url: idxUrl !== -1 ? r[idxUrl] || null : null,
        createdAt: idxDate !== -1 ? r[idxDate] || null : null,
        postType: idxType !== -1 ? r[idxType] || null : null,
        reach: rowReach,
        impressions: rowImpr,
        engagement: rowEng,
        reactions: rowReact,
        comments: rowCmt,
        shares: rowShare,
        clicks: rowClicks,
      });
    }
  }

  const topPosts = [...parsedPosts]
    .sort((a, b) => b.engagement - a.engagement || b.reach - a.reach)
    .slice(0, 10);
  const best = topPosts[0];
  const engagementRate =
    reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;

  return {
    postsCount: isContentExport ? parsedPosts.length : 0,
    followers: maxFollowers,
    newFollowers,
    unfollows,
    reach,
    impressions,
    pageViews,
    videoViews,
    linkClicks,
    inboxMessages,
    engagement,
    reactions,
    comments,
    shares,
    engagementRate,
    topPostTitle: best?.title ?? null,
    topPostUrl: best?.url ?? null,
    topPostReach: best?.reach ?? 0,
    topPostEngagement: best?.engagement ?? 0,
    topPosts,
    detectedMode: isContentExport ? "CONTENT_EXPORT" : "OVERVIEW_EXPORT",
  };
}

function parseCompactMetricNumber(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace(/\u00a0/g, " ");
  const m = cleaned.match(/^([\d.,]+)(?:[ \t]*(k|n|m|tr|trieu|triệu)(?![a-zA-ZÀ-ỹ]))?/i);
  if (!m) return 0;
  let num = m[1];
  const suffix = (m[2] || "").toLowerCase();
  if (suffix) {
    if (/^\d+[.,]\d{1,2}$/.test(num)) {
      num = num.replace(",", ".");
    } else {
      num = num.replace(/[.,]/g, "");
    }
    const base = parseFloat(num) || 0;
    return Math.round(base * (suffix === "k" || suffix === "n" ? 1000 : 1_000_000));
  }
  return Number(num.replace(/[.,]/g, "")) || 0;
}

/**
 * Bóc tách số liệu khi người dùng vào Meta Business Suite / Facebook Insights,
 * bấm Ctrl+A -> Ctrl+C toàn bộ trang rồi dán trực tiếp vào CRM (không cần Token Developer).
 */
export function parseMetaCopiedText(rawText: string): Partial<ParsedMetaCsvReport> {
  const text = rawText.replace(/\r\n/g, "\n");

  const extractNear = (patterns: RegExp[]): number => {
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m?.[1]) {
        const val = parseCompactMetricNumber(m[1]);
        if (val > 0) return val;
      }
    }
    return 0;
  };

  const num = "([\\d.,]+(?:[ \\t]*(?:K|M|k|m|tr|triệu|trieu)(?![a-zA-ZÀ-ỹ]))?)";
  const gap = "[\\s:\\n]{0,40}";

  const followers = extractNear([
    new RegExp(`${num}\\s*(?:người theo dõi|followers)`, "i"),
    new RegExp(`(?:Tổng người theo dõi|Total followers|Followers)${gap}${num}`, "i"),
  ]);
  const newFollowers = extractNear([
    new RegExp(`(?:Người theo dõi mới|Lượt thích Trang mới|Follows|New followers|Net follows)${gap}${num}`, "i"),
  ]);
  const reach = extractNear([
    new RegExp(`(?:Người tiếp cận|Số người tiếp cận|Reach|Accounts reached)${gap}${num}`, "i"),
  ]);
  const impressions = extractNear([
    new RegExp(`(?:Lượt xem|Lượt hiển thị|Views|Impressions)${gap}${num}`, "i"),
  ]);
  const pageViews = extractNear([
    new RegExp(`(?:Lượt truy cập trang|Lượt truy cập Trang cá nhân|Page visits|Profile visits)${gap}${num}`, "i"),
  ]);
  const videoViews = extractNear([
    new RegExp(`(?:Lượt xem video 3 giây|Lượt xem 3 giây|3-second video views|Video views)${gap}${num}`, "i"),
  ]);
  const engagement = extractNear([
    new RegExp(`(?:Lượt tương tác với nội dung|Lượt tương tác|Content interactions|Post engagement|Interactions|Engagement)${gap}${num}`, "i"),
  ]);
  const linkClicks = extractNear([
    new RegExp(`(?:Lượt click vào liên kết|Lượt nhấp vào liên kết|Link clicks)${gap}${num}`, "i"),
  ]);
  const inboxMessages = extractNear([
    new RegExp(`(?:Cuộc trò chuyện qua tin nhắn đã bắt đầu|Tin nhắn mới|Messaging conversations started|Messaging conversations)${gap}${num}`, "i"),
  ]);
  const reactions = extractNear([
    new RegExp(`(?:Cảm xúc|Reactions)${gap}${num}`, "i"),
  ]);
  const comments = extractNear([
    new RegExp(`(?:Bình luận|Comments)${gap}${num}`, "i"),
  ]);
  const shares = extractNear([
    new RegExp(`(?:Lượt chia sẻ|Chia sẻ|Shares)${gap}${num}`, "i"),
  ]);

  return {
    followers,
    newFollowers,
    reach,
    impressions,
    pageViews,
    videoViews,
    engagement,
    linkClicks,
    inboxMessages,
    reactions,
    comments,
    shares,
  };
}
