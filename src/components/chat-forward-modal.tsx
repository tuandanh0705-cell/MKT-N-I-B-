"use client";

import { useMemo, useState } from "react";
import { Check, EyeOff, Forward, Search, Users, X } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import {
  getStickerNameFromContent,
  isImageOrStickerAttachment,
  isStickerMessage,
} from "@/lib/chat-stickers";
import type {
  ChatMessageItem,
  ChatParticipantUser,
  ChatRoomSummary,
} from "@/types/crm";

interface ChatForwardMessageModalProps {
  message: ChatMessageItem | null;
  rooms: ChatRoomSummary[];
  teammates: ChatParticipantUser[];
  onClose: () => void;
  onForwarded: (payload: {
    forwardedCount: number;
    targetRoomIds: string[];
    createdRooms: ChatRoomSummary[];
    messagesByRoom: Record<string, ChatMessageItem[]>;
  }) => void;
}

export function ChatForwardMessageModal(props: ChatForwardMessageModalProps) {
  if (!props.message) return null;
  return (
    <ChatForwardMessageModalInner
      key={props.message.id}
      {...props}
      message={props.message}
    />
  );
}

function ChatForwardMessageModalInner({
  message,
  rooms,
  teammates,
  onClose,
  onForwarded,
}: Omit<ChatForwardMessageModalProps, "message"> & {
  message: ChatMessageItem;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const groupRooms = useMemo(
    () =>
      rooms.filter((r) => {
        if (r.type !== "GROUP") return false;
        if (!search.trim()) return true;
        return (r.name || "").toLowerCase().includes(search.trim().toLowerCase());
      }),
    [rooms, search]
  );

  const filteredTeammates = useMemo(
    () =>
      teammates.filter((u) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          (u.title || "").toLowerCase().includes(q)
        );
      }),
    [teammates, search]
  );

  const totalSelected = selectedRoomIds.length + selectedUserIds.length;
  const senderLabel = message.isAnonymous
    ? message.anonymousAlias || "🎭 Hải Tặc Bí Ẩn"
    : message.isMine
      ? "Bạn"
      : message.sender?.name || "Đồng đội";

  const stickerMsg = isStickerMessage(message.content, message.attachmentUrl);
  const previewText = stickerMsg
    ? `[Sticker] ${getStickerNameFromContent(message.content)}`
    : message.content || "📎 Đính kèm";

  function toggleRoom(id: string) {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message || totalSelected === 0 || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/chat/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          targetRoomIds: selectedRoomIds,
          targetUserIds: selectedUserIds,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể chia sẻ tin nhắn.", "error");
        return;
      }
      onForwarded(data);
      showToast(
        `Đã chia sẻ tin nhắn tới ${data.forwardedCount} cuộc trò chuyện.`,
        "success"
      );
      onClose();
    } catch {
      showToast("Lỗi kết nối khi chia sẻ tin nhắn.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] rounded-2xl bg-white border-2 border-amber-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-amber-100 bg-[#FFFDF7] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Forward className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Chia sẻ tin nhắn
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Chọn 1 hoặc nhiều nhóm chat / đồng đội để chuyển tiếp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Xem trước tin nhắn sẽ chia sẻ */}
        <div className="px-4 py-2.5 bg-amber-50/60 border-b border-amber-100 shrink-0">
          <div className="rounded-xl border border-amber-200/80 bg-white px-3 py-2 flex items-center gap-2.5">
            <div className="w-1 self-stretch rounded-full bg-sky-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                {message.isAnonymous && (
                  <EyeOff className="w-3 h-3 text-indigo-600 shrink-0" />
                )}
                <span className="truncate">{senderLabel}</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 break-words mt-0.5">
                {previewText}
              </p>
            </div>
            {message.attachmentUrl &&
              isImageOrStickerAttachment(message.attachmentUrl) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={message.attachmentUrl}
                  alt="Ảnh xem trước"
                  className="w-10 h-10 rounded-lg object-cover border border-amber-200 shrink-0"
                />
              )}
          </div>
        </div>

        {/* Ô tìm kiếm */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nhóm chat hoặc tên đồng đội..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Danh sách chọn nhiều */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">
            {/* Nhóm chat */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Nhóm chat ({groupRooms.length})
              </div>
              {groupRooms.length === 0 ? (
                <p className="text-xs text-slate-400 py-1.5">
                  Không có nhóm chat phù hợp.
                </p>
              ) : (
                <div className="space-y-1">
                  {groupRooms.map((room) => {
                    const checked = selectedRoomIds.includes(room.id);
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => toggleRoom(room.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                          checked
                            ? "bg-sky-50 border-sky-300"
                            : "bg-white border-transparent hover:bg-amber-50/70"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            checked
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#0B2545] text-amber-300 border border-amber-300 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {room.name || "Nhóm chat"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {room.participants.length} thành viên
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Đồng đội 1-1 */}
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Đồng đội — Chat 1-1 ({filteredTeammates.length})
              </div>
              {filteredTeammates.length === 0 ? (
                <p className="text-xs text-slate-400 py-1.5">
                  Không tìm thấy đồng đội nào.
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredTeammates.map((member) => {
                    const checked = selectedUserIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleUser(member.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                          checked
                            ? "bg-sky-50 border-sky-300"
                            : "bg-white border-transparent hover:bg-amber-50/70"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            checked
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <PirateAvatar
                          name={member.name}
                          color={member.avatarColor}
                          scope={member.departmentScope}
                          pirateCharacter={member.pirateCharacter}
                          size="sm"
                          animate={false}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {member.name}
                          </div>
                          {member.title && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {member.title}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ghi chú đính kèm + Nút gửi */}
          <div className="px-4 py-3 border-t border-amber-100 bg-[#FFFDF7] space-y-2.5 shrink-0">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm lời nhắn gửi kèm (không bắt buộc)..."
              maxLength={500}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs sm:text-sm focus:border-sky-400 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {totalSelected > 0
                  ? `Đã chọn ${totalSelected} nơi nhận`
                  : "Chưa chọn người nhận"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={totalSelected === 0 || submitting}
                  className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Forward className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? "Đang chia sẻ..."
                      : totalSelected > 0
                        ? `Chia sẻ (${totalSelected})`
                        : "Chia sẻ"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
