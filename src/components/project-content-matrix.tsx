"use client";

import { useState } from "react";
import {
  ArrowRightCircle,
  Check,
  Edit3,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  CONTENT_ROUTE_OPTIONS,
  POST_FORMAT_OPTIONS,
  getContentRouteMeta,
  getContentStatusDisplay,
  getPostFormatMeta,
  inferRouteAndFormatFromText,
  normalizeContentMatrix,
  type ContentMatrixData,
  type ContentMatrixIdea,
} from "@/lib/content-plan";
import { useToast } from "@/components/toast-provider";
import type { SimpleProject, TaskItem } from "@/types/crm";

export function ProjectContentMatrixPanel({
  project,
  tasks,
  onProjectUpdated,
  onCreatePostFromIdea,
  onOpenExistingPost,
}: {
  project: SimpleProject;
  tasks: TaskItem[];
  onProjectUpdated: (updated: Partial<SimpleProject>) => void;
  onCreatePostFromIdea: (prefill: {
    title: string;
    route?: string;
    format?: string;
    topic: string;
    matrixIdeaId: string;
  }) => void;
  onOpenExistingPost: (task: TaskItem) => void;
}) {
  const { showToast } = useToast();
  const [matrix, setMatrix] = useState<ContentMatrixData>(() =>
    normalizeContentMatrix(project.contentMatrixJson)
  );
  const [saving, setSaving] = useState(false);

  // Thêm Topic mới
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitleDraft, setTopicTitleDraft] = useState("");

  // Thêm nhanh Idea vào 1 ô (Topic x Độ sâu)
  const [activeCell, setActiveCell] = useState<{
    topicId: string;
    depthKey: string;
  } | null>(null);
  const [ideaTextDraft, setIdeaTextDraft] = useState("");
  const [ideaRouteDraft, setIdeaRouteDraft] = useState("EDUCATE");
  const [ideaFormatDraft, setIdeaFormatDraft] = useState("Ảnh");

  // Sửa 1 idea có sẵn
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editIdeaText, setEditIdeaText] = useState("");
  const [editIdeaRoute, setEditIdeaRoute] = useState("");
  const [editIdeaFormat, setEditIdeaFormat] = useState("Ảnh");

  async function persistMatrix(nextMatrix: ContentMatrixData, toastMsg?: string) {
    setMatrix(nextMatrix);
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          contentMatrixJson: nextMatrix,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được Matrix Content.", "error");
        return false;
      }
      onProjectUpdated({ contentMatrixJson: data.project.contentMatrixJson });
      if (toastMsg) showToast(toastMsg);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newTopicTitle.trim();
    if (!cleaned) return;
    const topicId = `topic-${Date.now().toString(36)}`;
    const next: ContentMatrixData = {
      ...matrix,
      topics: [...matrix.topics, { id: topicId, title: cleaned }],
    };
    const ok = await persistMatrix(next, `Đã thêm Topic "${cleaned}".`);
    if (ok) {
      setNewTopicTitle("");
      setAddingTopic(false);
    }
  }

  async function handleRenameTopic(topicId: string) {
    const cleaned = topicTitleDraft.trim();
    if (!cleaned) return;
    const next: ContentMatrixData = {
      ...matrix,
      topics: matrix.topics.map((t) =>
        t.id === topicId ? { ...t, title: cleaned } : t
      ),
    };
    const ok = await persistMatrix(next, "Đã đổi tên Topic.");
    if (ok) setEditingTopicId(null);
  }

  async function handleDeleteTopic(topicId: string) {
    if (matrix.topics.length <= 1) {
      showToast("Cần giữ ít nhất 1 cột Topic trong Matrix.", "error");
      return;
    }
    const next: ContentMatrixData = {
      ...matrix,
      topics: matrix.topics.filter((t) => t.id !== topicId),
      ideas: matrix.ideas.filter((i) => i.topicId !== topicId),
    };
    await persistMatrix(next, "Đã xóa cột Topic khỏi Matrix.");
  }

  async function handleAddCellIdeas(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCell) return;
    const lines = ideaTextDraft
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\-\*\•]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const nowBase = Date.now();
    const createdIdeas: ContentMatrixIdea[] = lines.map((line, idx) => {
      const inferred = inferRouteAndFormatFromText(
        line,
        ideaRouteDraft || undefined,
        ideaFormatDraft || undefined
      );
      return {
        id: `idea-${nowBase.toString(36)}-${idx}`,
        topicId: activeCell.topicId,
        depthKey: activeCell.depthKey,
        text: line,
        route: inferred.route,
        format: inferred.format,
        linkedTaskId: null,
      };
    });

    const next: ContentMatrixData = {
      ...matrix,
      ideas: [...matrix.ideas, ...createdIdeas],
    };
    const ok = await persistMatrix(
      next,
      `Đã thêm ${createdIdeas.length} idea vào Matrix!`
    );
    if (ok) {
      setIdeaTextDraft("");
      setActiveCell(null);
    }
  }

  async function handleSaveEditIdea(ideaId: string) {
    const cleaned = editIdeaText.trim();
    if (!cleaned) return;
    const next: ContentMatrixData = {
      ...matrix,
      ideas: matrix.ideas.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              text: cleaned,
              route: editIdeaRoute || undefined,
              format: editIdeaFormat || undefined,
            }
          : i
      ),
    };
    const ok = await persistMatrix(next, "Đã cập nhật idea.");
    if (ok) setEditingIdeaId(null);
  }

  async function handleDeleteIdea(ideaId: string) {
    const next: ContentMatrixData = {
      ...matrix,
      ideas: matrix.ideas.filter((i) => i.id !== ideaId),
    };
    await persistMatrix(next, "Đã xóa idea.");
  }

  return (
    <div className="space-y-4">
      {/* Header Matrix Content */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          <h2 className="text-base font-extrabold text-slate-900">
            Matrix Content ({matrix.ideas.length} idea • {matrix.topics.length} Topic)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {addingTopic ? (
            <form onSubmit={handleAddTopic} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="VD: TOPIC: setup livestream ko lo về giá"
                className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                Thêm
              </button>
              <button
                type="button"
                onClick={() => setAddingTopic(false)}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingTopic(true)}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Topic
            </button>
          )}
        </div>
      </div>

      {/* Bảng Matrix Brand Content (7 Tầng Độ Sâu x Nhiều Topic) */}
      <div className="bg-white rounded-2xl border-2 border-emerald-700/30 overflow-x-auto shadow-sm">
        <table className="w-full border-collapse text-xs min-w-[920px]">
          <thead>
            <tr className="bg-[#38761d] text-white">
              <th
                rowSpan={2}
                className="py-3 px-3.5 text-center font-extrabold border-r border-emerald-800/40 w-32 align-middle"
              >
                Độ sâu
              </th>
              <th
                rowSpan={2}
                className="py-3 px-3.5 text-left font-extrabold border-r border-emerald-800/40 w-52 align-middle"
              >
                Mục tiêu nội dung
              </th>
              <th
                colSpan={matrix.topics.length}
                className="py-2 px-4 text-center font-black tracking-wider uppercase text-xs bg-[#2e6317] border-b border-emerald-900/30"
              >
                BRAND CONTENT
              </th>
            </tr>
            <tr className="bg-[#4b8a2f] text-white">
              {matrix.topics.map((topic) => (
                <th
                  key={topic.id}
                  className="py-2.5 px-3 text-left border-l border-emerald-800/30 min-w-[270px] align-top"
                >
                  {editingTopicId === topic.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={topicTitleDraft}
                        onChange={(e) => setTopicTitleDraft(e.target.value)}
                        className="w-full rounded px-2 py-1 text-xs text-slate-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameTopic(topic.id)}
                        className="p-1 rounded bg-white text-emerald-800 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTopicId(null)}
                        className="p-1 rounded bg-white/20 text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-xs leading-snug text-amber-200">
                          {topic.title}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-100/90 mt-0.5">
                          idea cụ thể
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTopicId(topic.id);
                            setTopicTitleDraft(topic.title);
                          }}
                          title="Đổi tên Topic"
                          className="p-1 rounded hover:bg-white/15 text-emerald-100 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {matrix.topics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(topic.id)}
                            title="Xóa cột Topic"
                            className="p-1 rounded hover:bg-rose-600/80 text-emerald-100 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {matrix.depths.map((depth) => (
              <tr key={depth.key} className="align-top">
                <td className="p-3 bg-[#b6d7a8]/60 font-extrabold text-slate-900 text-center border-r border-emerald-200 align-middle">
                  {depth.label}
                </td>
                <td className="p-3 bg-[#d9ead3]/55 text-slate-800 font-medium border-r border-emerald-200 align-middle leading-relaxed">
                  {depth.goal}
                </td>

                {matrix.topics.map((topic) => {
                  const cellIdeas = matrix.ideas.filter(
                    (i) => i.topicId === topic.id && i.depthKey === depth.key
                  );
                  const isEditingThisCell =
                    activeCell?.topicId === topic.id &&
                    activeCell?.depthKey === depth.key;

                  return (
                    <td
                      key={topic.id}
                      className="p-2.5 border-l border-slate-200 bg-white align-top space-y-2"
                    >
                      {cellIdeas.map((idea) => {
                        const linkedTask =
                          (idea.linkedTaskId &&
                            tasks.find((t) => t.id === idea.linkedTaskId)) ||
                          tasks.find((t) => t.matrixIdeaId === idea.id) ||
                          null;
                        const routeMeta = getContentRouteMeta(idea.route);
                        const formatMeta = getPostFormatMeta(idea.format);
                        const isEditing = editingIdeaId === idea.id;

                        if (isEditing) {
                          return (
                            <div
                              key={idea.id}
                              className="rounded-xl border border-blue-300 bg-blue-50/40 p-2.5 space-y-2"
                            >
                              <textarea
                                rows={2}
                                value={editIdeaText}
                                onChange={(e) => setEditIdeaText(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <select
                                  value={editIdeaRoute}
                                  onChange={(e) => setEditIdeaRoute(e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                                >
                                  <option value="">-- Tuyến --</option>
                                  {CONTENT_ROUTE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editIdeaFormat}
                                  onChange={(e) => setEditIdeaFormat(e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                                >
                                  {POST_FORMAT_OPTIONS.map((f) => (
                                    <option key={f} value={f}>
                                      {f}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingIdeaId(null)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditIdea(idea.id)}
                                  className="rounded-lg bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const linkedStatus = linkedTask
                          ? getContentStatusDisplay(
                              linkedTask.status,
                              linkedTask.isAired
                            )
                          : null;

                        return (
                          <div
                            key={idea.id}
                            className={`group rounded-xl border p-2.5 space-y-1.5 transition ${
                              linkedTask
                                ? "border-emerald-300 bg-emerald-50/40"
                                : "border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="text-slate-800 font-medium leading-snug">
                                • {idea.text}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIdeaId(idea.id);
                                    setEditIdeaText(idea.text);
                                    setEditIdeaRoute(idea.route || "");
                                    setEditIdeaFormat(idea.format || "Ảnh");
                                  }}
                                  title="Sửa idea"
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIdea(idea.id)}
                                  title="Xóa idea"
                                  className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                              <div className="flex flex-wrap items-center gap-1">
                                {idea.route && (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${routeMeta.badgeClass}`}
                                  >
                                    {routeMeta.label}
                                  </span>
                                )}
                                {idea.format && (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${formatMeta.badgeClass}`}
                                  >
                                    {formatMeta.label}
                                  </span>
                                )}
                              </div>

                              {linkedTask && linkedStatus ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenExistingPost(linkedTask)}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${linkedStatus.badgeClass}`}
                                >
                                  <span>{linkedTask.code}:</span>
                                  <span>{linkedStatus.label}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCreatePostFromIdea({
                                      title: idea.text,
                                      route: idea.route,
                                      format: idea.format || "Ảnh",
                                      topic: topic.title,
                                      matrixIdeaId: idea.id,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#0B2545] hover:bg-blue-700 text-amber-300 hover:text-white px-2 py-1 text-[10px] font-bold cursor-pointer"
                                >
                                  <ArrowRightCircle className="w-3 h-3" />
                                  Lên lịch
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {isEditingThisCell ? (
                        <form
                          onSubmit={handleAddCellIdeas}
                          className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-2.5 space-y-2"
                        >
                          <textarea
                            rows={3}
                            autoFocus
                            value={ideaTextDraft}
                            onChange={(e) => setIdeaTextDraft(e.target.value)}
                            placeholder="Nhập idea (mỗi dòng 1 ý)..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={ideaRouteDraft}
                              onChange={(e) => setIdeaRouteDraft(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                            >
                              <option value="">-- Tuyến --</option>
                              {CONTENT_ROUTE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={ideaFormatDraft}
                              onChange={(e) => setIdeaFormatDraft(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]"
                            >
                              {POST_FORMAT_OPTIONS.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveCell(null)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 cursor-pointer"
                            >
                              Đóng
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="rounded-lg bg-emerald-700 text-white px-3 py-1 text-[11px] font-bold cursor-pointer"
                            >
                              Lưu Idea
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCell({ topicId: topic.id, depthKey: depth.key });
                            setIdeaTextDraft("");
                          }}
                          className="w-full rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-emerald-800 cursor-pointer"
                        >
                          + Thêm idea
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
