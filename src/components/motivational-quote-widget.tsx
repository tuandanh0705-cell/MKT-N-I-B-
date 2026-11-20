"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Heart,
  Pin,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type { MotivationalQuoteItem } from "@/types/crm";

export function MotivationalQuoteWidget({
  toneMode = "PIRATE",
  compact = false,
}: {
  toneMode?: string;
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState<MotivationalQuoteItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.quotes) setQuotes(data.quotes);
      })
      .catch(() => {});
  }, []);

  const current = quotes[idx] || null;

  function nextQuote() {
    if (quotes.length <= 1) return;
    setIdx((prev) => (prev + 1) % quotes.length);
  }

  async function reactQuote(action: "LIKE" | "PIN") {
    if (!current) return;
    const res = await fetch("/api/quotes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, action }),
    });
    const data = await res.json();
    if (res.ok && data.quote) {
      setQuotes((prev) =>
        prev.map((q) => {
          if (q.id === data.quote.id) return data.quote;
          return action === "PIN" ? { ...q, isPinned: false } : q;
        })
      );
      if (action === "PIN") {
        setIdx(0);
        showToast("Đã ghim câu quote này cho cả team cùng xem!");
      }
    }
  }

  async function handleAddQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          authorLabel: newAuthor || undefined,
          tone: toneMode,
          isPinned: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.quote) {
        setQuotes((prev) => [
          data.quote,
          ...prev.map((q) => ({ ...q, isPinned: false })),
        ]);
        setIdx(0);
        setNewContent("");
        setNewAuthor("");
        setAdding(false);
        showToast("Đã thả quote động lực lên bảng team!");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 border-amber-300/80 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-sky-50 ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      } shadow-sm`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                ⚡ Góc Quotes Động Lực Hôm Nay
              </span>
              {current?.isPinned && (
                <span className="rounded-full bg-amber-200/80 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                  📌 Đang ghim
                </span>
              )}
            </div>
            {current ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  &ldquo;{current.content}&rdquo;
                </p>
                <div className="text-[11px] text-slate-600 font-medium">
                  — {current.authorLabel}
                  {current.createdBy ? ` (gửi bởi ${current.createdBy.name})` : ""}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Đang tải nguồn năng lượng cho cả team...
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {current && (
            <>
              <button
                type="button"
                onClick={() => reactQuote("LIKE")}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 cursor-pointer"
                title="Thả tim tiếp lửa"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                {current.likes}
              </button>
              <button
                type="button"
                onClick={() => reactQuote("PIN")}
                className="p-1.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-100 text-amber-700 cursor-pointer"
                title="Ghim câu này lên đầu"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextQuote}
                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                title="Đổi câu quote khác"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-2.5 py-1.5 text-xs font-bold cursor-pointer"
          >
            {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            Viết Quote
          </button>
        </div>
      </div>

      {adding && (
        <form
          onSubmit={handleAddQuote}
          className="mt-3 pt-3 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2"
        >
          <input
            type="text"
            required
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Nhập câu động lực, meme vui hoặc lời nhắn gửi đồng đội..."
            className="sm:col-span-7 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            placeholder="Tác giả / Biệt danh (tuỳ chọn)"
            className="sm:col-span-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Ghim ngay
          </button>
        </form>
      )}
    </div>
  );
}
