"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { useToast } from "@/components/toast-provider";
import {
  DEFAULT_PROJECT_FORMATS,
  DEFAULT_PROJECT_PLATFORMS,
  DEFAULT_PROJECT_ROUTES,
  getContentRouteMeta,
  getPostFormatMeta,
  getProjectContentOptions,
  type ProjectContentOptionKind,
} from "@/lib/content-plan";
import type { SimpleProject } from "@/types/crm";

export interface AppliedOptionRename {
  field: "contentAngle" | "platform" | "postFormat";
  from: string;
  to: string;
}

interface EditableOptionRow {
  id: string;
  value: string;
  originalValue?: string;
}

interface ProjectContentOptionsModalProps {
  open: boolean;
  project: SimpleProject;
  initialTab?: ProjectContentOptionKind;
  onClose: () => void;
  onSaved: (
    updatedProject: Partial<SimpleProject>,
    appliedRenames: AppliedOptionRename[]
  ) => void;
}

const TAB_CONFIG: Array<{
  key: ProjectContentOptionKind;
  label: string;
  field: "contentAngle" | "platform" | "postFormat";
  placeholder: string;
  helper: string;
  defaults: string[];
}> = [
  {
    key: "ROUTES",
    label: "Tuyến nội dung",
    field: "contentAngle",
    placeholder: "VD: REVIEW STUDIO, FEEDBACK KHÁCH, BÁN GÓI LIVE...",
    helper: "Hiển thị ở Soạn bài, Nội dung chi tiết, Bộ lọc & Matrix Content.",
    defaults: DEFAULT_PROJECT_ROUTES,
  },
  {
    key: "PLATFORMS",
    label: "Nền tảng",
    field: "platform",
    placeholder: "VD: Fanpage, TikTok, LinkedIn, Email, Zalo OA...",
    helper: "Hiển thị ở ô chọn Nền tảng khi lên lịch & soạn bài.",
    defaults: DEFAULT_PROJECT_PLATFORMS,
  },
  {
    key: "FORMATS",
    label: "Format",
    field: "postFormat",
    placeholder: "VD: Ảnh, Video ngắn, Infographic, Slide PDF...",
    helper: "Hiển thị ở cột Format, Soạn bài & Matrix Content.",
    defaults: DEFAULT_PROJECT_FORMATS,
  },
];

function toEditableRows(values: string[], prefix: string): EditableOptionRow[] {
  return values.map((v, idx) => ({
    id: `${prefix}-${idx}-${v}`,
    value: v,
    originalValue: v,
  }));
}

export function ProjectContentOptionsModal(
  props: ProjectContentOptionsModalProps
) {
  if (!props.open) return null;
  return (
    <ProjectContentOptionsModalInner
      key={`${props.project.id}-${props.initialTab || "ROUTES"}-${JSON.stringify(
        props.project.overviewJson ?? null
      )}`}
      {...props}
    />
  );
}

