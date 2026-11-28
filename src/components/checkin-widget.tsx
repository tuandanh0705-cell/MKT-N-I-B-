"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Sparkles } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type { CheckinItem } from "@/types/crm";

export interface TodayPlanCheckinSummary {
  total: number;
  inProgress: number;
  waitingApproval: number;
  done: number;
  titles: string[];
}

interface CheckinWidgetProps {
  todayDate: string;
  initialCheckin: CheckinItem | null;
  todayPlanSummary?: TodayPlanCheckinSummary;
  onStatusChange?: (status: "ON_TRACK" | "AT_RISK" | "DONE_TODAY") => void;
}

export function CheckinWidget({
  todayDate,
  initialCheckin,
  todayPlanSummary,
  onStatusChange,
}: CheckinWidgetProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [checkin, setCheckin] = useState<CheckinItem | null>(initialCheckin);
  const [note, setNote] = useState(initialCheckin?.note || "");
  const [showRiskInput, setShowRiskInput] = useState(
    initialCheckin?.status === "AT_RISK"
  );
  const [saving, setSaving] = useState(false);

  async function submitCheckin(
    status: "ON_TRACK" | "AT_RISK" | "DONE_TODAY",
    overrideNote?: string
  ) {
    const effectiveNote = overrideNote !== undefined ? overrideNote : note;
    if (status === "AT_RISK" && !effectiveNote.trim()) {
      setShowRiskInput(true);
      showToast("Nhập ngắn lý do gặp sóng lớn để Thuyền trưởng hỗ trợ nhé.", "info");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: effectiveNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể lưu báo cáo ra khơi.", "error");
      } else {
        setCheckin(data.checkin);
        setShowRiskInput(status === "AT_RISK");
        onStatusChange?.(status);
        showToast(
          status === "AT_RISK"
            ? "Ốc sên Den Den Mushi đã báo động tới Thuyền trưởng!"
            : "Đã điểm danh ra khơi hôm nay thành công!",
          status === "AT_RISK" ? "info" : "success"
        );
        router.refresh();
      }
    } catch {
      showToast("Lỗi kết nối khi Check-in.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full h-full bg-white rounded-2xl border-2 border-amber-200/80 px-4 py-4 shadow-sm flex flex-col justify-center">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">
                Điểm danh ra khơi sáng ({todayDate})
              </span>
              {checkin && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    checkin.status === "AT_RISK"
                      ? "bg-rose-100 text-rose-700"
                      : checkin.status === "DONE_TODAY"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {checkin.status === "AT_RISK"
                    ? "🌊 Đang gặp sóng lớn"
                    : checkin.status === "DONE_TODAY"
                      ? "⚓ Đã cập bến hôm nay"
                      : "⛵ Thuận buồm xuôi gió"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {todayPlanSummary && todayPlanSummary.total > 0
                ? `Kế hoạch hôm nay: ${todayPlanSummary.total} việc (${todayPlanSummary.inProgress} đang làm • ${todayPlanSummary.waitingApproval} chờ duyệt • ${todayPlanSummary.done} xong)`
                : "Bấm 1 chạm thay báo cáo 09:00 trên Bitrix / Zalo"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              let autoSummary: string | undefined;
              if (
                !note.trim() &&
                todayPlanSummary &&
                todayPlanSummary.titles.length > 0
              ) {
                autoSummary = `Hôm nay (${todayPlanSummary.total} việc): ${todayPlanSummary.titles
                  .slice(0, 3)
                  .join("; ")}${
                  todayPlanSummary.titles.length > 3 ? "..." : ""
                }`;
                setNote(autoSummary);
              }
              void submitCheckin("ON_TRACK", autoSummary);
            }}
            className="rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 cursor-pointer"
          >
            ⛵ Thuận buồm xuôi gió
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => setShowRiskInput((v) => !v)}
            className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 cursor-pointer"
          >
            🌊 Gặp sóng lớn (Nguy cơ trễ)
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitCheckin("DONE_TODAY")}
            className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 cursor-pointer"
          >
            ⚓ Cập bến hôm nay!
          </button>
        </div>
      </div>

      {showRiskInput && (
        <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
          {todayPlanSummary && todayPlanSummary.titles.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setNote(
                  `Cần hỗ trợ tiến độ hôm nay (${todayPlanSummary.titles
                    .slice(0, 2)
                    .join(", ")}): `
                )
              }
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Chèn nhanh tên việc từ To-Do hôm nay
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập lý do gặp sóng lớn để Thuyền trưởng hỗ trợ..."
              className="flex-1 rounded-xl border border-amber-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => submitCheckin("AT_RISK")}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold shrink-0 cursor-pointer"
            >
              🐌 Gọi Den Den Mushi báo Leader
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
