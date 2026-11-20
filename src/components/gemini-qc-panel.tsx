"use client";

import { BookOpenCheck, Bot, KeyRound, Save, Wand2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type {
  GeminiConfigInfo,
  GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import type { UserRole } from "@/generated/prisma/client";

interface GeminiQcPanelProps {
  currentUserRole: UserRole;
  aiConfig?: GeminiConfigInfo;
  aiResult?: GeminiQcCheckResponse | null;
  aiLoading?: boolean;
  aiError?: string | null;
  customFocus: string;
  onChangeCustomFocus: (val: string) => void;
  onRunCheck: () => void;
  onOpenAiSettings?: () => void;
  onOpenStandardsModal?: () => void;
  onApplySuggestedCaption?: (suggestedCaption: string) => void;
  onSendIssuesToRevision?: (codes: string[], note: string) => void;
  onSaveAsQcComment?: () => Promise<void>;
  savingComment?: boolean;
  applyingCaption?: boolean;
  runButtonLabel?: string;
}

export function GeminiQcPanel({
  currentUserRole,
  aiConfig,
  aiResult,
  aiLoading = false,
  aiError,
  customFocus,
  onChangeCustomFocus,
  onRunCheck,
  onOpenAiSettings,
  onOpenStandardsModal,
  onApplySuggestedCaption,
  onSendIssuesToRevision,
  onSaveAsQcComment,
  savingComment = false,
  applyingCaption = false,
  runButtonLabel,
}: GeminiQcPanelProps) {
  const { showToast } = useToast();
  const isLeader = currentUserRole === "LEADER";

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-3.5 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950">
          <Bot className="w-4 h-4 text-indigo-600" />
          <span>Google Gemini Check QC</span>
          {aiConfig?.model && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono text-indigo-700">
              {aiConfig.model}
            </span>
          )}
        </div>

        {isLeader && (onOpenStandardsModal || onOpenAiSettings) && (
          <div className="flex flex-wrap items-center gap-2">
            {onOpenStandardsModal && (
              <button
                type="button"
                onClick={onOpenStandardsModal}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
              >
                <BookOpenCheck className="w-3 h-3" />
                Tiêu chuẩn ({aiConfig?.activeStandardsCount ?? 0})
              </button>
            )}
            {onOpenAiSettings && (
              <button
                type="button"
                onClick={onOpenAiSettings}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                {aiConfig?.configured ? "Đổi Key / Model" : "Cấu hình API Key"}
              </button>
            )}
          </div>
        )}
      </div>

      {aiConfig && !aiConfig.configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 space-y-2">
          <p>
            {isLeader
              ? "Chưa cấu hình Google Gemini API Key. Hãy dán API Key miễn phí hoặc trả phí từ Google AI Studio để bật tính năng soi lỗi tự động cho toàn bộ thành viên."
              : "Leader chưa gắn Google Gemini API Key cho hệ thống — hãy nhắn Leader bật tại nút Cấu hình Gemini AI."}
          </p>
          {isLeader && onOpenAiSettings && (
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
            >
              + Gắn Gemini API Key ngay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
            <input
              type="text"
              value={customFocus}
              onChange={(e) => onChangeCustomFocus(e.target.value)}
              placeholder="Trọng tâm check (vd: Soi kỹ chính tả, hook, CTA, chữ trên ảnh...)"
              className="flex-1 min-w-[180px] rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={aiLoading}
              onClick={onRunCheck}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Wand2
                className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`}
              />
              {aiLoading
                ? "Gemini đang soi..."
                : runButtonLabel || (aiResult ? "Check lại" : "AI Check QC")}
            </button>
          </div>

          {aiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                      aiResult.result.score >= 80
                        ? "bg-emerald-100 text-emerald-800"
                        : aiResult.result.score >= 55
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {aiResult.result.score}/100 điểm
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      aiResult.result.verdict === "DAT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : aiResult.result.verdict === "CAN_SUA"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {aiResult.result.verdict === "DAT"
                      ? "Đạt chuẩn QC"
                      : aiResult.result.verdict === "CAN_SUA"
                        ? "Cần chỉnh sửa"
                        : "Thiếu dữ liệu"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Đã soi: {aiResult.meta.imagesAnalyzedCount} ảnh
                  {aiResult.meta.hasCaptionChecked ? " + Caption" : ""} •{" "}
                  <span className="font-mono">{aiResult.meta.model}</span>
                  {aiResult.meta.fallbackFrom
                    ? ` (dự phòng từ ${aiResult.meta.fallbackFrom})`
                    : ""}
                </span>
              </div>

              <p className="text-slate-700 leading-relaxed">
                {aiResult.result.summary}
              </p>

              {aiResult.meta.standardsSource && (
                <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 px-2.5 py-1.5 text-[11px] text-indigo-900">
                  {aiResult.meta.standardsSource === "LEADER_DOCS" ? (
                    <span>
                      <strong>Căn cứ check:</strong> Bộ tiêu chuẩn Leader (
                      {isLeader && (aiResult.meta.standardsNames?.length ?? 0) > 0
                        ? aiResult.meta.standardsNames!.join(", ")
                        : `${aiResult.meta.standardsCount ?? 1} tài liệu áp dụng`}
                      )
                    </span>
                  ) : aiResult.meta.standardsSource === "COMBINED" ? (
                    <span>
                      <strong>Căn cứ check:</strong> Tài liệu Leader + Checklist CRM (
                      {isLeader && (aiResult.meta.standardsNames?.length ?? 0) > 0
                        ? aiResult.meta.standardsNames!.join(", ")
                        : `${aiResult.meta.standardsCount ?? 1} tài liệu Leader`}
                      )
                    </span>
                  ) : (
                    <span>
                      <strong>Căn cứ check:</strong> Bộ tiêu chuẩn QC mặc định của hệ thống
                    </span>
                  )}
                </div>
              )}

              {aiResult.meta.skippedPrivateImageLinks.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-800">
                  Lưu ý: {aiResult.meta.skippedPrivateImageLinks.length} link file không tải trực tiếp được ảnh (do link Canva/Folder/riêng tư), hãy mở link để đối chiếu thêm visual.
                </div>
              )}

              {aiResult.result.strengths.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold text-emerald-700">
                    Điểm làm tốt:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                    {aiResult.result.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.result.issues.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-extrabold text-rose-700">
                    Điểm cần kiểm tra / sửa ({aiResult.result.issues.length}):
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {aiResult.result.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-rose-100 bg-rose-50/40 p-2 space-y-0.5 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                              issue.severity === "HIGH"
                                ? "bg-rose-600 text-white"
                                : issue.severity === "MEDIUM"
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-500 text-white"
                            }`}
                          >
                            {issue.qcCode}
                          </span>
                          <span>{issue.title}</span>
                        </div>
                        <p className="text-slate-600">{issue.detail}</p>
                        {issue.fixSuggestion && (
                          <p className="text-indigo-700 font-medium">
                            Gợi ý: {issue.fixSuggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.result.suggestedCaption && (
                <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-sky-900">
                      Caption Gemini gợi ý chỉnh sửa:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            aiResult.result.suggestedCaption
                          );
                          showToast("Đã copy Caption gợi ý.");
                        }}
                        className="rounded border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700 cursor-pointer"
                      >
                        Copy
                      </button>
                      {onApplySuggestedCaption && (
                        <button
                          type="button"
                          disabled={applyingCaption}
                          onClick={() =>
                            onApplySuggestedCaption(
                              aiResult.result.suggestedCaption
                            )
                          }
                          className="rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                        >
                          Áp dụng Caption
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                    {aiResult.result.suggestedCaption}
                  </p>
                </div>
              )}

              {(onSendIssuesToRevision || onSaveAsQcComment) && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                  {isLeader &&
                    onSendIssuesToRevision &&
                    aiResult.result.issues.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const note = aiResult.result.issues
                            .map(
                              (i) =>
                                `- [${i.qcCode}] ${i.title}: ${
                                  i.fixSuggestion || i.detail
                                }`
                            )
                            .join("\n");
                          onSendIssuesToRevision(
                            aiResult.result.matchedQcCodes,
                            note
                          );
                        }}
                        className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                      >
                        Đưa lỗi vào form Yêu cầu sửa
                      </button>
                    )}

                  {onSaveAsQcComment && (
                    <button
                      type="button"
                      disabled={savingComment}
                      onClick={onSaveAsQcComment}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      {savingComment ? "Đang lưu..." : "Lưu vào ghi chú QC"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
