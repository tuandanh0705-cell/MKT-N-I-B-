"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  NotebookPen,
  Send,
  Sparkles,
} from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import {
  computeCourseProgress,
  type KnowledgeCourseItem,
  type KnowledgeProgressItem,
  type KnowledgeTeamMember,
} from "@/lib/knowledge";

interface KnowledgeTeamProgressProps {
  courses: KnowledgeCourseItem[];
  members: KnowledgeTeamMember[];
  teamProgresses: KnowledgeProgressItem[];
  onProgressUpdated: (progress: KnowledgeProgressItem) => void;
}

export function KnowledgeTeamProgress({
  courses,
  members,
  teamProgresses,
  onProgressUpdated,
}: KnowledgeTeamProgressProps) {
  const { showToast } = useToast();
  const [courseFilterId, setCourseFilterId] = useState<string>("ALL");
  const [onlyMandatory, setOnlyMandatory] = useState<boolean>(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(
    members[0]?.id ?? null
  );
  const [remindingKey, setRemindingKey] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [savingNoteKey, setSavingNoteKey] = useState<string | null>(null);

  const visibleCourses = useMemo(() => {
    return courses.filter((c) => {
      if (onlyMandatory && !c.isMandatory) return false;
      if (courseFilterId !== "ALL" && c.id !== courseFilterId) return false;
      return true;
    });
  }, [courses, courseFilterId, onlyMandatory]);

  const progressByUserMap = useMemo(() => {
    const outer = new Map<string, Map<string, KnowledgeProgressItem>>();
    for (const p of teamProgresses) {
      let inner = outer.get(p.userId);
      if (!inner) {
        inner = new Map<string, KnowledgeProgressItem>();
        outer.set(p.userId, inner);
      }
      inner.set(p.lessonId, p);
    }
    return outer;
  }, [teamProgresses]);

  async function handleRemindMember(targetUserId: string, courseId: string) {
    const key = `${targetUserId}:${courseId}`;
    setRemindingKey(key);
    try {
      const res = await fetch("/api/knowledge/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể gửi nhắc học.", "error");
        return;
      }
      showToast("Đã gửi nhắc nhở học tập qua Ốc Sên Tin!");
    } finally {
      setRemindingKey(null);
    }
  }

  async function handleSaveLeaderNote(
    targetUserId: string,
    lessonId: string,
    fallbackValue: string
  ) {
    const noteKey = `${targetUserId}:${lessonId}`;
    const noteText = (noteInputs[noteKey] ?? fallbackValue).trim();
    setSavingNoteKey(noteKey);
    try {
      const res = await fetch("/api/knowledge/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LEADER_NOTE",
          targetUserId,
          lessonId,
          leaderNote: noteText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được góp ý.", "error");
        return;
      }
      onProgressUpdated(data.progress as KnowledgeProgressItem);
      showToast("Đã lưu góp ý của Leader & báo cho nhân viên.");
    } finally {
      setSavingNoteKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-amber-200/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
            📊 Tiến độ Học tập của Team ({members.length} thành viên)
          </h2>
          <p className="text-xs text-slate-500">
            Xem % hoàn thành, đọc phần Thu hoạch &amp; bài thực hành, góp ý và nhắc học từng bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-800 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMandatory}
              onChange={(e) => setOnlyMandatory(e.target.checked)}
            />
            Chỉ khóa Bắt buộc
          </label>

          <select
            value={courseFilterId}
            onChange={(e) => setCourseFilterId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 max-w-[260px]"
          >
            <option value="ALL">Tất cả khóa học ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.isMandatory ? "📌 " : ""}
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-3">
        {members.map((m) => {
          const userMap =
            progressByUserMap.get(m.id) ?? new Map<string, KnowledgeProgressItem>();

          // Tính tổng bài hoàn thành / tổng bài thuộc các khóa phù hợp
          let totalLessons = 0;
          let completedLessons = 0;
          let takeawaysCount = 0;
          let completedCoursesCount = 0;

          const relevantCourses = visibleCourses.filter(
            (c) => !c.targetDepartment || c.targetDepartment === m.departmentScope || courseFilterId !== "ALL"
          );

          const courseSummaries = relevantCourses.map((c) => {
            const sum = computeCourseProgress(c, userMap);
            totalLessons += sum.totalLessons;
            completedLessons += sum.completedLessons;
            if (sum.status === "COMPLETED") completedCoursesCount += 1;
            for (const l of c.lessons) {
              const p = userMap.get(l.id);
              if (p?.takeaways?.trim()) takeawaysCount += 1;
            }
            return { course: c, summary: sum };
          });

          const overallPercent =
            totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0;

          const isExpanded = expandedUserId === m.id;

          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedUserId((cur) => (cur === m.id ? null : m.id))
                }
                className="w-full p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PirateAvatar
                    name={m.name}
                    color={m.avatarColor}
                    scope={m.departmentScope}
                    pirateCharacter={m.pirateCharacter}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900">
                        {m.name}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {DEPARTMENT_SCOPE_LABEL[m.departmentScope]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Xong <strong>{completedCoursesCount}/{relevantCourses.length}</strong> khóa •{" "}
                      <strong>{completedLessons}/{totalLessons}</strong> bài •{" "}
                      <strong>{takeawaysCount}</strong> ghi chú thu hoạch
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-36 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-extrabold">
                      <span className="text-slate-600">Tiến độ</span>
                      <span
                        className={
                          overallPercent >= 80
                            ? "text-emerald-700"
                            : overallPercent > 0
                              ? "text-blue-700"
                              : "text-slate-400"
                        }
                      >
                        {overallPercent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          overallPercent >= 80
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${overallPercent}%` }}
                      />
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-3">
                  {courseSummaries.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">
                      Chưa có khóa học nào thuộc bộ phận / bộ lọc này.
                    </div>
                  ) : (
                    courseSummaries.map(({ course, summary }) => {
                      const remindKey = `${m.id}:${course.id}`;
                      const lessonNotes = course.lessons
                        .map((l) => ({ lesson: l, prog: userMap.get(l.id) }))
                        .filter(
                          (x) =>
                            x.prog?.takeaways?.trim() ||
                            x.prog?.practiceUrl?.trim() ||
                            x.prog?.leaderNote?.trim()
                        );

                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {course.isMandatory && (
                                  <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-extrabold">
                                    Bắt buộc
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                  {course.title}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Hoàn thành:{" "}
                                <strong>
                                  {summary.completedLessons}/{summary.totalLessons}
                                </strong>{" "}
                                bài ({summary.percent}%)
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {summary.status === "COMPLETED" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Đã hoàn thành
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={remindingKey === remindKey}
                                  onClick={() =>
                                    void handleRemindMember(m.id, course.id)
                                  }
                                  className="rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <BellRing className="w-3 h-3 text-amber-600" />
                                  {remindingKey === remindKey
                                    ? "Đang gửi..."
                                    : "Nhắc học"}
                                </button>
                              )}
                            </div>
                          </div>

                          {lessonNotes.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              {lessonNotes.map(({ lesson, prog }) => {
                                const noteKey = `${m.id}:${lesson.id}`;
                                const currentNoteVal =
                                  noteInputs[noteKey] ?? prog?.leaderNote ?? "";
                                return (
                                  <div
                                    key={lesson.id}
                                    className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 space-y-2 text-xs"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-bold text-slate-800 inline-flex items-center gap-1">
                                        <NotebookPen className="w-3.5 h-3.5 text-indigo-600" />
                                        {lesson.title}
                                      </span>
                                      {prog?.practiceUrl && (
                                        <a
                                          href={prog.practiceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline text-[11px]"
                                        >
                                          Link bài thực hành
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>

                                    {prog?.takeaways && (
                                      <p className="text-slate-700 whitespace-pre-line bg-white rounded-lg border border-slate-200/70 p-2">
                                        {prog.takeaways}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <input
                                        type="text"
                                        value={currentNoteVal}
                                        onChange={(e) =>
                                          setNoteInputs((prev) => ({
                                            ...prev,
                                            [noteKey]: e.target.value,
                                          }))
                                        }
                                        placeholder="Góp ý / nhận xét của Leader..."
                                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px]"
                                      />
                                      <button
                                        type="button"
                                        disabled={savingNoteKey === noteKey}
                                        onClick={() =>
                                          void handleSaveLeaderNote(
                                            m.id,
                                            lesson.id,
                                            prog?.leaderNote ?? ""
                                          )
                                        }
                                        className="rounded-lg bg-[#0B2545] text-amber-300 px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Send className="w-3 h-3" />
                                        Gửi
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
