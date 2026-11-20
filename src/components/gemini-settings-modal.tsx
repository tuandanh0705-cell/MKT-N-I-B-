"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_OPTIONS,
  type GeminiConfigInfo,
} from "@/lib/gemini-shared";

interface GeminiSettingsModalProps {
  open: boolean;
  initialConfig: GeminiConfigInfo;
  onClose: () => void;
  onSaved: (nextConfig: GeminiConfigInfo) => void;
}

export function GeminiSettingsModal({
  open,
  initialConfig,
  onClose,
  onSaved,
}: GeminiSettingsModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-sky-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="text-base font-extrabold">
                Cấu hình Google Gemini AI (Check QC Output)
              </h3>
              <p className="text-[11px] text-slate-300">
                Dùng chung cho toàn đội ngũ kiểm tra Content, Ảnh &amp; Brief
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <GeminiSettingsPanel
          key={`${initialConfig.model}-${initialConfig.source}-${initialConfig.maskedKey || ""}`}
          initialConfig={initialConfig}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

const PRESET_MODEL_IDS = new Set<string>(
  GEMINI_MODEL_OPTIONS.map((m) => m.id)
);

export function GeminiSettingsPanel({
  initialConfig,
  onClose,
  onSaved,
  closeOnSave = true,
}: Omit<GeminiSettingsModalProps, "open"> & { closeOnSave?: boolean }) {
  const { showToast } = useToast();
  const resolvedInitialModel = initialConfig.model || DEFAULT_GEMINI_MODEL;
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(
    !PRESET_MODEL_IDS.has(resolvedInitialModel)
  );
  const [model, setModel] = useState(resolvedInitialModel);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    warning?: boolean;
    suggestedModel?: string;
    availableFlashModels?: string[];
    message: string;
  } | null>(null);

  const selectedPreset = GEMINI_MODEL_OPTIONS.find((m) => m.id === model);
  const isFreeTierSelected =
    selectedPreset?.tier === "FREE" ||
    (!selectedPreset && /flash/i.test(model));

  async function handleTest() {
    const cleanModel = model.trim() || DEFAULT_GEMINI_MODEL;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/outputs/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST",
          apiKey: apiKeyInput.trim() || undefined,
          model: cleanModel,
        }),
      });
      const data = await res.json();
      setTestResult({
        ok: Boolean(data.ok),
        warning: Boolean(data.warning),
        suggestedModel:
          typeof data.suggestedModel === "string"
            ? data.suggestedModel
            : undefined,
        availableFlashModels: Array.isArray(data.availableFlashModels)
          ? data.availableFlashModels
          : undefined,
        message: String(data.message || data.error || "Không rõ kết quả."),
      });
    } catch {
      setTestResult({
        ok: false,
        message: "Lỗi kết nối máy chủ khi kiểm tra Gemini API.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanModel = model.trim();
    if (!cleanModel) {
      showToast("Vui lòng chọn hoặc nhập mã Model Gemini.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/outputs/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim() || undefined,
          model: cleanModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể lưu cấu hình Gemini AI.", "error");
        return;
      }
      onSaved(data as GeminiConfigInfo);
      showToast("Đã lưu cấu hình Google Gemini AI.");
      if (closeOnSave) onClose();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearDbKey() {
    setSaving(true);
    try {
      const res = await fetch("/api/outputs/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearDbKey: true, model }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể xóa key.", "error");
        return;
      }
      onSaved(data as GeminiConfigInfo);
      setApiKeyInput("");
      showToast("Đã gỡ API Key lưu trong hệ thống.");
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Status card */}
          <div
            className={`rounded-xl border p-3 text-xs space-y-1 ${
              initialConfig.configured
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/70 text-amber-900"
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-bold">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {initialConfig.configured
                  ? `Đang kết nối (${initialConfig.source === "DB" ? "Lưu trong App" : "Từ file .env"})`
                  : "Chưa có Gemini API Key"}
              </span>
              {initialConfig.maskedKey && (
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {initialConfig.maskedKey}
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-85">
              API Key được lưu bảo mật ở phía server PostgreSQL, không bao giờ gửi key gốc ra trình duyệt.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                Google Gemini API Key {initialConfig.configured ? "(để trống nếu giữ key cũ)" : "*"}
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Lấy key tại Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                initialConfig.configured
                  ? "Nhập key mới để thay thế (vd: AIzaSy...)"
                  : "Dán API Key bắt đầu bằng AIza..."
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-mono text-slate-800 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Model Gemini sử dụng
              </label>
              <button
                type="button"
                onClick={() => setUseCustomModel((v) => !v)}
                className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                {useCustomModel
                  ? "← Chọn từ danh sách gợi ý"
                  : "+ Tự nhập mã Model bất kỳ"}
              </button>
            </div>

            {!useCustomModel ? (
              <select
                value={PRESET_MODEL_IDS.has(model) ? model : "__CUSTOM__"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__CUSTOM__") {
                    setUseCustomModel(true);
                  } else {
                    setModel(val);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer"
              >
                <optgroup label="Free Tier $0 (Không cần thẻ / Billing)">
                  {GEMINI_MODEL_OPTIONS.filter((m) => m.tier === "FREE").map(
                    (m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Gemini 4 &amp; Paid / Google AI Ultra Credit">
                  {GEMINI_MODEL_OPTIONS.filter((m) => m.tier === "PAID").map(
                    (m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    )
                  )}
                </optgroup>
                <option value="__CUSTOM__">
                  Tự nhập mã Model ID khác (Custom)...
                </option>
              </select>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="vd: gemini-3.8-flash, gemini-4-hydrogen, gemini-3.5-flash-lite..."
                  className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "gemini-3.8-flash",
                    "gemini-3.5-flash-lite",
                    "gemini-4-hydrogen",
                    "gemini-4-neon",
                  ].map((quickId) => (
                    <button
                      key={quickId}
                      type="button"
                      onClick={() => setModel(quickId)}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] font-mono font-bold cursor-pointer ${
                        model === quickId
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {quickId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isFreeTierSelected ? (
                <>
                  <strong className="text-emerald-700">Gợi ý Free Tier ($0):</strong>{" "}
                  Tạo API Key không cần gắn thẻ/Billing tại Google AI Studio và chọn{" "}
                  <code className="font-mono text-slate-700">gemini-3.8-flash</code>{" "}
                  hoặc{" "}
                  <code className="font-mono text-slate-700">gemini-3.5-flash-lite</code>{" "}
                  để test miễn phí (giới hạn lượt/phút theo mức Free).
                </>
              ) : (
                <>
                  <strong className="text-amber-700">Chú ý Model Paid/Credit:</strong>{" "}
                  Model <code className="font-mono text-slate-700">{model || "này"}</code>{" "}
                  thường trừ vào Google Cloud Billing / Credit gói Google AI Ultra.
                </>
              )}
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs space-y-2 ${
                testResult.ok
                  ? testResult.warning
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <div className="font-semibold leading-relaxed">
                {testResult.message}
              </div>

              {testResult.suggestedModel && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = testResult.suggestedModel!;
                      setUseCustomModel(!PRESET_MODEL_IDS.has(next));
                      setModel(next);
                      setTestResult({
                        ok: true,
                        message: `Đã chọn model "${next}". Bạn hãy bấm "Lưu cấu hình" để áp dụng ngay.`,
                      });
                    }}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                  >
                    Dùng ngay {testResult.suggestedModel}
                  </button>
                </div>
              )}

              {(testResult.availableFlashModels?.length ?? 0) > 0 && (
                <div className="space-y-1 pt-1 border-t border-amber-200/70">
                  <div className="text-[10px] font-bold opacity-80">
                    Các model Flash Google mở sẵn trên Key của bạn (bấm để chọn):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {testResult.availableFlashModels!.map((mId) => (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => {
                          setUseCustomModel(!PRESET_MODEL_IDS.has(mId));
                          setModel(mId);
                        }}
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold cursor-pointer ${
                          model === mId
                            ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                            : "border-amber-200 bg-white text-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        {mId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testing || saving}
                onClick={handleTest}
                className="rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 disabled:opacity-60 text-sky-800 px-3 py-2 text-xs font-bold cursor-pointer"
              >
                {testing ? "Đang test..." : "Kiểm tra kết nối"}
              </button>

              {initialConfig.source === "DB" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleClearDbKey}
                  className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 px-2.5 py-2 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  title="Xóa key đã lưu trong DB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Gỡ key
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-60 text-amber-300 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
          </div>
        </form>
  );
}
