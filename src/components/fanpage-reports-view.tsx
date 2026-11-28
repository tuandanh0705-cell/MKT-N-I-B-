"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  Printer,
  RefreshCw,
  Plus,
  ExternalLink,
  Trash2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Upload,
  HelpCircle,
  BarChart3,
  ClipboardPaste,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import {
  FanpageReportsTables,
  type FanpageMonthlyRow,
  type FanpageWeeklyRow,
} from "@/components/fanpage-reports-tables";
import {
  FanpageBookmarkletModal,
  FanpageEditModal,
  FanpageGuideModal,
  FanpageManualModal,
  FanpageTopPostsDrawer,
  type ManualModalTarget,
  type ManualSnapshotPayload,
} from "@/components/fanpage-reports-modals";
import { useToast } from "@/components/toast-provider";
import { formatVnDateTime, shiftVnWeekStart } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";
import type { ParsedTopPost } from "@/lib/meta-csv-parser";
import type { FanpageChannelItem, SimpleProject, SimpleUser } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export function FanpageReportsView({
  initialWeekStart,
  initialWeekEnd,
  initialMonthKey,
  projects,
  users,
  currentUserId,
  currentUserRole,
  toneMode,
  initialBookmarkletJson,
}: {
  initialWeekStart: string;
  initialWeekEnd: string;
  initialMonthKey: string;
  projects: SimpleProject[];
  users: SimpleUser[];
  currentUserId: string;
  currentUserRole: UserRole;
  toneMode?: string;
  initialBookmarkletJson?: string | null;
}) {
  const { showToast } = useToast();

  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [weekEnd, setWeekEnd] = useState(initialWeekEnd);
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [loading, setLoading] = useState(true);

  const [channels, setChannels] = useState<FanpageChannelItem[]>([]);
  const [fanpageWeekly, setFanpageWeekly] = useState<FanpageWeeklyRow[]>([]);
  const [fanpageMonthly, setFanpageMonthly] = useState<FanpageMonthlyRow[]>([]);
  const [ingestSecret, setIngestSecret] = useState("");

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [postsDrawer, setPostsDrawer] = useState<{
    pageName: string;
    posts: ParsedTopPost[];
  } | null>(null);

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<FanpageChannelItem | null>(null);
  const [manualModalTarget, setManualModalTarget] =
    useState<ManualModalTarget | null>(null);
  const [bmConsumed, setBmConsumed] = useState(false);
  const [deleteChannelTarget, setDeleteChannelTarget] =
    useState<FanpageChannelItem | null>(null);

  const applyData = useCallback(
    (data: {
      weekStart: string;
      weekEnd: string;
      fanpageReport: {
        channels: FanpageChannelItem[];
        weekly: FanpageWeeklyRow[];
        monthly: FanpageMonthlyRow[];
        ingestSecret: string;
      };
    }) => {
      setWeekStart(data.weekStart);
      setWeekEnd(data.weekEnd);
      setChannels(data.fanpageReport.channels || []);
      setFanpageWeekly(data.fanpageReport.weekly || []);
      setFanpageMonthly(data.fanpageReport.monthly || []);
      setIngestSecret(data.fanpageReport.ingestSecret || "");
    },
    []
  );

  const loadFanpages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/overview?scope=fanpage&weekStart=${encodeURIComponent(
          weekStart
        )}&month=${encodeURIComponent(monthKey)}`
      );
      if (res.ok) applyData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [weekStart, monthKey, applyData]);

  useEffect(() => {
    let active = true;
    fetch(
      `/api/reports/overview?scope=fanpage&weekStart=${encodeURIComponent(
        weekStart
      )}&month=${encodeURIComponent(monthKey)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        applyData(data);
        const list: FanpageChannelItem[] = data?.fanpageReport?.channels || [];
        if (initialBookmarkletJson && !bmConsumed && list.length > 0) {
          setBmConsumed(true);
          try {
            const bm = JSON.parse(initialBookmarkletJson) as {
              pageUrl?: string;
              pageTitle?: string;
              followers?: number;
              newFollowers?: number;
              reach?: number;
              impressions?: number;
              pageViews?: number;
              videoViews?: number;
              engagement?: number;
              linkClicks?: number;
              inboxMessages?: number;
              reactions?: number;
              comments?: number;
              shares?: number;
            };
            const urlLower = (bm.pageUrl || "").toLowerCase();
            const titleLower = (bm.pageTitle || "").toLowerCase();
            const matched = list.find(
              (c) =>
                (c.pageId && urlLower.includes(c.pageId.toLowerCase())) ||
                (c.pageUrl && urlLower.includes(c.pageUrl.toLowerCase())) ||
                titleLower.includes(c.name.toLowerCase())
            );
            if (!matched) {
              showToast(
                `Không tìm thấy Fanpage khớp với "${bm.pageTitle || bm.pageUrl || "trang đang mở"}". Hãy kiểm tra lại Tên/Link Fanpage trên CRM trước khi đồng bộ!`,
                "error"
              );
              return;
            }
            setManualModalTarget({
              channel: matched,
              overrides: {
                ...(bm.followers ? { followers: bm.followers } : {}),
                ...(bm.newFollowers ? { newFollowers: bm.newFollowers } : {}),
                ...(bm.reach ? { reach: bm.reach } : {}),
                ...(bm.impressions ? { impressions: bm.impressions } : {}),
                ...(bm.pageViews ? { pageViews: bm.pageViews } : {}),
                ...(bm.videoViews ? { videoViews: bm.videoViews } : {}),
                ...(bm.engagement ? { engagement: bm.engagement } : {}),
                ...(bm.linkClicks ? { linkClicks: bm.linkClicks } : {}),
                ...(bm.inboxMessages ? { inboxMessages: bm.inboxMessages } : {}),
                ...(bm.reactions ? { reactions: bm.reactions } : {}),
                ...(bm.comments ? { comments: bm.comments } : {}),
                ...(bm.shares ? { shares: bm.shares } : {}),
              },
            });
            showToast(
              `Bookmarklet đã hút dữ liệu cho "${matched.name}" — kiểm tra & bấm Lưu!`
            );
          } catch {
            // ignore invalid bookmarklet payload
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    weekStart,
    monthKey,
    applyData,
    initialBookmarkletJson,
    bmConsumed,
    showToast,
  ]);

  function openAddPage() {
    setEditingPage(null);
    setPageModalOpen(true);
  }

  function openEditPage(ch: FanpageChannelItem) {
    setEditingPage(ch);
    setPageModalOpen(true);
  }

  async function triggerRealtimeSync(
    channel: FanpageChannelItem,
    sendToLeader: boolean
  ) {
    setSyncingId(channel.id);
    try {
      const res = await fetch("/api/fanpages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          mode: "AUTO",
          sendToLeader,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || "Đã cào số liệu Realtime thành công!");
      } else {
        showToast(
          data.message ||
            "Meta chặn quét trực tiếp — hãy Import CSV từ Meta Business Suite hoặc gắn Page Token.",
          "info"
        );
      }
      loadFanpages();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleImportMetaCsv(channel: FanpageChannelItem, file: File) {
    setSyncingId(channel.id);
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
        )}, ER ${data.parsedSummary.engagementRate}%) & báo Leader!`
      );
      loadFanpages();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSaveManualSnapshot(
    channelId: string,
    manualSnapshot: ManualSnapshotPayload,
    sendToLeader: boolean
  ) {
    setSyncingId(channelId);
    try {
      const res = await fetch("/api/fanpages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          mode: "MANUAL",
          sendToLeader,
          manualSnapshot,
        }),
      });
      if (res.ok) {
        showToast(
          sendToLeader
            ? "Đã lưu đầy đủ số liệu Fanpage & Gửi báo cáo cho Leader!"
            : "Đã cập nhật số liệu Fanpage!"
        );
        setManualModalTarget(null);
        loadFanpages();
      }
    } finally {
      setSyncingId(null);
    }
  }

  async function confirmDeleteChannel() {
    if (!deleteChannelTarget) return;
    const res = await fetch(`/api/fanpages?id=${deleteChannelTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Đã gỡ Fanpage khỏi danh sách.");
      setDeleteChannelTarget(null);
      loadFanpages();
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const bookmarkletCode = `javascript:(function(){var t=document.body.innerText||'';function p(s){if(!s)return 0;var c=s.trim().toLowerCase().replace(/\\u00a0/g,' ');var m=c.match(/^([\\d.,]+)(?:[ \\t]*(k|n|m|tr|trieu|triệu)(?![a-zA-Z]))?/i);if(!m)return 0;var n=m[1],u=(m[2]||'').toLowerCase();if(u){n=/^\\d+[.,]\\d{1,2}$/.test(n)?n.replace(',','.'):n.replace(/[.,]/g,'');return Math.round((parseFloat(n)||0)*(u==='k'||u==='n'?1000:1000000));}return Number(n.replace(/[.,]/g,''))||0;}function g(re){var m=t.match(re);return m&&m[1]?p(m[1]):0;}var num='([\\\\d.,]+(?:[ \\\\t]*(?:K|M|k|m|tr|triệu)(?![a-zA-Z]))?)';var gap='[\\\\s:\\\\n]{0,40}';var payload={pageUrl:location.href,pageTitle:document.title,followers:g(new RegExp(num+'\\\\s*(?:người theo dõi|followers)','i')),newFollowers:g(new RegExp('(?:Người theo dõi mới|Lượt thích Trang mới|Follows|New followers)'+gap+num,'i')),reach:g(new RegExp('(?:Người tiếp cận|Số người tiếp cận|Reach|Accounts reached)'+gap+num,'i')),impressions:g(new RegExp('(?:Lượt xem|Lượt hiển thị|Views|Impressions)'+gap+num,'i')),pageViews:g(new RegExp('(?:Lượt truy cập trang|Page visits|Profile visits)'+gap+num,'i')),videoViews:g(new RegExp('(?:Lượt xem video 3 giây|Lượt xem 3 giây|3-second video views)'+gap+num,'i')),engagement:g(new RegExp('(?:Lượt tương tác với nội dung|Lượt tương tác|Content interactions|Interactions)'+gap+num,'i')),linkClicks:g(new RegExp('(?:Lượt click vào liên kết|Link clicks)'+gap+num,'i')),inboxMessages:g(new RegExp('(?:Cuộc trò chuyện qua tin nhắn đã bắt đầu|Tin nhắn mới|Messaging conversations started|Messaging conversations)'+gap+num,'i'))};window.open('${origin}/fanpage-reports?bm='+encodeURIComponent(JSON.stringify(payload)),'_blank');})();`;

  function handleExportCsv() {
    if (period === "WEEKLY") {
      downloadCsv(
        `bao-cao-data-fanpage-tuan-${weekStart}.csv`,
        [
          "Fanpage",
          "Du an",
          "Followers",
          "Tang truong",
          "Follower moi",
          "Bo theo doi",
          "Reach",
          "Impressions",
          "Luot xem trang",
          "Video Views",
          "Tuong tac",
          "ER (%)",
          "Reactions",
          "Comments",
          "Shares",
          "Click Link",
          "Inbox moi",
          "So bai",
          "Bai noi bat",
        ],
        fanpageWeekly.map((f) => [
          f.name,
          f.project?.name || "Chung",
          f.followers,
          f.followersDelta,
          f.newFollowers,
          f.unfollows,
          f.reach,
          f.impressions,
          f.pageViews,
          f.videoViews,
          f.engagement,
          f.engagementRate,
          f.reactions,
          f.comments,
          f.shares,
          f.linkClicks,
          f.inboxMessages,
          f.postsCount,
          f.topPostTitle || "",
        ])
      );
      showToast("Đã xuất CSV Data Fanpage Tuần đầy đủ!");
    } else {
      downloadCsv(
        `bao-cao-data-fanpage-thang-${monthKey}.csv`,
        [
          "Fanpage",
          "Du an",
          "Followers hien tai",
          "Follower moi thang",
          "Tang truong rong",
          "Tong Reach",
          "Tong Impressions",
          "Tong Xem trang",
          "Tong Video Views",
          "Tong Tuong tac",
          "ER TB (%)",
          "Tong Click Link",
          "Tong Inbox",
          "Tong Bai dang",
          "Bai hieu qua nhat",
        ],
        fanpageMonthly.map((f) => [
          f.name,
          f.project?.name || "Chung",
          f.currentFollowers,
          f.newFollowers,
          f.followersGrowth,
          f.totalReach,
          f.totalImpressions,
          f.totalPageViews,
          f.totalVideoViews,
          f.totalEngagement,
          f.avgEngagementRate,
          f.totalLinkClicks,
          f.totalInbox,
          f.totalPosts,
          f.bestPostTitle || "",
        ])
      );
      showToast("Đã xuất CSV Data Fanpage Tháng đầy đủ!");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-blue-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              📈 Báo Cáo Dữ Liệu Fanpage Quản Lý (Full Chỉ Số → Tuần / Tháng)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Theo dõi Followers, Reach, Hiển thị, Xem trang, Video Views, Click Link, Tin nhắn Inbox & Top 10 Bài viết nổi bật.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              Cách lấy Full Data
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Xuất Excel (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In / Lưu PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 print:hidden">
          <div className="inline-flex rounded-xl bg-blue-50 border border-blue-200 p-0.5">
            <button
              type="button"
              onClick={() => setPeriod("WEEKLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                period === "WEEKLY"
                  ? "bg-blue-600 text-white"
                  : "text-blue-900"
              }`}
            >
              Số liệu Tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriod("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                period === "MONTHLY"
                  ? "bg-blue-600 text-white"
                  : "text-blue-900"
              }`}
            >
              Tổng kết Tháng
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBookmarkletModalOpen(true)}
              className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Bookmarklet 1-Click
            </button>
            <button
              type="button"
              onClick={openAddPage}
              className="rounded-xl bg-[#0B2545] text-amber-300 px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Fanpage
            </button>

            {period === "WEEKLY" ? (
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setWeekStart((w) => shiftVnWeekStart(w, -1))}
                  className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  {weekStart} → {weekEnd}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekStart((w) => shiftVnWeekStart(w, 1))}
                  className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="month"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold"
              />
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center text-sm text-slate-400">
          Đang tải dữ liệu Fanpage...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 print:hidden">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ch.project && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: ch.project.color }}
                        >
                          {ch.project.name}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ch.hasAccessToken
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {ch.hasAccessToken
                          ? "Đã gắn Graph API Token"
                          : "CSV Meta / Bookmarklet"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                      <Link
                        href={`/fanpage-reports/${ch.id}`}
                        className="hover:text-blue-700 hover:underline"
                      >
                        {ch.name}
                      </Link>
                    </h3>
                    <a
                      href={ch.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline truncate max-w-full"
                    >
                      {ch.pageUrl}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditPage(ch)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="Sửa / Gắn Page Access Token"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {(currentUserRole === "LEADER" ||
                      ch.managedById === currentUserId) && (
                      <button
                        type="button"
                        onClick={() => setDeleteChannelTarget(ch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa Fanpage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <Link
                  href={`/fanpage-reports/${ch.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40 p-2.5 text-xs transition group"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">Followers</div>
                      <div className="text-base font-black text-slate-900">
                        {ch.followers.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Lần sync cuối</div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        {ch.lastSyncedAt
                          ? formatVnDateTime(ch.lastSyncedAt)
                          : "Chưa sync"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-blue-700">
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Xem báo cáo chi tiết & Biểu đồ
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                {ch.lastSyncNote && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg border border-slate-100 px-2.5 py-1.5">
                    {ch.lastSyncNote}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={syncingId === ch.id}
                    onClick={() => triggerRealtimeSync(ch, true)}
                    className="col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        syncingId === ch.id ? "animate-spin" : ""
                      }`}
                    />
                    Cào Graph API Realtime & Gửi Leader
                  </button>

                  <label className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-2 text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer">
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Import CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImportMetaCsv(ch, file);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setManualModalTarget({ channel: ch })}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-2 py-2 text-[11px] font-bold cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                    <span>Dán / Chốt số</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <FanpageReportsTables
            period={period}
            weekStart={weekStart}
            weekEnd={weekEnd}
            monthKey={monthKey}
            fanpageWeekly={fanpageWeekly}
            fanpageMonthly={fanpageMonthly}
            onOpenTopPosts={setPostsDrawer}
          />
        </>
      )}

      <FanpageTopPostsDrawer
        drawer={postsDrawer}
        onClose={() => setPostsDrawer(null)}
      />

      <FanpageGuideModal
        open={guideOpen}
        origin={origin}
        ingestSecret={ingestSecret}
        onClose={() => setGuideOpen(false)}
      />

      <FanpageEditModal
        open={pageModalOpen}
        editingPage={editingPage}
        projects={projects}
        users={users}
        onClose={() => setPageModalOpen(false)}
        onSaved={loadFanpages}
      />

      <FanpageManualModal
        target={manualModalTarget}
        channels={channels}
        syncingId={syncingId}
        onSelectChannel={(ch) => setManualModalTarget({ channel: ch })}
        onClose={() => setManualModalTarget(null)}
        onSubmit={handleSaveManualSnapshot}
      />

      <FanpageBookmarkletModal
        open={bookmarkletModalOpen}
        bookmarkletCode={bookmarkletCode}
        onClose={() => setBookmarkletModalOpen(false)}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteChannelTarget)}
        itemName={deleteChannelTarget?.name || ""}
        toneMode={toneMode}
        permanentWarning
        onConfirm={confirmDeleteChannel}
        onCancel={() => setDeleteChannelTarget(null)}
      />
    </div>
  );
}
