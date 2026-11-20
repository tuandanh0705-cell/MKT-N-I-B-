"use client";

import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { KnowledgeCourseModal } from "@/components/knowledge-course-modal";
import { KnowledgeStudyDrawer } from "@/components/knowledge-study-drawer";
import { KnowledgeTeamProgress } from "@/components/knowledge-team-progress";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import {
  KNOWLEDGE_CATEGORY_META,
  computeCourseProgress,
  getCourseSourceMeta,
  type KnowledgeCourseItem,
  type KnowledgeLessonStatus,
  type KnowledgeProgressItem,
  type KnowledgeTeamMember,
} from "@/lib/knowledge";
import type { SimpleProject } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface KnowledgeHubViewProps {
  initialCourses: KnowledgeCourseItem[];
  initialMyProgresses: KnowledgeProgressItem[];
  projects: SimpleProject[];
  teamMembers: KnowledgeTeamMember[];
  initialTeamProgresses: KnowledgeProgressItem[];
  currentUserId: string;
  currentUserRole: UserRole;
  initialCourseId?: string;
}

type HubTab = "LIBRARY" | "TEAM_PROGRESS";
type TrackFilter = "ALL" | "OFFICIAL" | "MANDATORY" | "SHARED";
type ProgressFilter = "ALL" | KnowledgeLessonStatus;

