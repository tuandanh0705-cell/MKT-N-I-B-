"use client";

import Link from "next/link";
import { BarChart2, BarChart3 } from "lucide-react";
import type { ParsedTopPost } from "@/lib/meta-csv-parser";

export interface FanpageWeeklyRow {
  channelId: string;
  name: string;
  pageUrl: string;
  project?: { id: string; name: string; color: string } | null;
  managedBy?: { id: string; name: string } | null;
  followers: number;
  followersDelta: number;
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
  topPosts: ParsedTopPost[];
  sentToLeaderAt: string | null;
}

export interface FanpageMonthlyRow {
  channelId: string;
  name: string;
  pageUrl: string;
  project?: { id: string; name: string; color: string } | null;
  currentFollowers: number;
  newFollowers: number;
  followersGrowth: number;
  totalReach: number;
  totalImpressions: number;
  totalPageViews: number;
  totalVideoViews: number;
  totalLinkClicks: number;
  totalInbox: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalPosts: number;
  bestPostTitle: string | null;
  bestPostUrl: string | null;
  topPosts: ParsedTopPost[];
}

interface FanpageReportsTablesProps {
  period: "WEEKLY" | "MONTHLY";
  weekStart: string;
  weekEnd: string;
  monthKey: string;
  fanpageWeekly: FanpageWeeklyRow[];
  fanpageMonthly: FanpageMonthlyRow[];
  onOpenTopPosts: (payload: { pageName: string; posts: ParsedTopPost[] }) => void;
}