function ProjectContentOptionsModalInner({
  project,
  initialTab = "ROUTES",
  onClose,
  onSaved,
}: ProjectContentOptionsModalProps) {
  const { showToast } = useToast();
  const initialOpts = getProjectContentOptions(project.overviewJson);

  const [activeTab, setActiveTab] =
    useState<ProjectContentOptionKind>(initialTab);
  const [rowsByTab, setRowsByTab] = useState<
    Record<ProjectContentOptionKind, EditableOptionRow[]>
  >({
    ROUTES: toEditableRows(initialOpts.routes, "r"),
    PLATFORMS: toEditableRows(initialOpts.platforms, "p"),
    FORMATS: toEditableRows(initialOpts.formats, "f"),
  });

  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [syncRenamedTasks, setSyncRenamedTasks] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentTabConfig =
    TAB_CONFIG.find((t) => t.key === activeTab) ?? TAB_CONFIG[0];
  const currentRows = rowsByTab[activeTab];

  function collectRenames(): AppliedOptionRename[] {
    const out: AppliedOptionRename[] = [];
    for (const cfg of TAB_CONFIG) {
      for (const row of rowsByTab[cfg.key]) {
        if (
          row.originalValue &&
          row.value.trim() &&
          row.originalValue !== row.value.trim()
        ) {
          out.push({
            field: cfg.field,
            from: row.originalValue,
            to: row.value.trim(),
          });
        }
      }
    }
    return out;
  }

  const pendingRenames = collectRenames();

  function handleAddItems() {
    const parts = newItemText
      .split(/[\r\n,]+/)
      .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 60))
      .filter(Boolean);
    if (parts.length === 0) return;

    setRowsByTab((prev) => {
      const existing = prev[activeTab];
      const existingLower = new Set(existing.map((r) => r.value.toLowerCase()));
      const additions: EditableOptionRow[] = [];
      for (const part of parts) {
        if (existing.length + additions.length >= 30) break;
        const lower = part.toLowerCase();
        if (existingLower.has(lower)) continue;
        existingLower.add(lower);
        additions.push({
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          value: part,
        });
      }
      if (additions.length === 0) {
        showToast("Option này đã có sẵn trong danh sách rồi.", "info");
        return prev;
      }
      return {
        ...prev,
        [activeTab]: [...existing, ...additions],
      };
    });
    setNewItemText("");
  }

  function handleCommitRename(rowId: string) {
    const cleaned = editingDraft.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!cleaned) {
      setEditingId(null);
      return;
    }
    const duplicate = currentRows.some(
      (r) => r.id !== rowId && r.value.toLowerCase() === cleaned.toLowerCase()
    );
    if (duplicate) {
      showToast(`"${cleaned}" đã tồn tại trong danh sách.`, "error");
      return;
    }
    setRowsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((r) =>
        r.id === rowId ? { ...r, value: cleaned } : r
      ),
    }));
    setEditingId(null);
  }

  function handleMove(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= currentRows.length) return;
    setRowsByTab((prev) => {
      const next = [...prev[activeTab]];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, [activeTab]: next };
    });
  }

  function handleDelete(rowId: string) {
    if (currentRows.length <= 1) {
      showToast("Cần giữ lại ít nhất 1 option trong danh sách.", "error");
      return;
    }
    setRowsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((r) => r.id !== rowId),
    }));
  }

  function handleResetCurrentTab() {
    setRowsByTab((prev) => ({
      ...prev,
      [activeTab]: currentTabConfig.defaults.map((v, idx) => ({
        id: `reset-${activeTab}-${idx}-${v}`,
        value: v,
      })),
    }));
    setEditingId(null);
    showToast(`Đã nạp lại bộ ${currentTabConfig.label} mặc định (bấm Lưu để áp dụng).`, "info");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const routeOptions = rowsByTab.ROUTES.map((r) => r.value.trim()).filter(Boolean);
      const platformOptions = rowsByTab.PLATFORMS.map((r) => r.value.trim()).filter(Boolean);
      const formatOptions = rowsByTab.FORMATS.map((r) => r.value.trim()).filter(Boolean);

      const renamesToApply = syncRenamedTasks ? collectRenames() : [];

      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          contentOptions: {
            routeOptions,
            platformOptions,
            formatOptions,
          },
          optionRenames: renamesToApply,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được bộ option của dự án.", "error");
        return;
      }

      const patchProject: Partial<SimpleProject> = {
        overviewJson: data.project.overviewJson,
      };
      if (data.project.contentMatrixJson !== undefined) {
        patchProject.contentMatrixJson = data.project.contentMatrixJson;
      }

      onSaved(patchProject, renamesToApply);
      showToast(
        data.renamedTasksCount > 0
          ? `Đã lưu bộ option cho ${project.name} và đồng bộ ${data.renamedTasksCount} bài viết!`
          : `Đã lưu bộ option riêng cho dự án ${project.name}!`
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">Tùy chỉnh Option — {project.name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chỉ áp dụng riêng cho dự án này — không ảnh hưởng các dự án khác.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto">
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setEditingId(null);
                  setNewItemText("");
                }}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}{" "}
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {rowsByTab[tab.key].length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Add new option bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Thêm {currentTabConfig.label} mới
              </label>
              <button
                type="button"
                onClick={handleResetCurrentTab}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Khôi phục mặc định
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleAddItems();
                  }
                }}
                placeholder={currentTabConfig.placeholder}
                className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddItems}
                disabled={!newItemText.trim()}
                className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {currentTabConfig.helper} Có thể thêm nhiều mục cùng lúc bằng dấu phẩy (<code>,</code>).
            </p>
          </div>

          {/* Current options list */}
          <div className="space-y-1.5">
            {currentRows.map((row, idx) => {
              const isEditing = editingId === row.id;
              const routeMeta =
                activeTab === "ROUTES" ? getContentRouteMeta(row.value) : null;
              const formatMeta =
                activeTab === "FORMATS" ? getPostFormatMeta(row.value) : null;

              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 hover:bg-white transition"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        autoFocus
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleCommitRename(row.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        className="flex-1 min-w-0 rounded-lg border-2 border-blue-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCommitRename(row.id)}
                        className="rounded-lg bg-blue-600 text-white p-1.5 cursor-pointer"
                        title="Xác nhận đổi tên"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-200 bg-white text-slate-600 p-1.5 cursor-pointer"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 w-4 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        {activeTab === "ROUTES" && routeMeta && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold truncate ${routeMeta.badgeClass}`}
                          >
                            {row.value}
                          </span>
                        )}
                        {activeTab === "PLATFORMS" && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                            <PlatformLogo platform={row.value} size="xs" />
                            <span>{row.value}</span>
                          </span>
                        )}
                        {activeTab === "FORMATS" && formatMeta && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold truncate ${formatMeta.badgeClass}`}
                          >
                            {row.value}
                          </span>
                        )}
                        {row.originalValue && row.originalValue !== row.value && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                            đổi từ &ldquo;{row.originalValue}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, -1)}
                          title="Đưa lên"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentRows.length - 1}
                          onClick={() => handleMove(idx, 1)}
                          title="Đưa xuống"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(row.id);
                            setEditingDraft(row.value);
                          }}
                          title="Đổi tên option"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          title="Xóa option"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {pendingRenames.length > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={syncRenamedTasks}
                onChange={(e) => setSyncRenamedTasks(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 cursor-pointer"
              />
              <span>
                Tự động cập nhật tên mới trên các bài viết &amp; Matrix cũ của dự án{" "}
                <strong>{project.name}</strong> ({pendingRenames.length} mục đã đổi tên).
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu..." : "Lưu bộ Option dự án"}
          </button>
        </div>
      </div>
    </div>
  );
}
