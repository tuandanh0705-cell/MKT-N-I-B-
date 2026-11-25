"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { GeminiQcPanel } from "@/components/gemini-qc-panel";
import { TaskFeedbackChat } from "@/components/task-feedback-chat";
import { useToast } from "@/components/toast-provider";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import { getAssetDomainLabel } from "@/lib/output-helpers";
import { getQcCriteriaForTaskType } from "@/lib/qc-standards";
import type {
  GeminiConfigInfo,
  GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import type { AssetKind, UserRole } from "@/generated/prisma/client";
import type { SimpleUser, TaskItem } from "@/types/crm";

interface OutputInspectorQcPanelProps {
  task: TaskItem;
  currentUserId?: string;
  currentUserRole: UserRole;
  users?: SimpleUser[];
  aiConfig?: GeminiConfigInfo;
  aiResult?: GeminiQcCheckResponse | null;
  aiLoading: boolean;
  aiError?: string | null;
  onRunAiCheck?: (taskId: string, customFocus?: string) => Promise<unknown>;
  onOpenAiSettings?: () => void;
  onOpenStandardsModal?: () => void;
  onUpdated: (task: TaskItem) => void;
}

export function OutputInspectorQcPanel({
  task,
  currentUserId,
  currentUserRole,
  users = [],
  aiConfig,
  aiResult,
  aiLoading,
  aiError,
  onRunAiCheck,
  onOpenAiSettings,
  onOpenStandardsModal,
  onUpdated,
}: OutputInspectorQcPanelProps) {
  const { showToast } = useToast();
  const isLeader = currentUserRole === "LEADER";

  const [acting, setActing] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [selectedQcCodes, setSelectedQcCodes] = useState<string[]>([]);

  const [assetKind, setAssetKind] = useState<AssetKind>("FINAL");
  const [assetLabel, setAssetLabel] = useState("");
  const [assetUrl, setAssetUrl] = useState("");

  const [customAiFocus, setCustomAiFocus] = useState("");
  const [savingAiComment, setSavingAiComment] = useState(false);

  const qcCriteria = getQcCriteriaForTaskType(task.taskType);
  const isCompletedStatus =
    task.status === "APPROVED_FINAL" ||
    task.status === "PUBLISHED" ||
    task.status === "DONE";

  async function patchTask(
    payload: Record<string, unknown>,
    successMsg: string
  ) {
    setActing(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể cập nhật tác vụ.", "error");
        return false;
      }
      if (data.task) {
        onUpdated(data.task as TaskItem);
      }
      showToast(successMsg);
      return true;
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
      return false;
    } finally {
      setActing(false);
    }
  }

  async function handleQuickAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetUrl.trim()) return;
    const ok = await patchTask(
      {
        newAsset: {
          kind: assetKind,
          label: assetLabel.trim() || undefined,
          url: assetUrl.trim(),
        },
      },
      "Đã gắn link sản phẩm Output."
    );
    if (ok) {
      setAssetUrl("");
      setAssetLabel("");
    }
  }

  async function handleSubmitRevision() {
    if (!revisionNote.trim() && selectedQcCodes.length === 0) {
      showToast("Hãy nhập góp ý hoặc chọn ít nhất 1 tiêu chuẩn QC.", "error");
      return;
    }
    const ok = await patchTask(
      {
        action: "REQUEST_REVISION",
        feedback: revisionNote.trim(),
        qcFlags: selectedQcCodes,
      },
      `Đã gửi yêu cầu chỉnh sửa cho ${task.assignee?.name || "nhân sự"}.`
    );
    if (ok) {
      setShowRevisionForm(false);
      setRevisionNote("");
      setSelectedQcCodes([]);
    }
  }

  return (
    <div className="lg:col-span-5 p-5 bg-slate-50/50 space-y-5">
      <GeminiQcPanel
        currentUserRole={currentUserRole}
        aiConfig={aiConfig}
        aiResult={aiResult}
        aiLoading={aiLoading}
        aiError={aiError}
        customFocus={customAiFocus}
        onChangeCustomFocus={setCustomAiFocus}
        onRunCheck={() => {
          void onRunAiCheck?.(task.id, customAiFocus);
        }}
        onOpenAiSettings={onOpenAiSettings}
        onOpenStandardsModal={isLeader ? onOpenStandardsModal : undefined}
        applyingCaption={acting}
        onApplySuggestedCaption={(suggestedCaption) => {
          void patchTask(
            { caption: suggestedCaption },
            "Đã cập nhật Caption theo gợi ý Gemini!"
          );
        }}
        onSendIssuesToRevision={(codes, note) => {
          setSelectedQcCodes(codes);
          setRevisionNote(note);
          setShowRevisionForm(true);
        }}
        savingComment={savingAiComment}
        onSaveAsQcComment={
          aiResult
            ? async () => {
                setSavingAiComment(true);
                try {
                  const lines = [
                    `[Gemini AI Check QC: ${aiResult.result.score}/100] ${aiResult.result.summary}`,
                    ...aiResult.result.issues.map(
                      (i) =>
                        `- [${i.qcCode}] ${i.title}: ${
                          i.fixSuggestion || i.detail
                        }`
                    ),
                  ];
                  const res = await fetch(`/api/tasks/${task.id}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      content: lines.join("\n"),
                      qcFlags: aiResult.result.matchedQcCodes,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    showToast(data.error || "Không thể lưu ghi chú.", "error");
                    return;
                  }
                  if (data.comment) {
                    const nextComments = [...(task.comments ?? []), data.comment];
                    onUpdated({
                      ...task,
                      comments: nextComments,
                      _count: {
                        comments: nextComments.length,
                        activityLogs: task._count?.activityLogs,
                      },
                    });
                  }
                  showToast("Đã lưu đánh giá Gemini AI vào ghi chú QC.");
                } finally {
                  setSavingAiComment(false);
                }
              }
            : undefined
        }
      />

      {/* Deliverables List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            File &amp; Link Output đã nộp ({task.assets.length})
          </h4>
        </div>

        {task.assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3.5 text-xs text-slate-500">
            Chưa có link Demo / Final / Bài đã đăng nào được gắn.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {task.assets.map((asset) => {
              const kindBadge =
                asset.kind === "FINAL"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : asset.kind === "PUBLISHED_LINK"
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : asset.kind === "DEMO"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";
              return (
                <div
                  key={asset.id}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${kindBadge}`}
                      >
                        {ASSET_KIND_LABEL[asset.kind] || asset.kind}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        v{asset.version} • {getAssetDomainLabel(asset.url)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {asset.label}
                    </div>
                  </div>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Mở
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick attach link */}
        <form
          onSubmit={handleQuickAddAsset}
          className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2"
        >
          <div className="text-[11px] font-bold text-slate-600">
            Bổ sung nhanh link Output
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={assetKind}
              onChange={(e) => setAssetKind(e.target.value as AssetKind)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="FINAL">Bản Final</option>
              <option value="DEMO">Bản Demo</option>
              <option value="PUBLISHED_LINK">Link bài đã đăng</option>
              <option value="BRIEF_REF">Tư liệu tham khảo</option>
            </select>
            <input
              type="text"
              value={assetLabel}
              onChange={(e) => setAssetLabel(e.target.value)}
              placeholder="Nhãn (vd: Banner 1:1)"
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
            />
          </div>
          <div className="flex gap-1.5">
            <input
              type="url"
              required
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="https://drive.google.com/... hoặc Canva"
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-800"
            />
            <button
              type="submit"
              disabled={acting}
              className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Gắn
            </button>
          </div>
        </form>
      </div>

      {/* Live Chat & Feedback trực tiếp ngay trong Output */}
      <TaskFeedbackChat
        taskId={task.id}
        taskCode={task.code}
        initialComments={task.comments ?? []}
        users={users}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        compact
        maxHeightClass="max-h-60"
        placeholder="Nhắn feedback trực tiếp về bài/ấn phẩm này (Enter gửi, Ctrl+V dán ảnh)..."
        onCommentsChanged={(nextComments) => {
          const prevCount =
            task.comments?.length ?? task._count?.comments ?? 0;
          if (nextComments.length !== prevCount) {
            onUpdated({
              ...task,
              comments: nextComments,
              _count: {
                comments: nextComments.length,
                activityLogs: task._count?.activityLogs,
              },
            });
          }
        }}
      />

      {/* Quick Leader Check & Approve Panel */}
      {isLeader && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
          <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Thao tác Check Output (Leader)
          </div>

          <div className="flex flex-wrap gap-2">
            {task.status === "BRIEF_REVIEW" && (
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  patchTask({ action: "APPROVE_BRIEF" }, "Đã duyệt Brief!")
                }
                className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                Duyệt Brief
              </button>
            )}

            {!isCompletedStatus && (
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  patchTask(
                    { action: "APPROVE" },
                    `Đã duyệt Final ${task.code}!`
                  )
                }
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Duyệt Final
              </button>
            )}

            {task.status === "APPROVED_FINAL" && (
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  patchTask(
                    { action: "MARK_PUBLISHED" },
                    `Đã đánh dấu ${task.code} Đã lên sóng!`
                  )
                }
                className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                Đánh dấu Đã đăng
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRevisionForm((v) => !v)}
              className="rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {showRevisionForm ? "Đóng form sửa" : "Yêu cầu sửa (QC)"}
            </button>
          </div>

          {showRevisionForm && (
            <div className="space-y-2.5 pt-2 border-t border-amber-200">
              <div className="text-[11px] font-bold text-slate-700">
                Chọn nhanh tiêu chí cần chỉnh sửa:
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                {qcCriteria.slice(0, 12).map((q) => {
                  const checked = selectedQcCodes.includes(q.code);
                  return (
                    <button
                      key={q.code}
                      type="button"
                      onClick={() =>
                        setSelectedQcCodes((prev) =>
                          checked
                            ? prev.filter((c) => c !== q.code)
                            : [...prev, q.code]
                        )
                      }
                      title={q.detail}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                        checked
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
                      }`}
                    >
                      {q.code}: {q.group}
                    </button>
                  );
                })}
              </div>
              <textarea
                rows={3}
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Nhập chi tiết điểm cần chỉnh sửa trong content hoặc ấn phẩm..."
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-800"
              />
              <button
                type="button"
                disabled={acting}
                onClick={handleSubmitRevision}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Gửi yêu cầu sửa cho nhân sự
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
