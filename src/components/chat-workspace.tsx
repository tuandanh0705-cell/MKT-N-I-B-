"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AtSign,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { DenDenMushiIcon } from "@/components/pirate-art";
import { ChatRoomsSidebar } from "@/components/chat-rooms-sidebar";
import { ChatMessageStream } from "@/components/chat-message-stream";
import {
  ChatCreateGroupModal,
  ChatGroupSettingsModal,
  ChatImageLightbox,
} from "@/components/chat-modals";
import { useToast } from "@/components/toast-provider";
import type {
  ChatMessageItem,
  ChatParticipantUser,
  ChatRoomSummary,
} from "@/types/crm";
import type { DepartmentScope, UserRole } from "@/generated/prisma/client";

const STEALTH_ALIASES = [
  "🎭 Hải Tặc Bí Ẩn",
  "🦉 Cú Đêm Trên Buồm",
  "👒 Bóng Ma Tàu Sunny",
  "🌊 Thủy Thủ Vô Danh",
  "🪙 Kho Báu Bí Mật",
  "🔥 Kẻ Giấu Mặt",
];

const QUICK_EMOJIS = ["👍", "🔥", "❤️", "😂", "🏴‍☠️", "🎉", "🚀"];

interface ChatWorkspaceProps {
  currentUser: {
    id: string;
    name: string;
    role: UserRole;
    departmentScope: DepartmentScope;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
  teammates: ChatParticipantUser[];
  initialRooms: ChatRoomSummary[];
  initialRoomId: string | null;
  initialMessages: ChatMessageItem[];
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("File không phải ảnh hợp lệ"));
      img.onload = () => {
        const maxDim = 1024;
        const scale = Math.min(
          1,
          maxDim / Math.max(img.width || 1, img.height || 1)
        );
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export function ChatWorkspace({
  currentUser,
  teammates,
  initialRooms,
  initialRoomId,
  initialMessages,
}: ChatWorkspaceProps) {
  const { showToast } = useToast();

  const [rooms, setRooms] = useState<ChatRoomSummary[]>(initialRooms);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  const [filterTab, setFilterTab] = useState<"ALL" | "GROUP" | "DIRECT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(false);

  const [draft, setDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [anonymousMode, setAnonymousMode] = useState<boolean>(() => {
    const first = initialRooms.find((r) => r.id === initialRoomId);
    return Boolean(first?.name?.includes("Ẩn Danh"));
  });
  const [anonymousAlias, setAnonymousAlias] = useState<string>(STEALTH_ALIASES[0]);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeRoomIdRef = useRef<string | null>(activeRoomId);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const roomCacheRef = useRef<Map<string, ChatMessageItem[]>>(
    new Map(initialRoomId ? [[initialRoomId, initialMessages]] : [])
  );
  const pollTickRef = useRef<number>(0);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const updateRoomMessages = useCallback(
    (
      roomId: string,
      updater: (prev: ChatMessageItem[]) => ChatMessageItem[]
    ): boolean => {
      const prev = roomCacheRef.current.get(roomId) ?? [];
      const next = updater(prev);
      if (next === prev) return false;
      roomCacheRef.current.set(roomId, next);
      if (activeRoomIdRef.current === roomId) {
        setMessages(next);
      }
      return true;
    },
    []
  );

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId]
  );

  const mentionCandidates = useMemo(() => {
    const pool = activeRoom
      ? activeRoom.participants.map((p) => p.user)
      : teammates;
    return pool.filter((u) => u.id !== currentUser.id);
  }, [activeRoom, teammates, currentUser.id]);

  const filteredMentions = useMemo(() => {
    const match = draft.match(/(?:^|\s)@([^\s@]{0,20})$/);
    if (!match) return [];
    const q = match[1].toLowerCase();
    return mentionCandidates
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [draft, mentionCandidates]);

  const mentionNames = useMemo(
    () => [currentUser.name, ...teammates.map((t) => t.name)],
    [currentUser.name, teammates]
  );

  const displayedMessages = useMemo(() => {
    const q = msgSearchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        !m.isDeleted &&
        (m.content.toLowerCase().includes(q) ||
          (m.sender?.name || "").toLowerCase().includes(q) ||
          (m.anonymousAlias || "").toLowerCase().includes(q))
    );
  }, [messages, msgSearchQuery]);

  function handleInsertMention(name: string) {
    setDraft((prev) =>
      prev.replace(/(?:^|\s)@([^\s@]{0,20})$/, (full) => {
        const leadingSpace =
          full.startsWith(" ") || full.startsWith("\n") ? full[0] : "";
        return `${leadingSpace}@${name} `;
      })
    );
    chatInputRef.current?.focus();
  }

  async function handleAttachImageFile(file: File | null | undefined) {
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (dataUrl.length > 900_000) {
        showToast("Ảnh quá nặng sau khi nén, vui lòng chọn ảnh nhỏ hơn.", "error");
        return;
      }
      setAttachmentUrl(dataUrl);
      setShowLinkInput(false);
    } catch {
      showToast("Không đọc được file ảnh.", "error");
    } finally {
      setUploadingImage(false);
    }
  }

