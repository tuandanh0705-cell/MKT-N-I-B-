"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ExternalLink,
  EyeOff,
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
  onOpenLightbox: (url: string) => void;
}

export function ChatMessageStream({
  activeRoom,
  displayedMessages,
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
  onOpenLightbox,
}: ChatMessageStreamProps) {
  const directPeer = getDirectPeer(activeRoom);

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
              onClick={onToggleMsgSearch}
              className={`w-9 h-9 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                msgSearchOpen
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "bg-white border-amber-200 hover:bg-amber-50 text-slate-700"
              }`}
              title="Tìm kiếm tin nhắn cũ trong phòng"
              aria-label="Tìm tin nhắn"
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Tìm tin</span>
            </button>

            {activeRoom.type === "GROUP" && (
              <button
                type="button"
                onClick={onOpenGroupSettings}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
                aria-label="Cài đặt nhóm & Thành viên"
              >
                <Settings2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Thành viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

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

            if (msg.isDeleted) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] italic text-slate-400">
                    Tin nhắn đã được thu hồi
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-2 ${
                  mine ? "justify-end" : "justify-start"
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
                  className={`max-w-[85%] sm:max-w-[68%] space-y-1 ${
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
                      • {msg.pending ? "Đang gửi..." : formatChatTime(msg.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mine && !msg.pending && (
                      <button
                        type="button"
                        onClick={() => onRecallMessage(msg.id)}
                        title="Thu hồi tin nhắn này"
                        className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    {(() => {
                      const stickerMsg = isStickerMessage(
                        msg.content,
                        msg.attachmentUrl
                      );
                      const pureEmojiMsg =
                        !msg.attachmentUrl && isPureEmojiMessage(msg.content);

                      if (stickerMsg && msg.attachmentUrl) {
                        const stickerLabel = getStickerNameFromContent(msg.content);
                        return (
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
                          {renderMessageTextWithLinks(
                            msg.content,
                            mine || msg.isAnonymous,
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
                                    mine || msg.isAnonymous
                                      ? "text-amber-300"
                                      : "text-sky-600"
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
                    })()}
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
