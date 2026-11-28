"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import {
  MyWorkActionTray,
  MyWorkDelegatedTracker,
} from "@/components/my-work-action-tray";
import { MyWorkDailyKpiPanel } from "@/components/my-work-daily-kpi-panel";
import { MyWorkMediaOrdersBoard } from "@/components/my-work-media-orders-board";
import { MyWorkTopWidgets } from "@/components/my-work-top-widgets";
import {
  MyWorkExtraAccordions,
  MyWorkInlineCreateForm,
  MyWorkWeekStrip,
} from "@/components/my-work-sections";
import {
  MyWorkTaskRow,
  isCompletedTaskStatus,
} from "@/components/my-work-task-row";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDrawer, type DrawerTab } from "@/components/task-drawer";
import { useToast } from "@/components/toast-provider";
import {
  isMediaProductionUser,
  isTaskOverdue,
  taskRequiresLeaderApproval,
} from "@/lib/constants";
import {
  computeDailyKpiProgress,
  isDailyKpiDayOff,
  type ApprovedLeaveSpan,
  type DailyKpiItem,
  type DailyKpiSummaryResult,
} from "@/lib/daily-kpi";
import { getVnDateString, getVnWeekBounds } from "@/lib/dates";
import {
  formatTaskAssigneesLabel,
  getTaskAssignees,
  isUserAssignedToTask,
} from "@/lib/task-assignees";
import { softDeleteTasksByIds } from "@/lib/task-delete";
import { normalizeSubtasks } from "@/lib/subtasks";
import type { PendingMandatoryCourseSummary } from "@/lib/knowledge-data";
import type {
  BirthdayMemberInfo,
  CapacityItem,
  CheckinItem,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { TaskType, UserRole } from "@/generated/prisma/client";

interface MyWorkViewProps {
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserName: string;
  currentUserAvatarColor?: string;
  currentUserScope?: string;
  currentUserPirateCharacter?: string | null;
  currentUserTone?: string;
  currentUserIcon?: string | null;
  currentUserMotto?: string | null;
  todayDate: string;
  initialCheckin: CheckinItem | null;
  initialTasks: TaskItem[];
  projects: SimpleProject[];
  users: SimpleUser[];
  capacity: CapacityItem[];
  todayBirthdays?: BirthdayMemberInfo[];
  pendingCourses?: PendingMandatoryCourseSummary[];
  initialDailyKpi?: DailyKpiItem[];
  initialDailyKpiIsDefault?: boolean;
  approvedLeaves?: ApprovedLeaveSpan[];
  initialTaskId?: string;
  initialOpenChat?: boolean;
}

const VN_WEEKDAYS_LONG = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

const VN_WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function addDaysYmd(ymd: string, delta: number): string {
  const anchor = new Date(`${ymd}T12:00:00+07:00`);
  anchor.setUTCDate(anchor.getUTCDate() + delta);
  return getVnDateString(anchor);
}

/**
 * Ngày hiển thị trên To-Do List: ưu tiên `plannedDate` (ngày dự kiến làm),
 * sau đó mới tới `dueAt` / `scheduledPublishAt`. Khi dời `plannedDate`, Deadline gốc `dueAt` vẫn giữ nguyên!
 */
function getEffectiveTaskDateStr(t: TaskItem): string | null {
  if (t.plannedDate && /^\d{4}-\d{2}-\d{2}$/.test(t.plannedDate)) {
    return t.plannedDate;
  }
  const done = isCompletedTaskStatus(t.status);
  const ref =
    t.dueAt ??
    t.scheduledPublishAt ??
    (done ? t.completedAt ?? t.createdAt : null);
  return ref ? getVnDateString(new Date(ref)) : null;
}

export function MyWorkView({
  currentUserId,
  currentUserRole,
  currentUserName,
  currentUserAvatarColor = "#2563eb",
  currentUserScope = "CONTENT",
  currentUserPirateCharacter,
  currentUserTone = "PIRATE",
  currentUserIcon,
  currentUserMotto,
  todayDate,
  initialCheckin,
  initialTasks,
  projects,
  users,
  capacity,
  todayBirthdays = [],
  pendingCourses = [],
  initialDailyKpi = [],
  initialDailyKpiIsDefault = true,
  approvedLeaves = [],
  initialTaskId,
  initialOpenChat = false,
}: MyWorkViewProps) {
  const { showToast } = useToast();
  const isMediaProduction = isMediaProductionUser(
    currentUserRole,
    currentUserScope
  );

  const [prevInitialTasks, setPrevInitialTasks] = useState<TaskItem[]>(initialTasks);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  if (prevInitialTasks !== initialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const currentWeekStartStr = useMemo(
    () => getVnWeekBounds(new Date(`${todayDate}T12:00:00+07:00`)).weekStartStr,
    [todayDate]
  );

  const [tab, setTab] = useState<"ASSIGNED" | "REQUESTED">("ASSIGNED");
  const [windowStartStr, setWindowStartStr] = useState<string>(currentWeekStartStr);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const [prevDeepLinkKey, setPrevDeepLinkKey] = useState<string>(
    `${initialTaskId ?? ""}:${initialOpenChat ? "1" : "0"}`
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(
    initialTaskId && initialTasks.some((t) => t.id === initialTaskId)
      ? initialTaskId
      : null
  );
  const [drawerInitialTab, setDrawerInitialTab] = useState<DrawerTab | undefined>(
    initialTaskId && initialOpenChat ? "CHAT" : undefined
  );

  const currentDeepLinkKey = `${initialTaskId ?? ""}:${initialOpenChat ? "1" : "0"}`;
  if (prevDeepLinkKey !== currentDeepLinkKey) {
    setPrevDeepLinkKey(currentDeepLinkKey);
    if (initialTaskId && tasks.some((t) => t.id === initialTaskId)) {
      setActiveTaskId(initialTaskId);
      setDrawerInitialTab(initialOpenChat ? "CHAT" : undefined);
    }
  }

  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [liveCheckinStatus, setLiveCheckinStatus] = useState<
    "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE"
  >(initialCheckin?.status ?? "NONE");
  const [celebrateNonce, setCelebrateNonce] = useState(0);

  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Record<string, boolean>>({});
  const [openSubtaskComposerId, setOpenSubtaskComposerId] = useState<string | null>(null);

  const [dailyKpiTargets, setDailyKpiTargets] =
    useState<DailyKpiItem[]>(initialDailyKpi);
  const [dailyKpiIsDefault, setDailyKpiIsDefault] = useState<boolean>(
    initialDailyKpiIsDefault
  );

  // Ô thêm việc trực tiếp ngay trong từng ngày
  const [inlineAddDayStr, setInlineAddDayStr] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineProjectId, setInlineProjectId] = useState(projects[0]?.id || "");
  const [inlineTime, setInlineTime] = useState("17:30");
  const [inlineTaskType, setInlineTaskType] = useState<TaskType>(
    () => initialDailyKpi[0]?.taskType || "CONTENT_SOCIAL"
  );
  const [inlineQuantity, setInlineQuantity] = useState<number>(1);
  const [creatingInline, setCreatingInline] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [bringingAllOverdue, setBringingAllOverdue] = useState(false);
  const [remindingTaskId, setRemindingTaskId] = useState<string | null>(null);

  // Thu gọn/mở mục phụ ở đáy trang
  const [showBacklog, setShowBacklog] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const assignedToMe = useMemo(
    () => tasks.filter((t) => isUserAssignedToTask(t, currentUserId)),
    [tasks, currentUserId]
  );
  const requestedByMe = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.requester.id === currentUserId &&
          !isUserAssignedToTask(t, currentUserId)
      ),
    [tasks, currentUserId]
  );

  const filteredAssigned = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignedToMe.filter((t) => {
      if (projectFilter !== "ALL" && t.project.id !== projectFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.project.name.toLowerCase().includes(q) ||
        (t.publishChannel || "").toLowerCase().includes(q) ||
        t.requester.name.toLowerCase().includes(q) ||
        normalizeSubtasks(t.subtasksJson).some((s) =>
          s.title.toLowerCase().includes(q)
        )
      );
    });
  }, [assignedToMe, projectFilter, searchQuery]);

  const filteredRequested = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requestedByMe.filter((t) => {
      if (projectFilter !== "ALL" && t.project.id !== projectFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.project.name.toLowerCase().includes(q) ||
        getTaskAssignees(t).some((u) => u.name.toLowerCase().includes(q))
      );
    });
  }, [requestedByMe, projectFilter, searchQuery]);

  const upcomingDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const dateStr = addDaysYmd(windowStartStr, idx);
      const anchor = new Date(`${dateStr}T12:00:00+07:00`);
      const dow = anchor.getUTCDay();
      const dayNum = Number(dateStr.slice(8, 10));
      const monthNum = Number(dateStr.slice(5, 7));
      const tomorrowStr = addDaysYmd(todayDate, 1);
      const rel =
        dateStr === todayDate
          ? "Hôm nay"
          : dateStr === tomorrowStr
            ? "Ngày mai"
            : null;
      return {
        dateStr,
        dayNum,
        monthNum,
        shortDow: VN_WEEKDAYS_SHORT[dow],
        longDow: VN_WEEKDAYS_LONG[dow],
        relLabel: rel,
      };
    });
  }, [windowStartStr, todayDate]);

  // 3 nhóm cho Khung "Việc mới nhận & Cần xử lý" luôn nổi trên đầu tab Việc của tôi
  const { revisionTasks, overdueOrCarryoverTasks, incomingTasks } = useMemo(() => {
    const rev: TaskItem[] = [];
    const ov: TaskItem[] = [];
    const inc: TaskItem[] = [];

    for (const t of filteredAssigned) {
      if (isCompletedTaskStatus(t.status)) continue;

      if (t.status === "REVISION_NEEDED") {
        rev.push(t);
        continue;
      }

      const effectiveYmd = getEffectiveTaskDateStr(t);
      const isPlannedToday = t.plannedDate === todayDate;
      const dueYmd = t.dueAt ? getVnDateString(new Date(t.dueAt)) : null;

      // Việc quá hạn gốc hoặc tồn từ plannedDate trước hôm nay (mà chưa được kéo về Hôm nay)
      if (
        !isPlannedToday &&
        ((dueYmd && dueYmd < todayDate) ||
          (t.plannedDate && t.plannedDate < todayDate))
      ) {
        ov.push(t);
        continue;
      }

      // Việc mới được Leader / đồng đội giao (hoặc Order Media có hạn nhiều ngày tới) hoặc việc chưa đặt ngày
      if (effectiveYmd !== todayDate) {
        const isDelegatedOrOrder =
          t.requester.id !== currentUserId || t.isMediaOrder;
        const isUnscheduled = !effectiveYmd;
        if (isUnscheduled || isDelegatedOrOrder) {
          inc.push(t);
        }
      }
    }

    const byDueAsc = (a: TaskItem, b: TaskItem) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    };
    ov.sort(byDueAsc);
    inc.sort(byDueAsc);

    return {
      revisionTasks: rev,
      overdueOrCarryoverTasks: ov,
      incomingTasks: inc,
    };
  }, [filteredAssigned, todayDate, currentUserId]);

  const { dayBuckets, attentionTasks, futureTasks, completedTasks } = useMemo(() => {
    const windowSet = new Set(upcomingDays.map((d) => d.dateStr));
    const windowEndStr = upcomingDays[upcomingDays.length - 1]?.dateStr || todayDate;
    const buckets = new Map<string, TaskItem[]>();
    for (const d of upcomingDays) {
      buckets.set(d.dateStr, []);
    }

    const attention: TaskItem[] = [];
    const future: TaskItem[] = [];
    const completed: TaskItem[] = [];

    for (const t of filteredAssigned) {
      const done = isCompletedTaskStatus(t.status);
      const ymd = getEffectiveTaskDateStr(t);

      if (!ymd) {
        if (done) completed.push(t);
        else attention.push(t);
        continue;
      }

      if (windowSet.has(ymd)) {
        buckets.get(ymd)?.push(t);
        continue;
      }

      if (done) {
        completed.push(t);
        continue;
      }

      if (ymd < upcomingDays[0].dateStr || isTaskOverdue(t)) {
        attention.push(t);
      } else if (ymd > windowEndStr) {
        future.push(t);
      } else {
        attention.push(t);
      }
    }

    for (const [key, list] of buckets.entries()) {
      list.sort((a, b) => {
        const aDone = isCompletedTaskStatus(a.status) ? 1 : 0;
        const bDone = isCompletedTaskStatus(b.status) ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const aRev = a.status === "REVISION_NEEDED" ? 0 : 1;
        const bRev = b.status === "REVISION_NEEDED" ? 0 : 1;
        if (aRev !== bRev) return aRev - bRev;
        return 0;
      });
      buckets.set(key, list);
    }

    future.sort((a, b) => {
      const aTime = new Date(a.dueAt ?? a.scheduledPublishAt ?? 0).getTime();
      const bTime = new Date(b.dueAt ?? b.scheduledPublishAt ?? 0).getTime();
      return aTime - bTime;
    });

    return {
      dayBuckets: buckets,
      attentionTasks: attention,
      futureTasks: future,
      completedTasks: completed,
    };
  }, [filteredAssigned, upcomingDays, todayDate]);

  // Đo KPI ngày hoàn toàn từ Task thật & Order được giao theo ngày làm thực tế (`plannedDate ?? dueAt`)
  const kpiByDayMap = useMemo(() => {
    const windowSet = new Set(upcomingDays.map((d) => d.dateStr));
    const assignedByDate = new Map<string, TaskItem[]>();
    for (const d of upcomingDays) {
      assignedByDate.set(d.dateStr, []);
    }

    for (const t of assignedToMe) {
      const ymd = getEffectiveTaskDateStr(t);
      if (!ymd) continue;
      if (windowSet.has(ymd)) {
        assignedByDate.get(ymd)?.push(t);
      }
    }

    const result = new Map<string, DailyKpiSummaryResult>();
    for (const d of upcomingDays) {
      result.set(
        d.dateStr,
        computeDailyKpiProgress(dailyKpiTargets, assignedByDate.get(d.dateStr) ?? [])
      );
    }
    return result;
  }, [assignedToMe, upcomingDays, dailyKpiTargets]);

  // Tóm tắt kế hoạch Hôm nay kết nối trực tiếp lên Widget Check-in sáng
  const todayPlanSummary = useMemo(() => {
    const list = isMediaProduction
      ? assignedToMe.filter((t) => {
          if (
            t.status === "REVISION_NEEDED" ||
            t.status === "IN_PROGRESS" ||
            t.status === "BRIEF_REVIEW" ||
            t.status === "DRAFT" ||
            t.status === "WAITING_APPROVAL"
          ) {
            return true;
          }
          const completedYmd = t.completedAt
            ? getVnDateString(new Date(t.completedAt))
            : null;
          return completedYmd === todayDate;
        })
      : assignedToMe.filter((t) => getEffectiveTaskDateStr(t) === todayDate);
    let inProgress = 0;
    let waitingApproval = 0;
    let done = 0;
    const titles: string[] = [];
    for (const t of list) {
      if (isCompletedTaskStatus(t.status) || t.status === "APPROVED_FINAL") {
        done += 1;
      } else if (t.status === "WAITING_APPROVAL") {
        waitingApproval += 1;
      } else {
        inProgress += 1;
        titles.push(t.title);
      }
    }
    return {
      total: list.length,
      inProgress,
      waitingApproval,
      done,
      titles,
    };
  }, [assignedToMe, isMediaProduction, todayDate]);

  function openTaskDrawer(taskId: string, openChat = false, tabOverride?: DrawerTab) {
    setDrawerInitialTab(tabOverride ?? (openChat ? "CHAT" : undefined));
    setActiveTaskId(taskId);
  }

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTaskId((cur) => (cur === taskId ? null : cur));
  }

  async function handleConfirmQuickDelete() {
    if (!deleteConfirmTask) return;
    setDeletingTask(true);
    try {
      const { deletedIds, failedCount } = await softDeleteTasksByIds([
        deleteConfirmTask.id,
      ]);
      if (deletedIds.length > 0) {
        setTasks((prev) => prev.filter((t) => !deletedIds.includes(t.id)));
        setActiveTaskId((cur) => (cur && deletedIds.includes(cur) ? null : cur));
        setDeleteConfirmTask(null);
        window.dispatchEvent(new Event("reviews-count-updated"));
      } else if (failedCount > 0) {
        showToast("Không thể xóa đầu việc này. Vui lòng thử lại.", "error");
      }
    } finally {
      setDeletingTask(false);
    }
  }

  function isTaskExpanded(task: TaskItem): boolean {
    if (task.id in collapsedTaskIds) {
      return !collapsedTaskIds[task.id];
    }
    return normalizeSubtasks(task.subtasksJson).length > 0;
  }

  function toggleTaskExpand(task: TaskItem) {
    const current = isTaskExpanded(task);
    setCollapsedTaskIds((prev) => ({ ...prev, [task.id]: current }));
  }

  async function handleToggleTaskDone(task: TaskItem) {
    const done = isCompletedTaskStatus(task.status);
    setTogglingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          done ? { status: "IN_PROGRESS" } : { action: "MARK_DONE" }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được trạng thái.", "error");
        return;
      }
      handleTaskUpdated(data.task);
      window.dispatchEvent(new Event("reviews-count-updated"));
      if (!done) {
        setCelebrateNonce((n) => n + 1);
        showToast(`Đã hoàn thành "${task.title}"!`);
      }
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setTogglingTaskId(null);
    }
  }

  async function handleMarkPublished(task: TaskItem) {
    setTogglingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_PUBLISHED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể đánh dấu Đã đăng.", "error");
        return;
      }
      handleTaskUpdated(data.task);
      window.dispatchEvent(new Event("reviews-count-updated"));
      setCelebrateNonce((n) => n + 1);
      showToast(`🚀 Đã đánh dấu "${task.title}" Đã lên sóng!`);
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setTogglingTaskId(null);
    }
  }

  async function handleSubmitForReview(task: TaskItem) {
    // Nếu là bài Content / Ảnh / Video mà chưa có link thành phẩm (DEMO/FINAL) hoặc Caption -> mở thẳng tab Output để nộp
    const isMediaTask =
      task.isMediaOrder ||
      task.taskType === "MEDIA_IMAGE" ||
      task.taskType === "MEDIA_VIDEO";
    const hasDeliverableAsset = (task.assets ?? []).some(
      (a) => a.kind === "DEMO" || a.kind === "FINAL" || a.kind === "PUBLISHED_LINK"
    );
    const hasOutput = isMediaTask
      ? hasDeliverableAsset
      : Boolean((task.caption || "").trim()) || (task.assets?.length ?? 0) > 0;
    if (taskRequiresLeaderApproval(task) && !hasOutput) {
      openTaskDrawer(task.id, false, "OUTPUT_QC");
      showToast(
        isMediaTask
          ? "Hãy dán link file thành phẩm (Demo / Final) ở tab Output trước khi gửi Leader duyệt nhé!"
          : "Hãy dán link sản phẩm hoặc viết nội dung ở tab Output trước khi gửi Leader duyệt nhé!",
        "info"
      );
      return;
    }

    setTogglingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_FOR_REVIEW" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không gửi duyệt được.", "error");
        return;
      }
      handleTaskUpdated(data.task);
      window.dispatchEvent(new Event("reviews-count-updated"));
      setCelebrateNonce((n) => n + 1);
      showToast(`Đã gửi "${task.title}" lên hàng đợi Leader duyệt QC!`);
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setTogglingTaskId(null);
    }
  }

  async function handlePlanTaskForDate(
    task: TaskItem,
    targetDateStr: string,
    toastMessage: string
  ) {
    setTogglingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedDate: targetDateStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không xếp lịch làm được.", "error");
        return;
      }
      handleTaskUpdated(data.task);
      showToast(toastMessage);
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setTogglingTaskId(null);
    }
  }

  async function handleBringAllOverdueToToday() {
    if (overdueOrCarryoverTasks.length === 0) return;
    setBringingAllOverdue(true);
    try {
      const updatedTasks = await Promise.all(
        overdueOrCarryoverTasks.map(async (t) => {
          const res = await fetch(`/api/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plannedDate: todayDate }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return (data.task as TaskItem) ?? null;
        })
      );
      const valid = updatedTasks.filter((t): t is TaskItem => Boolean(t));
      if (valid.length > 0) {
        const byId = new Map(valid.map((t) => [t.id, t]));
        setTasks((prev) => prev.map((t) => byId.get(t.id) ?? t));
        setWindowStartStr(currentWeekStartStr);
        setSelectedDateStr(todayDate);
        showToast(
          `Đã đưa ${valid.length} việc tồn vào kế hoạch làm Hôm nay (vẫn giữ nguyên Deadline gốc)!`
        );
      }
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setBringingAllOverdue(false);
    }
  }

  async function handleRemindDelegatedTask(task: TaskItem) {
    setRemindingTaskId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}/remind`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không gửi được nhắc nhở.", "error");
        return;
      }
      showToast(
        `Đã gửi thông báo nhắc tiến độ tới ${formatTaskAssigneesLabel(task, "người thực hiện")}!`
      );
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setRemindingTaskId(null);
    }
  }

  async function handleInlineCreateTask(
    e: React.FormEvent,
    targetDateStr: string
  ) {
    e.preventDefault();
    const cleaned = inlineTitle.trim();
    const targetProjectId = inlineProjectId || projects[0]?.id;
    if (!cleaned || !targetProjectId) {
      showToast("Vui lòng nhập tên đầu việc và chọn dự án.", "error");
      return;
    }

    setCreatingInline(true);
    try {
      const dueIso = new Date(
        `${targetDateStr}T${inlineTime || "17:30"}:00+07:00`
      ).toISOString();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          title: cleaned,
          assigneeId: currentUserId,
          dueAt: dueIso,
          plannedDate: targetDateStr,
          taskType: inlineTaskType,
          quantity: Math.max(1, Number(inlineQuantity || 1)),
          status: "IN_PROGRESS",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được công việc.", "error");
        return;
      }
      setTasks((prev) => [data.task, ...prev]);
      setInlineTitle("");
      setInlineQuantity(1);
      setInlineAddDayStr(null);
      showToast("Đã thêm công việc mới vào To-Do List!");
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setCreatingInline(false);
    }
  }

  const selectedDay =
    upcomingDays.find((d) => d.dateStr === selectedDateStr) ?? upcomingDays[0];
  const headerYear = Number((selectedDay?.dateStr || selectedDateStr).slice(0, 4));
  const headerMonth = Number((selectedDay?.dateStr || selectedDateStr).slice(5, 7));
  const tomorrowStr = addDaysYmd(todayDate, 1);

  function renderTaskHierarchyRow(
    t: TaskItem,
    options?: { allowMoveToday?: boolean; allowMoveTomorrow?: boolean }
  ) {
    const expanded = isTaskExpanded(t) || openSubtaskComposerId === t.id;
    return (
      <MyWorkTaskRow
        key={t.id}
        task={t}
        users={users}
        todayDate={todayDate}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isRequestedTab={tab === "REQUESTED"}
        expanded={expanded}
        openSubtaskComposerId={openSubtaskComposerId}
        togglingTaskId={togglingTaskId}
        allowMoveToday={options?.allowMoveToday}
        allowMoveTomorrow={options?.allowMoveTomorrow}
        onToggleExpand={toggleTaskExpand}
        onToggleDone={handleToggleTaskDone}
        onMarkPublished={handleMarkPublished}
        onSubmitForReview={handleSubmitForReview}
        onOpenTask={(id, openChat) => openTaskDrawer(id, Boolean(openChat))}
        onOpenSubtaskComposer={(target) => {
          setCollapsedTaskIds((prev) => ({ ...prev, [target.id]: false }));
          setOpenSubtaskComposerId((cur) =>
            cur === target.id ? null : target.id
          );
        }}
        onComposerOpenChange={(id, open) =>
          setOpenSubtaskComposerId(open ? id : null)
        }
        onMoveToday={(target) =>
          void handlePlanTaskForDate(
            target,
            todayDate,
            "Đã đưa vào kế hoạch làm Hôm nay (vẫn giữ nguyên Deadline gốc)!"
          )
        }
        onMoveTomorrow={(target) =>
          void handlePlanTaskForDate(
            target,
            tomorrowStr,
            "Đã chuyển kế hoạch làm sang Ngày mai (không đổi Deadline gốc)!"
          )
        }
        onRequestDelete={setDeleteConfirmTask}
        onTaskUpdated={handleTaskUpdated}
      />
    );
  }

  return (
    <div className="space-y-5">
      <MyWorkTopWidgets
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatarColor={currentUserAvatarColor}
        currentUserScope={currentUserScope}
        currentUserPirateCharacter={currentUserPirateCharacter}
        currentUserTone={currentUserTone}
        currentUserIcon={currentUserIcon}
        currentUserMotto={currentUserMotto}
        todayDate={todayDate}
        initialCheckin={initialCheckin}
        todayPlanSummary={todayPlanSummary}
        liveCheckinStatus={liveCheckinStatus}
        celebrateNonce={celebrateNonce}
        projects={projects}
        todayBirthdays={todayBirthdays}
        pendingCourses={pendingCourses}
        hideCreateButton={isMediaProduction}
        onOpenCreate={() => setCreateOpen(true)}
        onCheckinStatusChange={(st) => {
          setLiveCheckinStatus(st);
          setCelebrateNonce((n) => n + 1);
        }}
      />

      {/* NHẬT KÝ HẢI TRÌNH */}
      {isMediaProduction ? (
        <MyWorkMediaOrdersBoard
          tasks={assignedToMe}
          currentUserScope={currentUserScope}
          todayDate={todayDate}
          togglingTaskId={togglingTaskId}
          onOpenTask={openTaskDrawer}
          onSubmitForReview={(task) => void handleSubmitForReview(task)}
          onToggleDone={(task) => void handleToggleTaskDone(task)}
        />
      ) : (
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 sm:p-6 space-y-5">
        {/* Thanh đầu trang Nhật Ký */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Nhật Ký Hải Trình
            </h2>
            {tab === "ASSIGNED" && (
              <span className="text-xs sm:text-sm font-bold text-slate-500">
                Tháng {headerMonth} {headerYear}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-amber-50 p-0.5 border border-amber-200">
              <button
                type="button"
                onClick={() => setTab("ASSIGNED")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  tab === "ASSIGNED"
                    ? "bg-[#0B2545] text-amber-300"
                    : "text-slate-700 hover:bg-amber-100"
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                Việc của tôi (
                {assignedToMe.filter((t) => !isCompletedTaskStatus(t.status)).length})
              </button>
              <button
                type="button"
                onClick={() => setTab("REQUESTED")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  tab === "REQUESTED"
                    ? "bg-[#0B2545] text-amber-300"
                    : "text-slate-700 hover:bg-amber-100"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Đã giao / Order (
                {requestedByMe.filter((t) => !isCompletedTaskStatus(t.status)).length})
              </button>
            </div>

            {tab === "ASSIGNED" && (
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setWindowStartStr((prev) => addDaysYmd(prev, -7));
                    setSelectedDateStr((prev) => addDaysYmd(prev, -7));
                    setInlineAddDayStr(null);
                  }}
                  className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Tuần trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWindowStartStr(currentWeekStartStr);
                    setSelectedDateStr(todayDate);
                    setInlineAddDayStr(null);
                  }}
                  className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 border-x border-slate-200 cursor-pointer"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWindowStartStr((prev) => addDaysYmd(prev, 7));
                    setSelectedDateStr((prev) => addDaysYmd(prev, 7));
                    setInlineAddDayStr(null);
                  }}
                  className="p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Tuần sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bộ lọc tìm kiếm nhanh theo từ khóa & dự án */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên việc, mã task, người giao, kênh đăng, hoặc đầu việc nhỏ..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                title="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-amber-400 focus:outline-none px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tất cả dự án ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {(searchQuery.trim() !== "" || projectFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setProjectFilter("ALL");
              }}
              className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>
                Đang lọc (
                {tab === "ASSIGNED"
                  ? filteredAssigned.length
                  : filteredRequested.length}
                )
              </span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {tab === "REQUESTED" ? (
          <MyWorkDelegatedTracker
            tasks={filteredRequested}
            todayDate={todayDate}
            remindingTaskId={remindingTaskId}
            onRemindTask={(t) => void handleRemindDelegatedTask(t)}
            onOpenTask={(id, openChat) => openTaskDrawer(id, Boolean(openChat))}
          />
        ) : (
          <>
            {/* KHUNG NỔI: Việc mới nhận / Order sắp tới / Bài cần sửa / Việc tồn */}
            <MyWorkActionTray
              todayDate={todayDate}
              currentUserId={currentUserId}
              revisionTasks={revisionTasks}
              overdueOrCarryoverTasks={overdueOrCarryoverTasks}
              incomingTasks={incomingTasks}
              busyTaskId={togglingTaskId}
              bringingAll={bringingAllOverdue}
              onPlanForToday={(t) => {
                void handlePlanTaskForDate(
                  t,
                  todayDate,
                  "Đã đưa vào kế hoạch làm Hôm nay (giữ nguyên Deadline gốc)!"
                );
                setWindowStartStr(currentWeekStartStr);
                setSelectedDateStr(todayDate);
              }}
              onBringAllOverdueToToday={() => void handleBringAllOverdueToToday()}
              onOpenTask={(id, openChat) => openTaskDrawer(id, Boolean(openChat))}
            />

            {/* Thanh ngang 7 ngày trong tuần (T2 → CN) */}
            <MyWorkWeekStrip
              upcomingDays={upcomingDays}
              dayBuckets={dayBuckets}
              kpiByDayMap={kpiByDayMap}
              approvedLeaves={approvedLeaves}
              todayDate={todayDate}
              selectedDateStr={selectedDay?.dateStr ?? selectedDateStr}
              onSelectDate={(dateStr) => {
                setSelectedDateStr(dateStr);
                setInlineAddDayStr(null);
              }}
            />

            {/* Danh sách To-do trong 1 NGÀY đang chọn + Thanh KPI đo từ Task thật */}
            {selectedDay &&
              (() => {
                const day = selectedDay;
                const dayTasks = dayBuckets.get(day.dateStr) ?? [];
                const dayKpi = kpiByDayMap.get(day.dateStr);
                const selectedDayOff = isDailyKpiDayOff(day.dateStr, approvedLeaves);
                const isAddingHere = inlineAddDayStr === day.dateStr;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-extrabold ${
                            day.dateStr === todayDate
                              ? "text-rose-600"
                              : "text-slate-900"
                          }`}
                        >
                          {day.dayNum} Th{day.monthNum}
                        </span>
                        {day.relLabel && (
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            {day.relLabel}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-400">
                          • {day.longDow}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {dayTasks.length} công việc
                      </span>
                    </div>

                    {dayKpi && (
                      <MyWorkDailyKpiPanel
                        dayLabel={`${day.dayNum}/${day.monthNum} (${day.shortDow})`}
                        dayOffReason={selectedDayOff.reason}
                        projects={projects}
                        targets={dailyKpiTargets}
                        isDefaultFallback={dailyKpiIsDefault}
                        kpiSummary={dayKpi}
                        canCreateTasks={projects.length > 0}
                        onQuickPrefillRow={(taskType, remainingQty, title, projId) => {
                          setInlineAddDayStr(day.dateStr);
                          setInlineTaskType(taskType);
                          setInlineQuantity(remainingQty);
                          setInlineTitle(title);
                          if (projId) {
                            setInlineProjectId(projId);
                          } else if (!inlineProjectId && projects[0]) {
                            setInlineProjectId(projects[0].id);
                          }
                        }}
                        onTargetsSaved={(nextItems, isDefault) => {
                          setDailyKpiTargets(nextItems);
                          setDailyKpiIsDefault(isDefault);
                          if (nextItems[0]) {
                            setInlineTaskType(nextItems[0].taskType);
                          }
                        }}
                      />
                    )}

                    {dayTasks.length > 0 ? (
                      <div>
                        {dayTasks.map((t) =>
                          renderTaskHierarchyRow(t, {
                            allowMoveTomorrow: day.dateStr === todayDate,
                          })
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-xs text-slate-500">
                        {searchQuery.trim() !== "" || projectFilter !== "ALL"
                          ? "Không có công việc khớp bộ lọc trong ngày này."
                          : day.dateStr === todayDate
                            ? "Chưa có việc nào được xếp vào Hôm nay — bạn có thể bấm nút 'Thêm việc cá nhân' ngay bên dưới hoặc chọn 'Làm hôm nay' trong chi tiết đầu việc."
                            : "Chưa có đầu việc nào trong ngày này."}
                      </div>
                    )}

                    {isAddingHere ? (
                      <MyWorkInlineCreateForm
                        targetDateStr={day.dateStr}
                        projects={projects}
                        inlineTitle={inlineTitle}
                        inlineProjectId={inlineProjectId}
                        inlineTaskType={inlineTaskType}
                        inlineQuantity={inlineQuantity}
                        inlineTime={inlineTime}
                        creatingInline={creatingInline}
                        onChangeTitle={setInlineTitle}
                        onChangeProjectId={setInlineProjectId}
                        onChangeTaskType={setInlineTaskType}
                        onChangeQuantity={setInlineQuantity}
                        onChangeTime={setInlineTime}
                        onCancel={() => {
                          setInlineAddDayStr(null);
                          setInlineTitle("");
                          setInlineQuantity(1);
                        }}
                        onSubmit={handleInlineCreateTask}
                      />
                    ) : (
                      projects.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineAddDayStr(day.dateStr);
                            setInlineTitle("");
                            setInlineTaskType(
                              dailyKpiTargets[0]?.taskType || "CONTENT_SOCIAL"
                            );
                            setInlineQuantity(1);
                            if (!inlineProjectId && projects[0]) {
                              setInlineProjectId(projects[0].id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm việc cá nhân vào {day.shortDow} ({day.dayNum}/{day.monthNum})
                        </button>
                      )
                    )}
                  </div>
                );
              })()}

            <MyWorkExtraAccordions
              attentionTasks={attentionTasks}
              futureTasks={futureTasks}
              completedTasks={completedTasks}
              showBacklog={showBacklog}
              showFuture={showFuture}
              showCompleted={showCompleted}
              onToggleBacklog={() => setShowBacklog((v) => !v)}
              onToggleFuture={() => setShowFuture((v) => !v)}
              onToggleCompleted={() => setShowCompleted((v) => !v)}
              renderRow={renderTaskHierarchyRow}
            />
          </>
        )}
      </div>
      )}

      {!isMediaProduction && (
        <CreateTaskModal
          key={`my-work-create-${createOpen ? "open" : "closed"}`}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projects={projects}
          users={users}
          initialCapacity={capacity}
          currentUserId={currentUserId}
          defaultAssigneeId={currentUserId}
          defaultOrderMode="TASK"
          onCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
        />
      )}

      <TaskDrawer
        taskId={activeTaskId}
        currentUserRole={currentUserRole}
        currentUserScope={currentUserScope}
        centeredModal={isMediaProduction}
        initialTab={drawerInitialTab}
        onClose={() => {
          setActiveTaskId(null);
          setDrawerInitialTab(undefined);
        }}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        onDuplicated={(dup) => setTasks((prev) => [dup, ...prev])}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteConfirmTask)}
        itemName={
          deleteConfirmTask
            ? `${deleteConfirmTask.code} — ${deleteConfirmTask.title}`
            : ""
        }
        description="Đầu việc sẽ được chuyển vào Thùng rác và có thể khôi phục bất kỳ lúc nào."
        loading={deletingTask}
        onConfirm={handleConfirmQuickDelete}
        onCancel={() => {
          if (!deletingTask) setDeleteConfirmTask(null);
        }}
      />
    </div>
  );
}
