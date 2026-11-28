"use client";

import Image from "next/image";
import {
  AlarmClock,
  AlarmClockPlus,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Forward,
  Quote,
  Repeat,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import {
  getStickerNameFromContent,
  isImageOrStickerAttachment,
  isPureEmojiMessage,
  isStickerMessage,
} from "@/lib/chat-stickers";
import type {
  ChatMessageItem,
  ChatParticipantUser,
  ChatReminderItem,
  ChatReminderRepeatRule,
  ChatRoomSummary,
} from "@/types/crm";

function formatChatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatReminderDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getReminderCalendarTile(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "--", month: "--" };
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "--";
  const month = parts.find((p) => p.type === "month")?.value ?? "--";
  return { day, month: `Th${month}` };
}

const REPEAT_BADGE: Record<ChatReminderRepeatRule, string | null> = {
  NONE: null,
  DAILY: "Hàng ngày",
  WEEKLY: "Hàng tuần",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderMessageTextWithLinks(
  text: string,
  isMine: boolean,
  mentionNames: string[]
) {
  const sortedNames = [...mentionNames].sort((a, b) => b.length - a.length);
  const mentionPattern =
    sortedNames.length > 0
      ? `@(?:${sortedNames.map(escapeRegExp).join("|")})`
      : "";
  const combinedRegex = mentionPattern
    ? new RegExp(`(https?:\\/\\/[^\\s]+|${mentionPattern})`, "gi")
    : /(https?:\/\/[^\s]+)/gi;

  const parts = text.split(combinedRegex);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-medium ${
            isMine
              ? "text-amber-200 hover:text-white"
              : "text-sky-600 hover:text-sky-800"
          }`}
        >
          {part}
        </a>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={idx}
          className={`inline-block rounded px-1 py-0.5 font-extrabold ${
            isMine ? "bg-amber-300/25 text-amber-200" : "bg-sky-100 text-sky-800"
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

interface ChatMessageStreamProps {
  activeRoom: ChatRoomSummary;
  displayedMessages: ChatMessageItem[];
  reminders: ChatReminderItem[];
  highlightedMessageId: string | null;
  hasAnyMessages: boolean;
  loadingRoom: boolean;
  msgSearchOpen: boolean;
  msgSearchQuery: string;
  mentionNames: string[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  getDirectPeer: (room: ChatRoomSummary) => ChatParticipantUser | null;
  getRoomDisplayTitle: (room: ChatRoomSummary) => string;
  onMobileBack: () => void;
  onToggleMsgSearch: () => void;
  onMsgSearchQueryChange: (q: string) => void;
  onOpenGroupSettings: () => void;
  onRecallMessage: (messageId: string) => void;
  onReplyMessage: (message: ChatMessageItem) => void;
  onForwardMessage: (message: ChatMessageItem) => void;
  onCreateReminderFromMessage: (message: ChatMessageItem) => void;
  onOpenReminders: (mode: "LIST" | "CREATE") => void;
  onToggleReminderComplete: (reminderId: string, isCompleted: boolean) => void;
  onJumpToMessage: (messageId: string) => void;
  onOpenLightbox: (url: string) => void;
}

export function ChatMessageStream({
  activeRoom,
  displayedMessages,
  reminders,
  highlightedMessageId,
  hasAnyMessages,
  loadingRoom,
  msgSearchOpen,
  msgSearchQuery,
  mentionNames,
  messagesEndRef,
  getDirectPeer,
  getRoomDisplayTitle,
  onMobileBack,
  onToggleMsgSearch,
  onMsgSearchQueryChange,
  onOpenGroupSettings,
  onRecallMessage,
  onReplyMessage,
  onForwardMessage,
  onCreateReminderFromMessage,
  onOpenReminders,
  onToggleReminderComplete,
  onJumpToMessage,
  onOpenLightbox,
}: ChatMessageStreamProps) {
  const directPeer = getDirectPeer(activeRoom);

  const activeReminders = reminders
    .filter((r) => !r.isCompleted)
    .sort(
      (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
    );
  const nextReminder = activeReminders[0] ?? null;
  const reminderById = new Map(reminders.map((r) => [r.id, r]));

  return (
    <>
      {/* Header phòng chat (chuẩn app nhắn tin trên Mobile + Desktop) */}
      <div className="pt-safe md:pt-0 border-b border-amber-100 bg-[#FFFDF7] shrink-0">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onMobileBack}
              className="md:hidden w-9 h-9 -ml-1 rounded-full text-slate-700 hover:bg-amber-100 active:bg-amber-200/70 flex items-center justify-center cursor-pointer shrink-0 transition"
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {activeRoom.isAnonymousThread ? (
              <div className="w-9 h-9 rounded-full bg-indigo-950 text-amber-300 border-2 border-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <EyeOff className="w-4 h-4" />
              </div>
            ) : activeRoom.type === "DIRECT" && directPeer ? (
              <PirateAvatar
                name={directPeer.name}
                color={directPeer.avatarColor}
                scope={directPeer.departmentScope}
                pirateCharacter={directPeer.pirateCharacter}
                size="md"
                animate={false}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#0B2545] text-amber-300 border-2 border-amber-300 flex items-center justify-center shrink-0">
                {activeRoom.name?.includes("Ẩn Danh") ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 min-w-0">
                <span className="truncate">{getRoomDisplayTitle(activeRoom)}</span>
                {activeRoom.isAnonymousThread ? (
                  <span className="hidden lg:inline-flex rounded-full bg-indigo-900 text-amber-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                    🔒 Bảo mật
                  </span>
                ) : (
                  activeRoom.allowAnonymous && (
                    <span className="hidden lg:inline-flex rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 text-[10px] font-bold shrink-0">
                      🕵️ Hỗ trợ Ẩn danh
                    </span>
                  )
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {activeRoom.isAnonymousThread
                  ? activeRoom.isAnonymousSender
                    ? `Bạn đang ẩn danh (${activeRoom.anonymousAlias || "🎭 Hải Tặc Bí Ẩn"}) • Người nhận không thấy tên bạn`
                    : "Tin nhắn ẩn danh • Bạn có thể trả lời trực tiếp tại đây"
                  : activeRoom.type === "DIRECT"
                    ? "Đang hoạt động • Chat 1-1"
                    : `${activeRoom.participants.length} thành viên${
                        activeRoom.allowAnonymous ? " • 🕵️ Ẩn danh" : ""
                      }`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onOpenReminders(activeReminders.length > 0 ? "LIST" : "CREATE")
              }
              className={`relative w-8 h-8 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 rounded-full xl:rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                activeReminders.length > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                  : "bg-white border-amber-200 hover:bg-amber-50 text-slate-700"
              }`}
              title="Tạo & quản lý nhắc hẹn trong phòng"
              aria-label="Nhắc hẹn"
            >
              <AlarmClock className="w-4 h-4 xl:w-3.5 xl:h-3.5 text-amber-600" />
              <span className="hidden xl:inline">Nhắc hẹn</span>
              {activeReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 xl:static min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold inline-flex items-center justify-center">
                  {activeReminders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleMsgSearch}
              className={`w-8 h-8 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 rounded-full xl:rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                msgSearchOpen
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "bg-white border-amber-200 hover:bg-amber-50 text-slate-700"
              }`}
              title="Tìm kiếm tin nhắn cũ trong phòng"
              aria-label="Tìm tin nhắn"
            >
              <Search className="w-4 h-4 xl:w-3.5 xl:h-3.5" />
              <span className="hidden xl:inline">Tìm tin</span>
            </button>

            {activeRoom.type === "GROUP" && (
              <button
                type="button"
                onClick={onOpenGroupSettings}
                className="w-8 h-8 xl:w-auto xl:h-auto xl:px-2.5 xl:py-1.5 rounded-full xl:rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
                title="Cài đặt nhóm & Thành viên"
                aria-label="Cài đặt nhóm & Thành viên"
              >
                <Settings2 className="w-4 h-4 xl:w-3.5 xl:h-3.5 text-amber-700" />
                <span className="hidden xl:inline">Thành viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thanh ghim Nhắc hẹn sắp tới ngay dưới header */}
      {nextReminder && (
        <div className="px-3 sm:px-4 py-2 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-[#FFFBF0] to-amber-50/70 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenReminders("LIST")}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group/pin"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlarmClock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-slate-900 truncate group-hover/pin:text-amber-800">
                {nextReminder.title}
              </div>
              <div className="text-[10px] font-semibold text-amber-800 flex items-center gap-1.5 truncate">
                <span>{formatReminderDateTime(nextReminder.remindAt)}</span>
                {activeReminders.length > 1 && (
                  <span className="rounded-full bg-amber-200/80 text-amber-950 px-1.5 py-0.2 text-[9px] font-extrabold">
                    +{activeReminders.length - 1} hẹn khác
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleReminderComplete(nextReminder.id, true)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
              title="Đánh dấu hoàn thành nhắc hẹn này"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Xong</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenReminders("CREATE")}
              className="rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 p-1.5 cursor-pointer transition"
              title="Thêm nhắc hẹn mới"
              aria-label="Thêm nhắc hẹn mới"
            >
              <AlarmClockPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {msgSearchOpen && (
        <div className="px-4 py-2 border-b border-amber-100 bg-sky-50/50 flex items-center gap-2 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={msgSearchQuery}
            onChange={(e) => onMsgSearchQueryChange(e.target.value)}
            placeholder="Gõ từ khóa tin nhắn cũ hoặc tên người gửi..."
            className="flex-1 bg-white rounded-lg border border-slate-200 px-2.5 py-1 text-xs focus:border-sky-400 focus:outline-none"
          />
          {msgSearchQuery && (
            <span className="text-[11px] font-bold text-sky-700 shrink-0">
              {displayedMessages.length} kết quả
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onMsgSearchQueryChange("");
              onToggleMsgSearch();
            }}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Luồng tin nhắn */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-4 space-y-3 bg-gradient-to-b from-[#FFFDF7]/60 to-sky-50/30">
        {activeRoom.isAnonymousThread && (
          <div className="mx-auto max-w-md rounded-2xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-center text-[11px] text-indigo-900 shadow-2xs">
            {activeRoom.isAnonymousSender ? (
              <>
                <span className="font-extrabold">🕵️ Hội thoại ẩn danh tách biệt:</span>{" "}
                Mọi tin nhắn bạn gửi ở đây hiển thị với{" "}
                <strong>{directPeer?.name || "người nhận"}</strong> dưới tên{" "}
                <strong className="text-indigo-700">
                  {activeRoom.anonymousAlias || "🎭 Hải Tặc Bí Ẩn"}
                </strong>{" "}
                — không bao giờ lộ tên hay avatar thật của bạn.
              </>
            ) : (
              <>
                <span className="font-extrabold">🎭 Tin nhắn ẩn danh bảo mật:</span>{" "}
                Danh tính người gửi được ẩn hoàn toàn khỏi hệ thống hiển thị. Bạn có thể phản hồi trực tiếp ngay tại cuộc hội thoại này.
              </>
            )}
          </div>
        )}

        {loadingRoom && !hasAnyMessages ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Đang tải cuộc trò chuyện...
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {msgSearchQuery
              ? `Không tìm thấy tin nhắn nào khớp "${msgSearchQuery}".`
              : "Chưa có tin nhắn nào. Gửi lời chào hoặc bật 🕵️ Ẩn danh để gửi tâm tư bí mật!"}
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const mine = msg.isMine;
            const isHighlighted = highlightedMessageId === msg.id;

            if (msg.isDeleted) {
              return (
                <div
                  key={msg.id}
                  data-msg-id={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] italic text-slate-400">
                    Tin nhắn đã được thu hồi
                  </div>
                </div>
              );
            }

            const darkBubble = mine || msg.isAnonymous;
            const stickerMsg = isStickerMessage(msg.content, msg.attachmentUrl);
            const pureEmojiMsg =
              !msg.attachmentUrl &&
              !msg.reminder &&
              !msg.replyTo &&
              !msg.forwardedFrom &&
              isPureEmojiMessage(msg.content);

            const renderQuotePreview = () => {
              if (!msg.replyTo) return null;
              const r = msg.replyTo;
              const replyIsImg =
                r.attachmentUrl && isImageOrStickerAttachment(r.attachmentUrl);
              const replyPreviewText = r.isDeleted
                ? "Tin nhắn đã được thu hồi"
                : isStickerMessage(r.content, r.attachmentUrl)
                  ? `[Sticker] ${getStickerNameFromContent(r.content)}`
                  : r.content || "📎 Đính kèm";

              return (
                <button
                  type="button"
                  onClick={() => onJumpToMessage(r.id)}
                  className={`mb-2 w-full text-left rounded-xl px-2.5 py-1.5 border-l-[3px] flex items-center gap-2 transition cursor-pointer ${
                    darkBubble
                      ? "bg-white/10 hover:bg-white/15 border-amber-300 text-white"
                      : "bg-amber-50/90 hover:bg-amber-100/80 border-sky-500 text-slate-800"
                  }`}
                  title="Bấm để nhảy tới tin nhắn gốc"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[10px] font-extrabold truncate ${
                        darkBubble ? "text-amber-300" : "text-sky-700"
                      }`}
                    >
                      {r.senderName}
                    </div>
                    <div
                      className={`text-[11px] line-clamp-2 break-words ${
                        r.isDeleted ? "italic opacity-70" : "opacity-90"
                      }`}
                    >
                      {replyPreviewText}
                    </div>
                  </div>
                  {replyIsImg && r.attachmentUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.attachmentUrl}
                      alt=""
                      className="w-8 h-8 rounded-md object-cover shrink-0 border border-black/10"
                    />
                  )}
                </button>
              );
            };

            const renderForwardedHeader = () => {
              if (!msg.forwardedFrom) return null;
              return (
                <div
                  className={`mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold italic ${
                    darkBubble ? "text-amber-200/90" : "text-sky-700"
                  }`}
                >
                  <Forward className="w-3 h-3 shrink-0" />
                  <span>Chia sẻ từ {msg.forwardedFrom}</span>
                </div>
              );
            };

            const renderBubbleBody = () => {
              if (msg.reminder) {
                const liveRem = reminderById.get(msg.reminder.reminderId);
                const remTitle = liveRem?.title ?? msg.reminder.title;
                const remAt = liveRem?.remindAt ?? msg.reminder.remindAt;
                const remRepeat =
                  liveRem?.repeatRule ?? msg.reminder.repeatRule;
                const remCompleted = liveRem?.isCompleted ?? false;
                const remExists = Boolean(liveRem);
                const tile = getReminderCalendarTile(remAt);
                const repeatLabel = REPEAT_BADGE[remRepeat];

                return (
                  <div
                    className={`w-[260px] sm:w-[300px] max-w-full rounded-2xl border-2 overflow-hidden shadow-sm bg-white ${
                      remCompleted
                        ? "border-slate-200 opacity-85"
                        : "border-amber-300"
                    }`}
                  >
                    {msg.forwardedFrom && (
                      <div className="px-3 pt-2 text-[10px] font-bold italic text-sky-700 flex items-center gap-1">
                        <Forward className="w-3 h-3 shrink-0" />
                        <span>Chia sẻ từ {msg.forwardedFrom}</span>
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 flex items-center justify-between gap-2 ${
                        remCompleted
                          ? "bg-slate-100 text-slate-600"
                          : "bg-gradient-to-r from-[#0B2545] to-slate-800 text-amber-300"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold inline-flex items-center gap-1">
                        <AlarmClock className="w-3.5 h-3.5" />
                        NHẮC HẸN
                      </span>
                      <div className="flex items-center gap-1">
                        {repeatLabel && (
                          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold inline-flex items-center gap-0.5">
                            <Repeat className="w-2.5 h-2.5" />
                            {repeatLabel}
                          </span>
                        )}
                        {remCompleted && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-extrabold">
                            ✓ Đã xong
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex items-start gap-2.5">
                      <div className="w-11 rounded-xl border border-amber-200 bg-amber-50 text-center overflow-hidden shrink-0">
                        <div className="bg-amber-500 text-white text-[9px] font-extrabold py-0.5 uppercase">
                          {tile.month}
                        </div>
                        <div className="text-base font-black text-slate-900 py-0.5 leading-tight">
                          {tile.day}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs sm:text-sm font-extrabold break-words ${
                            remCompleted
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {remTitle}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-800 mt-0.5">
                          {formatReminderDateTime(remAt)}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 py-2 border-t border-amber-100 bg-amber-50/40 flex items-center justify-between gap-1.5">
                      {remExists ? (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleReminderComplete(
                              msg.reminder!.reminderId,
                              !remCompleted
                            )
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                            remCompleted
                              ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {remCompleted ? "Mở lại" : "Đánh dấu xong"}
                        </button>
                      ) : msg.forwardedFrom ? (
                        <span className="text-[10px] italic text-sky-700 font-semibold">
                          Nhắc hẹn được chia sẻ
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">
                          Đã gỡ khỏi danh sách
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenReminders("LIST")}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
                      >
                        Xem tất cả
                      </button>
                    </div>
                  </div>
                );
              }

              if (stickerMsg && msg.attachmentUrl) {
                const stickerLabel = getStickerNameFromContent(msg.content);
                return (
                  <div
                    className={`flex flex-col ${
                      mine ? "items-end" : "items-start"
                    } gap-1`}
                  >
                    {(msg.forwardedFrom || msg.replyTo) && (
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-xs max-w-[260px] ${
                          darkBubble
                            ? "bg-[#0B2545] text-white"
                            : "bg-white border border-amber-200 text-slate-800"
                        }`}
                      >
                        {renderForwardedHeader()}
                        {renderQuotePreview()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(msg.attachmentUrl!)}
                      title={stickerLabel}
                      className={`group/stk block p-1 rounded-2xl transition hover:scale-105 cursor-pointer ${
                        msg.pending ? "opacity-70" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.attachmentUrl}
                        alt={stickerLabel}
                        className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-sm select-none"
                      />
                    </button>
                  </div>
                );
              }

              if (pureEmojiMsg) {
                return (
                  <div
                    className={`px-1 py-0.5 text-3xl sm:text-4xl leading-none tracking-wide select-text transition-opacity ${
                      msg.pending ? "opacity-70" : ""
                    }`}
                  >
                    {msg.content}
                  </div>
                );
              }

              return (
                <div
                  className={`rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words transition-opacity ${
                    msg.pending ? "opacity-75" : ""
                  } ${
                    msg.isAnonymous
                      ? mine
                        ? "bg-indigo-900 text-amber-50 border border-indigo-500 rounded-br-sm"
                        : "bg-indigo-950 text-indigo-50 border border-indigo-700 rounded-bl-sm"
                      : mine
                        ? "bg-[#0B2545] text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-amber-200/80 rounded-bl-sm"
                  }`}
                >
                  {renderForwardedHeader()}
                  {renderQuotePreview()}

                  {renderMessageTextWithLinks(
                    msg.content,
                    darkBubble,
                    mentionNames
                  )}

                  {msg.attachmentUrl && (
                    <div className="mt-2 pt-1.5 border-t border-white/15">
                      {isImageOrStickerAttachment(msg.attachmentUrl) ? (
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(msg.attachmentUrl!)}
                          className="block rounded-xl overflow-hidden border border-black/10 hover:opacity-95 cursor-pointer"
                        >
                          <Image
                            src={msg.attachmentUrl}
                            alt="Ảnh đính kèm"
                            width={320}
                            height={240}
                            unoptimized
                            className="max-h-56 w-auto object-cover rounded-xl"
                          />
                        </button>
                      ) : (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-bold underline ${
                            darkBubble ? "text-amber-300" : "text-sky-600"
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Mở link đính kèm
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className={`group flex items-end gap-2 transition-all duration-500 ${
                  mine ? "justify-end" : "justify-start"
                } ${
                  isHighlighted
                    ? "bg-amber-200/60 ring-2 ring-amber-400 rounded-2xl p-1.5 -mx-1.5"
                    : ""
                }`}
              >
                {!mine &&
                  (msg.isAnonymous ? (
                    <div
                      className="w-7 h-7 rounded-full bg-indigo-950 text-amber-300 border-2 border-indigo-400 flex items-center justify-center text-xs shrink-0 shadow-sm"
                      title="Thuyền viên ẩn danh"
                    >
                      🎭
                    </div>
                  ) : msg.sender ? (
                    <PirateAvatar
                      name={msg.sender.name}
                      color={msg.sender.avatarColor}
                      scope={msg.sender.departmentScope}
                      pirateCharacter={msg.sender.pirateCharacter}
                      size="sm"
                      animate={false}
                    />
                  ) : null)}

                <div
                  className={`max-w-[86%] sm:max-w-[78%] space-y-1 ${
                    mine ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
                    {msg.isAnonymous ? (
                      <span className="font-bold text-indigo-700 inline-flex items-center gap-1 flex-wrap">
                        <EyeOff className="w-2.5 h-2.5 shrink-0" />
                        <span>{msg.anonymousAlias || "🎭 Hải Tặc Bí Ẩn"}</span>
                        {mine && (
                          <span className="rounded bg-indigo-100 text-indigo-700 px-1 py-0.5 text-[9px] font-bold">
                            Bạn · ẩn với người khác
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-700">
                        {mine ? "Bạn" : msg.sender?.name || "Đồng đội"}
                      </span>
                    )}
                    <span>
                      •{" "}
                      {msg.pending ? "Đang gửi..." : formatChatTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Bubble + Thanh nút hành động kiểu Zalo (Desktop: nổi kế bên khi hover; Mobile: gọn ngay dưới bubble, 0 tràn ngang) */}
                  <div
                    className={`flex flex-col gap-1 sm:items-center sm:gap-1.5 ${
                      mine
                        ? "items-end sm:flex-row-reverse"
                        : "items-start sm:flex-row"
                    }`}
                  >
                    <div className="max-w-full sm:max-w-[480px]">
                      {renderBubbleBody()}
                    </div>

                    {!msg.pending && (
                      <div
                        className={`flex items-center gap-1 shrink-0 transition-opacity duration-150 opacity-85 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
                      >
                        <button
                          type="button"
                          onClick={() => onReplyMessage(msg)}
                          title="Trả lời"
                          aria-label="Trả lời tin nhắn"
                          className="w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-xs hover:bg-sky-50 hover:border-sky-300 text-sky-600 flex items-center justify-center transition cursor-pointer"
                        >
                          <Quote className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onForwardMessage(msg)}
                          title="Chia sẻ đến người khác hoặc nhóm"
                          aria-label="Chia sẻ tin nhắn"
                          className="w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-xs hover:bg-sky-50 hover:border-sky-300 text-slate-600 hover:text-sky-700 flex items-center justify-center transition cursor-pointer"
                        >
                          <Forward className="w-3.5 h-3.5" />
                        </button>

                        {!msg.reminder && (
                          <button
                            type="button"
                            onClick={() => onCreateReminderFromMessage(msg)}
                            title="Tạo nhắc hẹn từ tin nhắn này"
                            aria-label="Tạo nhắc hẹn từ tin nhắn"
                            className="w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-xs hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-700 flex items-center justify-center transition cursor-pointer"
                          >
                            <AlarmClock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {mine && (
                          <button
                            type="button"
                            onClick={() => onRecallMessage(msg.id)}
                            title="Thu hồi tin nhắn này"
                            aria-label="Thu hồi tin nhắn"
                            className="w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-xs hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