export function FanpageReportsTables({
  period,
  weekStart,
  weekEnd,
  monthKey,
  fanpageWeekly,
  fanpageMonthly,
  onOpenTopPosts,
}: FanpageReportsTablesProps) {
  if (period === "WEEKLY") {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-200/80 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-blue-100">
          <h2 className="text-sm font-extrabold text-slate-900">
            📈 Báo Cáo Data Fanpage Tuần ({weekStart} → {weekEnd})
          </h2>
        </div>
        <table className="w-full text-left border-collapse text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] uppercase">
              <th className="py-2.5 px-2.5 xl:px-3.5">Fanpage</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Followers (+/-)</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Reach / Hiển thị</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Xem Trang / Video 3s</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Tương tác (ER%)</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">React / Cmt / Share</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Click / Inbox</th>
              <th className="py-2.5 px-2.5 xl:px-3.5">Số bài &amp; Top Post</th>
              <th className="py-2.5 px-2.5 xl:px-3.5 whitespace-nowrap">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fanpageWeekly.map((r) => (
              <tr key={r.channelId} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-2.5 xl:px-3.5">
                  <Link
                    href={`/fanpage-reports/${r.channelId}`}
                    className="font-bold text-slate-900 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    {r.name}
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </Link>
                  {r.project && (
                    <div className="text-[11px] text-slate-500">
                      {r.project.name}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 whitespace-nowrap">
                  <div className="font-bold text-slate-900">
                    {r.followers.toLocaleString("vi-VN")}
                  </div>
                  <div
                    className={`text-[11px] font-bold ${
                      r.followersDelta >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {r.followersDelta >= 0 ? "+" : ""}
                    {r.followersDelta.toLocaleString("vi-VN")}
                    {r.newFollowers > 0 ? ` (+${r.newFollowers} mới)` : ""}
                  </div>
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 whitespace-nowrap">
                  <div className="font-bold text-blue-700">
                    {r.reach.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {r.impressions.toLocaleString("vi-VN")} hiển thị
                  </div>
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 text-xs whitespace-nowrap">
                  <div>
                    Xem trang:{" "}
                    <strong>{r.pageViews.toLocaleString("vi-VN")}</strong>
                  </div>
                  <div className="text-slate-500">
                    Video 3s:{" "}
                    <strong>{r.videoViews.toLocaleString("vi-VN")}</strong>
                  </div>
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 whitespace-nowrap">
                  <div className="font-bold text-slate-900">
                    {r.engagement.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] font-semibold text-violet-700">
                    ER: {r.engagementRate}%
                  </div>
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 text-xs text-slate-600 whitespace-nowrap">
                  {r.reactions} / {r.comments} / {r.shares}
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 text-xs whitespace-nowrap">
                  <div>
                    Click:{" "}
                    <strong>{r.linkClicks.toLocaleString("vi-VN")}</strong>
                  </div>
                  <div className="text-emerald-700 font-semibold">
                    Inbox: {r.inboxMessages.toLocaleString("vi-VN")}
                  </div>
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 max-w-[175px] text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    {r.postsCount} bài
                  </div>
                  {r.topPostTitle && (
                    <div className="line-clamp-1 text-slate-600">
                      {r.topPostTitle}
                    </div>
                  )}
                  {r.topPosts.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTopPosts({
                          pageName: r.name,
                          posts: r.topPosts,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      <BarChart2 className="w-3 h-3" />
                      Xem {r.topPosts.length} bài chi tiết
                    </button>
                  )}
                </td>
                <td className="py-2.5 px-2.5 xl:px-3.5 text-xs whitespace-nowrap">
                  {r.sentToLeaderAt ? (
                    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-bold">
                      Đã gửi Leader
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 font-semibold">
                      Bản nháp
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200/80 shadow-sm overflow-x-auto">
      <div className="px-5 py-4 border-b border-indigo-100">
        <h2 className="text-sm font-extrabold text-slate-900">
          🗓️ Báo Cáo Tổng Kết Data Fanpage Tháng {monthKey}
        </h2>
      </div>
      <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[1000px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase">
            <th className="py-3 px-4">Fanpage</th>
            <th className="py-3 px-4">Followers (Tăng)</th>
            <th className="py-3 px-4">Tổng Reach / Hiển thị</th>
            <th className="py-3 px-4">Xem Trang / Video 3s</th>
            <th className="py-3 px-4">Tổng Tương tác (ER)</th>
            <th className="py-3 px-4">Tổng Click / Inbox</th>
            <th className="py-3 px-4">Tổng Bài & Bài Top</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fanpageMonthly.map((r) => (
            <tr key={r.channelId} className="hover:bg-slate-50/70">
              <td className="py-3 px-4 font-bold text-slate-900">
                <Link
                  href={`/fanpage-reports/${r.channelId}`}
                  className="hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  {r.name}
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                </Link>
              </td>
              <td className="py-3 px-4">
                <div className="font-bold text-slate-900">
                  {r.currentFollowers.toLocaleString("vi-VN")}
                </div>
                <div
                  className={`text-[11px] font-bold ${
                    r.followersGrowth >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {r.followersGrowth >= 0 ? "+" : ""}
                  {r.followersGrowth.toLocaleString("vi-VN")}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="font-bold text-blue-700">
                  {r.totalReach.toLocaleString("vi-VN")}
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.totalImpressions.toLocaleString("vi-VN")} hiển thị
                </div>
              </td>
              <td className="py-3 px-4 text-xs">
                <div>Xem trang: {r.totalPageViews.toLocaleString("vi-VN")}</div>
                <div>Video 3s: {r.totalVideoViews.toLocaleString("vi-VN")}</div>
              </td>
              <td className="py-3 px-4">
                <div className="font-bold text-slate-900">
                  {r.totalEngagement.toLocaleString("vi-VN")}
                </div>
                <div className="text-[11px] text-violet-700 font-semibold">
                  ER TB: {r.avgEngagementRate}%
                </div>
              </td>
              <td className="py-3 px-4 text-xs">
                <div>Click: {r.totalLinkClicks.toLocaleString("vi-VN")}</div>
                <div className="text-emerald-700 font-semibold">
                  Inbox: {r.totalInbox.toLocaleString("vi-VN")}
                </div>
              </td>
              <td className="py-3 px-4 max-w-[230px] text-xs space-y-1">
                <div className="font-semibold">{r.totalPosts} bài</div>
                {r.bestPostTitle && (
                  <div className="line-clamp-1 text-slate-600">
                    {r.bestPostTitle}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
