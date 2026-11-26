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
  Smile,
  Sparkles,
  X,
} from "lucide-react";
import { DenDenMushiIcon } from "@/components/pirate-art";
import { ChatRoomsSidebar } from "@/components/chat-rooms-sidebar";
import { ChatMessageStream } from "@/components/chat-message-stream";
import { ChatEmojiStickerPicker } from "@/components/chat-emoji-sticker-picker";
import {
  ChatAnonymousDirectModal,
  ChatCreateGroupModal,
  ChatGroupSettingsModal,
  ChatImageLightbox,
} from "@/components/chat-modals";
import { useToast } from "@/components/toast-provider";
import { formatStickerMessageContent } from "@/lib/chat-stickers";
import type {
  ChatMessageItem,
  ChatParticipantUser,
  ChatRoomSummary,
  ChatStickerItem,
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

const QUICK_EMOJIS = ["👍", "🔥", "❤️", "😂", "🎉"];

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
  initialMobileShowChat?: boolean;
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
  initialMobileShowChat = false,
}: ChatWorkspaceProps) {
  const { showToast } = useToast();

  const [rooms, setRooms] = useState<ChatRoomSummary[]>(initialRooms);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(
    initialMobileShowChat
  );
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<{
    height: number;
    top: number;
    keyboardOpen: boolean;
  } | null>(null);

  const [filterTab, setFilterTab] = useState<"ALL" | "GROUP" | "DIRECT" | "ANON">("ALL");
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
    return Boolean(
      (first?.isAnonymousThread && first?.isAnonymousSender) ||
        (first?.name?.includes("Ẩn Danh") && first?.allowAnonymous)
    );
  });
  const [anonymousAlias, setAnonymousAlias] = useState<string>(() => {
    const first = initialRooms.find((r) => r.id === initialRoomId);
    if (first?.isAnonymousThread && first?.isAnonymousSender && first.anonymousAlias) {
      return first.anonymousAlias;
    }
    return STEALTH_ALIASES[0];
  });

  const [anonDirectOpen, setAnonDirectOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"EMOJI" | "STICKER">("EMOJI");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeRoomIdRef = useRef<string | null>(activeRoomId);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileChatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const roomCacheRef = useRef<Map<string, ChatMessageItem[]>>(
    new Map(initialRoomId ? [[initialRoomId, initialMessages]] : [])
  );
  const pollTickRef = useRef<number>(0);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // Trên Mobile: khi mở phòng chat, đồng bộ chiều cao thực tế theo visualViewport để khung chat bám sát bàn phím iOS/Android giống Messenger/Instagram
  useEffect(() => {
    if (!mobileShowChat || typeof window === "undefined") return;

    const syncViewport = () => {
      if (window.innerWidth >= 768) {
        setMobileViewport(null);
        document.body.style.overflow = "";
        return;
      }
      document.body.style.overflow = "hidden";
      const vv = window.visualViewport;
      if (!vv) {
        setMobileViewport({
          height: window.innerHeight,
          top: 0,
          keyboardOpen: false,
        });
        return;
      }
      const keyboardOpen = window.innerHeight - vv.height > 120;
      setMobileViewport({
        height: Math.round(vv.height),
        top: Math.round(vv.offsetTop),
        keyboardOpen,
      });
    };

    const rafId = requestAnimationFrame(syncViewport);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    return () => {
      cancelAnimationFrame(rafId);
      document.body.style.overflow = "";
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [mobileShowChat]);

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

  const isLockedAnonymous = Boolean(
    activeRoom?.isAnonymousThread && activeRoom?.isAnonymousSender
  );

  const effectiveAnonymous = Boolean(
    isLockedAnonymous || (anonymousMode && activeRoom?.allowAnonymous)
  );

  const mentionCandidates = useMemo(() => {
    const pool = activeRoom
      ? activeRoom.participants.map((p) => p.user)
      : teammates;
    return pool.filter(
      (u) => u.id !== currentUser.id && u.id !== "anonymous-sender"
    );
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

  function getActiveInputEl() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return mobileChatInputRef.current ?? chatInputRef.current;
    }
    return chatInputRef.current ?? mobileChatInputRef.current;
  }

  function handleInsertMention(name: string) {
    setDraft((prev) =>
      prev.replace(/(?:^|\s)@([^\s@]{0,20})$/, (full) => {
        const leadingSpace =
          full.startsWith(" ") || full.startsWith("\n") ? full[0] : "";
        return `${leadingSpace}@${name} `;
      })
    );
    getActiveInputEl()?.focus();
  }

  function handleInsertEmoji(emoji: string) {
    const el = getActiveInputEl();
    if (!el) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    setDraft((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    requestAnimationFrame(() => {
      if (typeof window === "undefined" || window.innerWidth >= 768) {
        el.focus();
      }
      const nextPos = start + emoji.length;
      el.setSelectionRange(nextPos, nextPos);
    });
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
      if (room.isAnonymousThread) {
        if (room.isAnonymousSender) {
          const peer = getDirectPeer(room);
          return `Ẩn danh → ${peer?.name || "Đồng đội"}`;
        }
        return room.anonymousAlias || "🎭 Hải Tặc Bí Ẩn";
      }
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
      const lockedAnon = Boolean(
        target?.isAnonymousThread && target.isAnonymousSender
      );
      setAnonymousMode(
        lockedAnon ||
          Boolean(target?.name?.includes("Ẩn Danh") && target.allowAnonymous)
      );
      if (lockedAnon && target?.anonymousAlias) {
        setAnonymousAlias(target.anonymousAlias);
      }

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
    let lastActivityAt = Date.now();

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

        if (hasNewIncoming) {
          lastActivityAt = Date.now();
        }
        // Chỉ refresh danh sách phòng mỗi 3 nhịp, khi có tin mới, hoặc khi vừa quay lại tab
        if (forceRooms || hasNewIncoming || pollTickRef.current % 3 === 0) {
          await refreshRoomsList(currentId);
        }
      } catch {
        // Bỏ qua lỗi mạng thoáng qua khi polling
      } finally {
        inFlight = false;
      }
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (!active) return;
      if (timeoutId) clearTimeout(timeoutId);
      // Adaptive polling: 2s khi đang nhắn/có tin mới -> tự giãn lên 5s sau 25s nhàn rỗi (tiết kiệm ~65% Neon compute)
      const idleMs = Date.now() - lastActivityAt;
      const delay = idleMs < 25_000 ? 2000 : 5000;
      timeoutId = setTimeout(async () => {
        await poll(false);
        scheduleNext();
      }, delay);
    };

    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        lastActivityAt = Date.now();
        void poll(true).finally(() => scheduleNext());
      }
    };

    const onUserTypingOrSending = () => {
      lastActivityAt = Date.now();
    };

    scheduleNext();
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("keydown", onUserTypingOrSending, { passive: true });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("keydown", onUserTypingOrSending);
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

  async function sendPayload(
    cleanText: string,
    cleanUrl: string,
    options?: { keepComposer?: boolean }
  ) {
    if (!activeRoom) return;
    if (!cleanText && !cleanUrl) return;

    const useAnon = Boolean(
      (activeRoom.isAnonymousThread && activeRoom.isAnonymousSender) ||
        (anonymousMode && activeRoom.allowAnonymous)
    );
    const chosenAlias = useAnon ? anonymousAlias : null;
    const isDataImage = Boolean(cleanUrl && /^data:image\//i.test(cleanUrl));
    const displayContent =
      cleanText ||
      (isDataImage ? "🖼️ Đã gửi 1 hình ảnh" : "📎 Đã gửi 1 liên kết tài liệu");

    const sortRoomsList = (list: ChatRoomSummary[]) =>
      [...list].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      });

    // Nếu người dùng đang đứng ở phòng 1-1 có tên thật nhưng bật Ẩn danh -> tách sang phòng ẩn danh riêng!
    const isDirectAnonRedirect = Boolean(
      activeRoom.type === "DIRECT" && !activeRoom.isAnonymousThread && useAnon
    );

    if (isDirectAnonRedirect) {
      const peer = getDirectPeer(activeRoom);
      const existingSecret = peer
        ? rooms.find(
            (r) =>
              r.type === "DIRECT" &&
              r.isAnonymousThread &&
              r.isAnonymousSender &&
              r.participants.some((p) => p.userId === peer.id)
          )
        : null;

      if (!options?.keepComposer) {
        setDraft("");
        setAttachmentUrl("");
        setShowLinkInput(false);
      }

      const endpointRoomId = existingSecret ? existingSecret.id : activeRoom.id;

      try {
        const res = await fetch(`/api/chat/rooms/${endpointRoomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: cleanText,
            attachmentUrl: cleanUrl || null,
            isAnonymous: true,
            anonymousAlias: chosenAlias,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!options?.keepComposer) {
            setDraft((cur) => (cur ? cur : cleanText));
            if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
          }
          showToast(data.error || "Không gửi được tin nhắn ẩn danh.", "error");
          return;
        }

        const sent: ChatMessageItem = data.message;
        const secretRoom: ChatRoomSummary | null =
          data.redirectedRoom ??
          (existingSecret
            ? {
                ...existingSecret,
                anonymousAlias: chosenAlias || existingSecret.anonymousAlias,
                lastMessage: sent,
                lastMessageAt: sent.createdAt,
                unreadCount: 0,
              }
            : null);

        if (secretRoom) {
          setRooms((prev) => {
            const hasRoom = prev.some((r) => r.id === secretRoom.id);
            const next = hasRoom
              ? prev.map((r) => (r.id === secretRoom.id ? secretRoom : r))
              : [secretRoom, ...prev];
            return sortRoomsList(next);
          });

          const hadCache = roomCacheRef.current.has(secretRoom.id);
          activeRoomIdRef.current = secretRoom.id;
          setActiveRoomId(secretRoom.id);
          setAnonymousMode(true);
          if (secretRoom.anonymousAlias) {
            setAnonymousAlias(secretRoom.anonymousAlias);
          }

          updateRoomMessages(secretRoom.id, (prev) =>
            prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
          );
          scrollToBottom(true);

          if (!hadCache) {
            // Tải thêm lịch sử cũ của phòng ẩn danh (nếu trước đó đã từng nhắn)
            void fetch(`/api/chat/rooms/${secretRoom.id}/messages`)
              .then((r) => (r.ok ? r.json() : null))
              .then((hist) => {
                if (hist?.messages && activeRoomIdRef.current === secretRoom.id) {
                  roomCacheRef.current.set(secretRoom.id, hist.messages);
                  setMessages(hist.messages);
                  scrollToBottom(false);
                }
              })
              .catch(() => {});
          }

          showToast(
            "🕵️ Đã chuyển sang hội thoại ẩn danh riêng — người nhận sẽ KHÔNG thấy tên bạn!",
            "success"
          );
        }
      } catch {
        if (!options?.keepComposer) {
          setDraft((cur) => (cur ? cur : cleanText));
          if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
        }
        showToast("Lỗi kết nối khi gửi tin nhắn ẩn danh.", "error");
      }
      return;
    }

    const targetRoomId = activeRoom.id;
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
    if (!options?.keepComposer) {
      setDraft("");
      setAttachmentUrl("");
      setShowLinkInput(false);
    }
    setRooms((prev) =>
      sortRoomsList(
        prev.map((r) =>
          r.id === targetRoomId
            ? {
                ...r,
                anonymousAlias:
                  r.isAnonymousThread && r.isAnonymousSender && chosenAlias
                    ? chosenAlias
                    : r.anonymousAlias,
                lastMessage: optimisticMsg,
                lastMessageAt: optimisticMsg.createdAt,
                unreadCount: 0,
              }
            : r
        )
      )
    );
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
        if (!options?.keepComposer) {
          setDraft((cur) => (cur ? cur : cleanText));
          if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
        }
        showToast(data.error || "Không gửi được tin nhắn.", "error");
        return;
      }

      const sent: ChatMessageItem = data.message;
      if (data.redirectedRoom) {
        const redirected: ChatRoomSummary = data.redirectedRoom;
        updateRoomMessages(targetRoomId, (prev) =>
          prev.filter((m) => m.id !== tempId)
        );
        setRooms((prev) => {
          const hasRoom = prev.some((r) => r.id === redirected.id);
          const next = hasRoom
            ? prev.map((r) => (r.id === redirected.id ? redirected : r))
            : [redirected, ...prev];
          return sortRoomsList(next);
        });
        activeRoomIdRef.current = redirected.id;
        setActiveRoomId(redirected.id);
        setAnonymousMode(true);
        updateRoomMessages(redirected.id, (prev) =>
          prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]
        );
        scrollToBottom(true);
        return;
      }

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
      if (!options?.keepComposer) {
        setDraft((cur) => (cur ? cur : cleanText));
        if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
      }
      showToast("Lỗi kết nối khi gửi tin nhắn.", "error");
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    setPickerOpen(false);
    await sendPayload(draft.trim(), attachmentUrl.trim());
  }

  async function handleSendSticker(sticker: ChatStickerItem) {
    await sendPayload(
      formatStickerMessageContent(sticker.name),
      sticker.imageUrl,
      { keepComposer: true }
    );
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
      if (filterTab === "ANON") {
        if (!r.isAnonymousThread && !r.name?.includes("Ẩn Danh")) return false;
      } else if (filterTab !== "ALL" && r.type !== filterTab) {
        return false;
      }
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
    <div className="space-y-2 sm:space-y-3">
      <div
        className={`${
          mobileShowChat ? "hidden md:flex" : "flex"
        } items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0">
            <DenDenMushiIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">
              💬 Ốc Sên Chat Nội Bộ
            </h1>
            <p className="hidden sm:block text-xs text-slate-500">
              Nhắn riêng 1-1, lập nhóm dự án hoặc bật{" "}
              <strong className="text-indigo-700">🕵️ Chế độ Ẩn danh</strong> tách phòng bảo mật
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAnonDirectOpen(true)}
            className="rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-amber-300 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition hover:-translate-y-0.5 cursor-pointer shrink-0"
            title="Nhắn tin ẩn danh 1-1 tách biệt"
          >
            <EyeOff className="w-4 h-4" />
            <span>Ẩn danh</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo nhóm</span>
            <span className="hidden sm:inline">chat</span>
          </button>
        </div>
      </div>

      <div
        className={`bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm grid grid-cols-1 md:grid-cols-12 md:h-[calc(100vh-195px)] md:min-h-[520px] md:overflow-hidden ${
          mobileShowChat
            ? ""
            : "overflow-hidden h-[calc(100dvh-232px)]"
        }`}
      >
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
          onOpenAnonymousModal={() => setAnonDirectOpen(true)}
          onSelectRoom={(id) => handleSelectRoom(id)}
          getDirectPeer={getDirectPeer}
          getRoomDisplayTitle={getRoomDisplayTitle}
        />

        <div
          style={
            mobileShowChat && mobileViewport
              ? {
                  top: `${mobileViewport.top}px`,
                  height: `${mobileViewport.height}px`,
                }
              : undefined
          }
          className={`md:col-span-8 lg:col-span-8 flex flex-col min-h-0 bg-white ${
            mobileShowChat
              ? "fixed inset-x-0 top-0 h-[100dvh] z-40 flex md:static md:inset-auto md:h-auto md:z-auto"
              : "hidden md:flex"
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
                onMobileBack={() => {
                  setPickerOpen(false);
                  setMobileToolsOpen(false);
                  setMobileViewport(null);
                  setMobileShowChat(false);
                }}
                onToggleMsgSearch={() => {
                  setMsgSearchOpen((v) => !v);
                  if (msgSearchOpen) setMsgSearchQuery("");
                }}
                onMsgSearchQueryChange={setMsgSearchQuery}
                onOpenGroupSettings={() => setSettingsOpen(true)}
                onRecallMessage={handleRecallMessage}
                onOpenLightbox={setLightboxImageUrl}
              />

              {/* Khung soạn tin: Mobile dùng thanh Pill 1 hàng chuẩn Messenger/Instagram bám sát bàn phím; Desktop giữ đầy đủ toolbar */}
              <form
                onSubmit={handleSendMessage}
                className={`relative border-t shrink-0 transition-colors px-2.5 pt-2 md:p-3 ${
                  mobileViewport?.keyboardOpen ? "pb-2" : "pb-safe md:pb-3"
                } ${
                  effectiveAnonymous
                    ? "bg-indigo-950/5 border-indigo-300"
                    : "bg-[#FFFDF7] border-amber-100"
                }`}
              >
                <ChatEmojiStickerPicker
                  open={pickerOpen}
                  initialTab={pickerTab}
                  currentUserId={currentUser.id}
                  currentUserRole={currentUser.role}
                  align="right"
                  onClose={() => setPickerOpen(false)}
                  onSelectEmoji={handleInsertEmoji}
                  onSelectSticker={handleSendSticker}
                />

                {/* === TOOLBAR DESKTOP (md+) === */}
                <div className="hidden md:flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                    {activeRoom.allowAnonymous &&
                      (isLockedAnonymous ? (
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1 border bg-indigo-900 text-amber-300 border-indigo-700 shadow-sm shrink-0"
                          title="Phòng ẩn danh riêng luôn giữ bí mật danh tính thật của bạn"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>🔒 Luôn bật Ẩn danh</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAnonymousMode((v) => !v)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1 border transition cursor-pointer shrink-0 ${
                            effectiveAnonymous
                              ? "bg-indigo-900 text-amber-300 border-indigo-700 shadow-sm"
                              : "bg-white text-slate-700 border-amber-200 hover:border-indigo-400"
                          }`}
                          title="Bật/tắt chế độ gửi ẩn danh"
                        >
                          {effectiveAnonymous ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>🕵️ Đang bật Ẩn danh</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Gửi Ẩn danh</span>
                            </>
                          )}
                        </button>
                      ))}

                    {effectiveAnonymous && (
                      <select
                        value={anonymousAlias}
                        onChange={(e) => setAnonymousAlias(e.target.value)}
                        className="rounded-full border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 focus:outline-none shrink-0"
                      >
                        {STEALTH_ALIASES.map((alias) => (
                          <option key={alias} value={alias}>
                            {alias}
                          </option>
                        ))}
                      </select>
                    )}

                    <label
                      title="Gửi ảnh từ máy"
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border bg-white border-amber-200 text-slate-600 hover:bg-amber-50 cursor-pointer shrink-0"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{uploadingImage ? "Đang nén..." : "Gửi Ảnh"}</span>
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
                      title="Nhắc tên đồng đội (@)"
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border bg-white border-amber-200 text-slate-600 hover:bg-amber-50 cursor-pointer shrink-0"
                    >
                      <AtSign className="w-3.5 h-3.5 text-violet-600" />
                      <span>@Tag tên</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLinkInput((v) => !v)}
                      title="Đính kèm link"
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 border cursor-pointer shrink-0 ${
                        showLinkInput
                          ? "bg-sky-50 border-sky-300 text-sky-700"
                          : "bg-white border-amber-200 text-slate-600 hover:bg-amber-50"
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Gắn Link</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="hidden xl:flex items-center gap-0.5 mr-1">
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleInsertEmoji(em)}
                          className="text-sm hover:scale-125 transition px-0.5 cursor-pointer"
                          title={`Chèn nhanh ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (pickerOpen && pickerTab === "EMOJI") {
                          setPickerOpen(false);
                        } else {
                          setPickerTab("EMOJI");
                          setPickerOpen(true);
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 border transition cursor-pointer shrink-0 ${
                        pickerOpen && pickerTab === "EMOJI"
                          ? "bg-amber-100 border-amber-400 text-amber-950"
                          : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50"
                      }`}
                      title="Mở kho biểu tượng cảm xúc đầy đủ"
                    >
                      <Smile className="w-3.5 h-3.5 text-amber-500" />
                      <span>Emoji</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (pickerOpen && pickerTab === "STICKER") {
                          setPickerOpen(false);
                        } else {
                          setPickerTab("STICKER");
                          setPickerOpen(true);
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 border transition cursor-pointer shrink-0 ${
                        pickerOpen && pickerTab === "STICKER"
                          ? "bg-[#0B2545] border-[#0B2545] text-amber-300"
                          : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                      }`}
                      title="Mở kho Sticker & tự thêm Sticker"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sticker</span>
                    </button>
                  </div>
                </div>

                {/* Dải thông báo Ẩn danh: Desktop hiện đầy đủ; Mobile hiện 1 dòng siêu gọn */}
                {effectiveAnonymous && (
                  <>
                    <div className="hidden md:flex mb-2 rounded-xl bg-indigo-900 text-indigo-100 px-3 py-1.5 text-[11px] items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>
                        {activeRoom.type === "DIRECT" && !activeRoom.isAnonymousThread ? (
                          <>
                            Khi gửi, tin nhắn sẽ{" "}
                            <strong className="text-amber-300">
                              tự tách sang hội thoại ẩn danh riêng
                            </strong>{" "}
                            dưới tên <strong className="text-amber-300">{anonymousAlias}</strong> — KHÔNG hiện trong đoạn chat có tên thật của bạn.
                          </>
                        ) : (
                          <>
                            Danh tính thật của bạn sẽ được ẩn hoàn toàn khi gửi — người khác chỉ thấy{" "}
                            <strong className="text-amber-300">{anonymousAlias}</strong>.
                          </>
                        )}
                      </span>
                    </div>
                    <div className="md:hidden mb-1.5 flex items-center justify-between gap-2 rounded-full bg-indigo-900 text-indigo-100 px-2.5 py-1 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <EyeOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <select
                          value={anonymousAlias}
                          onChange={(e) => setAnonymousAlias(e.target.value)}
                          aria-label="Chọn biệt danh ẩn danh"
                          className="bg-transparent text-amber-300 font-bold text-[11px] focus:outline-none truncate"
                        >
                          {STEALTH_ALIASES.map((alias) => (
                            <option
                              key={alias}
                              value={alias}
                              className="text-slate-900 bg-white"
                            >
                              {alias}
                            </option>
                          ))}
                        </select>
                        {activeRoom.type === "DIRECT" &&
                          !activeRoom.isAnonymousThread && (
                            <span className="text-[10px] text-indigo-200 shrink-0">
                              • Tách phòng riêng
                            </span>
                          )}
                      </div>
                      {isLockedAnonymous ? (
                        <span className="text-[10px] font-bold text-amber-300 px-1.5 py-0.5 rounded-full bg-white/10 shrink-0">
                          🔒 Bảo mật
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAnonymousMode(false)}
                          className="text-[10px] font-bold text-indigo-200 hover:text-white px-1.5 py-0.5 rounded-full bg-white/10 shrink-0 cursor-pointer"
                        >
                          Tắt
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Khay mở rộng nút phụ trên Mobile khi bấm dấu + */}
                {mobileToolsOpen && (
                  <div className="md:hidden mb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {activeRoom.allowAnonymous && !isLockedAnonymous && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnonymousMode((v) => !v);
                          setMobileToolsOpen(false);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 border shrink-0 cursor-pointer ${
                          effectiveAnonymous
                            ? "bg-indigo-900 text-amber-300 border-indigo-700"
                            : "bg-white text-slate-700 border-amber-200"
                        }`}
                      >
                        {effectiveAnonymous ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        {effectiveAnonymous ? "Tắt Ẩn danh" : "Bật Ẩn danh"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) =>
                          d && !d.endsWith(" ") ? `${d} @` : `${d}@`
                        );
                        setMobileToolsOpen(false);
                        mobileChatInputRef.current?.focus();
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 border bg-white border-amber-200 text-slate-700 shrink-0 cursor-pointer"
                    >
                      <AtSign className="w-3.5 h-3.5 text-violet-600" />
                      @Tag tên
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkInput((v) => !v);
                        setMobileToolsOpen(false);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 border shrink-0 cursor-pointer ${
                        showLinkInput
                          ? "bg-sky-50 border-sky-300 text-sky-700"
                          : "bg-white border-amber-200 text-slate-700"
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5 text-sky-600" />
                      Gắn Link
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileToolsOpen(false);
                        mobileChatInputRef.current?.blur();
                        setPickerTab("STICKER");
                        setPickerOpen(true);
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 border bg-amber-50 border-amber-300 text-amber-900 shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Kho Sticker
                    </button>
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
                      className="w-11 h-11 rounded-lg object-cover border border-emerald-300 shrink-0"
                    />
                    <span className="font-semibold text-emerald-900 flex-1 truncate">
                      Đã chọn 1 hình ảnh sẵn sàng gửi
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl("")}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
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
                  <div className="mb-2 flex items-center gap-1.5">
                    <input
                      type="url"
                      value={
                        attachmentUrl.startsWith("data:image/")
                          ? ""
                          : attachmentUrl
                      }
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Dán link Google Drive / Canva / Tài liệu (https://...)"
                      className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkInput(false);
                        if (!attachmentUrl.startsWith("data:image/")) {
                          setAttachmentUrl("");
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* === MOBILE PILL COMPOSER (chuẩn Messenger / Instagram như Ảnh 3) === */}
                <div className="md:hidden flex items-end gap-1.5">
                  <div
                    className={`flex-1 flex items-center gap-1 rounded-[24px] border px-1.5 py-1 bg-white shadow-xs transition-colors ${
                      effectiveAnonymous
                        ? "border-indigo-400 bg-indigo-50/40"
                        : "border-amber-200 focus-within:border-amber-400"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPickerOpen(false);
                        setMobileToolsOpen((v) => !v);
                      }}
                      aria-label="Mở thêm công cụ chat"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
                        mobileToolsOpen
                          ? "bg-[#0B2545] text-amber-300 rotate-45"
                          : effectiveAnonymous
                            ? "bg-indigo-700 text-amber-300"
                            : "bg-amber-100 text-amber-900 active:bg-amber-200"
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <textarea
                      ref={mobileChatInputRef}
                      rows={1}
                      value={draft}
                      onFocus={() => {
                        setPickerOpen(false);
                        setMobileToolsOpen(false);
                        setTimeout(() => scrollToBottom(false), 180);
                      }}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        effectiveAnonymous
                          ? "Nhắn ẩn danh..."
                          : "Nhắn tin..."
                      }
                      className="flex-1 min-w-0 max-h-24 resize-none bg-transparent px-1.5 py-1.5 text-[16px] leading-snug text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />

                    {!draft.trim() && !attachmentUrl.trim() ? (
                      <div className="flex items-center gap-0.5 shrink-0 pr-0.5">
                        <label
                          aria-label="Gửi ảnh"
                          className="w-9 h-9 rounded-full text-slate-600 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <ImagePlus className="w-5 h-5 text-emerald-600" />
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
                            setMobileToolsOpen(false);
                            mobileChatInputRef.current?.blur();
                            if (pickerOpen && pickerTab === "EMOJI") {
                              setPickerOpen(false);
                            } else {
                              setPickerTab("EMOJI");
                              setPickerOpen(true);
                            }
                          }}
                          aria-label="Chọn biểu tượng cảm xúc"
                          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${
                            pickerOpen && pickerTab === "EMOJI"
                              ? "bg-amber-100 text-amber-700"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Smile className="w-5 h-5 text-amber-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileToolsOpen(false);
                            mobileChatInputRef.current?.blur();
                            if (pickerOpen && pickerTab === "STICKER") {
                              setPickerOpen(false);
                            } else {
                              setPickerTab("STICKER");
                              setPickerOpen(true);
                            }
                          }}
                          aria-label="Chọn Sticker"
                          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${
                            pickerOpen && pickerTab === "STICKER"
                              ? "bg-[#0B2545] text-amber-300"
                              : "text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          <Sparkles className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0 pr-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileToolsOpen(false);
                            mobileChatInputRef.current?.blur();
                            setPickerTab("EMOJI");
                            setPickerOpen((v) => !v);
                          }}
                          aria-label="Chèn Emoji"
                          className="w-9 h-9 rounded-full text-amber-500 hover:bg-amber-50 flex items-center justify-center cursor-pointer"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        <button
                          type="submit"
                          aria-label="Gửi tin nhắn"
                          className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-sm cursor-pointer transition ${
                            effectiveAnonymous
                              ? "bg-indigo-700 active:bg-indigo-800"
                              : "bg-gradient-to-r from-red-500 to-amber-500 active:from-red-600 active:to-amber-600"
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* === DESKTOP COMPOSER (md+) === */}
                <div className="hidden md:flex items-end gap-2">
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
                      effectiveAnonymous
                        ? "Nhập tin nhắn ẩn danh..."
                        : `Nhắn tới ${getRoomDisplayTitle(activeRoom)}...`
                    }
                    className={`flex-1 min-h-[40px] max-h-28 resize-none rounded-2xl border px-3.5 py-2.5 text-sm leading-snug bg-white focus:outline-none ${
                      effectiveAnonymous
                        ? "border-indigo-300 focus:border-indigo-500"
                        : "border-amber-200 focus:border-sky-400"
                    }`}
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim() && !attachmentUrl.trim()}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold text-white inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 ${
                      effectiveAnonymous
                        ? "bg-indigo-700 hover:bg-indigo-800"
                        : "bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <ChatAnonymousDirectModal
        open={anonDirectOpen}
        teammates={teammates}
        onClose={() => setAnonDirectOpen(false)}
        onOpened={async (room, alias) => {
          const exists = rooms.some((r) => r.id === room.id);
          const nextRooms = exists
            ? rooms.map((r) => (r.id === room.id ? room : r))
            : [room, ...rooms];
          setRooms(nextRooms);
          setAnonDirectOpen(false);
          setAnonymousAlias(alias);
          setAnonymousMode(true);
          await handleSelectRoom(room.id, nextRooms);
        }}
      />

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
