"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2, Trash2 } from "lucide-react";
import { FacebookPostPreview } from "@/components/facebook-post-preview";
import { GeminiQcPanel } from "@/components/gemini-qc-panel";
import { useToast } from "@/components/toast-provider";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import type {
  GeminiConfigInfo,
  GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import type { TaskItem } from "@/types/crm";
import type { AssetKind, UserRole } from "@/generated/prisma/client";

interface TaskDrawerQcTabProps {
  task: TaskItem;
  currentUserRole: UserRole;
  linkOnlyOutput?: boolean;
  saving: boolean;
  aiConfig?: GeminiConfigInfo;
  aiResult: GeminiQcCheckResponse | null;
  aiLoading: boolean;
  aiError: string | null;
  onRunAiCheck: (customFocus?: string) => void;
  onRunPatch: (payload: Record<string, unknown>, successToast?: string) => Promise<void>;
}

export function TaskDrawerQcTab({
  task,
  currentUserRole,
  linkOnlyOutput = false,
  saving,
  aiConfig,
  aiResult,
  aiLoading,
  aiError,
  onRunAiCheck,
  onRunPatch,
}: TaskDrawerQcTabProps) {
  const { showToast } = useToast();

  const [captionDraft, setCaptionDraft] = useState(task.caption || "");
  const [editingCaption, setEditingCaption] = useState(false);
  const [fbLayoutDraft, setFbLayoutDraft] = useState(
    task.fbPostLayout || "SINGLE_SQUARE"
  );
  const [showFbPreview, setShowFbPreview] = useState(true);
  const [customAiFocus, setCustomAiFocus] = useState("");

  const [assetKind, setAssetKind] = useState<AssetKind>("DEMO");
  const [assetLabel, setAssetLabel] = useState("");
  const [assetUrl, setAssetUrl] = useState("");

  const [prevTask, setPrevTask] = useState(task);
  if (prevTask !== task) {
    setPrevTask(task);
    setCaptionDraft(task.caption || "");
    setFbLayoutDraft(task.fbPostLayout || "SINGLE_SQUARE");
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetUrl.trim()) return;
    await onRunPatch(
      {
        newAsset: {
          kind: assetKind,
          label: assetLabel.trim() || undefined,
          url: assetUrl.trim(),
        },
      },
      "Đã gắn link Drive / Canva mới."
    );
    setAssetUrl("");
    setAssetLabel("");
  }

  return (
    <div className="space-y-4">
      {!linkOnlyOutput && (
        <>
          {/* Gemini AI Check QC */}
          <GeminiQcPanel
            currentUserRole={currentUserRole}
            aiConfig={aiConfig}
            aiResult={aiResult}
            aiLoading={aiLoading}
            aiError={aiError}
            customFocus={customAiFocus}
            onChangeCustomFocus={setCustomAiFocus}
            onRunCheck={() => onRunAiCheck(customAiFocus)}
            runButtonLabel={aiResult ? "AI Check lại" : "AI Check Output"}
            onApplySuggestedCaption={(suggested) => {
              setCaptionDraft(suggested);
              setEditingCaption(true);
              showToast("Đã nạp Caption gợi ý vào khung sửa — bấm Lưu Caption để cập nhật!");
            }}
          />

          {/* Caption & Facebook Preview */}
          <div className="rounded-xl border border-slate-200 p-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Caption bài đăng
          </span>
          <div className="flex items-center gap-3">
            {task.caption && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(task.caption || "");
                  showToast("Đã copy Caption vào bộ nhớ tạm.");
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingCaption((p) => !p)}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
            >
              {editingCaption ? "Hủy" : "Sửa Caption"}
            </button>
          </div>
        </div>

        {editingCaption ? (
          <div className="space-y-2 mt-2">
            <textarea
              rows={4}
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await onRunPatch({ caption: captionDraft }, "Đã lưu Caption.");
                setEditingCaption(false);
              }}
              className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Lưu Caption
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {task.caption || (
              <span className="text-slate-400 italic">Chưa có caption</span>
            )}
          </p>
        )}

        {(task.platform === "Fanpage" ||
          task.platform === "Group" ||
          editingCaption ||
          Boolean(task.caption)) && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => setShowFbPreview((v) => !v)}
              className="text-xs font-bold text-[#1877F2] hover:underline cursor-pointer"
            >
              {showFbPreview
                ? "Ẩn bố cục bài đăng Facebook"
                : "👁️ Xem trước bố cục bài đăng Facebook"}
            </button>
            {showFbPreview && (
              <FacebookPostPreview
                pageName={task.publishChannel?.trim() || task.project.name}
                pageColor={task.project.color}
                caption={editingCaption ? captionDraft : task.caption || ""}
                layout={fbLayoutDraft}
                onChangeLayout={(nextLayout) => {
                  setFbLayoutDraft(nextLayout);
                  void onRunPatch(
                    { fbPostLayout: nextLayout },
                    "Đã cập nhật bố cục bài đăng Facebook."
                  );
                }}
                mediaUrl={task.assets[0]?.url || null}
                mediaUrls={task.assets.map((a) => a.url)}
                title={task.title}
              />
            )}
          </div>
        )}
          </div>
        </>
      )}

      {/* Link Google Drive / Canva / Bài đăng */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {linkOnlyOutput
              ? "Link đính kèm Output (Google Drive / Canva / Video...)"
              : "Link File (Google Drive / Canva / Bài đăng)"}
          </h3>
        </div>

        {task.assets.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Chưa có link file nào được gắn vào thẻ này.
          </p>
        ) : (
          <div className="space-y-2">
            {task.assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
              >
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 hover:text-blue-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-bold">
                      {ASSET_KIND_LABEL[asset.kind] || asset.kind}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {asset.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {asset.url}
                  </div>
                </a>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                    title="Mở link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      void onRunPatch(
                        { deleteAssetId: asset.id },
                        "Đã gỡ link đính kèm."
                      )
                    }
                    disabled={saving}
                    title="Gỡ link này"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAddAsset}
          className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2"
        >
          <select
            value={assetKind}
            onChange={(e) => setAssetKind(e.target.value as AssetKind)}
            className="sm:col-span-3 rounded-xl border border-slate-200 px-2.5 py-2 text-xs bg-white"
          >
            <option value="DEMO">Link Demo</option>
            <option value="FINAL">Link Final</option>
            <option value="BRIEF_REF">Brief / Tư liệu</option>
            <option value="PUBLISHED_LINK">Link bài đã đăng</option>
          </select>
          <input
            type="text"
            value={assetLabel}
            onChange={(e) => setAssetLabel(e.target.value)}
            placeholder="Ghi chú (vd: Demo v2)"
            className="sm:col-span-3 rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
          />
          <input
            type="url"
            required
            value={assetUrl}
            onChange={(e) => setAssetUrl(e.target.value)}
            placeholder="Dán link Drive / Canva..."
            className="sm:col-span-4 rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-semibold cursor-pointer"
          >
            Gắn link
          </button>
        </form>
      </div>
    </div>
  );
}
