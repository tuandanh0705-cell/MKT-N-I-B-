"use client";

import { useEffect, useState } from "react";
import { Copy, FileSpreadsheet, Send } from "lucide-react";
import { useToast } from "@/components/toast-provider";

export function GoogleFormIntakeSetupCard({
  onSimulatedCreated,
}: {
  onSimulatedCreated: () => void;
}) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<{
    endpointUrl: string;
    secret: string;
    appsScriptSnippet: string;
  } | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [simSender, setSimSender] = useState("Phòng Kinh Doanh — Anh Minh");
  const [simTitle, setSimTitle] = useState("Poster sự kiện Hội thảo Khách hàng");
  const [simDueAt, setSimDueAt] = useState("");
  const [sendingSim, setSendingSim] = useState(false);

  useEffect(() => {
    fetch("/api/intake/google-form")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.endpointUrl) setConfig(data);
      })
      .catch(() => {});
  }, []);

  async function runTestSimulation(e: React.FormEvent) {
    e.preventDefault();
    setSendingSim(true);
    try {
      const res = await fetch("/api/intake/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: simSender,
          senderDepartment: "Phòng ban ngoài",
          title: simTitle,
          description: "Test đơn gửi qua Google Form Intake",
          taskType: "MEDIA_IMAGE",
          platform: "Fanpage",
          quantity: 2,
          dueAt: simDueAt ? new Date(simDueAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.ruleD7Warning
            ? `Đã nhận đơn ${data.task.code} (Cảnh báo: ${data.ruleD7Warning})`
            : `Đã nhận đơn Google Form ${data.task.code} vào hàng chờ Leader duyệt!`
        );
        onSimulatedCreated();
      } else {
        showToast(data.error || "Không tạo được đơn thử.", "error");
      }
    } finally {
      setSendingSim(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-orange-200/80 shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              📋 Cổng Nhận Việc Ngoài Team qua Google Form (Quy tắc D-7)
            </h2>
            <p className="text-xs text-slate-500">
              Khi phòng ban khác điền Google Form, Apps Script tự bắn đơn vào dự án{" "}
              <strong>Đơn Ngoài Team</strong>, gắn nhãn Gấp nếu dưới 7 ngày và báo ngay cho Leader.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowScript((v) => !v)}
          className="rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 px-3 py-1.5 text-xs font-bold cursor-pointer"
        >
          {showScript ? "Ẩn mã Apps Script" : "Xem mã kết nối Google Form"}
        </button>
      </div>

      {config && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Webhook Endpoint URL
              </div>
              <div className="font-mono text-slate-800 truncate">
                {config.endpointUrl}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(config.endpointUrl);
                showToast("Đã copy URL Google Form Webhook!");
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Header Bí Mật (x-intake-secret)
              </div>
              <div className="font-mono text-slate-800 truncate">
                {config.secret}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(config.secret);
                showToast("Đã copy Intake Secret!");
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showScript && config && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">
              Dán vào Google Form → Trình chỉnh sửa tập lệnh (Apps Script) → Cài Trigger &ldquo;Khi gửi biểu mẫu&rdquo;:
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(config.appsScriptSnippet);
                showToast("Đã copy code Apps Script!");
              }}
              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Code.gs
            </button>
          </div>
          <pre className="rounded-xl bg-slate-900 text-amber-200 p-3 overflow-x-auto text-[11px] font-mono">
            {config.appsScriptSnippet}
          </pre>
        </div>
      )}

      <form
        onSubmit={runTestSimulation}
        className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs"
      >
        <div className="sm:col-span-4">
          <label className="block font-semibold text-slate-600 mb-1">
            Người / Phòng ban gửi thử
          </label>
          <input
            type="text"
            required
            value={simSender}
            onChange={(e) => setSimSender(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block font-semibold text-slate-600 mb-1">
            Tiêu đề yêu cầu thử
          </label>
          <input
            type="text"
            required
            value={simTitle}
            onChange={(e) => setSimTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block font-semibold text-slate-600 mb-1">
            Ngày cần hàng
          </label>
          <input
            type="date"
            value={simDueAt}
            onChange={(e) => setSimDueAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2.5 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={sendingSim}
            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white py-2 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingSim ? "Đang gửi..." : "Gửi Test Đơn"}
          </button>
        </div>
      </form>
    </div>
  );
}
