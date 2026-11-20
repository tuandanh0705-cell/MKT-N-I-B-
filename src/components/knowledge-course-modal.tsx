"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Link2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import {
  KNOWLEDGE_CATEGORY_META,
  type KnowledgeCategoryKey,
  type KnowledgeCourseItem,
  type KnowledgeTrackType,
} from "@/lib/knowledge";
import type { SimpleProject } from "@/types/crm";
import type { DepartmentScope, UserRole } from "@/generated/prisma/client";

interface LessonDraft {
  id?: string;
  title: string;
  lessonUrl: string;
  summary: string;
  durationMinutes: number;
}

interface KnowledgeCourseModalProps {
  open: boolean;
  course: KnowledgeCourseItem | null;
  currentUserRole: UserRole;
  projects: SimpleProject[];
  onClose: () => void;
  onSaved: (course: KnowledgeCourseItem, isNew: boolean) => void;
}

export function KnowledgeCourseModal(props: KnowledgeCourseModalProps) {
  if (!props.open) return null;
  return (
    <KnowledgeCourseModalInner
      key={props.course?.id || "new-course"}
      {...props}
    />
  );
}

function KnowledgeCourseModalInner({
  course,
  currentUserRole,
  projects,
  onClose,
  onSaved,
}: KnowledgeCourseModalProps) {
  const { showToast } = useToast();
  const isLeader = currentUserRole === "LEADER";
  const isEditing = Boolean(course);

  const [title, setTitle] = useState(course?.title || "");
  const [courseUrl, setCourseUrl] = useState(course?.courseUrl || "");
  const [description, setDescription] = useState(course?.description || "");
  const [trackType, setTrackType] = useState<KnowledgeTrackType>(
    isLeader ? course?.trackType || "OFFICIAL" : "SHARED"
  );
  const [category, setCategory] = useState<KnowledgeCategoryKey>(
    course?.category || "GENERAL"
  );
  const [targetDepartment, setTargetDepartment] = useState<string>(
    course?.targetDepartment || ""
  );
  const [projectId, setProjectId] = useState<string>(course?.projectId || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(
    course?.estimatedMinutes || 30
  );
  const [isMandatory, setIsMandatory] = useState<boolean>(
    Boolean(course?.isMandatory)
  );
  const [isPinned, setIsPinned] = useState<boolean>(Boolean(course?.isPinned));
  const [notifyTeam, setNotifyTeam] = useState<boolean>(false);

  const [lessons, setLessons] = useState<LessonDraft[]>(() => {
    if (course && course.lessons.length > 0) {
      return course.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        lessonUrl: l.lessonUrl || "",
        summary: l.summary || "",
        durationMinutes: l.durationMinutes || 15,
      }));
    }
    return [
      {
        title: "Bài 1: Nội dung chính & ghi chú trọng tâm",
        lessonUrl: "",
        summary: "",
        durationMinutes: 20,
      },
    ];
  });

  const [saving, setSaving] = useState(false);

  function addLessonRow() {
    setLessons((prev) => [
      ...prev,
      {
        title: `Bài ${prev.length + 1}: `,
        lessonUrl: "",
        summary: "",
        durationMinutes: 20,
      },
    ]);
  }

  function removeLessonRow(idx: number) {
    setLessons((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
    );
  }

  function updateLesson(idx: number, patch: Partial<LessonDraft>) {
    setLessons((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !courseUrl.trim()) {
      showToast("Vui lòng nhập Tên khóa học và Link khóa học.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        courseUrl: courseUrl.trim(),
        description: description.trim() || null,
        trackType: isLeader ? trackType : "SHARED",
        category,
        targetDepartment: targetDepartment || null,
        projectId: projectId || null,
        estimatedMinutes: Number(estimatedMinutes) || 30,
        isMandatory: isLeader && trackType === "OFFICIAL" ? isMandatory : false,
        isPinned: isLeader ? isPinned : false,
        notifyTeam: !isEditing && isLeader && trackType === "OFFICIAL" && notifyTeam,
        lessons: lessons
          .filter((l) => l.title.trim().length > 0)
          .map((l) => ({
            id: l.id,
            title: l.title.trim(),
            lessonUrl: l.lessonUrl.trim() || courseUrl.trim(),
            summary: l.summary.trim() || null,
            durationMinutes: Number(l.durationMinutes) || 20,
          })),
      };

      const url = isEditing ? `/api/knowledge/${course!.id}` : "/api/knowledge";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được khóa học.", "error");
        return;
      }

      onSaved(data.course as KnowledgeCourseItem, !isEditing);
      showToast(
        isEditing
          ? "Đã cập nhật khóa học!"
          : isLeader && trackType === "OFFICIAL"
            ? "Đã tạo khóa học mới cho team!"
            : "Đã chia sẻ khóa học lên Khu Luyện Tập!"
      );
      onClose();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border-2 border-amber-300 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h3 className="text-base font-extrabold">
                {isEditing
                  ? "Chỉnh sửa Khóa học / Tài liệu"
                  : isLeader
                    ? "Thêm Khóa học vào Khu Luyện Tập"
                    : "Chia sẻ Khóa học / Tài liệu hay cho Team"}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isLeader
                  ? "Gắn link khóa học & chia thành từng bài nhỏ để mọi người học và ghi thu hoạch."
                  : "Đăng link khóa học hoặc video hay bạn tìm được vào mục Chia sẻ chung của team."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Tên khóa học / Lộ trình *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Khóa học Copywriting Facebook Ads Chuyển Đổi Cao 2026"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Link khóa học chính (YouTube / Google Drive / Notion / Udemy / Docs...) *
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={courseUrl}
                  onChange={(e) => setCourseUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc https://youtube.com/..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Chủ đề chuyên môn
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategoryKey)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800"
              >
                {Object.entries(KNOWLEDGE_CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.emoji} {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bộ phận nên học
              </label>
              <select
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800"
              >
                <option value="">Toàn bộ team</option>
                {(Object.keys(DEPARTMENT_SCOPE_LABEL) as DepartmentScope[])
                  .filter((d) => d !== "LEADER")
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {DEPARTMENT_SCOPE_LABEL[dept]}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Thời lượng dự kiến (phút)
              </label>
              <input
                type="number"
                min={5}
                max={2000}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Gắn theo Dự án (tùy chọn)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800"
              >
                <option value="">Kiến thức dùng chung</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Mô tả mục tiêu khóa học
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Học xong khóa này giúp ích gì cho công việc hằng ngày?"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Tùy chọn quyền Leader */}
          {isLeader && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-extrabold text-amber-950">Phân loại:</span>
                <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="trackType"
                    checked={trackType === "OFFICIAL"}
                    onChange={() => setTrackType("OFFICIAL")}
                  />
                  🏆 Khóa Chính thức (Leader)
                </label>
                <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="trackType"
                    checked={trackType === "SHARED"}
                    onChange={() => {
                      setTrackType("SHARED");
                      setIsMandatory(false);
                    }}
                  />
                  💡 Chia sẻ tham khảo
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {trackType === "OFFICIAL" && (
                  <label className="inline-flex items-center gap-1.5 font-bold text-rose-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                    />
                    📌 Khóa bắt buộc phải học xong
                  </label>
                )}
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  ⭐ Ghim lên đầu trang
                </label>
                {!isEditing && trackType === "OFFICIAL" && (
                  <label className="inline-flex items-center gap-1.5 font-bold text-indigo-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyTeam}
                      onChange={(e) => setNotifyTeam(e.target.checked)}
                    />
                    🔔 Báo cho bộ phận liên quan qua Ốc Sên Tin
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Danh sách bài học nhỏ trong khóa */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                  Danh sách Bài học / Học phần ({lessons.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Chia khóa học thành từng bài nhỏ để tính % tiến độ và ghi thu hoạch theo từng bài.
                </p>
              </div>
              <button
                type="button"
                onClick={addLessonRow}
                className="rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm bài học
              </button>
            </div>

            <div className="space-y-2.5">
              {lessons.map((l, idx) => (
                <div
                  key={l.id || `new-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-indigo-700">
                      Học phần #{idx + 1}
                    </span>
                    {lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLessonRow(idx)}
                        className="text-rose-600 hover:bg-rose-50 rounded-lg p-1 cursor-pointer"
                        title="Xóa bài học này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      required
                      value={l.title}
                      onChange={(e) =>
                        updateLesson(idx, { title: e.target.value })
                      }
                      placeholder="Tên bài học..."
                      className="sm:col-span-6 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold"
                    />
                    <input
                      type="text"
                      value={l.lessonUrl}
                      onChange={(e) =>
                        updateLesson(idx, { lessonUrl: e.target.value })
                      }
                      placeholder="Link bài riêng (để trống = dùng link khóa)"
                      className="sm:col-span-4 rounded-lg border border-slate-200 px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={l.durationMinutes}
                      onChange={(e) =>
                        updateLesson(idx, {
                          durationMinutes: Number(e.target.value),
                        })
                      }
                      title="Số phút học"
                      className="sm:col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-center"
                    />
                  </div>
                  <input
                    type="text"
                    value={l.summary}
                    onChange={(e) =>
                      updateLesson(idx, { summary: e.target.value })
                    }
                    placeholder="Trọng tâm cần nắm / bài tập thực hành gợi ý (tùy chọn)..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-60 text-amber-300 px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving
                ? "Đang lưu..."
                : isEditing
                  ? "Lưu thay đổi"
                  : isLeader
                    ? "Phát hành khóa học"
                    : "Chia sẻ vào Khu Luyện Tập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
