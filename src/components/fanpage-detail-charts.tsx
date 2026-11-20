"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { formatVnDateTime } from "@/lib/dates";
import type { FanpageSnapshotItem } from "@/types/crm";

export type ChartMetricTab = "REACH" | "ENGAGEMENT" | "FOLLOWERS" | "MEDIA";

export interface ParsedTopPost {
  title: string;
  url: string | null;
  createdAt: string | null;
  postType: string | null;
  reach: number;
  impressions: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
}

export function formatShortNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return String(val);
}

export function formatShortDate(input: string | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

export function normalizePosts(raw: unknown): ParsedTopPost[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((p) => ({
      title: String(p.title ?? "Bài đăng Fanpage"),
      url: p.url ? String(p.url) : null,
      createdAt: p.createdAt ? String(p.createdAt) : null,
      postType: p.postType ? String(p.postType) : null,
      reach: Number(p.reach ?? 0),
      impressions: Number(p.impressions ?? 0),
      engagement: Number(p.engagement ?? 0),
      reactions: Number(p.reactions ?? 0),
      comments: Number(p.comments ?? 0),
      shares: Number(p.shares ?? 0),
      clicks: Number(p.clicks ?? 0),
    }));
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    GRAPH_API: { label: "Graph API", cls: "bg-emerald-100 text-emerald-700" },
    CSV_IMPORT: { label: "CSV Meta", cls: "bg-sky-100 text-sky-700" },
    BOOKMARKLET: { label: "Bookmarklet", cls: "bg-amber-100 text-amber-800" },
    MANUAL: { label: "Nhập tay / Dán", cls: "bg-violet-100 text-violet-700" },
    PUBLIC_SCRAPE: { label: "Public Page", cls: "bg-slate-100 text-slate-700" },
  };
  const info = map[source] || { label: source, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${info.cls}`}>
      {info.label}
    </span>
  );
}

export function TrendSvgChart({
  points,
  tab,
}: {
  points: FanpageSnapshotItem[];
  tab: ChartMetricTab;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    return points.map((s) => {
      if (tab === "REACH") {
        return {
          snap: s,
          primary: s.reach,
          secondary: s.impressions,
          primaryLabel: "Reach",
          secondaryLabel: "Hiển thị",
          primaryColor: "#2563eb",
          secondaryColor: "#06b6d4",
        };
      }
      if (tab === "ENGAGEMENT") {
        return {
          snap: s,
          primary: s.engagement,
          secondary: s.reactions,
          primaryLabel: "Tổng Tương tác",
          secondaryLabel: "Reactions",
          primaryColor: "#7c3aed",
          secondaryColor: "#ec4899",
        };
      }
      if (tab === "FOLLOWERS") {
        return {
          snap: s,
          primary: s.followers,
          secondary: s.newFollowers || Math.max(0, s.followersDelta),
          primaryLabel: "Tổng Followers",
          secondaryLabel: "Follower mới",
          primaryColor: "#059669",
          secondaryColor: "#f59e0b",
        };
      }
      return {
        snap: s,
        primary: s.videoViews || 0,
        secondary: s.pageViews || 0,
        primaryLabel: "Video Views",
        secondaryLabel: "Lượt xem Trang",
        primaryColor: "#e11d48",
        secondaryColor: "#0284c7",
      };
    });
  }, [points, tab]);

  if (series.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Chưa có dữ liệu sync nào trong khoảng đã chọn. Hãy bấm Sync hoặc Import CSV!
      </div>
    );
  }

  const width = 760;
  const height = 250;
  const padL = 52;
  const padR = 24;
  const padT = 22;
  const padB = 42;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = Math.max(
    1,
    ...series.map((d) => Math.max(d.primary, d.secondary))
  );

  const stepX = series.length > 1 ? innerW / (series.length - 1) : innerW / 2;
  const coords = series.map((d, i) => {
    const x = series.length === 1 ? padL + innerW / 2 : padL + i * stepX;
    const y1 = padT + innerH - (d.primary / maxVal) * innerH;
    const y2 = padT + innerH - (d.secondary / maxVal) * innerH;
    return { x, y1, y2, ...d };
  });

  const line1 = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y1}`).join(" ");
  const line2 = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y2}`).join(" ");
  const area1 =
    coords.length > 1
      ? `${line1} L${coords[coords.length - 1].x},${padT + innerH} L${coords[0].x},${padT + innerH} Z`
      : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const activePoint =
    hoverIdx !== null ? coords[hoverIdx] : coords[coords.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: series[0].primaryColor }}
            />
            {series[0].primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: series[0].secondaryColor }}
            />
            {series[0].secondaryLabel}
          </span>
        </div>
        {activePoint && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700">
            Mốc {formatShortDate(activePoint.snap.capturedAt)}:{" "}
            <span style={{ color: activePoint.primaryColor }}>
              {activePoint.primaryLabel} {activePoint.primary.toLocaleString("vi-VN")}
            </span>{" "}
            •{" "}
            <span style={{ color: activePoint.secondaryColor }}>
              {activePoint.secondaryLabel} {activePoint.secondary.toLocaleString("vi-VN")}
            </span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px] h-64 select-none"
        >
          <defs>
            <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={series[0].primaryColor}
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor={series[0].primaryColor}
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>

          {yTicks.map((t) => {
            const y = padT + innerH - t * innerH;
            const val = Math.round(maxVal * t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={t === 0 ? undefined : "4 4"}
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                >
                  {formatShortNumber(val)}
                </text>
              </g>
            );
          })}

          {area1 && <path d={area1} fill="url(#primaryAreaGrad)" />}

          {coords.length === 1 ? (
            <>
              <rect
                x={coords[0].x - 36}
                y={coords[0].y1}
                width={30}
                height={Math.max(4, padT + innerH - coords[0].y1)}
                rx={6}
                fill={coords[0].primaryColor}
                opacity={0.9}
              />
              <rect
                x={coords[0].x + 6}
                y={coords[0].y2}
                width={30}
                height={Math.max(4, padT + innerH - coords[0].y2)}
                rx={6}
                fill={coords[0].secondaryColor}
                opacity={0.85}
              />
            </>
          ) : (
            <>
              <path
                d={line2}
                fill="none"
                stroke={series[0].secondaryColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={line1}
                fill="none"
                stroke={series[0].primaryColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {coords.map((c, i) => {
            const showLabel =
              coords.length <= 8 || i % Math.ceil(coords.length / 7) === 0 || i === coords.length - 1;
            return (
              <g
                key={c.snap.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <circle
                  cx={c.x}
                  cy={c.y2}
                  r={hoverIdx === i ? 5.5 : 4}
                  fill="#fff"
                  stroke={c.secondaryColor}
                  strokeWidth="2.5"
                />
                <circle
                  cx={c.x}
                  cy={c.y1}
                  r={hoverIdx === i ? 6.5 : 4.5}
                  fill="#fff"
                  stroke={c.primaryColor}
                  strokeWidth="2.8"
                />
                {showLabel && (
                  <text
                    x={c.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    fontWeight="600"
                  >
                    {formatShortDate(c.snap.capturedAt)}
                  </text>
                )}
                <rect
                  x={c.x - 16}
                  y={padT}
                  width={32}
                  height={innerH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {coords.length === 1 && (
        <p className="text-[11px] text-slate-500">
          Page này mới có <strong>1 lần sync</strong>. Khi bạn bấm{" "}
          <strong>Cào Graph API Realtime</strong> vào các ngày/tuần tiếp theo, biểu đồ sẽ tự động nối thành đường xu hướng qua nhiều mốc thời gian!
        </p>
      )}
    </div>
  );
}

export function EngagementDonutChart({ snap }: { snap: FanpageSnapshotItem | null }) {
  const reactions = snap?.reactions ?? 0;
  const comments = snap?.comments ?? 0;
  const shares = snap?.shares ?? 0;
  const clicks = snap?.linkClicks ?? 0;
  const inbox = snap?.inboxMessages ?? 0;

  const segments = [
    { label: "Reactions (Cảm xúc)", value: reactions, color: "#6366f1" },
    { label: "Comments (Bình luận)", value: comments, color: "#f59e0b" },
    { label: "Shares (Chia sẻ)", value: shares, color: "#10b981" },
    { label: "Click Link", value: clicks, color: "#0ea5e9" },
    { label: "Inbox mới", value: inbox, color: "#ec4899" },
  ];

  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  const computed = segments.reduce<
    Array<{
      label: string;
      value: number;
      color: string;
      dash: number;
      offset: number;
      pct: number;
    }>
  >((acc, seg) => {
    const prevSum = acc.reduce((sum, item) => sum + item.dash, 0);
    const ratio = total > 0 ? seg.value / total : 0;
    const dash = ratio * circumference;
    acc.push({
      ...seg,
      dash,
      offset: -prevSum,
      pct: Math.round(ratio * 1000) / 10,
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 150 150" className="w-40 h-40 -rotate-90">
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="18"
          />
          {total > 0 &&
            computed.map((s) =>
              s.value > 0 ? (
                <circle
                  key={s.label}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="18"
                  strokeDasharray={`${s.dash} ${circumference}`}
                  strokeDashoffset={s.offset}
                />
              ) : null
            )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="text-[10px] text-slate-400 font-semibold">Tổng hành động</div>
          <div className="text-xl font-black text-slate-900">
            {total.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] font-bold text-violet-600">
            ER {(snap?.engagementRate ?? 0)}%
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2 text-xs">
        {computed.map((s) => (
          <div key={s.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-bold text-slate-900">
                {s.value.toLocaleString("vi-VN")}{" "}
                <span className="text-slate-400 font-normal">({s.pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  backgroundColor: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FanpageTopPostsAndFunnelSection({
  funnelSteps,
  funnelBase,
  topPosts,
  maxPostReach,
}: {
  funnelSteps: Array<{ label: string; val: number; color: string }>;
  funnelBase: number;
  topPosts: ParsedTopPost[];
  maxPostReach: number;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            🔻 Phễu Hiệu Suất Fanpage
          </h2>
          <p className="text-[11px] text-slate-500">
            Tỷ lệ chuyển đổi từ Hiển thị → Tiếp cận → Tương tác → Hành động
          </p>
        </div>
        <div className="space-y-3 pt-1">
          {funnelSteps.map((step) => {
            const pct = Math.min(100, Math.round((step.val / funnelBase) * 1000) / 10);
            return (
              <div key={step.label} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{step.label}</span>
                  <span className="font-bold text-slate-900">
                    {step.val.toLocaleString("vi-VN")}{" "}
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${step.color}`}
                    style={{ width: `${Math.max(step.val > 0 ? 3 : 0, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              🏆 Hiệu Suất Từng Bài Đăng ({topPosts.length} bài gần nhất)
            </h2>
            <p className="text-[11px] text-slate-500">
              So sánh Reach, Tương tác và tỷ lệ ER% trên từng bài viết của Page
            </p>
          </div>
        </div>

        {topPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Chưa có danh sách bài viết chi tiết. Hãy bấm <strong>Cào Graph API Realtime</strong> hoặc <strong>Import CSV Meta</strong> tab Nội dung!
          </div>
        ) : (
          <div className="space-y-3">
            {topPosts.map((p, idx) => {
              const reachW = Math.round((p.reach / maxPostReach) * 100);
              const engW = Math.round((p.engagement / maxPostReach) * 100);
              const postEr =
                p.reach > 0 ? ((p.engagement / p.reach) * 100).toFixed(2) : "0";
              return (
                <div
                  key={`${p.title}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span
                        className={`shrink-0 rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px] font-black ${
                          idx === 0
                            ? "bg-amber-400 text-slate-950"
                            : idx === 1
                              ? "bg-slate-300 text-slate-900"
                              : idx === 2
                                ? "bg-orange-300 text-slate-900"
                                : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 mt-0.5">
                          {p.createdAt && (
                            <span>Đăng: {formatShortDate(p.createdAt)}</span>
                          )}
                          <span>❤️ {p.reactions}</span>
                          <span>
                            <MessageCircle className="w-3 h-3 inline mr-0.5" />
                            {p.comments}
                          </span>
                          <span>🔁 {p.shares}</span>
                          {p.clicks > 0 && <span>🔗 {p.clicks} click</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-lg bg-violet-100 text-violet-800 px-2 py-0.5 text-[11px] font-bold">
                        ER {postEr}%
                      </span>
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                        >
                          Mở FB
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-20 text-slate-500 shrink-0">
                        Reach: <strong className="text-blue-700">{p.reach}</strong>
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.max(p.reach > 0 ? 3 : 0, reachW)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-20 text-slate-500 shrink-0">
                        Tương tác:{" "}
                        <strong className="text-violet-700">{p.engagement}</strong>
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full"
                          style={{
                            width: `${Math.max(p.engagement > 0 ? 3 : 0, engW)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function FanpageSyncHistoryTable({
  snapshotsNewestFirst,
}: {
  snapshotsNewestFirst: FanpageSnapshotItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900">
          🗂️ Lịch Sử Đồng Bộ & Chốt Số Liệu ({snapshotsNewestFirst.length} bản ghi)
        </h2>
      </div>
      <table className="w-full text-left border-collapse text-xs min-w-[920px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
            <th className="py-2.5 px-4">Thời gian</th>
            <th className="py-2.5 px-4">Nguồn</th>
            <th className="py-2.5 px-4">Followers (+/-)</th>
            <th className="py-2.5 px-4">Reach / Hiển thị</th>
            <th className="py-2.5 px-4">Xem Trang / Video</th>
            <th className="py-2.5 px-4">Tương tác (ER%)</th>
            <th className="py-2.5 px-4">React / Cmt / Share</th>
            <th className="py-2.5 px-4">Click / Inbox</th>
            <th className="py-2.5 px-4">Người sync</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {snapshotsNewestFirst.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50/70">
              <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                {formatVnDateTime(s.capturedAt)}
              </td>
              <td className="py-2.5 px-4">
                <SourceBadge source={s.source} />
              </td>
              <td className="py-2.5 px-4">
                <strong>{s.followers.toLocaleString("vi-VN")}</strong>{" "}
                <span
                  className={
                    s.followersDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  ({s.followersDelta >= 0 ? "+" : ""}
                  {s.followersDelta})
                </span>
              </td>
              <td className="py-2.5 px-4">
                <strong className="text-blue-700">
                  {s.reach.toLocaleString("vi-VN")}
                </strong>{" "}
                / {s.impressions.toLocaleString("vi-VN")}
              </td>
              <td className="py-2.5 px-4">
                {(s.pageViews ?? 0).toLocaleString("vi-VN")} /{" "}
                {(s.videoViews ?? 0).toLocaleString("vi-VN")}
              </td>
              <td className="py-2.5 px-4">
                <strong className="text-violet-700">
                  {s.engagement.toLocaleString("vi-VN")}
                </strong>{" "}
                ({s.engagementRate ?? 0}%)
              </td>
              <td className="py-2.5 px-4 text-slate-600">
                {s.reactions} / {s.comments} / {s.shares}
              </td>
              <td className="py-2.5 px-4">
                {s.linkClicks ?? 0} /{" "}
                <span className="text-emerald-700 font-semibold">
                  {s.inboxMessages ?? 0}
                </span>
              </td>
              <td className="py-2.5 px-4 text-slate-600">
                {s.syncedBy?.name || "Hệ thống"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
