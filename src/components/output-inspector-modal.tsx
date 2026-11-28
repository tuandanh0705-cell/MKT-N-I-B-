"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import { DemoImageLightbox } from "@/components/demo-image-lightbox";
import { PirateAvatar } from "@/components/pirate-art";
import { PlatformLogo } from "@/components/platform-logo";
import { TaskStatusBadge } from "@/components/status-badge";
import { FacebookPostPreview } from "@/components/facebook-post-preview";
import { OutputInspectorQcPanel } from "@/components/output-inspector-qc-panel";
import { VideoScriptBriefViewer } from "@/components/video-script-brief-viewer";
import { useToast } from "@/components/toast-provider";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import { formatVnDateTime } from "@/lib/dates";
import { formatTaskAssigneesLabel, getTaskAssignees } from "@/lib/task-assignees";
import {
  OUTPUT_CATEGORY_META,
  analyzeTaskOutputs,
  getAssetDomainLabel,
  getTaskPreviewMediaUrls,
} from "@/lib/output-helpers";
import type {
  GeminiConfigInfo,
  GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import type { UserRole } from "@/generated/prisma/client";
import type { SimpleUser, TaskItem } from "@/types/crm";

interface OutputInspectorModalProps {
  task: TaskItem | null;
  open: boolean;
  currentUserId?: string;
  currentUserRole: UserRole;
  users?: SimpleUser[];
  aiConfig?: GeminiConfigInfo;
  aiResult?: GeminiQcCheckResponse | null;
  aiLoading?: boolean;
  aiError?: string | null;
  onRunAiCheck?: (taskId: string, customFocus?: string) => Promise<unknown>;
  onOpenAiSettings?: () => void;
  onOpenStandardsModal?: () => void;
  onClose: () => void;
  onUpdated: (task: TaskItem) => void;
  onOpenTaskDrawer: (taskId: string) => void;
}

function SafeAssetImage({
  src,
  alt,
  href,
}: {
  src: string;
  alt: string;
  href: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  if (failed) {
    return (
      <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center bg-slate-100 text-slate-600 p-6 text-center gap-2">
        <ImageIcon className="w-8 h-8 text-slate-400" />
        <p className="text-xs font-semibold text-slate-600">
          Không tải trực tiếp được ảnh xem trước (link riêng tư hoặc định dạng không phải ảnh tĩnh).
        </p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Mở file gốc ({getAssetDomainLabel(href)})
        </a>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      onError={() => setFailedSrc(src)}
      className="object-contain bg-slate-950/5"
    />
  );
}

export function OutputInspectorModal({
  task,
  open,
  currentUserId,
  currentUserRole,
  users,
  aiConfig,
  aiResult,
  aiLoading = false,
  aiError,
  onRunAiCheck,
  onOpenAiSettings,
  onOpenStandardsModal,
  onClose,
  onUpdated,
  onOpenTaskDrawer,
}: OutputInspectorModalProps) {
  if (!open || !task) return null;
  return (
    <OutputInspectorInner
      key={task.id}
      task={task}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      users={users}
      aiConfig={aiConfig}
      aiResult={aiResult}
      aiLoading={aiLoading}
      aiError={aiError}
      onRunAiCheck={onRunAiCheck}
      onOpenAiSettings={onOpenAiSettings}
      onOpenStandardsModal={onOpenStandardsModal}
      onClose={onClose}
      onUpdated={onUpdated}
      onOpenTaskDrawer={onOpenTaskDrawer}
    />
  );
}

function OutputInspectorInner({
  task,
  currentUserId,
  currentUserRole,
  users,
  aiConfig,
  aiResult,
  aiLoading,
  aiError,
  onRunAiCheck,
  onOpenAiSettings,
  onOpenStandardsModal,
  onClose,
  onUpdated,
  onOpenTaskDrawer,
}: {
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
  onClose: () => void;
  onUpdated: (task: TaskItem) => void;
  onOpenTaskDrawer: (taskId: string) => void;
}) {
  const { showToast } = useToast();
  const analyzed = analyzeTaskOutputs(task);
  const categoryMeta = OUTPUT_CATEGORY_META[analyzed.category];
  const previewMediaUrls = getTaskPreviewMediaUrls(task);

  const defaultTab: "CONTENT" | "MEDIA" | "FB_PREVIEW" =
    analyzed.category === "CONTENT" &&
    (analyzed.hasCaption || previewMediaUrls.length > 0)
      ? "FB_PREVIEW"
      : analyzed.imagePreviews.length > 0 ||
          analyzed.category === "IMAGE" ||
          analyzed.category === "VIDEO"
        ? "MEDIA"
        : "CONTENT";

  const [tab, setTab] = useState<"CONTENT" | "MEDIA" | "FB_PREVIEW">(defaultTab);
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
  const [mediaLightboxIdx, setMediaLightboxIdx] = useState<number | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const activePreview =
    analyzed.imagePreviews[selectedPreviewIdx] ?? analyzed.imagePreviews[0] ?? null;

  async function handleSyncPreviewLayout(nextLayout: string) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbPostLayout: nextLayout }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được bố cục xem trước.", "error");
        return;
      }
      if (data.task) {
        onUpdated(data.task as TaskItem);
      }
      showToast("Đã đồng bộ bố cục bài đăng.");
    } catch {
      showToast("Lỗi kết nối khi cập nhật bố cục.", "error");
    }
  }

  async function handlePersistPreviewImages(urls: string[]) {
    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAssets: cleaned.map((url, idx) => ({
            kind: "DEMO",
            label: url.startsWith("data:image/")
              ? `Ảnh demo bài viết #${idx + 1}`
              : "Ảnh / Thành phẩm bài viết",
            url,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được ảnh demo.", "error");
        return;
      }
      if (data.task) {
        onUpdated(data.task as TaskItem);
      }
      showToast(`Đã lưu & đồng bộ ${cleaned.length} ảnh vào bài viết.`);
    } catch {
      showToast("Lỗi kết nối khi lưu ảnh demo.", "error");
    }
  }

  async function handleCopyCaption() {
    const text = (task.caption || "").trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    showToast("Đã copy nội dung Content.");
    setTimeout(() => setCopiedCaption(false), 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border-2 border-amber-200 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-200">
                {task.code}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-white"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.project.color }}
                />
                {task.project.name}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${categoryMeta.badgeClass}`}
              >
                {categoryMeta.label} • {task.quantity} {analyzed.unitLabel}
              </span>
              <TaskStatusBadge status={task.status} />
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {task.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
              <div className="inline-flex items-center gap-1.5 font-semibold">
                {getTaskAssignees(task).length > 0 ? (
                  <div className="flex items-center -space-x-1.5">
                    {getTaskAssignees(task)
                      .slice(0, 3)
                      .map((u) => (
                        <span
                          key={u.id}
                          className="rounded-full ring-1 ring-slate-900 inline-flex"
                        >
                          <PirateAvatar
                            name={u.name}
                            color={u.avatarColor}
                            scope={u.departmentScope}
                            pirateCharacter={u.pirateCharacter}
                            size="sm"
                          />
                        </span>
                      ))}
                  </div>
                ) : (
                  <PirateAvatar
                    name="Chưa gán"
                    color="#64748b"
                    size="sm"
                  />
                )}
                <span>{formatTaskAssigneesLabel(task, "Chưa phân công")}</span>
              </div>

              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-semibold">
                <PlatformLogo platform={task.platform} size="xs" />
                <span>{task.publishChannel || task.platform}</span>
              </span>

              {task.submittedAt && (
                <span className="text-slate-300">
                  Nộp duyệt: {formatVnDateTime(task.submittedAt)}
                </span>
              )}
              {task.completedAt && (
                <span className="text-emerald-300 font-semibold">
                  Hoàn tất: {formatVnDateTime(task.completedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTaskDrawer(task.id);
              }}
              className="rounded-xl bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Mở Task đầy đủ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Actual Deliverable Reader & Visual Preview */}
          <div className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTab("CONTENT")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    tab === "CONTENT"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Nội dung Content
                </button>
                <button
                  type="button"
                  onClick={() => setTab("MEDIA")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    tab === "MEDIA"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {analyzed.category === "VIDEO" ? (
                    <Film className="w-3.5 h-3.5 text-violet-600" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  Ấn phẩm &amp; Brief ({analyzed.imagePreviews.length || analyzed.mediaBriefItems.length || analyzed.deliverableAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("FB_PREVIEW")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    tab === "FB_PREVIEW"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Mockup Bài Đăng
                </button>
              </div>
            </div>

            {tab === "CONTENT" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Caption / Nội dung bài viết
                    </div>
                    {analyzed.hasCaption && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {(task.caption || "").trim().length} ký tự
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 cursor-pointer"
                        >
                          {copiedCaption ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedCaption ? "Đã copy" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>

                  {analyzed.hasCaption ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto">
                      {task.caption}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs font-medium text-amber-800">
                      Nhân sự chưa nhập nội dung Caption cho đầu việc này.
                    </div>
                  )}
                </div>

                {(task.contentAngle || task.contentPillar || task.postFormat || task.productLink) && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {task.contentAngle && (
                      <span className="rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 font-bold text-sky-800">
                        Tuyến bài: {task.contentAngle}
                      </span>
                    )}
                    {task.contentPillar && (
                      <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-800">
                        Chủ đề: {task.contentPillar}
                      </span>
                    )}
                    {task.postFormat && (
                      <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold text-amber-900">
                        Định dạng: {task.postFormat}
                      </span>
                    )}
                    {task.productLink && (
                      <a
                        href={task.productLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-bold text-emerald-700 inline-flex items-center gap-1 hover:bg-emerald-100"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link sản phẩm / bài
                      </a>
                    )}
                  </div>
                )}

                {analyzed.hasDescription && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      Mô tả / Kịch bản / Brief đầu việc
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "MEDIA" && (
              <div className="space-y-4">
                {activePreview ? (
                  <div className="space-y-2.5">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setMediaLightboxIdx(selectedPreviewIdx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMediaLightboxIdx(selectedPreviewIdx);
                        }
                      }}
                      title="Bấm để phóng to xem ảnh giữa màn hình"
                      className="group relative h-72 sm:h-80 w-full rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden cursor-zoom-in"
                    >
                      <SafeAssetImage
                        src={activePreview.previewUrl}
                        alt={activePreview.asset.label}
                        href={activePreview.asset.url}
                      />
                      <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-xs text-white px-2.5 py-1 text-[11px] font-bold opacity-85 group-hover:opacity-100 transition">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Phóng to
                      </span>
                    </div>
                    <DemoImageLightbox
                      images={analyzed.imagePreviews.map((p) => p.previewUrl)}
                      activeIndex={mediaLightboxIdx}
                      title={task.title}
                      onClose={() => setMediaLightboxIdx(null)}
                      onChangeIndex={(nextIdx) => {
                        setMediaLightboxIdx(nextIdx);
                        setSelectedPreviewIdx(nextIdx);
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <div className="text-xs font-bold text-slate-800">
                        {ASSET_KIND_LABEL[activePreview.asset.kind] || activePreview.asset.kind}:{" "}
                        {activePreview.asset.label} (v{activePreview.asset.version})
                      </div>
                      {activePreview.asset.url.startsWith("data:image/") ? (
                        <button
                          type="button"
                          onClick={() => setMediaLightboxIdx(selectedPreviewIdx)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Phóng to ảnh gốc
                        </button>
                      ) : (
                        <a
                          href={activePreview.asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mở file gốc ({getAssetDomainLabel(activePreview.asset.url)})
                        </a>
                      )}
                    </div>

                    {analyzed.imagePreviews.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {analyzed.imagePreviews.map((item, idx) => (
                          <button
                            key={item.asset.id}
                            type="button"
                            onClick={() => setSelectedPreviewIdx(idx)}
                            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer ${
                              idx === selectedPreviewIdx
                                ? "border-amber-500 ring-2 ring-amber-200"
                                : "border-slate-200 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <Image
                              src={item.previewUrl}
                              alt={item.asset.label}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-2">
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">
                      {analyzed.deliverableAssets.length > 0
                        ? "Link sản phẩm thuộc nền tảng ngoài (Canva / Video / Folder Drive). Hãy mở các link ở cột bên phải để kiểm tra trực tiếp."
                        : "Chưa có file ảnh hoặc link sản phẩm nào được nộp cho đầu việc này."}
                    </p>
                  </div>
                )}

                {analyzed.mediaBriefItems.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2.5">
                    <div className="text-xs font-extrabold text-amber-950">
                      Đối chiếu Brief từng {analyzed.category === "VIDEO" ? "Video" : "Ảnh"} (
                      {analyzed.mediaBriefItems.length} mục)
                    </div>
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {analyzed.mediaBriefItems.map((item, idx) =>
                        analyzed.category === "VIDEO" ? (
                          <VideoScriptBriefViewer
                            key={item.id}
                            item={item}
                            index={idx}
                            compact
                          />
                        ) : (
                          <div
                            key={item.id}
                            className="rounded-xl border border-amber-200/80 bg-white p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-900">
                                Ảnh {idx + 1}
                              </span>
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                Tỷ lệ: {item.ratio}
                              </span>
                            </div>
                            {item.content && (
                              <p className="text-slate-700 whitespace-pre-wrap">
                                {item.content}
                              </p>
                            )}
                            {item.note && (
                              <p className="text-slate-500 italic">
                                Ghi chú: {item.note}
                              </p>
                            )}
                            {item.sampleUrl && (
                              <a
                                href={item.sampleUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Mẫu tham khảo
                              </a>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "FB_PREVIEW" && (
              <FacebookPostPreview
                pageName={task.publishChannel?.trim() || task.project.name}
                pageColor={task.project.color}
                platform={task.platform}
                postFormat={task.postFormat}
                description={task.description}
                caption={task.caption || ""}
                layout={task.fbPostLayout || "SINGLE_SQUARE"}
                onChangeLayout={(nextLayout) => {
                  void handleSyncPreviewLayout(nextLayout);
                }}
                onPersistNewImages={handlePersistPreviewImages}
                mediaUrl={previewMediaUrls[0] || null}
                mediaUrls={previewMediaUrls}
                title={task.title}
              />
            )}
          </div>

          <OutputInspectorQcPanel
            task={task}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            users={users}
            aiConfig={aiConfig}
            aiResult={aiResult}
            aiLoading={aiLoading}
            aiError={aiError}
            onRunAiCheck={onRunAiCheck}
            onOpenAiSettings={onOpenAiSettings}
            onOpenStandardsModal={onOpenStandardsModal}
            onUpdated={onUpdated}
          />
        </div>
      </div>
    </div>
  );
}
