"use client";

import { useState } from "react";
import { Copy, ExternalLink, Send, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { parseMetaCopiedText, type ParsedTopPost } from "@/lib/meta-csv-parser";
import type { FanpageChannelItem, SimpleProject, SimpleUser } from "@/types/crm";

export interface ManualSnapshotPayload {
  followers: number;
  newFollowers: number;
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
  postsCount: number;
  topPostTitle: string;
  topPostUrl: string;
}

export interface ManualModalTarget {
  channel: FanpageChannelItem;
  overrides?: Partial<ManualSnapshotPayload>;
}

function buildManualInitialState(target: ManualModalTarget) {
  const latest = target.channel.snapshots?.[0];
  const ov = target.overrides || {};
  return {
    followers: ov.followers ?? latest?.followers ?? target.channel.followers ?? 0,
    newFollowers: ov.newFollowers ?? latest?.newFollowers ?? 0,
    reach: ov.reach ?? latest?.reach ?? 0,
    impressions: ov.impressions ?? latest?.impressions ?? 0,
    pageViews: ov.pageViews ?? latest?.pageViews ?? 0,
    videoViews: ov.videoViews ?? latest?.videoViews ?? 0,
    linkClicks: ov.linkClicks ?? latest?.linkClicks ?? 0,
    inboxMessages: ov.inboxMessages ?? latest?.inboxMessages ?? 0,
    engagement: ov.engagement ?? latest?.engagement ?? 0,
    reactions: ov.reactions ?? latest?.reactions ?? 0,
    comments: ov.comments ?? latest?.comments ?? 0,
    shares: ov.shares ?? latest?.shares ?? 0,
    postsCount: ov.postsCount ?? latest?.postsCount ?? 0,
    topTitle: ov.topPostTitle ?? latest?.topPostTitle ?? "",
    topUrl: ov.topPostUrl ?? latest?.topPostUrl ?? "",
  };
}

export function FanpageTopPostsDrawer({
  drawer,
  onClose,
}: {
  drawer: { pageName: string; posts: ParsedTopPost[] } | null;
  onClose: () => void;
}) {
  if (!drawer) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              📊 Top Bài Viết — {drawer.pageName}
            </h3>
            <p className="text-xs text-slate-500">
              Chi tiết Reach, Tương tác & Clicks từng bài đã cào / import từ Meta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drawer.posts.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-slate-900">
                  #{i + 1} • {p.title}
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline shrink-0 inline-flex items-center gap-1 font-semibold"
                  >
                    Xem bài <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                <span>
                  Reach: <strong>{p.reach.toLocaleString("vi-VN")}</strong>
                </span>
                <span>
                  Tương tác:{" "}
                  <strong>{p.engagement.toLocaleString("vi-VN")}</strong>
                </span>
                <span>
                  👍 {p.reactions} • 💬 {p.comments} • ↗️ {p.shares}
                </span>
                {p.clicks > 0 && <span>🔗 Click: {p.clicks}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FanpageGuideModal({
  open,
  origin,
  ingestSecret,
  onClose,
}: {
  open: boolean;
  origin: string;
  ingestSecret: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border-2 border-blue-200 shadow-2xl overflow-hidden text-xs">
        <div className="px-5 py-3.5 bg-[#0B2545] text-white flex items-center justify-between">
          <span className="font-bold text-sm">
            📖 Cách Lấy 100% Số Liệu Fanpage (Không Cần Developer Portal!)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto text-slate-700 leading-relaxed">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-1.5">
            <div className="font-bold text-indigo-950 text-sm">
              Cách 1 (Nhanh nhất — 3 giây, không tải file): Copy &amp; Paste từ Meta Business Suite
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Mở{" "}
                <a
                  href="https://business.facebook.com/latest/insights"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 underline font-bold"
                >
                  business.facebook.com/latest/insights
                </a>{" "}
                bằng nick Facebook đang quản lý Fanpage (bỏ qua hoàn toàn developers.facebook.com).
              </li>
              <li>
                Chọn Fanpage và khoảng ngày Tuần/Tháng → bấm <strong>Ctrl + A</strong> rồi{" "}
                <strong>Ctrl + C</strong> toàn trang.
              </li>
              <li>
                Quay lại CRM bấm <strong>&ldquo;Dán / Chốt số liệu&rdquo;</strong> → dán (
                <strong>Ctrl + V</strong>) vào ô Dán nhanh ở trên cùng: hệ thống tự điền Reach, Lượt xem, Followers, Tương tác, Xem trang, Video 3s, Click link, Inbox!
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
            <div className="font-bold text-emerald-900 text-sm">
              Cách 2 (Đầy đủ nhất kèm Top 10 bài đăng): Export CSV từ Meta Business Suite
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Trong <strong>business.facebook.com</strong> → mục{" "}
                <strong>Thông tin chi tiết (Insights)</strong> → tab{" "}
                <strong>Nội dung (Content)</strong> hoặc <strong>Tổng quan</strong>.
              </li>
              <li>
                Chọn tuần/tháng → bấm nút <strong>Xuất dữ liệu (Export Data) → Tải file CSV</strong>.
              </li>
              <li>
                Bấm nút xanh <strong>&ldquo;📥 Import CSV Meta&rdquo;</strong> trên thẻ Fanpage → tự động hút 100% chỉ số và Top 10 bài đăng!
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
            <div className="font-bold text-amber-950 text-sm">
              Cách 3 (1-Click trên trình duyệt): Bookmarklet vượt chặn CSP
            </div>
            <p>
              Bấm nút <strong>&ldquo;🔖 Bookmarklet 1-Click&rdquo;</strong> ở thanh công cụ → lưu thành dấu trang Chrome. Khi đang mở trang Meta Business Suite / Fanpage, bấm dấu trang đó để tự hút số liệu sang tab CRM xác nhận lưu (không bị Facebook chặn bảo mật CSP).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1 text-[11px] text-slate-600">
            <div className="font-bold text-slate-800">
              Nâng cao (Tự động chạy ngầm / API ngoài):
            </div>
            <p>
              Nếu dùng Apify Scraper / Google Apps Script / Make.com, gửi{" "}
              <code className="bg-white px-1 rounded">
                POST {origin}/api/fanpages/ingest
              </code>{" "}
              kèm header{" "}
              <code className="bg-white px-1 rounded">
                x-ingest-secret: {ingestSecret || "(chưa tải)"}
              </code>
              . Graph API Token trong nút Sửa Fanpage chỉ dùng thêm nếu có tài khoản mở được Developer Portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FanpageEditModal({
  open,
  editingPage,
  projects,
  users,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingPage: FanpageChannelItem | null;
  projects: SimpleProject[];
  users: SimpleUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [pageName, setPageName] = useState(editingPage?.name || "");
  const [pageUrl, setPageUrl] = useState(editingPage?.pageUrl || "");
  const [pageId, setPageId] = useState(editingPage?.pageId || "");
  const [pageToken, setPageToken] = useState("");
  const [pageProjectId, setPageProjectId] = useState(
    editingPage?.projectId || projects[0]?.id || ""
  );
  const [pageManagerId, setPageManagerId] = useState(
    editingPage?.managedById || users[0]?.id || ""
  );
  const [prevKey, setPrevKey] = useState<string>(
    `${open ? "1" : "0"}:${editingPage?.id || "new"}`
  );

  const currentKey = `${open ? "1" : "0"}:${editingPage?.id || "new"}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (open) {
      setPageName(editingPage?.name || "");
      setPageUrl(editingPage?.pageUrl || "");
      setPageId(editingPage?.pageId || "");
      setPageToken("");
      setPageProjectId(editingPage?.projectId || projects[0]?.id || "");
      setPageManagerId(editingPage?.managedById || users[0]?.id || "");
    }
  }

  if (!open) return null;

  async function handleSaveFanpage(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/fanpages", {
      method: editingPage ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingPage
          ? {
              id: editingPage.id,
              name: pageName,
              pageUrl,
              pageId: pageId || null,
              accessToken: pageToken ? pageToken : undefined,
              managedById: pageManagerId || null,
            }
          : {
              name: pageName,
              pageUrl,
              pageId: pageId || null,
              accessToken: pageToken || null,
              projectId: pageProjectId || null,
              managedById: pageManagerId || null,
            }
      ),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(
        editingPage
          ? `Đã cập nhật Fanpage "${data.channel.name}"!`
          : `Đã thêm Fanpage "${data.channel.name}"!`
      );
      onClose();
      onSaved();
    } else {
      showToast(data.error || "Không lưu được Fanpage.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSaveFanpage}
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl border-2 border-blue-200 shadow-2xl p-5 space-y-3.5 text-xs"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {editingPage ? "✏️ Sửa Thông Tin Fanpage" : "➕ Thêm Fanpage Quản Lý"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Tên Fanpage *
          </label>
          <input
            type="text"
            required
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            placeholder="VD: Inpro AI - Phần Mềm Doanh Nghiệp"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Link Fanpage Facebook *
          </label>
          <input
            type="url"
            required
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://www.facebook.com/..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!editingPage && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Thuộc Dự án
              </label>
              <select
                value={pageProjectId}
                onChange={(e) => setPageProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">-- Kênh chung Team --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={editingPage ? "col-span-2" : ""}>
            <label className="block font-bold text-slate-700 mb-1">
              Người phụ trách
            </label>
            <select
              value={pageManagerId}
              onChange={(e) => setPageManagerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Page ID (Số ID Fanpage trên Facebook — nên điền để gọi Graph API chuẩn)
          </label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="vd: 109482716..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Page Access Token (Graph API — bỏ trống nếu giữ nguyên)
          </label>
          <input
            type="password"
            value={pageToken}
            onChange={(e) => setPageToken(e.target.value)}
            placeholder="EAA..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold cursor-pointer"
          >
            Lưu Fanpage
          </button>
        </div>
      </form>
    </div>
  );
}

export function FanpageManualModal({
  target,
  channels,
  syncingId,
  onSelectChannel,
  onClose,
  onSubmit,
}: {
  target: ManualModalTarget | null;
  channels: FanpageChannelItem[];
  syncingId: string | null;
  onSelectChannel: (ch: FanpageChannelItem) => void;
  onClose: () => void;
  onSubmit: (
    channelId: string,
    payload: ManualSnapshotPayload,
    sendToLeader: boolean
  ) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [prevTarget, setPrevTarget] = useState<ManualModalTarget | null>(null);
  const [mFollowers, setMFollowers] = useState(0);
  const [mNewFollowers, setMNewFollowers] = useState(0);
  const [mReach, setMReach] = useState(0);
  const [mImpressions, setMImpressions] = useState(0);
  const [mPageViews, setMPageViews] = useState(0);
  const [mVideoViews, setMVideoViews] = useState(0);
  const [mLinkClicks, setMLinkClicks] = useState(0);
  const [mInboxMessages, setMInboxMessages] = useState(0);
  const [mEngagement, setMEngagement] = useState(0);
  const [mReactions, setMReactions] = useState(0);
  const [mComments, setMComments] = useState(0);
  const [mShares, setMShares] = useState(0);
  const [mPostsCount, setMPostsCount] = useState(0);
  const [mTopTitle, setMTopTitle] = useState("");
  const [mTopUrl, setMTopUrl] = useState("");
  const [mSendToLeader, setMSendToLeader] = useState(true);
  const [quickPasteText, setQuickPasteText] = useState("");

  if (prevTarget !== target) {
    setPrevTarget(target);
    if (target) {
      const init = buildManualInitialState(target);
      setQuickPasteText("");
      setMFollowers(init.followers);
      setMNewFollowers(init.newFollowers);
      setMReach(init.reach);
      setMImpressions(init.impressions);
      setMPageViews(init.pageViews);
      setMVideoViews(init.videoViews);
      setMLinkClicks(init.linkClicks);
      setMInboxMessages(init.inboxMessages);
      setMEngagement(init.engagement);
      setMReactions(init.reactions);
      setMComments(init.comments);
      setMShares(init.shares);
      setMPostsCount(init.postsCount);
      setMTopTitle(init.topTitle);
      setMTopUrl(init.topUrl);
      setMSendToLeader(true);
    }
  }

  if (!target) return null;

  function handleQuickPasteChange(text: string) {
    setQuickPasteText(text);
    if (!text.trim()) return;
    const parsed = parseMetaCopiedText(text);
    let hits = 0;
    if (parsed.followers) { setMFollowers(parsed.followers); hits++; }
    if (parsed.newFollowers) { setMNewFollowers(parsed.newFollowers); hits++; }
    if (parsed.reach) { setMReach(parsed.reach); hits++; }
    if (parsed.impressions) { setMImpressions(parsed.impressions); hits++; }
    if (parsed.pageViews) { setMPageViews(parsed.pageViews); hits++; }
    if (parsed.videoViews) { setMVideoViews(parsed.videoViews); hits++; }
    if (parsed.engagement) { setMEngagement(parsed.engagement); hits++; }
    if (parsed.linkClicks) { setMLinkClicks(parsed.linkClicks); hits++; }
    if (parsed.inboxMessages) { setMInboxMessages(parsed.inboxMessages); hits++; }
    if (parsed.reactions) { setMReactions(parsed.reactions); hits++; }
    if (parsed.comments) { setMComments(parsed.comments); hits++; }
    if (parsed.shares) { setMShares(parsed.shares); hits++; }
    if (hits > 0) {
      showToast(`Đã tự bóc tách ${hits} chỉ số từ Meta Business Suite!`);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    await onSubmit(
      target.channel.id,
      {
        followers: mFollowers,
        newFollowers: mNewFollowers,
        reach: mReach,
        impressions: mImpressions,
        pageViews: mPageViews,
        videoViews: mVideoViews,
        linkClicks: mLinkClicks,
        inboxMessages: mInboxMessages,
        engagement: mEngagement,
        reactions: mReactions,
        comments: mComments,
        shares: mShares,
        postsCount: mPostsCount,
        topPostTitle: mTopTitle,
        topPostUrl: mTopUrl,
      },
      mSendToLeader
    );
  }

  const numericFields: Array<{
    label: string;
    value: number;
    onChange: (v: number) => void;
  }> = [
    { label: "Tổng Followers", value: mFollowers, onChange: setMFollowers },
    { label: "Follower mới (Tuần)", value: mNewFollowers, onChange: setMNewFollowers },
    { label: "Reach (Tiếp cận)", value: mReach, onChange: setMReach },
    { label: "Impressions (Hiển thị)", value: mImpressions, onChange: setMImpressions },
    { label: "Lượt Xem Trang", value: mPageViews, onChange: setMPageViews },
    { label: "Video Views (3s+)", value: mVideoViews, onChange: setMVideoViews },
    { label: "Tổng Tương tác", value: mEngagement, onChange: setMEngagement },
    { label: "Click Link / CTA", value: mLinkClicks, onChange: setMLinkClicks },
    { label: "Tin nhắn Inbox mới", value: mInboxMessages, onChange: setMInboxMessages },
    { label: "Reactions", value: mReactions, onChange: setMReactions },
    { label: "Comments", value: mComments, onChange: setMComments },
    { label: "Shares", value: mShares, onChange: setMShares },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleFormSubmit}
        className="relative z-10 w-full max-w-xl bg-white rounded-2xl border-2 border-blue-200 shadow-2xl p-5 space-y-3.5 text-xs max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            📋 Dán / Chốt Số Liệu — {target.channel.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {channels.length > 1 && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Chọn Fanpage lưu báo cáo
            </label>
            <select
              value={target.channel.id}
              onChange={(e) => {
                const found = channels.find((c) => c.id === e.target.value);
                if (found) onSelectChannel(found);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white font-semibold"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.project?.name || "Chung"})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 space-y-1.5">
          <label className="block font-bold text-indigo-950">
            ⚡ Dán nhanh toàn trang Meta Business Suite (Ctrl+A → Ctrl+C tại{" "}
            <a
              href="https://business.facebook.com/latest/insights"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-indigo-700"
            >
              business.facebook.com
            </a>
            )
          </label>
          <textarea
            rows={3}
            value={quickPasteText}
            onChange={(e) => handleQuickPasteChange(e.target.value)}
            placeholder="Dán (Ctrl+V) toàn bộ nội dung copy từ trang Tổng quan / Insights của Meta Business Suite vào đây... Hệ thống tự tách Reach, Lượt xem, Followers, Tương tác, Video 3s, Click link, Inbox!"
            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[11px]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {numericFields.map((field) => (
            <div key={field.label}>
              <label className="block font-bold text-slate-700 mb-1">
                {field.label}
              </label>
              <input
                type="number"
                min={0}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Số bài đã đăng tuần
            </label>
            <input
              type="number"
              min={0}
              value={mPostsCount}
              onChange={(e) => setMPostsCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Bài nổi bật nhất tuần
            </label>
            <input
              type="text"
              value={mTopTitle}
              onChange={(e) => setMTopTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Link bài nổi bật
          </label>
          <input
            type="url"
            value={mTopUrl}
            onChange={(e) => setMTopUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <label className="inline-flex items-center gap-2 font-semibold text-blue-800 cursor-pointer">
          <input
            type="checkbox"
            checked={mSendToLeader}
            onChange={(e) => setMSendToLeader(e.target.checked)}
          />
          Gửi thông báo & chuông điện thoại báo cáo số liệu cho Leader ngay
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={Boolean(syncingId)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Lưu & Gửi Leader
          </button>
        </div>
      </form>
    </div>
  );
}

export function FanpageBookmarkletModal({
  open,
  bookmarkletCode,
  onClose,
}: {
  open: boolean;
  bookmarkletCode: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl border-2 border-amber-300 shadow-2xl p-5 space-y-3.5 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            🔖 Bookmarklet Cào Fanpage 1-Click
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Copy mã dưới đây → tạo dấu trang Chrome (URL = mã này) → mở tab{" "}
          <strong>business.facebook.com/latest/insights</strong> hoặc trang Fanpage rồi bấm vào dấu trang: CRM sẽ tự mở tab Chốt số liệu với dữ liệu đã hút sẵn (không bị Facebook CSP chặn)!
        </p>
        <textarea
          readOnly
          rows={4}
          value={bookmarkletCode}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(bookmarkletCode);
              showToast("Đã copy mã Bookmarklet!");
            }}
            className="rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Mã Bookmarklet
          </button>
        </div>
      </div>
    </div>
  );
}
