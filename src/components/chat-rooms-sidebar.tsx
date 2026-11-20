"use client";

import { EyeOff, Pin, Search, Users } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import type { ChatParticipantUser, ChatRoomSummary } from "@/types/crm";

function formatRoomShortDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

interface ChatRoomsSidebarProps {
  teammates: ChatParticipantUser[];
  filteredRooms: ChatRoomSummary[];
  activeRoomId: string | null;
  mobileShowChat: boolean;
  searchQuery: string;
  filterTab: "ALL" | "GROUP" | "DIRECT";
  onSearchQueryChange: (q: string) => void;
  onFilterTabChange: (tab: "ALL" | "GROUP" | "DIRECT") => void;
  onStartDirectChat: (userId: string) => void;
  onSelectRoom: (roomId: string) => void;
  getDirectPeer: (room: ChatRoomSummary) => ChatParticipantUser | null;
  getRoomDisplayTitle: (room: ChatRoomSummary) => string;
}

export function ChatRoomsSidebar({
  teammates,
  filteredRooms,
  activeRoomId,
  mobileShowChat,
  searchQuery,
  filterTab,
  onSearchQueryChange,
  onFilterTabChange,
  onStartDirectChat,
  onSelectRoom,
  getDirectPeer,
  getRoomDisplayTitle,
}: ChatRoomsSidebarProps) {
  return (
    <div
      className={`md:col-span-4 lg:col-span-4 border-r border-amber-100 flex flex-col min-h-0 bg-[#FFFDF7] ${
        mobileShowChat ? "hidden md:flex" : "flex"
      }`}
    >
      {/* Nhắn nhanh 1-1 cho từng người */}
      <div className="p-3 border-b border-amber-100">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80 mb-2">
          Nhắn riêng 1-1 nhanh
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {teammates.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onStartDirectChat(member.id)}
              title={`Nhắn riêng cho ${member.name}`}
              className="flex flex-col items-center gap-1 shrink-0 w-14 group cursor-pointer"
            >
              <PirateAvatar
                name={member.name}
                color={member.avatarColor}
                scope={member.departmentScope}
                pirateCharacter={member.pirateCharacter}
                size="md"
                animate={false}
              />
              <span className="text-[10px] font-bold text-slate-700 group-hover:text-sky-600 truncate w-full text-center">
                {member.name.split(" ")[0] === "Chị"
                  ? "Hương"
                  : member.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tìm kiếm & Lọc */}
      <div className="p-3 space-y-2 border-b border-amber-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm nhóm hoặc tên đồng đội..."
            className="w-full rounded-xl border border-amber-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="flex gap-1">
          {[
            { id: "ALL" as const, label: "Tất cả" },
            { id: "GROUP" as const, label: "Nhóm" },
            { id: "DIRECT" as const, label: "Cá nhân 1-1" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onFilterTabChange(t.id)}
              className={`flex-1 rounded-lg py-1 text-[11px] font-bold transition cursor-pointer ${
                filterTab === t.id
                  ? "bg-[#0B2545] text-amber-300"
                  : "bg-amber-50 text-slate-600 hover:bg-amber-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách phòng */}
      <div className="flex-1 overflow-y-auto divide-y divide-amber-100/70">
        {filteredRooms.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Chưa có cuộc trò chuyện khớp tìm kiếm. Bấm vào avatar đồng đội phía trên để nhắn riêng!
          </div>
        ) : (
          filteredRooms.map((room) => {
            const peer = getDirectPeer(room);
            const selected = room.id === activeRoomId;
            const last = room.lastMessage;
            const previewText = !last
              ? "Chưa có tin nhắn nào"
              : last.isDeleted
                ? "Tin nhắn đã thu hồi"
                : last.isAnonymous
                  ? `${last.anonymousAlias || "🕵️ Ẩn danh"}: ${last.content}`
                  : `${last.isMine ? "Bạn" : last.sender?.name || "Ai đó"}: ${last.content}`;

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room.id)}
                className={`w-full text-left px-3.5 py-3 transition flex items-start gap-2.5 cursor-pointer ${
                  selected
                    ? "bg-amber-100/70 border-l-4 border-l-amber-500"
                    : "hover:bg-amber-50/60"
                }`}
              >
                {room.type === "DIRECT" && peer ? (
                  <PirateAvatar
                    name={peer.name}
                    color={peer.avatarColor}
                    scope={peer.departmentScope}
                    pirateCharacter={peer.pirateCharacter}
                    size="md"
                    animate={false}
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      room.name?.includes("Ẩn Danh")
                        ? "bg-indigo-900 text-amber-300 border-indigo-400"
                        : "bg-[#0B2545] text-amber-300 border-amber-300"
                    }`}
                  >
                    {room.name?.includes("Ẩn Danh") ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1">
                      {room.isPinned && (
                        <Pin className="w-3 h-3 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">{getRoomDisplayTitle(room)}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRoomShortDate(room.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 truncate">
                      {previewText}
                    </span>
                    {room.unreadCount > 0 && (
                      <span className="rounded-full bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 min-w-[18px] text-center shrink-0">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
