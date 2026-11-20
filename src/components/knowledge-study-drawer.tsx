"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  MessageSquareText,
  NotebookPen,
  PlayCircle,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  KNOWLEDGE_CATEGORY_META,
  computeCourseProgress,
  getCourseSourceMeta,
  type KnowledgeCourseItem,
  type KnowledgeLessonItem,
  type KnowledgeLessonStatus,
  type KnowledgeProgressItem,
} from "@/lib/knowledge";

interface KnowledgeStudyDrawerProps {
  course: KnowledgeCourseItem | null;
  open: boolean;
  myProgresses: KnowledgeProgressItem[];
  onClose: () => void;
  onProgressUpdated: (progress: KnowledgeProgressItem) => void;
}

export function KnowledgeStudyDrawer(props: KnowledgeStudyDrawerProps) {
  if (!props.open || !props.course) return null;
  return (
    <KnowledgeStudyDrawerInner
      key={props.course.id}
      course={props.course}
      myProgresses={props.myProgresses}
      onClose={props.onClose}
      onProgressUpdated={props.onProgressUpdated}
    />
  );
}

function LessonStudyRow({
  lesson,
  index,
  courseUrl,
  progress,
  onSaveProgress,
}: {
  lesson: KnowledgeLessonItem;
  index: number;
  courseUrl: string;
  progress: KnowledgeProgressItem | undefined;
  onSaveProgress: (
    lessonId: string,
    payload: {
      status?: KnowledgeLessonStatus;
      takeaways?: string;
      practiceUrl?: string;
    }
  ) => Promise<void>;
}) {
  const effectiveUrl = lesson.lessonUrl || courseUrl;
  const sourceMeta = getCourseSourceMeta(effectiveUrl);

  const [expanded, setExpanded] = useState<boolean>(
    Boolean(progress?.takeaways || progress?.practiceUrl)
  );
  const [embedOpen, setEmbedOpen] = useState(false);
  const [takeaways, setTakeaways] = useState(progress?.takeaways || "");
  const [practiceUrl, setPracticeUrl] = useState(progress?.practiceUrl || "");
  const [saving, setSaving] = useState(false);

  const [prevProgress, setPrevProgress] = useState(progress);
  if (prevProgress !== progress) {
    setPrevProgress(progress);
    setTakeaways(progress?.takeaways || "");
    setPracticeUrl(progress?.practiceUrl || "");
  }

  const currentStatus: KnowledgeLessonStatus = progress?.status || "NOT_STARTED";
  const isDone = currentStatus === "COMPLETED";

  async function handleStatusChange(nextStatus: KnowledgeLessonStatus) {
    setSaving(true);
    try {
      await onSaveProgress(lesson.id, { status: nextStatus });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes(markCompleted?: boolean) {
    setSaving(true);
    try {
      await onSaveProgress(lesson.id, {
        status: markCompleted ? "COMPLETED" : currentStatus,
        takeaways,
        practiceUrl,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 p-4 space-y-3 transition ${
        isDone
          ? "border-emerald-200 bg-emerald-50/30"
          : currentStatus === "IN_PROGRESS"
            ? "border-sky-200 bg-sky-50/30"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-extrabold">
              Bài {index + 1}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${sourceMeta.badgeClass}`}
            >
              {sourceMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              {lesson.durationMinutes}p
            </span>
            {progress?.takeaways && (
              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                ✍️ Đã ghi thu hoạch
              </span>
            )}
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
            {lesson.title}
          </h4>
          {lesson.summary && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {lesson.summary}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {sourceMeta.embedUrl && (
            <button
              type="button"
              onClick={() => setEmbedOpen((v) => !v)}
              className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {embedOpen ? "Ẩn trình phát" : "Xem trực tiếp"}
            </button>
          )}

          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (currentStatus === "NOT_STARTED") {
                void handleStatusChange("IN_PROGRESS");
              }
            }}
            className="rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở link bài
          </a>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void handleStatusChange(isDone ? "IN_PROGRESS" : "COMPLETED")
            }
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition ${
              isDone
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isDone ? "Đã hoàn thành" : "Đánh dấu xong"}
          </button>
        </div>
      </div>

      {embedOpen && sourceMeta.embedUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video">
          <iframe
            src={sourceMeta.embedUrl}
            title={lesson.title}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      {progress?.leaderNote && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold">Góp ý từ Leader: </span>
            <span>{progress.leaderNote}</span>
          </div>
        </div>
      )}

      {/* Nút mở/đóng phần Thu hoạch & Bài thực hành */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <NotebookPen className="w-3.5 h-3.5" />
          {expanded
            ? "Thu gọn ô Thu hoạch & Thực hành"
            : progress?.takeaways || progress?.practiceUrl
              ? "Xem / Sửa Thu hoạch & Link thực hành"
              : "+ Ghi Thu hoạch (Key Takeaways) & Link bài thực hành"}
        </button>

        {expanded && (
          <div className="mt-2.5 rounded-xl border border-indigo-200/80 bg-white p-3 space-y-2.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ✍️ Thu hoạch / Điều tâm đắc rút ra (Key Takeaways)
              </label>
              <textarea
                rows={3}
                value={takeaways}
                onChange={(e) => setTakeaways(e.target.value)}
                placeholder="Ghi lại 2-3 ý chính bạn học được từ bài này để áp dụng vào công việc..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                🔗 Link bài thực hành / áp dụng (Docs, Canva, Drive... tùy chọn)
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={practiceUrl}
                  onChange={(e) => setPracticeUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveNotes(false)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu ghi chú
              </button>
              {!isDone && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveNotes(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lưu Thu hoạch &amp; Hoàn thành bài
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KnowledgeStudyDrawerInner({
  course,
  myProgresses,
  onClose,
  onProgressUpdated,
}: {
  course: KnowledgeCourseItem;
  myProgresses: KnowledgeProgressItem[];
  onClose: () => void;
  onProgressUpdated: (progress: KnowledgeProgressItem) => void;
}) {
  const { showToast } = useToast();

  const progressMap = useMemo(() => {
    const m = new Map<string, KnowledgeProgressItem>();
    for (const p of myProgresses) {
      if (p.courseId === course.id) m.set(p.lessonId, p);
    }
    return m;
  }, [myProgresses, course.id]);

  const summary = computeCourseProgress(course, progressMap);
  const catMeta =
    KNOWLEDGE_CATEGORY_META[course.category] || KNOWLEDGE_CATEGORY_META.GENERAL;
  const sourceMeta = getCourseSourceMeta(course.courseUrl);

  async function saveLessonProgress(
    lessonId: string,
    payload: {
      status?: KnowledgeLessonStatus;
      takeaways?: string;
      practiceUrl?: string;
    }
  ) {
    try {
      const res = await fetch("/api/knowledge/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được tiến độ.", "error");
        return;
      }
      onProgressUpdated(data.progress as KnowledgeProgressItem);
      showToast(
        payload.status === "COMPLETED"
          ? "Chúc mừng! Đã đánh dấu hoàn thành bài học."
          : "Đã lưu tiến độ & thu hoạch bài học."
      );
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border-2 border-sky-200 bg-slate-50 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-amber-300 text-slate-950 px-2.5 py-0.5 font-extrabold">
                  {course.trackType === "OFFICIAL"
                    ? "🏆 Khóa Chính thức"
                    : "💡 Team Chia sẻ"}
                </span>
                {course.isMandatory && (
                  <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 font-bold">
                    📌 Bắt buộc
                  </span>
                )}
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold text-sky-100">
                  {catMeta.emoji} {catMeta.label}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold text-amber-200">
                  {sourceMeta.label}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold leading-snug">
                {course.title}
              </h3>

              {course.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Course Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex-1 min-w-[200px] space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-300">
                  Tiến độ của bạn: {summary.completedLessons}/{summary.totalLessons} bài (
                  {summary.percent}%)
                </span>
                <span className="text-slate-300">
                  ~{course.estimatedMinutes} phút
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-300"
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
            </div>

            <a
              href={course.courseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Mở link khóa học gốc
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Lessons List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-bold inline-flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-indigo-600" />
              Hoàn thành từng bài học &amp; ghi lại Thu hoạch để lưu lịch sử rèn luyện
            </span>
          </div>

          {course.lessons.map((lesson, idx) => (
            <LessonStudyRow
              key={lesson.id}
              lesson={lesson}
              index={idx}
              courseUrl={course.courseUrl}
              progress={progressMap.get(lesson.id)}
              onSaveProgress={saveLessonProgress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
