"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AtSign,
  ExternalLink,
  ImagePlus,
  Link2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import { QC_CRITERIA } from "@/lib/qc-standards";
import type { SimpleUser, TaskCommentItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface ViewerInfo {
  id: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  pirateCharacter?: string | null;
}

interface TaskFeedbackChatProps {
  taskId: string;
  taskCode?: string;
  initialComments?: TaskCommentItem[];
  users?: SimpleUser[];
  currentUserId?: string;
  currentUserRole?: UserRole;
  compact?: boolean;
  maxHeightClass?: string;
  placeholder?: string;
  onCommentsChanged?: (comments: TaskCommentItem[]) => void;
}

function formatShortVnTime(input: string | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function isImageAttachment(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTextWithLinksAndMentions(
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

  return text.split(combinedRegex).map((part, idx) => {
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

function normalizeChronological(list: TaskCommentItem[]): TaskCommentItem[] {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function TaskFeedbackChat({
  taskId,
  taskCode,
  initialComments = [],
  users = [],
  currentUserId,
  currentUserRole,
  compact = false,
  maxHeightClass = "max-h-72",
  placeholder,
  onCommentsChanged,
}: TaskFeedbackChatProps) {
  const { showToast } = useToast();

  const [comments, setComments] = useState<TaskCommentItem[]>(() =>
    normalizeChronological(initialComments)
  );
  const [viewer, setViewer] = useState<ViewerInfo | null>(
    currentUserId
      ? {
          id: currentUserId,
          name: "Bạn",
          role: currentUserRole ?? "MEMBER",
          avatarColor: "#2563eb",
        }
      : null
  );
  const [loadingInitial, setLoadingInitial] = useState(
    initialComments.length === 0
  );
  const [draft, setDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const commentsRef = useRef<TaskCommentItem[]>(comments);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const onCommentsChangedRef = useRef(onCommentsChanged);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    onCommentsChangedRef.current = onCommentsChanged;
  }, [onCommentsChanged]);

  // Hợp nhất ngay các comment mới tạo từ thao tác bên ngoài (ví dụ: Yêu cầu sửa QC, Lưu đánh giá Gemini AI)
  useEffect(() => {
    if (!initialComments || initialComments.length === 0) return;
    setComments((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const missing = initialComments.filter((c) => !existingIds.has(c.id));
      if (missing.length === 0) return prev;
      const merged = normalizeChronological([...prev, ...missing]);
      commentsRef.current = merged;
      return merged;
    });
  }, [initialComments]);

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  // Tải đầy đủ lịch sử feedback & đồng bộ tin mới dạng incremental mỗi 2.5s
  useEffect(() => {
    let active = true;
    let inFlight = false;

    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.viewer) setViewer(data.viewer as ViewerInfo);
        const loaded = normalizeChronological(
          (data.comments || []) as TaskCommentItem[]
        );
        setComments((prev) => {
          const pendingOnes = prev.filter((c) => c.pending);
          const merged = [...loaded, ...pendingOnes];
          commentsRef.current = merged;
          return merged;
        });
        onCommentsChangedRef.current?.(loaded);
        scrollToBottom(false);
      } catch {
        // Giữ nguyên dữ liệu hiện có nếu lỗi mạng tạm
      } finally {
        if (active) setLoadingInitial(false);
      }
    };

    void loadInitial();

    const pollIncremental = async () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      try {
        const confirmed = commentsRef.current.filter((c) => !c.pending);
        const lastConfirmed = confirmed[confirmed.length - 1];
        const url = lastConfirmed
          ? `/api/tasks/${taskId}/comments?after=${encodeURIComponent(
              new Date(lastConfirmed.createdAt).toISOString()
            )}`
          : `/api/tasks/${taskId}/comments`;

        const res = await fetch(url);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.viewer && !viewer) setViewer(data.viewer as ViewerInfo);
        const incoming: TaskCommentItem[] = data.comments || [];
        if (incoming.length === 0) return;

        let changed = false;
        let nextConfirmed: TaskCommentItem[] | null = null;
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueNew = incoming.filter((c) => !existingIds.has(c.id));
          if (uniqueNew.length === 0) return prev;
          changed = true;
          const next = normalizeChronological([...prev, ...uniqueNew]);
          commentsRef.current = next;
          nextConfirmed = next.filter((c) => !c.pending);
          return next;
        });

        if (changed) {
          if (nextConfirmed) onCommentsChangedRef.current?.(nextConfirmed);
          scrollToBottom(true);
        }
      } catch {
        // Bỏ qua lỗi mạng thoáng qua
      } finally {
        inFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void pollIncremental();
      }
    };

    const timer = setInterval(() => {
      void pollIncremental();
    }, 2500);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const viewerId = viewer?.id;
  const viewerName = viewer?.name;

  const mentionCandidates = useMemo(() => {
    const myId = viewerId || currentUserId;
    return users.filter((u) => u.isActive !== false && u.id !== myId);
  }, [users, viewerId, currentUserId]);

  const mentionNames = useMemo(
    () => [
      ...(viewerName ? [viewerName] : []),
      ...users.map((u) => u.name),
    ],
    [users, viewerName]
  );

  const filteredMentions = useMemo(() => {
    const match = draft.match(/(?:^|\s)@([^\s@]{0,20})$/);
    if (!match) return [];
    const q = match[1].toLowerCase();
    return mentionCandidates
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [draft, mentionCandidates]);

  function handleInsertMention(name: string) {
    setDraft((prev) =>
      prev.replace(/(?:^|\s)@([^\s@]{0,20})$/, (full) => {
        const leadingSpace =
          full.startsWith(" ") || full.startsWith("\n") ? full[0] : "";
        return `${leadingSpace}@${name} `;
      })
    );
    inputRef.current?.focus();
  }

  async function handleAttachImage(file: File | null | undefined) {
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

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const cleanText = draft.trim();
    const cleanUrl = attachmentUrl.trim();
    if (!cleanText && !cleanUrl) return;

    const isDataImage = Boolean(cleanUrl && /^data:image\//i.test(cleanUrl));
    const displayContent =
      cleanText ||
      (isDataImage
        ? "🖼️ Đã gửi 1 ảnh minh họa feedback"
        : "📎 Đã gửi 1 liên kết tham khảo");

    const tempId = `temp-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: TaskCommentItem = {
      id: tempId,
      content: displayContent,
      attachmentUrl: cleanUrl || null,
      createdAt: new Date().toISOString(),
      pending: true,
      author: {
        id: viewer?.id || currentUserId || "me",
        name: viewer?.name || "Bạn",
        role: viewer?.role || currentUserRole || "MEMBER",
        avatarColor: viewer?.avatarColor || "#0B2545",
        pirateCharacter: viewer?.pirateCharacter ?? null,
      },
    };

    // Optimistic UI: hiện bong bóng feedback ngay lập tức
    setComments((prev) => {
      const next = [...prev, optimistic];
      commentsRef.current = next;
      return next;
    });
    setDraft("");
    setAttachmentUrl("");
    setShowLinkInput(false);
    scrollToBottom(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cleanText,
          attachmentUrl: cleanUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComments((prev) => {
          const next = prev.filter((c) => c.id !== tempId);
          commentsRef.current = next;
          return next;
        });
        setDraft((cur) => (cur ? cur : cleanText));
        if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
        showToast(data.error || "Không gửi được feedback.", "error");
        return;
      }

      const saved = data.comment as TaskCommentItem;
      let nextConfirmed: TaskCommentItem[] | null = null;
      setComments((prev) => {
        const alreadyExists = prev.some((c) => c.id === saved.id);
        const replaced = alreadyExists
          ? prev.filter((c) => c.id !== tempId)
          : prev.map((c) => (c.id === tempId ? saved : c));
        const normalized = normalizeChronological(replaced);
        commentsRef.current = normalized;
        nextConfirmed = normalized.filter((c) => !c.pending);
        return normalized;
      });
      if (nextConfirmed) onCommentsChangedRef.current?.(nextConfirmed);
    } catch {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== tempId);
        commentsRef.current = next;
        return next;
      });
      setDraft((cur) => (cur ? cur : cleanText));
      if (cleanUrl) setAttachmentUrl((cur) => (cur ? cur : cleanUrl));
      showToast("Lỗi kết nối máy chủ khi gửi feedback.", "error");
    }
  }

  const myUserId = viewer?.id || currentUserId;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-white to-sky-50/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
          <h4 className="text-xs font-extrabold text-slate-900 truncate">
            Chat &amp; Feedback trực tiếp{taskCode ? ` (${taskCode})` : ""}
          </h4>
        </div>
        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 shrink-0">
          {comments.length} tin
        </span>
      </div>

      {/* Message stream */}
      <div
        ref={scrollContainerRef}
        className={`p-3 space-y-2.5 overflow-y-auto bg-[#FFFDF8] ${maxHeightClass}`}
      >
        {loadingInitial ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Đang tải lịch sử trao đổi...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">
              Chưa có tin nhắn feedback nào cho đầu việc này.
            </p>
            <p className="text-[11px]">
              Nhắn trao đổi, dán ảnh chụp chỗ cần sửa (`Ctrl+V`) hoặc `@tag` đồng đội ngay bên dưới.
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const isMine = Boolean(
              c.pending || (myUserId && c.author.id === myUserId)
            );
            const flags = Array.isArray(c.qcFlagsJson)
              ? (c.qcFlagsJson as string[])
              : [];
            return (
              <div
                key={c.id}
                className={`flex items-end gap-2 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {!isMine && (
                  <PirateAvatar
                    name={c.author.name}
                    color={c.author.avatarColor}
                    scope={c.author.role === "LEADER" ? "LEADER" : "CONTENT"}
                    pirateCharacter={c.author.pirateCharacter}
                    size="sm"
                    animate={false}
                  />
                )}

                <div
                  className={`max-w-[85%] flex flex-col space-y-0.5 ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700">
                      {isMine ? "Bạn" : c.author.name}
                    </span>
                    {c.author.role === "LEADER" && (
                      <span className="rounded bg-[#0B2545] text-amber-300 px-1.5 py-0.2 text-[9px] font-bold">
                        👒 Leader
                      </span>
                    )}
                    <span>
                      •{" "}
                      {c.pending
                        ? "Đang gửi..."
                        : formatShortVnTime(c.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs whitespace-pre-wrap break-words transition-opacity ${
                      c.pending ? "opacity-75" : ""
                    } ${
                      isMine
                        ? "bg-[#0B2545] text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-amber-200/80 rounded-bl-sm"
                    }`}
                  >
                    {renderTextWithLinksAndMentions(
                      c.content,
                      isMine,
                      mentionNames
                    )}

                    {flags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {flags.map((code) => {
                          const info = QC_CRITERIA.find((q) => q.code === code);
                          return (
                            <span
                              key={code}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isMine
                                  ? "bg-rose-500/25 text-rose-100 border border-rose-300/30"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {code}
                              {info ? `: ${info.group}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {c.attachmentUrl && (
                      <div className="mt-2 pt-1.5 border-t border-current/15">
                        {isImageAttachment(c.attachmentUrl) ? (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(c.attachmentUrl!)}
                            className="block rounded-xl overflow-hidden border border-black/10 hover:opacity-95 cursor-pointer"
                          >
                            <Image
                              src={c.attachmentUrl}
                              alt="Ảnh minh họa feedback"
                              width={280}
                              height={200}
                              unoptimized
                              className="max-h-44 w-auto object-cover rounded-xl"
                            />
                          </button>
                        ) : (
                          <a
                            href={c.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-[11px] font-bold underline ${
                              isMine ? "text-amber-300" : "text-sky-600"
                            }`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Mở link tham khảo
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className={`border-t border-slate-100 bg-white space-y-2 ${
          compact ? "p-2.5" : "p-3"
        }`}
      >
        {filteredMentions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 bg-violet-50/70 border border-violet-200 rounded-xl px-2 py-1.5">
            <span className="text-[10px] font-bold text-violet-700 px-1">
              Tag (@):
            </span>
            {filteredMentions.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleInsertMention(u.name)}
                className="rounded-lg bg-white hover:bg-violet-100 border border-violet-200 text-violet-900 px-2 py-0.5 text-[11px] font-bold cursor-pointer"
              >
                @{u.name}
              </button>
            ))}
          </div>
        )}

        {attachmentUrl && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-2.5 py-1.5 text-[11px]">
            {isImageAttachment(attachmentUrl) ? (
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={attachmentUrl}
                  alt="Preview"
                  width={36}
                  height={36}
                  unoptimized
                  className="w-9 h-9 rounded-lg object-cover border border-sky-200 shrink-0"
                />
                <span className="font-semibold text-sky-900 truncate">
                  Ảnh chụp feedback sẵn sàng gửi
                </span>
              </div>
            ) : (
              <span className="font-semibold text-sky-900 truncate">
                🔗 {attachmentUrl}
              </span>
            )}
            <button
              type="button"
              onClick={() => setAttachmentUrl("")}
              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              title="Gỡ đính kèm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showLinkInput && (
          <input
            type="url"
            value={attachmentUrl.startsWith("data:image/") ? "" : attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="Dán link Drive / Canva / Figma (https://...)"
            className="w-full rounded-xl border border-sky-200 bg-slate-50 focus:bg-white px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
          />
        )}

        <div className="flex items-end gap-1.5">
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            <label
              title="Gửi ảnh minh họa (hoặc Ctrl+V dán thẳng)"
              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 cursor-pointer transition"
            >
              <ImagePlus className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  void handleAttachImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowLinkInput((v) => !v)}
              title="Đính kèm link tham khảo"
              className={`p-1.5 rounded-lg cursor-pointer transition ${
                showLinkInput
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-500 hover:text-sky-700 hover:bg-sky-50"
              }`}
            >
              <Link2 className="w-4 h-4" />
            </button>
            {mentionCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDraft((prev) =>
                    prev && !prev.endsWith(" ") ? `${prev} @` : `${prev}@`
                  );
                  inputRef.current?.focus();
                }}
                title="Nhắc tên đồng đội (@)"
                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 cursor-pointer transition"
              >
                <AtSign className="w-4 h-4" />
              </button>
            )}
          </div>

          <textarea
            ref={inputRef}
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
                    void handleAttachImage(file);
                  }
                  break;
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              placeholder ||
              "Nhắn feedback trực tiếp... (Enter gửi, Ctrl+V dán ảnh)"
            }
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!draft.trim() && !attachmentUrl.trim()}
            className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-45 text-amber-300 px-3 py-2 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer shrink-0 transition"
          >
            <Send className="w-3.5 h-3.5" />
            Gửi
          </button>
        </div>
      </form>

      {/* Lightbox xem ảnh đính kèm */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <Image
            src={lightboxUrl}
            alt="Ảnh feedback phóng to"
            width={1200}
            height={900}
            unoptimized
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