export function KnowledgeHubView({
  initialCourses,
  initialMyProgresses,
  projects,
  teamMembers,
  initialTeamProgresses,
  currentUserId,
  currentUserRole,
  initialCourseId,
}: KnowledgeHubViewProps) {
  const { showToast } = useToast();
  const isLeader = currentUserRole === "LEADER";

  const [courses, setCourses] = useState<KnowledgeCourseItem[]>(initialCourses);
  const [myProgresses, setMyProgresses] =
    useState<KnowledgeProgressItem[]>(initialMyProgresses);
  const [teamProgresses, setTeamProgresses] = useState<KnowledgeProgressItem[]>(
    initialTeamProgresses
  );

  const [activeTab, setActiveTab] = useState<HubTab>("LIBRARY");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [studyCourseId, setStudyCourseId] = useState<string | null>(() => {
    if (
      initialCourseId &&
      initialCourses.some((c) => c.id === initialCourseId)
    ) {
      return initialCourseId;
    }
    return null;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] =
    useState<KnowledgeCourseItem | null>(null);
  const [deletingCourse, setDeletingCourse] =
    useState<KnowledgeCourseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const myProgressByLesson = useMemo(() => {
    const map = new Map<string, KnowledgeProgressItem>();
    for (const p of myProgresses) {
      map.set(p.lessonId, p);
    }
    return map;
  }, [myProgresses]);

  const personalStats = useMemo(() => {
    let completedCourses = 0;
    let totalLessons = 0;
    let completedLessons = 0;
    let mandatoryTotal = 0;
    let mandatoryCompleted = 0;
    let sharedCount = 0;

    for (const c of courses) {
      if (c.trackType === "SHARED") sharedCount += 1;
      const sum = computeCourseProgress(c, myProgressByLesson);
      totalLessons += sum.totalLessons;
      completedLessons += sum.completedLessons;
      if (sum.status === "COMPLETED") completedCourses += 1;
      if (c.isMandatory) {
        mandatoryTotal += 1;
        if (sum.status === "COMPLETED") mandatoryCompleted += 1;
      }
    }

    return {
      totalCourses: courses.length,
      completedCourses,
      totalLessons,
      completedLessons,
      mandatoryTotal,
      mandatoryCompleted,
      sharedCount,
      overallPercent:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
    };
  }, [courses, myProgressByLesson]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (trackFilter === "OFFICIAL" && c.trackType !== "OFFICIAL") return false;
      if (trackFilter === "MANDATORY" && !c.isMandatory) return false;
      if (trackFilter === "SHARED" && c.trackType !== "SHARED") return false;
      if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;

      if (progressFilter !== "ALL") {
        const sum = computeCourseProgress(c, myProgressByLesson);
        if (sum.status !== progressFilter) return false;
      }

      if (q) {
        const hit =
          c.title.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          c.createdBy.name.toLowerCase().includes(q) ||
          c.lessons.some((l) => l.title.toLowerCase().includes(q));
        if (!hit) return false;
      }

      return true;
    });
  }, [
    courses,
    trackFilter,
    categoryFilter,
    progressFilter,
    searchQuery,
    myProgressByLesson,
  ]);

  const studyCourse = useMemo(
    () => courses.find((c) => c.id === studyCourseId) ?? null,
    [courses, studyCourseId]
  );

  function canManageCourse(c: KnowledgeCourseItem) {
    if (isLeader) return true;
    return c.createdById === currentUserId && c.trackType === "SHARED";
  }

  function handleUpsertProgress(next: KnowledgeProgressItem) {
    if (next.userId === currentUserId) {
      setMyProgresses((prev) => {
        const idx = prev.findIndex((p) => p.lessonId === next.lessonId);
        if (idx >= 0) {
          return prev.map((p) => (p.lessonId === next.lessonId ? next : p));
        }
        return [next, ...prev];
      });
    }
    setTeamProgresses((prev) => {
      const idx = prev.findIndex(
        (p) => p.lessonId === next.lessonId && p.userId === next.userId
      );
      if (idx >= 0) {
        return prev.map((p) =>
          p.lessonId === next.lessonId && p.userId === next.userId ? next : p
        );
      }
      return [next, ...prev];
    });
  }

  function handleCourseSaved(saved: KnowledgeCourseItem, isNew: boolean) {
    setCourses((prev) =>
      isNew
        ? [saved, ...prev]
        : prev.map((c) => (c.id === saved.id ? saved : c))
    );
  }

  async function handlePromoteToOfficial(course: KnowledgeCourseItem) {
    const res = await fetch(`/api/knowledge/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackType: "OFFICIAL" }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Không thể duyệt khóa học.", "error");
      return;
    }
    handleCourseSaved(data.course as KnowledgeCourseItem, false);
    showToast(`Đã đưa "${course.title}" vào Khóa Chính thức!`);
  }

  async function executeDeleteCourse() {
    if (!deletingCourse) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${deletingCourse.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Không xóa được khóa học.", "error");
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      if (studyCourseId === deletingCourse.id) setStudyCourseId(null);
      showToast(`Đã xóa khóa "${deletingCourse.title}".`);
    } finally {
      setDeleting(false);
      setDeletingCourse(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Compact Stats */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="w-6 h-6 text-amber-600" />
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Khu Luyện Tập
              </h1>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                Tiến độ cá nhân: {personalStats.overallPercent}%
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Tổng hợp link khóa học chính thức từ Leader &amp; tài liệu hay team chia sẻ. Học xong đánh dấu hoàn thành &amp; ghi Thu hoạch để theo dõi nâng cấp kỹ năng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLeader && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("LIBRARY")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "LIBRARY"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Thư viện Khóa học
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("TEAM_PROGRESS")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "TEAM_PROGRESS"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  Tiến độ Team ({teamMembers.length})
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingCourse(null);
                setModalOpen(true);
              }}
              className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isLeader ? "Thêm Khóa học" : "Chia sẻ Khóa học hay"}
            </button>
          </div>
        </div>

        {/* Compact Progress Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LIBRARY");
              setTrackFilter("ALL");
              setProgressFilter("COMPLETED");
            }}
            className="rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11px] font-bold text-emerald-800">
              Khóa đã xong
            </span>
            <span className="text-sm font-black text-slate-900">
              {personalStats.completedCourses}
              <span className="text-[11px] font-normal text-slate-500">
                /{personalStats.totalCourses}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("LIBRARY");
              setTrackFilter("ALL");
              setProgressFilter("ALL");
            }}
            className="rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11px] font-bold text-sky-800">
              Bài học hoàn thành
            </span>
            <span className="text-sm font-black text-slate-900">
              {personalStats.completedLessons}
              <span className="text-[11px] font-normal text-slate-500">
                /{personalStats.totalLessons}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("LIBRARY");
              setTrackFilter("MANDATORY");
              setProgressFilter("ALL");
            }}
            className="rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11px] font-bold text-rose-800">
              Khóa Bắt buộc
            </span>
            <span className="text-sm font-black text-rose-700">
              {personalStats.mandatoryCompleted}
              <span className="text-[11px] font-normal text-slate-500">
                /{personalStats.mandatoryTotal}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("LIBRARY");
              setTrackFilter("SHARED");
              setProgressFilter("ALL");
            }}
            className="rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11px] font-bold text-amber-800">
              Team chia sẻ
            </span>
            <span className="text-sm font-black text-slate-900">
              {personalStats.sharedCount}
            </span>
          </button>
        </div>

        {/* Filters for Library Tab */}
        {activeTab === "LIBRARY" && (
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "ALL", label: "Tất cả nguồn" },
                    { id: "OFFICIAL", label: "🏆 Chính thức (Leader)" },
                    { id: "MANDATORY", label: "📌 Bắt buộc" },
                    { id: "SHARED", label: "💡 Team chia sẻ" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrackFilter(t.id)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold cursor-pointer transition ${
                      trackFilter === t.id
                        ? "bg-[#0B2545] text-amber-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700"
                >
                  <option value="ALL">Mọi chủ đề</option>
                  {Object.entries(KNOWLEDGE_CATEGORY_META).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.emoji} {meta.label}
                    </option>
                  ))}
                </select>

                <select
                  value={progressFilter}
                  onChange={(e) =>
                    setProgressFilter(e.target.value as ProgressFilter)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700"
                >
                  <option value="ALL">Mọi tiến độ</option>
                  <option value="NOT_STARTED">Chưa học</option>
                  <option value="IN_PROGRESS">Đang học</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên khóa học, tên bài học, người chia sẻ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none pl-9 pr-8 py-1.5 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {activeTab === "TEAM_PROGRESS" && isLeader ? (
        <KnowledgeTeamProgress
          courses={courses}
          members={teamMembers}
          teamProgresses={teamProgresses}
          onProgressUpdated={handleUpsertProgress}
        />
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">
            Không tìm thấy khóa học nào khớp bộ lọc.
          </div>
          <button
            type="button"
            onClick={() => {
              setTrackFilter("ALL");
              setCategoryFilter("ALL");
              setProgressFilter("ALL");
              setSearchQuery("");
            }}
            className="rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
          >
            Xem tất cả khóa học ({courses.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCourses.map((c) => {
            const catMeta =
              KNOWLEDGE_CATEGORY_META[c.category] ||
              KNOWLEDGE_CATEGORY_META.GENERAL;
            const sourceMeta = getCourseSourceMeta(c.courseUrl);
            const sum = computeCourseProgress(c, myProgressByLesson);
            const editable = canManageCourse(c);

            return (
              <div
                key={c.id}
                className={`rounded-2xl border-2 bg-white p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3.5 transition ${
                  sum.status === "COMPLETED"
                    ? "border-emerald-200/90"
                    : c.isMandatory
                      ? "border-rose-200/80"
                      : "border-slate-200 hover:border-amber-300"
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Badges & Controls */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {c.isPinned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 font-extrabold">
                          <Pin className="w-2.5 h-2.5" />
                          Ghim
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 font-extrabold ${
                          c.trackType === "OFFICIAL"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                            : "border-teal-200 bg-teal-50 text-teal-800"
                        }`}
                      >
                        {c.trackType === "OFFICIAL"
                          ? "🏆 Chính thức"
                          : "💡 Team chia sẻ"}
                      </span>
                      {c.isMandatory && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5 font-extrabold">
                          📌 Bắt buộc
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 font-bold ${catMeta.badgeClass}`}
                      >
                        {catMeta.emoji} {catMeta.label}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-bold ${sourceMeta.badgeClass}`}
                      >
                        {sourceMeta.label}
                      </span>
                    </div>

                    {editable && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isLeader && c.trackType === "SHARED" && (
                          <button
                            type="button"
                            onClick={() => void handlePromoteToOfficial(c)}
                            title="Duyệt thành Khóa Chính thức của Team"
                            className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            Đưa lên Chính thức
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourse(c);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Chỉnh sửa khóa học"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCourse(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa khóa học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title + Description */}
                  <div className="space-y-1">
                    <h3
                      onClick={() => setStudyCourseId(c.id)}
                      className="text-sm sm:text-base font-extrabold text-slate-900 hover:text-blue-700 leading-snug cursor-pointer"
                    >
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <PirateAvatar
                        name={c.createdBy.name}
                        color={c.createdBy.avatarColor}
                        scope={c.createdBy.departmentScope}
                        pirateCharacter={c.createdBy.pirateCharacter}
                        size="sm"
                      />
                      {c.createdBy.name}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {c.estimatedMinutes} phút
                    </span>
                    <span>•</span>
                    <span>{c.lessons.length} bài học</span>
                    {c.targetDepartment && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700">
                          Dành cho: {DEPARTMENT_SCOPE_LABEL[c.targetDepartment]}
                        </span>
                      </>
                    )}
                    {c.project && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700">
                          {c.project.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress + Action Footer */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span
                        className={
                          sum.status === "COMPLETED"
                            ? "text-emerald-700 inline-flex items-center gap-1"
                            : "text-slate-700"
                        }
                      >
                        {sum.status === "COMPLETED" && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {sum.status === "COMPLETED"
                          ? `Đã hoàn thành (${sum.completedLessons}/${sum.totalLessons} bài)`
                          : sum.status === "IN_PROGRESS"
                            ? `Đang học (${sum.completedLessons}/${sum.totalLessons} bài)`
                            : `Chưa học (${sum.totalLessons} bài)`}
                      </span>
                      <span className="text-slate-900 font-extrabold">
                        {sum.percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          sum.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-sky-500 to-indigo-600"
                        }`}
                        style={{ width: `${sum.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setStudyCourseId(c.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer ${
                        sum.status === "COMPLETED"
                          ? "border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                          : "bg-[#0B2545] hover:bg-[#13315C] text-amber-300"
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      {sum.status === "COMPLETED"
                        ? "Xem lại & Thu hoạch"
                        : "Vào học & Cập nhật"}
                    </button>

                    <a
                      href={c.courseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Mở link khóa
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <KnowledgeCourseModal
        open={modalOpen}
        course={editingCourse}
        currentUserRole={currentUserRole}
        projects={projects}
        onClose={() => {
          setModalOpen(false);
          setEditingCourse(null);
        }}
        onSaved={handleCourseSaved}
      />

      <KnowledgeStudyDrawer
        course={studyCourse}
        open={Boolean(studyCourse)}
        myProgresses={myProgresses}
        onClose={() => setStudyCourseId(null)}
        onProgressUpdated={handleUpsertProgress}
      />

      <ConfirmDeleteModal
        open={Boolean(deletingCourse)}
        loading={deleting}
        itemName={deletingCourse?.title || "khóa học này"}
        description="Toàn bộ bài học và lịch sử tiến độ của khóa này sẽ bị xóa."
        onCancel={() => setDeletingCourse(null)}
        onConfirm={() => {
          void executeDeleteCourse();
        }}
      />
    </div>
  );
}
