"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Check,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { parseSavedAiQcResult } from "@/lib/gemini-shared";
import type { LeaderLearningOverview } from "@/lib/knowledge-data";
import { TaskCard } from "@/components/task-card";
import { TaskAssigneesBadges } from "@/components/task-assignees-badges";
import { TaskStatusBadge } from "@/components/status-badge";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDrawer } from "@/components/task-drawer";
import { getTaskAssignees, isUserAssignedToTask } from "@/lib/task-assignees";
import { DenDenMushiIcon, PirateAvatar } from "@/components/pirate-art";
import {
  Pirate3DCrewCardGrid,
  Pirate3DCrewStage,
  type Pirate3DCardItem,
  type Pirate3DCrewMemberInput,
} from "@/components/pirate-3d-stage";
import { MotivationalQuoteWidget } from "@/components/motivational-quote-widget";
import { BirthdayCelebrationBanner } from "@/components/birthday-banner";
import { TASK_TYPE_META, isTaskOverdue } from "@/lib/constants";
import { getPlatformChannelMeta } from "@/lib/platform-meta";
import { PlatformLogo } from "@/components/platform-logo";
import { getToneCopy } from "@/lib/tone";
import { formatVnDateTime } from "@/lib/dates";
import type {
  BirthdayMemberInfo,
  CapacityItem,
  CheckinItem,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";

interface LeaderDashboardProps {
  initialTasks: TaskItem[];
  projects: SimpleProject[];
  users: SimpleUser[];
  capacity: CapacityItem[];
  todayCheckins: CheckinItem[];
  todayLeaves?: { userId: string; userName: string; leaveType: string }[];
  todayBirthdays?: BirthdayMemberInfo[];
  learningOverview?: LeaderLearningOverview;
  currentUserId?: string;
  todayDate: string;
  leaderTone?: string;
  leaderIcon?: string | null;
}

type QuickFilterMode = "OPEN" | "WAITING" | "OVERDUE" | "OUTSIDE" | "ALL";

export function LeaderDashboard({
  initialTasks,
  projects,
  users,
  capacity,
  todayCheckins,
  todayLeaves = [],
  todayBirthdays = [],
  learningOverview,
  currentUserId,
  todayDate,
  leaderTone = "PIRATE",
  leaderIcon,
}: LeaderDashboardProps) {
  const { showToast } = useToast();
  const tone = getToneCopy(leaderTone);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("ALL");
  const [quickMode, setQuickMode] = useState<QuickFilterMode>("OPEN");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState<number>(25);
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showShipDeck, setShowShipDeck] = useState(false);
  const listSectionRef = useRef<HTMLDivElement>(null);

  const waitingReviewCount = tasks.filter(
    (t) => t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW"
  ).length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));
  const outsideDeptCount = tasks.filter((t) => Boolean(t.isOutsideDepartment)).length;
  const atRiskCheckins = todayCheckins.filter((c) => c.status === "AT_RISK");
  const doneCount = tasks.filter(
    (t) =>
      t.status === "APPROVED_FINAL" ||
      t.status === "PUBLISHED" ||
      t.status === "DONE"
  ).length;

  const selectedAssigneeName =
    users.find((u) => u.id === selectedAssigneeId)?.name || null;
  const leaderUser = users.find((u) => u.role === "LEADER");

  const crew3DMembers: Pirate3DCrewMemberInput[] = useMemo(() => {
    const list: Pirate3DCrewMemberInput[] = [];
    const leader = users.find((u) => u.role === "LEADER");
    if (leader) {
      const leaderCheckin = todayCheckins.find((ch) => ch.user.id === leader.id);
      list.push({
        userId: leader.id,
        name: leader.name,
        departmentScope: "LEADER",
        pirateCharacter: leader.pirateCharacter,
        subtitle: "Chỉ huy toàn băng",
        checkinStatus: leaderCheckin?.status ?? "ON_TRACK",
      });
    }
    for (const c of capacity) {
      const checkedIn = todayCheckins.find((ch) => ch.user.id === c.userId);
      list.push({
        userId: c.userId,
        name: c.name,
        departmentScope: c.departmentScope,
        pirateCharacter: c.pirateCharacter,
        subtitle: c.limit
          ? `${c.used}/${c.limit} ${c.unit}`
          : `${c.activeTasksCount} việc`,
        checkinStatus: checkedIn?.status ?? "NONE",
      });
    }
    return list;
  }, [users, capacity, todayCheckins]);

  const crewCards: Pirate3DCardItem[] = useMemo(() => {
    return capacity.map((c) => {
      const checkedIn = todayCheckins.find((ch) => ch.user.id === c.userId);
      return {
        userId: c.userId,
        name: c.name,
        title: c.title,
        departmentScope: c.departmentScope,
        avatarColor: c.avatarColor,
        pirateCharacter: c.pirateCharacter,
        checkinStatus: checkedIn?.status ?? "NONE",
        checkinNote: checkedIn?.note ?? null,
        limit: c.limit,
        used: c.used,
        unit: c.unit,
        activeTasksCount: c.activeTasksCount,
        utilizationPercent: c.utilizationPercent,
        capacityStatus: c.status,
      };
    });
  }, [capacity, todayCheckins]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId !== "ALL" && t.project.id !== selectedProjectId) {
        return false;
      }
      if (
        selectedAssigneeId !== "ALL" &&
        !isUserAssignedToTask(t, selectedAssigneeId)
      ) {
        return false;
      }
      if (quickMode === "OPEN") {
        if (t.status === "DONE" || t.status === "PUBLISHED") return false;
      } else if (quickMode === "OVERDUE") {
        if (!isTaskOverdue(t)) return false;
      } else if (quickMode === "WAITING") {
        if (t.status !== "WAITING_APPROVAL" && t.status !== "BRIEF_REVIEW") {
          return false;
        }
      } else if (quickMode === "OUTSIDE") {
        if (!t.isOutsideDepartment) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.project.name.toLowerCase().includes(q) ||
          getTaskAssignees(t).some((u) => u.name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, selectedAssigneeId, quickMode, searchQuery]);

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  }

  function handleSelectAssignee(userId: string) {
    const next = selectedAssigneeId === userId ? "ALL" : userId;
    setSelectedAssigneeId(next);
    if (next !== "ALL") {
      listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function handleQuickApproveRow(
    e: React.MouseEvent,
    target: TaskItem
  ) {
    e.stopPropagation();
    setQuickApprovingId(target.id);
    try {
      const action =
        target.status === "BRIEF_REVIEW" ? "APPROVE_BRIEF" : "APPROVE";
      const res = await fetch(`/api/tasks/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không duyệt được đầu việc.", "error");
        return;
      }
      if (data.task) handleTaskUpdated(data.task as TaskItem);
      showToast(
        action === "APPROVE_BRIEF"
          ? `Đã duyệt Brief ${target.code}!`
          : `Đã duyệt Final ${target.code}!`
      );
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setQuickApprovingId(null);
    }
  }

  const displayedTasks = filteredTasks.slice(0, visibleLimit);

  return (
    <div className="space-y-5">
      {/* Header Boong Thuyền Trưởng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PirateAvatar
            name={leaderUser?.name || "Hương"}
            color={leaderUser?.avatarColor || "#0f172a"}
            scope="LEADER"
            pirateCharacter={leaderUser?.pirateCharacter}
            size="lg"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {leaderIcon ? `${leaderIcon} ` : ""}
              {tone.leaderDeckTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {todayDate} • {todayCheckins.length}/
              {users.filter((u) => u.role === "MEMBER").length} đã check-in
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 shadow-md transition hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {tone.assignBtnLabel.replace(/^\+\s*/, "")}
        </button>
      </div>

      <MotivationalQuoteWidget toneMode={leaderTone} compact />

      <BirthdayCelebrationBanner
        todayBirthdays={todayBirthdays}
        currentUserId={currentUserId}
      />

      {todayLeaves.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs text-amber-900">
          <span className="font-bold">🏖️ Lịch nghỉ hôm nay ({todayDate}):</span>
          {todayLeaves.map((l) => (
            <span
              key={l.userId}
              className="rounded-full bg-white border border-amber-300 px-2.5 py-0.5 font-semibold"
            >
              {l.userName} ({l.leaveType === "REMOTE" ? "Online WFH" : "Đang nghỉ"})
            </span>
          ))}
        </div>
      )}

      {/* Den Den Mushi Báo Động */}
      {atRiskCheckins.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 px-4 py-3 flex flex-col gap-1.5">
          {atRiskCheckins.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 text-rose-900">
                <DenDenMushiIcon className="w-5 h-5 shrink-0" />
                <span>
                  <strong>Den Den Mushi — {c.user.name} gặp sóng lớn:</strong>{" "}
                  {c.note || "Cần Thuyền trưởng chi viện."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectAssignee(c.user.id)}
                className="text-rose-700 font-bold hover:underline cursor-pointer shrink-0"
              >
                Kiểm tra việc {c.user.name} →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dải Chỉ Số Mảnh + Lối tắt Duyệt Output & Khu Luyện Tập */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setQuickMode("OPEN")}
          className={`text-left bg-white rounded-xl border-2 px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
            quickMode === "OPEN"
              ? "border-sky-400 bg-sky-50/40"
              : "border-amber-200/80 hover:border-sky-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-600">⛵ Đang chạy</span>
          <span className="text-lg font-black text-slate-900">
            {tasks.filter((t) => t.status !== "DONE" && t.status !== "PUBLISHED").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickMode("WAITING")}
          className={`text-left bg-white rounded-xl border-2 px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
            quickMode === "WAITING"
              ? "border-violet-400 bg-violet-50/40"
              : "border-amber-200/80 hover:border-violet-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-600">👀 Chờ duyệt</span>
          <span className="text-lg font-black text-violet-700">
            {waitingReviewCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickMode("OVERDUE")}
          className={`text-left bg-white rounded-xl border-2 px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
            quickMode === "OVERDUE"
              ? "border-rose-400 bg-rose-50/40"
              : "border-amber-200/80 hover:border-rose-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-600">🌊 Quá hạn</span>
          <span className="text-lg font-black text-rose-600">
            {overdueTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickMode("ALL")}
          className={`text-left bg-white rounded-xl border-2 px-3.5 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
            quickMode === "ALL"
              ? "border-emerald-400 bg-emerald-50/40"
              : "border-amber-200/80 hover:border-emerald-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-600">🏆 Đã xong</span>
          <span className="text-lg font-black text-emerald-700">
            {doneCount}
          </span>
        </button>

        {learningOverview ? (
          <Link
            href="/knowledge"
            className="col-span-2 sm:col-span-1 text-left bg-indigo-50/60 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 px-3.5 py-2.5 flex items-center justify-between gap-2 transition"
          >
            <span className="text-xs font-bold text-indigo-900 inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
              Luyện Tập
            </span>
            <span className="text-sm font-black text-indigo-800 whitespace-nowrap">
              {learningOverview.overallMandatoryPercent}%{" "}
              <span className="text-[10px] font-semibold text-indigo-600">
                ({learningOverview.membersCompletedAllCount}/
                {learningOverview.membersCount})
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href="/outputs?readiness=NEEDS_REVIEW"
            className="col-span-2 sm:col-span-1 text-left bg-amber-50 rounded-xl border-2 border-amber-300 px-3.5 py-2.5 flex items-center justify-between gap-2"
          >
            <span className="text-xs font-bold text-amber-900 inline-flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Duyệt Output →
            </span>
          </Link>
        )}
      </div>

      {/* Biệt Đội Mũ Rơm: Tên bên trái + Nhân vật 3D chuyển động bên phải */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            🏴‍☠️ Biệt đội 3D
          </h2>
          <div className="flex items-center gap-3">
            {selectedAssigneeId !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedAssigneeId("ALL")}
                className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
              >
                Hiện cả băng
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowShipDeck((v) => !v)}
              className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 transition cursor-pointer"
            >
              {showShipDeck ? "Thu gọn boong 3D" : "⛵ Boong Sunny 3D"}
            </button>
          </div>
        </div>

        <Pirate3DCrewCardGrid
          cards={crewCards}
          selectedUserId={selectedAssigneeId}
          onSelectMember={handleSelectAssignee}
        />

        {showShipDeck && (
          <Pirate3DCrewStage
            members={crew3DMembers}
            selectedUserId={selectedAssigneeId}
            onSelectMember={handleSelectAssignee}
            heightClassName="h-[265px] sm:h-[305px]"
          />
        )}
      </div>

      {/* Bảng Nhiệm vụ chính */}
      <div
        ref={listSectionRef}
        className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900">
              🧭 Nhiệm vụ toàn băng ({filteredTasks.length})
            </h2>
            {selectedAssigneeName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-0.5 text-xs font-bold">
                {selectedAssigneeName}
                <button
                  type="button"
                  onClick={() => setSelectedAssigneeId("ALL")}
                  className="hover:text-slate-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã, tiêu đề..."
                className="w-full rounded-xl border border-amber-200 pl-9 pr-3 py-1.5 text-xs sm:text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-xl border border-amber-200 px-3 py-1.5 text-xs sm:text-sm bg-white"
            >
              <option value="ALL">Tất cả Hải đồ</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl bg-amber-100/70 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                title="Xem dạng bảng gọn"
                className={`rounded-lg p-1.5 cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                title="Xem dạng thẻ"
                className={`rounded-lg p-1.5 cursor-pointer ${
                  viewMode === "GRID"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "OPEN" as const, label: "⛵ Đang ra khơi" },
              { id: "WAITING" as const, label: `👀 Chờ duyệt (${waitingReviewCount})` },
              { id: "OVERDUE" as const, label: `🌊 Quá hạn (${overdueTasks.length})` },
              { id: "OUTSIDE" as const, label: `📋 Ngoài team (${outsideDeptCount})` },
              { id: "ALL" as const, label: "Tất cả" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuickMode(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  quickMode === tab.id
                    ? "bg-[#0B2545] text-amber-300"
                    : "bg-amber-50 text-slate-700 hover:bg-amber-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {waitingReviewCount > 0 && (
            <Link
              href="/outputs?readiness=NEEDS_REVIEW"
              className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              Mở hàng đợi Duyệt Output ({waitingReviewCount}) →
            </Link>
          )}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Không có nhiệm vụ nào khớp bộ lọc hiện tại.
          </div>
        ) : viewMode === "TABLE" ? (
          <>
          <div className="overflow-x-auto border border-amber-200/80 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200/80 text-[11px] uppercase text-amber-900/70">
                  <th className="py-2.5 px-3">Mã</th>
                  <th className="py-2.5 px-3">Nhiệm vụ</th>
                  <th className="py-2.5 px-3">Hải đồ</th>
                  <th className="py-2.5 px-3">Thuyền viên</th>
                  <th className="py-2.5 px-3">Trạng thái &amp; AI</th>
                  <th className="py-2.5 px-3">Hạn</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {displayedTasks.map((t) => {
                  const overdue = isTaskOverdue(t);
                  const latestAsset = t.assets[0];
                  const savedAi = parseSavedAiQcResult(t.lastAiQcJson);
                  const canApproveRow =
                    t.status === "WAITING_APPROVAL" || t.status === "BRIEF_REVIEW";
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setActiveTaskId(t.id)}
                      className={`hover:bg-amber-50/40 cursor-pointer ${
                        overdue ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-amber-900 whitespace-nowrap">
                        {t.code}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {t.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <PlatformLogo platform={t.platform} size="xs" />
                          <span className="truncate">
                            {TASK_TYPE_META[t.taskType]?.label} •{" "}
                            {t.publishChannel ||
                              getPlatformChannelMeta(t.platform).displayLabel}
                            {t.isMediaOrder
                              ? ` • ${t.quantity} ${t.taskType === "MEDIA_VIDEO" ? "video" : "ảnh"}`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: t.project.color }}
                          />
                          {t.project.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                        <TaskAssigneesBadges
                          task={t}
                          size="sm"
                          emptyLabel="Chưa phân công"
                        />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <TaskStatusBadge status={t.status} />
                          {savedAi && (
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-extrabold ${
                                savedAi.result.score >= 80
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : savedAi.result.score >= 60
                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}
                            >
                              <Bot className="w-2.5 h-2.5" />
                              {savedAi.result.score}đ
                            </span>
                          )}
                          {overdue && (
                            <span className="rounded bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-bold">
                              Trễ
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-2.5 px-3 whitespace-nowrap text-xs ${
                          overdue ? "text-rose-600 font-bold" : "text-slate-500"
                        }`}
                      >
                        {formatVnDateTime(t.dueAt ?? t.scheduledPublishAt)}
                      </td>
                      <td
                        className="py-2.5 px-3 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {canApproveRow && (
                            <button
                              type="button"
                              disabled={quickApprovingId === t.id}
                              onClick={(e) => void handleQuickApproveRow(e, t)}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              {quickApprovingId === t.id ? "..." : "Duyệt"}
                            </button>
                          )}
                          {latestAsset && (
                            <a
                              href={latestAsset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
                            >
                              Mở
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > visibleLimit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((v) => v + 25)}
                className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                Xem thêm (+{Math.min(25, filteredTasks.length - visibleLimit)})
              </button>
              <button
                type="button"
                onClick={() => setVisibleLimit(filteredTasks.length)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Hiện tất cả ({filteredTasks.length})
              </button>
            </div>
          )}
          </>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={(t) => setActiveTaskId(t.id)}
              />
            ))}
          </div>
          {filteredTasks.length > visibleLimit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((v) => v + 25)}
                className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                Xem thêm (+{Math.min(25, filteredTasks.length - visibleLimit)})
              </button>
            </div>
          )}
          </>
        )}
      </div>

      <CreateTaskModal
        key={`leader-create-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        users={users}
        initialCapacity={capacity}
        currentUserId={currentUserId}
        defaultOrderMode="TASK"
        onCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
      />

      <TaskDrawer
        taskId={activeTaskId}
        currentUserRole="LEADER"
        onClose={() => setActiveTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        onDuplicated={(dup) => setTasks((prev) => [dup, ...prev])}
      />
    </div>
  );
}
