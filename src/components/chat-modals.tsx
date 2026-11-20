"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, LogOut, X } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import type { ChatParticipantUser, ChatRoomSummary } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export function ChatCreateGroupModal({
  open,
  teammates,
  onClose,
  onCreated,
}: {
  open: boolean;
  teammates: ChatParticipantUser[];
  onClose: () => void;
  onCreated: (room: ChatRoomSummary) => void;
}) {
  const { showToast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupAllowAnon, setGroupAllowAnon] = useState(true);
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  if (!open) return null;

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (groupMemberIds.length === 0) {
      showToast("Chọn ít nhất 1 đồng đội để lập nhóm chat.", "info");
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          name: groupName,
          description: groupDesc || null,
          allowAnonymous: groupAllowAnon,
          participantIds: groupMemberIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được nhóm chat.", "error");
        return;
      }
      const created: ChatRoomSummary = data.room;
      setGroupName("");
      setGroupDesc("");
      setGroupMemberIds([]);
      setGroupAllowAnon(true);
      showToast(`Đã tạo nhóm "${created.name}".`);
      onCreated(created);
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleCreateGroup}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">
            🏴‍☠️ Tạo Nhóm Chat Mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên nhóm *
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Team Quay Dựng Olympic AI"
              className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả ngắn (tùy chọn)
            </label>
            <input
              type="text"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="VD: Chốt kịch bản, gửi footage & feedback nhanh"
              className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs font-semibold text-indigo-900 cursor-pointer">
            <input
              type="checkbox"
              checked={groupAllowAnon}
              onChange={(e) => setGroupAllowAnon(e.target.checked)}
            />
            <span>
              🕵️ Cho phép thành viên bật <strong>Chế độ Ẩn danh</strong> trong nhóm này
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Chọn thành viên tham gia ({groupMemberIds.length}/{teammates.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setGroupMemberIds(
                    groupMemberIds.length === teammates.length
                      ? []
                      : teammates.map((m) => m.id)
                  )
                }
                className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
              >
                {groupMemberIds.length === teammates.length
                  ? "Bỏ chọn hết"
                  : "Chọn cả băng"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {teammates.map((m) => {
                const checked = groupMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setGroupMemberIds((prev) =>
                        checked
                          ? prev.filter((id) => id !== m.id)
                          : [...prev, m.id]
                      )
                    }
                    className={`flex items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition cursor-pointer ${
                      checked
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 bg-white hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PirateAvatar
                        name={m.name}
                        color={m.avatarColor}
                        scope={m.departmentScope}
                        pirateCharacter={m.pirateCharacter}
                        size="sm"
                        animate={false}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {m.name}
                        </div>
                      </div>
                    </div>
                    {checked && (
                      <Check className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={creatingGroup}
            className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2 text-xs font-bold cursor-pointer"
          >
            {creatingGroup ? "Đang tạo..." : "Lập nhóm ngay"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ChatGroupSettingsModal({
  open,
  activeRoom,
  currentUserId,
  currentUserRole,
  teammates,
  onClose,
  onRoomUpdated,
  onLeftRoom,
}: {
  open: boolean;
  activeRoom: ChatRoomSummary | null;
  currentUserId: string;
  currentUserRole: UserRole;
  teammates: ChatParticipantUser[];
  onClose: () => void;
  onRoomUpdated: (roomId: string, updated: Partial<ChatRoomSummary>) => void;
  onLeftRoom: (roomId: string) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [editGroupName, setEditGroupName] = useState(activeRoom?.name || "");
  const [editGroupAllowAnon, setEditGroupAllowAnon] = useState(
    activeRoom?.allowAnonymous ?? true
  );
  const [addMemberId, setAddMemberId] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [prevSyncKey, setPrevSyncKey] = useState<string>(
    `${open ? "1" : "0"}:${activeRoom?.id || ""}`
  );

  const syncKey = `${open ? "1" : "0"}:${activeRoom?.id || ""}`;
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open && activeRoom) {
      setEditGroupName(activeRoom.name || "");
      setEditGroupAllowAnon(activeRoom.allowAnonymous);
      setAddMemberId("");
    }
  }

  const nonMemberTeammates = useMemo(() => {
    if (!activeRoom) return [];
    const existingIds = new Set(activeRoom.participants.map((p) => p.userId));
    return teammates.filter((u) => !existingIds.has(u.id));
  }, [activeRoom, teammates]);

  if (!open || !activeRoom || activeRoom.type !== "GROUP") return null;

  const isRoomAdminOrLeader = Boolean(
    currentUserRole === "LEADER" ||
      activeRoom.participants.find((p) => p.userId === currentUserId)?.isAdmin
  );

  async function handleUpdateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoom) return;
    setSavingGroup(true);
    try {
      const res = await fetch(`/api/chat/rooms/${activeRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupName,
          allowAnonymous: editGroupAllowAnon,
          addUserIds: addMemberId ? [addMemberId] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được nhóm.", "error");
        return;
      }
      if (data.room) {
        onRoomUpdated(activeRoom.id, data.room);
      }
      setAddMemberId("");
      showToast("Đã cập nhật nhóm chat.");
      onClose();
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleRemoveParticipant(targetUserId: string) {
    if (!activeRoom) return;
    const res = await fetch(`/api/chat/rooms/${activeRoom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeUserId: targetUserId }),
    });
    const data = await res.json();
    if (res.ok && data.room) {
      onRoomUpdated(activeRoom.id, data.room);
      showToast("Đã xóa thành viên khỏi nhóm.", "info");
    } else {
      showToast(data.error || "Không xóa được thành viên.", "error");
    }
  }

  async function handleLeave() {
    if (!activeRoom) return;
    const res = await fetch(`/api/chat/rooms/${activeRoom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveRoom: true }),
    });
    const data = await res.json();
    if (res.ok) {
      onClose();
      await onLeftRoom(activeRoom.id);
      showToast("Bạn đã rời nhóm chat.", "info");
    } else {
      showToast(data.error || "Không thể rời nhóm này.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleUpdateGroup}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">
            ⚙️ Nhóm: {activeRoom.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isRoomAdminOrLeader && (
          <div className="space-y-3 bg-amber-50/50 border border-amber-200/80 rounded-xl p-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên nhóm
              </label>
              <input
                type="text"
                required
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 cursor-pointer">
              <input
                type="checkbox"
                checked={editGroupAllowAnon}
                onChange={(e) => setEditGroupAllowAnon(e.target.checked)}
              />
              <span>🕵️ Cho phép gửi tin nhắn ẩn danh trong nhóm</span>
            </label>

            {nonMemberTeammates.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                  className="flex-1 rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="">-- Chọn đồng đội thêm vào nhóm --</option>
                  {nonMemberTeammates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-slate-700 mb-2">
            Thành viên trong nhóm ({activeRoom.participants.length})
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {activeRoom.participants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-[#FFFDF7] px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PirateAvatar
                    name={p.user.name}
                    color={p.user.avatarColor}
                    scope={p.user.departmentScope}
                    pirateCharacter={p.user.pirateCharacter}
                    size="sm"
                    animate={false}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {p.user.name}
                      {p.isAdmin && (
                        <span className="ml-1.5 rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px]">
                          Trưởng nhóm
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isRoomAdminOrLeader &&
                  p.userId !== activeRoom.createdById &&
                  p.userId !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.userId)}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      Mời ra
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {!activeRoom.isPinned ? (
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Rời nhóm
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Kênh ghim mặc định của toàn băng
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Đóng
            </button>
            {isRoomAdminOrLeader && (
              <button
                type="submit"
                disabled={savingGroup}
                className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {savingGroup ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export function ChatImageLightbox({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) {
  if (!imageUrl) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <Image
        src={imageUrl}
        alt="Phóng to ảnh"
        width={1200}
        height={900}
        unoptimized
        className="max-w-full max-h-[90vh] w-auto h-auto rounded-2xl shadow-2xl object-contain"
      />
    </div>
  );
}
