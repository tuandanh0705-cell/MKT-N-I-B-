"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Download,
  ExternalLink,
  Eye,
  HeartHandshake,
  MessageCircle,
  MousePointerClick,
  Printer,
  RefreshCw,
  TrendingUp,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { formatVnDateTime } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";
import type { ParsedTopPost } from "@/lib/meta-csv-parser";
import type { FanpageChannelItem, FanpageSnapshotItem } from "@/types/crm";

type ChartMetricTab = "REACH" | "ENGAGEMENT" | "FOLLOWERS" | "MEDIA";

function formatShortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}

function formatShortDate(input: string | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function pctDiff(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev <= 0) return null;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

import {
  EngagementDonutChart,
  FanpageSyncHistoryTable,
  FanpageTopPostsAndFunnelSection,
  TrendSvgChart,
  normalizePosts,
  type ChartMetricTab as ImportedChartMetricTab,
} from "@/components/fanpage-detail-charts";

export function FanpageDetailView({
  channel,
  allChannels,
  snapshotsChronological,
}: {
  channel: FanpageChannelItem;
  allChannels: Array<{
    id: string;
    name: string;
    project?: { name: string; color: string } | null;
  }>;
  snapshotsChronological: FanpageSnapshotItem[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [metricTab, setMetricTab] = useState<ImportedChartMetricTab>("REACH");
  const [syncing, setSyncing] = useState(false);

  const snapshotsNewestFirst = useMemo(
    () => [...snapshotsChronological].reverse(),
    [snapshotsChronological]
  );

  const latest = snapshotsNewestFirst[0] ?? null;
  const previous = snapshotsNewestFirst[1] ?? null;

  const topPosts = useMemo(() => {
    for (const s of snapshotsNewestFirst) {
      const parsed = normalizePosts(s.topPostsJson);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, [snapshotsNewestFirst]);

  const maxPostReach = Math.max(1, ...topPosts.map((p) => p.reach), ...topPosts.map((p) => p.engagement));

  async function handleRealtimeSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/fanpages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          mode: "AUTO",
          sendToLeader: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.message || "Chưa đồng bộ được.", "error");
        return;
      }
      showToast(`Đã cập nhật số liệu mới cho ${channel.name}!`);
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function handleImportCsv(file: File) {
    setSyncing(true);
    try {
      const formData = new FormData();
      formData.append("channelId", channel.id);
      formData.append("sendToLeader", "true");
      formData.append("file", file);
      const res = await fetch("/api/fanpages/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không đọc được file CSV.", "error");
        return;
      }
      showToast(
        `Đã import CSV Meta (${data.parsedSummary.postsCount} bài, Reach ${data.parsedSummary.reach.toLocaleString(
          "vi-VN"
        )})!`
      );
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  function handleExportPageCsv() {
    downloadCsv(
      `lich-su-fanpage-${channel.name.toLowerCase().replace(/\s+/g, "-")}.csv`,
      [
        "Thoi gian sync",
        "Nguon",
        "Followers",
        "Tang/Giam",
        "Reach",
        "Impressions",
        "Xem Trang",
        "Video Views",
        "Tuong tac",
        "ER (%)",
        "Reactions",
        "Comments",
        "Shares",
        "Click Link",
        "Inbox",
        "So bai",
        "Bai noi bat",
      ],
      snapshotsNewestFirst.map((s) => [
        formatVnDateTime(s.capturedAt),
        s.source,
        s.followers,
        s.followersDelta,
        s.reach,
        s.impressions,
        s.pageViews ?? 0,
        s.videoViews ?? 0,
        s.engagement,
        s.engagementRate ?? 0,
        s.reactions,
        s.comments,
        s.shares,
        s.linkClicks ?? 0,
        s.inboxMessages ?? 0,
        s.postsCount,
        s.topPostTitle || "",
      ])
    );
  }

  const reachGrowth = pctDiff(latest?.reach ?? 0, previous?.reach);
  const engGrowth = pctDiff(latest?.engagement ?? 0, previous?.engagement);
  const videoGrowth = pctDiff(latest?.videoViews ?? 0, previous?.videoViews);
  const viewGrowth = pctDiff(latest?.pageViews ?? 0, previous?.pageViews);

  const funnelBase = Math.max(1, latest?.impressions || latest?.reach || 1);
  const funnelSteps = [
    {
      label: "Lượt hiển thị (Impressions)",
      val: latest?.impressions ?? 0,
      color: "bg-sky-500",
    },
    {
      label: "Người tiếp cận (Reach)",
      val: latest?.reach ?? 0,
      color: "bg-blue-600",
    },
    {
      label: "Lượt xem Video (Video Views)",
      val: latest?.videoViews ?? 0,
      color: "bg-rose-500",
    },
    {
      label: "Lượt tương tác (Interactions)",
      val: latest?.engagement ?? 0,
      color: "bg-violet-600",
    },
    {
      label: "Lượt xem Trang (Page Views)",
      val: latest?.pageViews ?? 0,
      color: "bg-amber-500",
    },
    {
      label: "Click Link + Inbox mới",
      val: (latest?.linkClicks ?? 0) + (latest?.inboxMessages ?? 0),
      color: "bg-emerald-600",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Switcher */}
      <div className="rounded-2xl border-2 border-blue-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link
            href="/fanpage-reports"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách tất cả Fanpage
          </Link>

          <div className="flex flex-wrap items-center gap-1.5">
            {allChannels.map((c) => {
              const active = c.id === channel.id;
              return (
                <Link
                  key={c.id}
                  href={`/fanpage-reports/${c.id}`}
                  className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                    active
                      ? "bg-[#0B2545] text-amber-300 border-[#0B2545]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {channel.project && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: channel.project.color }}
                >
                  {channel.project.name}
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  channel.hasAccessToken
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {channel.hasAccessToken ? "Graph API Đã kết nối" : "CSV / Nhập tay"}
              </span>
              {channel.managedBy && (
                <span className="text-xs text-slate-500">
                  Phụ trách: <strong>{channel.managedBy.name}</strong>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Báo Cáo Trực Quan Fanpage — {channel.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <a
                href={channel.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
              >
                {channel.pageUrl}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {channel.pageId && <span>Page ID: {channel.pageId}</span>}
              <span>
                Sync cuối:{" "}
                {channel.lastSyncedAt
                  ? formatVnDateTime(channel.lastSyncedAt)
                  : "Chưa sync"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              disabled={syncing}
              onClick={handleRealtimeSync}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Cào Graph API Realtime
            </button>

            <label className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import CSV Meta
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportCsv(file);
                    e.target.value = "";
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={handleExportPageCsv}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất CSV Page
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In / PDF
            </button>
          </div>
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Followers</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(latest?.followers ?? channel.followers).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1">
            {(latest?.followersDelta ?? 0) >= 0 ? "+" : ""}
            {(latest?.followersDelta ?? 0).toLocaleString("vi-VN")} gần nhất
            {(latest?.newFollowers ?? 0) > 0 ? ` (+${latest?.newFollowers} mới)` : ""}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Reach (Tiếp cận)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {(latest?.reach ?? 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Hiển thị: <strong>{(latest?.impressions ?? 0).toLocaleString("vi-VN")}</strong>
            {reachGrowth !== null && (
              <span
                className={`ml-1 font-bold ${
                  reachGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ({reachGrowth >= 0 ? "+" : ""}
                {reachGrowth}%)
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Tương tác & ER%</span>
            <HeartHandshake className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-violet-700 mt-1">
            {(latest?.engagement ?? 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] font-bold text-violet-600 mt-1">
            ER: {latest?.engagementRate ?? 0}%
            {engGrowth !== null && (
              <span
                className={`ml-1 ${
                  engGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ({engGrowth >= 0 ? "+" : ""}
                {engGrowth}%)
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Video Views</span>
            <Video className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {(latest?.videoViews ?? 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Lượt xem video
            {videoGrowth !== null && (
              <span
                className={`ml-1 font-bold ${
                  videoGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ({videoGrowth >= 0 ? "+" : ""}
                {videoGrowth}%)
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Xem Trang</span>
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {(latest?.pageViews ?? 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Truy cập hồ sơ Page
            {viewGrowth !== null && (
              <span
                className={`ml-1 font-bold ${
                  viewGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ({viewGrowth >= 0 ? "+" : ""}
                {viewGrowth}%)
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Click & Inbox</span>
            <MousePointerClick className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(latest?.linkClicks ?? 0).toLocaleString("vi-VN")}{" "}
            <span className="text-sm font-bold text-slate-400">/</span>{" "}
            <span className="text-emerald-600">
              {(latest?.inboxMessages ?? 0).toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Click Link / Inbox mới
          </div>
        </div>
      </div>

      {/* Main Visual Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Biểu đồ xu hướng theo thời gian (chiếm 2 cột) */}
        <div className="xl:col-span-2 rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                📈 Biểu Đồ Xu Hướng Theo Lần Đồng Bộ ({snapshotsChronological.length} mốc)
              </h2>
              <p className="text-[11px] text-slate-500">
                Di chuột vào từng điểm để xem chính xác số liệu theo thời gian thực
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold">
              {(
                [
                  ["REACH", "Reach / Hiển thị"],
                  ["ENGAGEMENT", "Tương tác"],
                  ["FOLLOWERS", "Followers"],
                  ["MEDIA", "Video / Trang"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMetricTab(k)}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                    metricTab === k
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <TrendSvgChart points={snapshotsChronological} tab={metricTab} />
        </div>

        {/* Biểu đồ Donut cơ cấu tương tác */}
        <div className="rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              🍩 Cơ Cấu Tương Tác & Chuyển Đổi
            </h2>
            <p className="text-[11px] text-slate-500">
              Tỷ trọng Cảm xúc / Bình luận / Chia sẻ / Click / Inbox lần sync mới nhất
            </p>
          </div>
          <EngagementDonutChart snap={latest} />
        </div>
      </div>

      <FanpageTopPostsAndFunnelSection
        funnelSteps={funnelSteps}
        funnelBase={funnelBase}
        topPosts={topPosts}
        maxPostReach={maxPostReach}
      />

      <FanpageSyncHistoryTable snapshotsNewestFirst={snapshotsNewestFirst} />
    </div>
  );
}