  const getDirectPeer = useCallback(
    (room: ChatRoomSummary): ChatParticipantUser | null => {
      if (room.type !== "DIRECT") return null;
      return (
        room.participants.find((p) => p.userId !== currentUser.id)?.user ??
        room.participants[0]?.user ??
        null
      );
    },
    [currentUser.id]
  );

  const getRoomDisplayTitle = useCallback(
    (room: ChatRoomSummary): string => {
      if (room.type === "DIRECT") {
        const peer = getDirectPeer(room);
        return peer?.name || "Trò chuyện riêng";
      }
      return room.name || "Nhóm chat";
    },
    [getDirectPeer]
  );

  const broadcastTotalUnread = useCallback((nextRooms: ChatRoomSummary[]) => {
    const total = nextRooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
    window.dispatchEvent(
      new CustomEvent("chat-unread-updated", { detail: { unreadCount: total } })
    );
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeRoomId, scrollToBottom]);

  const handleSelectRoom = useCallback(
    async (roomId: string, roomListSnapshot?: ChatRoomSummary[]) => {
      activeRoomIdRef.current = roomId;
      setActiveRoomId(roomId);
      setMobileShowChat(true);
      const source = roomListSnapshot ?? rooms;
      const target = source.find((r) => r.id === roomId);
      setAnonymousMode(
        Boolean(target?.name?.includes("Ẩn Danh") && target.allowAnonymous)
      );

      // Hiển thị tức thì tin nhắn đã cache của phòng này (0ms)
      const cached = roomCacheRef.current.get(roomId);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLoadingRoom(false);
        scrollToBottom(false);
      } else {
        setMessages([]);
        setLoadingRoom(true);
      }

      try {
        const lastConfirmed = cached
          ? [...cached].reverse().find((m) => !m.pending)
          : undefined;
        const url = lastConfirmed
          ? `/api/chat/rooms/${roomId}/messages?after=${encodeURIComponent(
              lastConfirmed.createdAt
            )}`
          : `/api/chat/rooms/${roomId}/messages`;

        const res = await fetch(url);
        if (res.ok && activeRoomIdRef.current === roomId) {
          const data = await res.json();
          if (data.incremental) {
            const incoming: ChatMessageItem[] = data.messages || [];
            const deletedSet = new Set<string>(data.deletedIds || []);
            const changed = updateRoomMessages(roomId, (prev) => {
              let dirty = false;
              const existingIds = new Set(prev.map((m) => m.id));
              const updated = prev.map((m) => {
                if (deletedSet.has(m.id) && !m.isDeleted) {
                  dirty = true;
                  return { ...m, isDeleted: true, content: "", attachmentUrl: null };
                }
                return m;
              });
              for (const m of incoming) {
                if (!existingIds.has(m.id)) {
                  dirty = true;
                  updated.push(m);
                }
              }
              return dirty ? updated : prev;
            });
            if (changed) scrollToBottom(false);
          } else {
            const loaded: ChatMessageItem[] = data.messages || [];
            roomCacheRef.current.set(roomId, loaded);
            setMessages(loaded);
            scrollToBottom(false);
          }

          setRooms((prev) => {
            const updated = prev.map((r) =>
              r.id === roomId ? { ...r, unreadCount: 0 } : r
            );
            broadcastTotalUnread(updated);
            return updated;
          });
        }
      } finally {
        setLoadingRoom(false);
      }
    },
    [rooms, broadcastTotalUnread, scrollToBottom, updateRoomMessages]
  );

  useEffect(() => {
    let active = true;
    let inFlight = false;

    const refreshRoomsList = async (currentId: string | null) => {
      const roomsRes = await fetch("/api/chat/rooms?poll=1");
      if (roomsRes.ok && active) {
        const rData = await roomsRes.json();
        const fetchedRooms: ChatRoomSummary[] = rData.rooms || [];
        const normalized = fetchedRooms.map((r) =>
          r.id === currentId ? { ...r, unreadCount: 0 } : r
        );
        setRooms(normalized);
        broadcastTotalUnread(normalized);
      }
    };

    const poll = async (forceRooms = false) => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      const currentId = activeRoomIdRef.current;
      pollTickRef.current += 1;
      let hasNewIncoming = false;

      try {
        if (currentId) {
          const cached = roomCacheRef.current.get(currentId) ?? [];
          const lastConfirmed = [...cached].reverse().find((m) => !m.pending);
          const url = lastConfirmed
            ? `/api/chat/rooms/${currentId}/messages?after=${encodeURIComponent(
                lastConfirmed.createdAt
              )}`
            : `/api/chat/rooms/${currentId}/messages`;

          const msgRes = await fetch(url);
          if (msgRes.ok && active && activeRoomIdRef.current === currentId) {
            const mData = await msgRes.json();
            if (mData.incremental) {
              const incoming: ChatMessageItem[] = mData.messages || [];
              const deletedSet = new Set<string>(mData.deletedIds || []);
              if (incoming.length > 0) hasNewIncoming = true;

              const changed = updateRoomMessages(currentId, (prev) => {
                let dirty = false;
                const existingIds = new Set(prev.map((m) => m.id));
                const next = prev.map((m) => {
                  if (deletedSet.has(m.id) && !m.isDeleted) {
                    dirty = true;
                    return { ...m, isDeleted: true, content: "", attachmentUrl: null };
                  }
                  return m;
                });
                for (const m of incoming) {
                  if (!existingIds.has(m.id)) {
                    dirty = true;
                    next.push(m);
                  }
                }
                return dirty ? next : prev;
              });
              if (changed && incoming.length > 0) {
                scrollToBottom(true);
              }
            } else {
              const loaded: ChatMessageItem[] = mData.messages || [];
              const changed = updateRoomMessages(currentId, (prev) => {
                if (
                  prev.length === loaded.length &&
                  prev[prev.length - 1]?.id === loaded[loaded.length - 1]?.id &&
                  prev[prev.length - 1]?.isDeleted ===
                    loaded[loaded.length - 1]?.isDeleted
                ) {
                  return prev;
                }
                return loaded;
              });
              if (changed) scrollToBottom(true);
            }
          }
        }

        // Chỉ refresh danh sách phòng mỗi 3 nhịp (~5.4s), khi có tin mới, hoặc khi vừa quay lại tab
        if (forceRooms || hasNewIncoming || pollTickRef.current % 3 === 0) {
          await refreshRoomsList(currentId);
        }
      } catch {
        // Bỏ qua lỗi mạng thoáng qua khi polling
      } finally {
        inFlight = false;
      }
    };

    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        void poll(true);
      }
    };

    const timer = setInterval(() => {
      void poll(false);
    }, 1800);
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [broadcastTotalUnread, scrollToBottom, updateRoomMessages]);

  async function handleStartDirectChat(targetUserId: string) {
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không mở được phòng chat riêng.", "error");
        return;
      }
      const room: ChatRoomSummary = data.room;
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === room.id);
        return exists ? prev : [room, ...prev];
      });
      await handleSelectRoom(room.id);
    } catch {
      showToast("Lỗi kết nối khi mở chat riêng.", "error");
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!activeRoom) return;

    const cleanText = draft.trim();
    const cleanUrl = attachmentUrl.trim();
    if (!cleanText && !cleanUrl) return;

    const targetRoomId = activeRoom.id;
    const useAnon = Boolean(anonymousMode && activeRoom.allowAnonymous);
    const chosenAlias = useAnon ? anonymousAlias : null;
    const isDataImage = Boolean(cleanUrl && /^data:image\//i.test(cleanUrl));
    const displayContent =
      cleanText ||
      (isDataImage ? "🖼️ Đã gửi 1 hình ảnh" : "📎 Đã gửi 1 liên kết tài liệu");

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      roomId: targetRoomId,
      content: displayContent,
      isAnonymous: useAnon,
      anonymousAlias: chosenAlias,
      attachmentUrl: cleanUrl || null,
      isDeleted: false,
      isMine: true,
      pending: true,
      createdAt: new Date().toISOString(),
      sender: useAnon
        ? null
        : {
            id: currentUser.id,
            name: currentUser.name,
            title: "",
            avatarColor: currentUser.avatarColor,
            pirateCharacter: currentUser.pirateCharacter ?? null,
            departmentScope: currentUser.departmentScope,
          },
    };

    // Optimistic UI: hiện bong bóng ngay lập tức (<10ms) & giải phóng ô nhập để gửi liên tiếp
    updateRoomMessages(targetRoomId, (prev) => [...prev, optimisticMsg]);
    setDraft("");
    setAttachmentUrl("");
    setShowLinkInput(false);
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === targetRoomId
          ? {
              ...r,
              lastMessage: optimisticMsg,
              lastMessageAt: optimisticMsg.createdAt,
              unreadCount: 0,
            }
          : r
      );
      return [...updated].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      });
    });
    scrollToBottom(true);

    try {
      const res = await fetch(`/api/chat/rooms/${targetRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cleanText,
          attachmentUrl: cleanUrl || null,
          isAnonymous: useAnon,
          anonymousAlias: chosenAlias,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateRoomMessages(targetRoomId, (prev) =>
          prev.filter((m) => m.id !== tempId)
        );
        setDraft((cur) => (cur ? cur : cleanText));
        if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
        showToast(data.error || "Không gửi được tin nhắn.", "error");
        return;
      }

      const sent: ChatMessageItem = data.message;
      updateRoomMessages(targetRoomId, (prev) => {
        const alreadyHasReal = prev.some((m) => m.id === sent.id);
        if (alreadyHasReal) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? sent : m));
      });
      setRooms((prev) =>
        prev.map((r) =>
          r.id === targetRoomId && r.lastMessage?.id === tempId
            ? { ...r, lastMessage: sent, lastMessageAt: sent.createdAt }
            : r
        )
      );
    } catch {
      updateRoomMessages(targetRoomId, (prev) =>
        prev.filter((m) => m.id !== tempId)
      );
      setDraft((cur) => (cur ? cur : cleanText));
      if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
      showToast("Lỗi kết nối khi gửi tin nhắn.", "error");
    }
  }

  async function handleRecallMessage(messageId: string) {
    const targetRoomId = activeRoomIdRef.current;
    // Optimistic recall
    if (targetRoomId) {
      updateRoomMessages(targetRoomId, (prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: "", attachmentUrl: null }
            : m
        )
      );
    }
    const res = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Đã thu hồi tin nhắn.", "info");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Không thể thu hồi tin nhắn.", "error");
      if (targetRoomId) void handleSelectRoom(targetRoomId);
    }
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterTab !== "ALL" && r.type !== filterTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const title = getRoomDisplayTitle(r).toLowerCase();
        const desc = (r.description || "").toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, filterTab, searchQuery, getRoomDisplayTitle]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0">
            <DenDenMushiIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              💬 Ốc Sên Chat Nội Bộ
            </h1>
            <p className="text-xs text-slate-500">
              Nhắn riêng 1-1, lập nhóm dự án hoặc bật{" "}
              <strong className="text-indigo-700">🕵️ Chế độ Ẩn danh</strong> góp ý bảo mật
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateGroupOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo nhóm chat
        </button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-195px)] min-h-[520px]">
        <ChatRoomsSidebar
          teammates={teammates}
          filteredRooms={filteredRooms}
          activeRoomId={activeRoomId}
          mobileShowChat={mobileShowChat}
          searchQuery={searchQuery}
          filterTab={filterTab}
          onSearchQueryChange={setSearchQuery}
          onFilterTabChange={setFilterTab}
          onStartDirectChat={handleStartDirectChat}
          onSelectRoom={(id) => handleSelectRoom(id)}
          getDirectPeer={getDirectPeer}
          getRoomDisplayTitle={getRoomDisplayTitle}
        />

        <div
          className={`md:col-span-8 lg:col-span-8 flex flex-col min-h-0 bg-white ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}
        >
          {!activeRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageCircle className="w-10 h-10 mb-2 text-amber-300" />
              <p className="text-sm font-semibold text-slate-600">
                Chọn một phòng chat hoặc bấm vào đồng đội để bắt đầu!
              </p>
            </div>
          ) : (
            <>
              <ChatMessageStream
                activeRoom={activeRoom}
                displayedMessages={displayedMessages}
                hasAnyMessages={messages.length > 0}
                loadingRoom={loadingRoom}
                msgSearchOpen={msgSearchOpen}
                msgSearchQuery={msgSearchQuery}
                mentionNames={mentionNames}
                messagesEndRef={messagesEndRef}
                getDirectPeer={getDirectPeer}
                getRoomDisplayTitle={getRoomDisplayTitle}
                onMobileBack={() => setMobileShowChat(false)}
                onToggleMsgSearch={() => {
                  setMsgSearchOpen((v) => !v);
                  if (msgSearchOpen) setMsgSearchQuery("");
                }}
                onMsgSearchQueryChange={setMsgSearchQuery}
                onOpenGroupSettings={() => setSettingsOpen(true)}
                onRecallMessage={handleRecallMessage}
                onOpenLightbox={setLightboxImageUrl}
              />

              {/* Khung soạn tin & Thanh bật/tắt Ẩn danh */}
              <form
                onSubmit={handleSendMessage}
                className={`p-3 border-t transition-colors ${
                  anonymousMode && activeRoom.allowAnonymous
                    ? "bg-indigo-950/5 border-indigo-300"
                    : "bg-[#FFFDF7] border-amber-100"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeRoom.allowAnonymous && (
                      <button
                        type="button"
                        onClick={() => setAnonymousMode((v) => !v)}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                          anonymousMode
                            ? "bg-indigo-900 text-amber-300 border-indigo-700 shadow-sm"
                            : "bg-white text-slate-700 border-amber-200 hover:border-indigo-400"
                        }`}
                      >
                        {anonymousMode ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            🕵️ Đang bật Ẩn danh
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            Gửi Ẩn danh
                          </>
                        )}
                      </button>
                    )}

                    {anonymousMode && activeRoom.allowAnonymous && (
                      <select
                        value={anonymousAlias}
                        onChange={(e) => setAnonymousAlias(e.target.value)}
                        className="rounded-full border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 focus:outline-none"
                      >
                        {STEALTH_ALIASES.map((alias) => (
                          <option key={alias} value={alias}>
                            Biệt danh: {alias}
                          </option>
                        ))}
                      </select>
                    )}

                    <label className="rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border bg-white border-amber-200 text-slate-600 hover:bg-amber-50 cursor-pointer">
                      <ImagePlus className="w-3 h-3 text-emerald-600" />
                      {uploadingImage ? "Đang nén..." : "Gửi Ảnh"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          handleAttachImageFile(file);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) =>
                          d && !d.endsWith(" ") ? `${d} @` : `${d}@`
                        );
                        chatInputRef.current?.focus();
                      }}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border bg-white border-amber-200 text-slate-600 hover:bg-amber-50 cursor-pointer"
                    >
                      <AtSign className="w-3 h-3 text-violet-600" />
                      @Tag tên
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLinkInput((v) => !v)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border cursor-pointer ${
                        showLinkInput
                          ? "bg-sky-50 border-sky-300 text-sky-700"
                          : "bg-white border-amber-200 text-slate-600 hover:bg-amber-50"
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      Gắn Link
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setDraft((d) => d + em)}
                        className="text-sm hover:scale-125 transition px-0.5 cursor-pointer"
                        title={`Chèn ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {anonymousMode && activeRoom.allowAnonymous && (
                  <div className="mb-2 rounded-xl bg-indigo-900 text-indigo-100 px-3 py-1.5 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>
                      Danh tính thật của bạn sẽ được ẩn hoàn toàn khi gửi — hiển thị dưới tên{" "}
                      <strong className="text-amber-300">{anonymousAlias}</strong>.
                    </span>
                  </div>
                )}

                {attachmentUrl && /^data:image\//i.test(attachmentUrl) && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs">
                    <Image
                      src={attachmentUrl}
                      alt="Xem trước ảnh"
                      width={64}
                      height={64}
                      unoptimized
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0"
                    />
                    <span className="font-semibold text-emerald-900 flex-1">
                      Đã đính kèm 1 hình ảnh sẵn sàng gửi (bạn cũng có thể Ctrl+V dán ảnh trực tiếp!)
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl("")}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Bỏ ảnh này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {filteredMentions.length > 0 && (
                  <div className="mb-2 rounded-xl border border-violet-200 bg-white shadow-md p-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 self-center px-1.5">
                      Nhắc tên (@):
                    </span>
                    {filteredMentions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleInsertMention(u.name)}
                        className="rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-900 px-2.5 py-1 text-xs font-bold cursor-pointer"
                      >
                        @{u.name}
                      </button>
                    ))}
                  </div>
                )}

                {showLinkInput && (
                  <div className="mb-2">
                    <input
                      type="url"
                      value={
                        attachmentUrl.startsWith("data:image/")
                          ? ""
                          : attachmentUrl
                      }
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Dán link Google Drive / Canva / Tài liệu (https://...)"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <textarea
                    ref={chatInputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;
                      for (const item of Array.from(items)) {
                        if (item.type.startsWith("image/")) {
                          const file = item.getAsFile();
                          if (file) {
                            e.preventDefault();
                            handleAttachImageFile(file);
                          }
                          break;
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      anonymousMode && activeRoom.allowAnonymous
                        ? "Nhập tin nhắn ẩn danh... (có thể @tag tên hoặc Ctrl+V dán ảnh)"
                        : `Nhắn tới ${getRoomDisplayTitle(activeRoom)}... (gõ @ để tag tên, Ctrl+V dán ảnh)`
                    }
                    className={`flex-1 resize-none rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm bg-white focus:outline-none ${
                      anonymousMode && activeRoom.allowAnonymous
                        ? "border-indigo-300 focus:border-indigo-500"
                        : "border-amber-200 focus:border-sky-400"
                    }`}
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim() && !attachmentUrl.trim()}
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-white inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 ${
                      anonymousMode && activeRoom.allowAnonymous
                        ? "bg-indigo-700 hover:bg-indigo-800"
                        : "bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Gửi</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <ChatCreateGroupModal
        open={createGroupOpen}
        teammates={teammates}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={async (created) => {
          const nextRooms = [created, ...rooms];
          setRooms(nextRooms);
          setCreateGroupOpen(false);
          await handleSelectRoom(created.id, nextRooms);
        }}
      />

      <ChatGroupSettingsModal
        open={settingsOpen}
        activeRoom={activeRoom}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        teammates={teammates}
        onClose={() => setSettingsOpen(false)}
        onRoomUpdated={(roomId, updated) => {
          setRooms((prev) =>
            prev.map((r) => (r.id === roomId ? { ...r, ...updated } : r))
          );
        }}
        onLeftRoom={async (roomId) => {
          const remaining = rooms.filter((r) => r.id !== roomId);
          setRooms(remaining);
          setActiveRoomId(remaining[0]?.id ?? null);
          if (remaining[0]) {
            await handleSelectRoom(remaining[0].id, remaining);
          } else {
            setMessages([]);
          }
        }}
      />

      <ChatImageLightbox
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}
