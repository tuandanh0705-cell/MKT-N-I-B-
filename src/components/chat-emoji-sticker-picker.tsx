"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Globe,
  ImagePlus,
  Link2,
  Lock,
  Plus,
  Search,
  Smile,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BUILTIN_STICKERS, EMOJI_CATEGORIES } from "@/lib/chat-stickers";
import { useToast } from "@/components/toast-provider";
import type { ChatStickerItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

const RECENT_EMOJIS_KEY = "meta_ecom_recent_emojis_v1";

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function readRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJIS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 24)
      : [];
  } catch {
    return [];
  }
}

function saveRecentEmoji(emoji: string): string[] {
  const prev = readRecentEmojis();
  const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 24);
  try {
    window.localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

/**
 * Chuẩn bị ảnh/GIF sticker:
 * - Giữ nguyên ảnh GIF động nếu dung lượng <= 480KB.
 * - Với PNG/WebP/JPG: thu gọn tối đa 320x320 và giữ nguyên nền trong suốt (WebP/PNG).
 */
function prepareStickerDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.onload = () => {
      const result = String(reader.result || "");
      if (file.type === "image/gif") {
        if (result.length > 680_000) {
          reject(
            new Error(
              "File GIF quá nặng (tối đa ~500KB). Vui lòng chọn GIF nhẹ hơn hoặc dán link GIF."
            )
          );
          return;
        }
        resolve(result);
        return;
      }

      const img = document.createElement("img");
      img.onerror = () => reject(new Error("File không phải ảnh hợp lệ."));
      img.onload = () => {
        const maxDim = 320;
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
          resolve(result);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL("image/webp", 0.88);
        if (webp.startsWith("data:image/webp")) {
          resolve(webp);
          return;
        }
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

// Cache dùng chung giữa Chat tổng và Chat trong Task để mở tức thì
let cachedCustomStickers: ChatStickerItem[] | null = null;
const stickerListeners = new Set<(list: ChatStickerItem[]) => void>();

function broadcastCustomStickers(list: ChatStickerItem[]) {
  cachedCustomStickers = list;
  stickerListeners.forEach((fn) => fn(list));
}

export interface ChatEmojiStickerPickerProps {
  open: boolean;
  initialTab?: "EMOJI" | "STICKER";
  currentUserId?: string;
  currentUserRole?: UserRole;
  align?: "left" | "right";
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: ChatStickerItem) => void;
}

export function ChatEmojiStickerPicker(props: ChatEmojiStickerPickerProps) {
  if (!props.open) return null;
  return (
    <ChatEmojiStickerPickerPanel
      key={props.initialTab ?? "EMOJI"}
      {...props}
    />
  );
}

function ChatEmojiStickerPickerPanel({
  initialTab = "EMOJI",
  currentUserId,
  currentUserRole,
  align = "left",
  onClose,
  onSelectEmoji,
  onSelectSticker,
}: ChatEmojiStickerPickerProps) {
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState<"EMOJI" | "STICKER">(initialTab);
  const [emojiCategory, setEmojiCategory] = useState<string>("smileys");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() =>
    readRecentEmojis()
  );

  const [customStickers, setCustomStickers] = useState<ChatStickerItem[]>(
    () => cachedCustomStickers ?? []
  );
  const [loadingStickers, setLoadingStickers] = useState(
    () => cachedCustomStickers === null
  );
  const [stickerPack, setStickerPack] = useState<string>("ALL");
  const [stickerSearch, setStickerSearch] = useState("");

  // Chế độ thêm sticker mới
  const [addingSticker, setAddingSticker] = useState(false);
  const [uploadMode, setUploadMode] = useState<"FILE" | "URL">("FILE");
  const [newName, setNewName] = useState("");
  const [newPackName, setNewPackName] = useState("⭐ Sticker Team");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newIsShared, setNewIsShared] = useState(true);
  const [processingFile, setProcessingFile] = useState(false);
  const [savingSticker, setSavingSticker] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Đăng ký đồng bộ cache sticker tùy chỉnh
  useEffect(() => {
    const listener = (list: ChatStickerItem[]) => setCustomStickers(list);
    stickerListeners.add(listener);
    return () => {
      stickerListeners.delete(listener);
    };
  }, []);

  // Tải danh sách sticker tự thêm từ DB khi mở lần đầu
  useEffect(() => {
    if (cachedCustomStickers !== null) return;
    let active = true;
    fetch("/api/chat/stickers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const list = Array.isArray(data.stickers)
          ? (data.stickers as ChatStickerItem[])
          : [];
        broadcastCustomStickers(list);
      })
      .catch(() => {
        // Bỏ qua lỗi mạng thoáng qua
      })
      .finally(() => {
        if (active) setLoadingStickers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Đóng khi bấm ngoài hoặc nhấn Esc
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    const q = normalizeVietnamese(emojiSearch.trim());
    if (q) {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const cat of EMOJI_CATEGORIES) {
        for (const item of cat.emojis) {
          if (
            !seen.has(item.emoji) &&
            (item.emoji.includes(q) ||
              normalizeVietnamese(item.keywords).includes(q))
          ) {
            seen.add(item.emoji);
            out.push(item.emoji);
          }
        }
      }
      return out;
    }
    if (emojiCategory === "recent") {
      return recentEmojis;
    }
    const found =
      EMOJI_CATEGORIES.find((c) => c.id === emojiCategory) ??
      EMOJI_CATEGORIES[0];
    return found.emojis.map((e) => e.emoji);
  }, [emojiSearch, emojiCategory, recentEmojis]);

  const allStickers = useMemo(
    () => [...customStickers, ...BUILTIN_STICKERS],
    [customStickers]
  );

  const packTabs = useMemo(() => {
    const customPacks = Array.from(
      new Set(customStickers.map((s) => s.packName).filter(Boolean))
    );
    const builtinPacks = Array.from(
      new Set(BUILTIN_STICKERS.map((s) => s.packName))
    );
    const extraCustomPacks = customPacks.filter(
      (p) => !builtinPacks.includes(p)
    );
    return {
      builtinPacks,
      extraCustomPacks,
    };
  }, [customStickers]);

  const displayedStickers = useMemo(() => {
    const q = normalizeVietnamese(stickerSearch.trim());
    return allStickers.filter((s) => {
      if (stickerPack === "CUSTOM" && s.isBuiltIn) return false;
      if (
        stickerPack !== "ALL" &&
        stickerPack !== "CUSTOM" &&
        s.packName !== stickerPack
      ) {
        return false;
      }
      if (q) {
        const hay = normalizeVietnamese(`${s.name} ${s.packName}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allStickers, stickerPack, stickerSearch]);

  function handlePickEmoji(em: string) {
    setRecentEmojis(saveRecentEmoji(em));
    onSelectEmoji(em);
  }

  async function handleFileSelected(file: File | null | undefined) {
    if (!file) return;
    setProcessingFile(true);
    try {
      const dataUrl = await prepareStickerDataUrl(file);
      if (dataUrl.length > 680_000) {
        showToast(
          "Sticker quá nặng sau khi nén, vui lòng chọn ảnh nhỏ hơn.",
          "error"
        );
        return;
      }
      setNewImageUrl(dataUrl);
      if (!newName.trim()) {
        const cleanFileName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim()
          .slice(0, 32);
        if (cleanFileName) setNewName(cleanFileName);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Không đọc được file sticker.",
        "error"
      );
    } finally {
      setProcessingFile(false);
    }
  }

  async function handleSaveNewSticker() {
    if (!newName.trim()) {
      showToast("Vui lòng nhập tên ngắn cho sticker.", "error");
      return;
    }
    if (!newImageUrl.trim()) {
      showToast("Vui lòng tải ảnh/GIF hoặc dán link ảnh sticker.", "error");
      return;
    }
    setSavingSticker(true);
    try {
      const res = await fetch("/api/chat/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          packName: newPackName.trim() || "⭐ Sticker Team",
          imageUrl: newImageUrl.trim(),
          isShared: newIsShared,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được sticker mới.", "error");
        return;
      }
      const created = data.sticker as ChatStickerItem;
      const nextList = [created, ...(cachedCustomStickers ?? customStickers)];
      broadcastCustomStickers(nextList);
      setNewName("");
      setNewImageUrl("");
      setAddingSticker(false);
      setStickerPack("CUSTOM");
      showToast(`Đã thêm sticker "${created.name}" thành công!`);
    } catch {
      showToast("Lỗi kết nối khi lưu sticker.", "error");
    } finally {
      setSavingSticker(false);
    }
  }

  async function handleDeleteCustomSticker(sticker: ChatStickerItem) {
    setDeletingId(sticker.id);
    try {
      const res = await fetch(
        `/api/chat/stickers?id=${encodeURIComponent(sticker.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Không xóa được sticker này.", "error");
        return;
      }
      const nextList = (cachedCustomStickers ?? customStickers).filter(
        (s) => s.id !== sticker.id
      );
      broadcastCustomStickers(nextList);
      showToast(`Đã xóa sticker "${sticker.name}".`, "info");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-full mb-2 z-50 left-1.5 right-1.5 w-auto sm:w-[384px] rounded-2xl border-2 border-amber-200 bg-white shadow-2xl overflow-hidden flex flex-col ${
        align === "right"
          ? "sm:left-auto sm:right-0"
          : "sm:left-0 sm:right-auto"
      }`}
    >
      {/* Header chọn Tab Emoji / Sticker */}
      <div className="px-2.5 py-2 border-b border-amber-100 bg-[#FFFDF7] flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-amber-100/70 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab("EMOJI");
              setAddingSticker(false);
            }}
            className={`rounded-lg px-2.5 py-1 font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
              tab === "EMOJI"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            Biểu tượng
          </button>
          <button
            type="button"
            onClick={() => setTab("STICKER")}
            className={`rounded-lg px-2.5 py-1 font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
              tab === "STICKER"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sticker
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                tab === "STICKER"
                  ? "bg-amber-300/20 text-amber-200"
                  : "bg-white text-amber-700"
              }`}
            >
              {allStickers.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label="Đóng bảng emoji và sticker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: FULL EMOJI PICKER */}
      {tab === "EMOJI" && (
        <div className="flex flex-col">
          {/* Ô tìm kiếm */}
          <div className="px-2.5 pt-2 pb-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
                placeholder="Tìm emoji (VD: cười, tim, lửa, deadline, ok...)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white pl-8 pr-7 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
              {emojiSearch && (
                <button
                  type="button"
                  onClick={() => setEmojiSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Thanh danh mục Emoji */}
          {!emojiSearch.trim() && (
            <div className="px-2 pb-1.5 border-b border-slate-100 flex items-center gap-0.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setEmojiCategory("recent")}
                title="Dùng gần đây"
                className={`p-1.5 rounded-lg text-sm shrink-0 transition cursor-pointer ${
                  emojiCategory === "recent"
                    ? "bg-amber-100 text-amber-900"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setEmojiCategory(cat.id)}
                  title={cat.label}
                  className={`px-2 py-1 rounded-lg text-base leading-none shrink-0 transition cursor-pointer ${
                    emojiCategory === cat.id
                      ? "bg-amber-100 ring-1 ring-amber-300"
                      : "hover:bg-slate-100"
                  }`}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Tên nhóm hiện tại */}
          <div className="px-3 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>
              {emojiSearch.trim()
                ? `Kết quả tìm kiếm (${filteredEmojis.length})`
                : emojiCategory === "recent"
                  ? "Dùng gần đây"
                  : EMOJI_CATEGORIES.find((c) => c.id === emojiCategory)?.label}
            </span>
            <span>Bấm để chèn</span>
          </div>

          {/* Lưới Emoji */}
          <div className="h-52 sm:h-60 overflow-y-auto px-2 pb-2.5">
            {filteredEmojis.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 px-4">
                {emojiCategory === "recent" && !emojiSearch.trim()
                  ? "Chưa có emoji gần đây. Hãy bấm chọn emoji ở các nhóm bên trên nhé!"
                  : `Không tìm thấy emoji khớp "${emojiSearch}".`}
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-0.5">
                {filteredEmojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handlePickEmoji(em)}
                    className="h-9 w-full flex items-center justify-center rounded-lg text-xl hover:bg-amber-100/80 hover:scale-125 transition cursor-pointer select-none"
                    title={`Chèn ${em}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STICKER PICKER + THÊM STICKER TỰ TẠO */}
      {tab === "STICKER" && !addingSticker && (
        <div className="flex flex-col">
          {/* Tìm kiếm + nút Thêm sticker */}
          <div className="px-2.5 pt-2 pb-1.5 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stickerSearch}
                onChange={(e) => setStickerSearch(e.target.value)}
                placeholder="Tìm sticker..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white pl-8 pr-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setAddingSticker(true)}
              className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm sticker
            </button>
          </div>

          {/* Bộ lọc bộ sticker */}
          <div className="px-2.5 pb-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setStickerPack("ALL")}
              className={`rounded-lg px-2 py-1 font-bold shrink-0 cursor-pointer transition ${
                stickerPack === "ALL"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({allStickers.length})
            </button>
            <button
              type="button"
              onClick={() => setStickerPack("CUSTOM")}
              className={`rounded-lg px-2 py-1 font-bold shrink-0 cursor-pointer transition ${
                stickerPack === "CUSTOM"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ⭐ Tự thêm ({customStickers.length})
            </button>
            {packTabs.builtinPacks.map((pack) => (
              <button
                key={pack}
                type="button"
                onClick={() => setStickerPack(pack)}
                className={`rounded-lg px-2 py-1 font-bold shrink-0 cursor-pointer transition ${
                  stickerPack === pack
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pack}
              </button>
            ))}
            {packTabs.extraCustomPacks.map((pack) => (
              <button
                key={pack}
                type="button"
                onClick={() => setStickerPack(pack)}
                className={`rounded-lg px-2 py-1 font-bold shrink-0 cursor-pointer transition ${
                  stickerPack === pack
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pack}
              </button>
            ))}
          </div>

          {/* Lưới Sticker */}
          <div className="h-56 sm:h-64 overflow-y-auto p-2.5">
            {loadingStickers && customStickers.length === 0 && stickerPack === "CUSTOM" ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang tải sticker tự thêm...
              </div>
            ) : displayedStickers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2.5">
                <p className="text-xs text-slate-500">
                  {stickerPack === "CUSTOM"
                    ? "Chưa có sticker tự thêm nào. Tải ảnh PNG, GIF động hoặc dán link meme của bạn để cả team cùng dùng!"
                    : `Không tìm thấy sticker khớp "${stickerSearch}".`}
                </p>
                {stickerPack === "CUSTOM" && (
                  <button
                    type="button"
                    onClick={() => setAddingSticker(true)}
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm sticker đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {displayedStickers.map((sticker) => {
                  const canDelete =
                    !sticker.isBuiltIn &&
                    (currentUserRole === "LEADER" ||
                      (currentUserId && sticker.createdById === currentUserId));

                  return (
                    <div key={sticker.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSticker(sticker);
                          onClose();
                        }}
                        title={`Gửi sticker "${sticker.name}"${
                          sticker.createdByName
                            ? ` • Tạo bởi ${sticker.createdByName}`
                            : ""
                        }`}
                        className="w-full rounded-xl border border-transparent hover:border-amber-300 hover:bg-amber-50/70 p-1.5 flex flex-col items-center gap-1 transition cursor-pointer"
                      >
                        <div className="w-16 h-16 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sticker.imageUrl}
                            alt={sticker.name}
                            loading="lazy"
                            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 truncate w-full text-center">
                          {sticker.name}
                        </span>
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingId === sticker.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteCustomSticker(sticker);
                          }}
                          title="Xóa sticker tự thêm này"
                          className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 rounded-full bg-white/95 border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-xs transition cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM THÊM STICKER TỰ TẠO */}
      {tab === "STICKER" && addingSticker && (
        <div
          className="p-3 space-y-2.5 max-h-[340px] overflow-y-auto"
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                  e.preventDefault();
                  setUploadMode("FILE");
                  void handleFileSelected(file);
                }
                break;
              }
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAddingSticker(false)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại kho sticker
            </button>
            <span className="text-[11px] font-extrabold text-amber-700">
              ➕ Thêm Sticker Mới
            </span>
          </div>

          {/* Chọn cách tải: File hoặc Link */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setUploadMode("FILE")}
              className={`rounded-xl border px-2.5 py-1.5 font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                uploadMode === "FILE"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Tải ảnh / GIF
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("URL")}
              className={`rounded-xl border px-2.5 py-1.5 font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                uploadMode === "URL"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Dán link ảnh / GIF
            </button>
          </div>

          {/* Khu vực chọn file hoặc dán URL + Xem trước */}
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-20 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center shrink-0 overflow-hidden p-1"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%)",
                backgroundSize: "12px 12px",
              }}
            >
              {newImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={newImageUrl}
                  alt="Xem trước sticker"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-slate-400 text-center px-1">
                  Xem trước
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              {uploadMode === "FILE" ? (
                <>
                  <label className="w-full rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    {processingFile
                      ? "Đang xử lý ảnh..."
                      : newImageUrl
                        ? "Chọn ảnh / GIF khác"
                        : "Chọn file PNG / WebP / GIF"}
                    <input
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        void handleFileSelected(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Hỗ trợ nền trong suốt (PNG/WebP), GIF động &amp; dán{" "}
                    <kbd className="rounded bg-slate-100 px-1 font-mono">Ctrl+V</kbd>.
                  </p>
                </>
              ) : (
                <input
                  type="url"
                  value={newImageUrl.startsWith("data:") ? "" : newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://media.giphy.com/... hoặc link .png/.webp/.gif"
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-amber-400 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tên sticker *
              </label>
              <input
                type="text"
                maxLength={40}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Duyệt luôn, Haha..."
                className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tên bộ sticker
              </label>
              <input
                type="text"
                maxLength={32}
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                placeholder="⭐ Sticker Team"
                className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Phạm vi chia sẻ */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setNewIsShared(true)}
              className={`flex-1 rounded-xl border px-2.5 py-1.5 font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                newIsShared
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Globe className="w-3 h-3" />
              Cả team cùng dùng
            </button>
            <button
              type="button"
              onClick={() => setNewIsShared(false)}
              className={`flex-1 rounded-xl border px-2.5 py-1.5 font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                !newIsShared
                  ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Lock className="w-3 h-3" />
              Chỉ mình tôi
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={savingSticker}
              onClick={() => setAddingSticker(false)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={savingSticker || processingFile}
              onClick={() => void handleSaveNewSticker()}
              className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-3.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {savingSticker ? "Đang lưu..." : "Lưu Sticker"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
