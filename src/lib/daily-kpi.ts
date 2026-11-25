import { TASK_NATURE_META } from "@/lib/report-grouping";
import { normalizeSubtasks } from "@/lib/subtasks";
import type {
  DepartmentScope,
  EmploymentType,
  TaskType,
  UserRole,
} from "@/generated/prisma/client";

export interface DailyKpiItem {
  id: string;
  title: string;
  taskType: TaskType;
  target: number;
  projectId?: string | null;
}

export interface DailyKpiProgressRow {
  id: string;
  title: string;
  taskType: TaskType;
  unit: string;
  target: number;
  projectId?: string | null;
  plannedQty: number;
  submittedQty: number;
  doneQty: number;
  remainingToPlan: number;
  remainingToDone: number;
  metDone: boolean;
  metPlanned: boolean;
}

export interface DailyKpiSummaryResult {
  breakdown: DailyKpiProgressRow[];
  totalTarget: number;
  totalPlanned: number;
  totalSubmitted: number;
  totalDone: number;
  donePercent: number;
  plannedPercent: number;
  allDoneMet: boolean;
  allPlannedMet: boolean;
  extraTasksCount: number;
}

const VALID_TASK_TYPES = new Set<string>(Object.keys(TASK_NATURE_META));

const COMPLETED_DAILY_STATUSES = new Set<string>([
  "APPROVED_FINAL",
  "PUBLISHED",
  "DONE",
]);

function makeFallbackKpiId(taskType: TaskType, index: number): string {
  return `kpi-${taskType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`;
}

export function normalizeDailyKpiList(raw: unknown): DailyKpiItem[] {
  if (!Array.isArray(raw)) return [];
  const result: DailyKpiItem[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < raw.length; idx += 1) {
    const entry = raw[idx];
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const rawType = String(obj.taskType ?? "").trim();
    const taskType: TaskType = VALID_TASK_TYPES.has(rawType)
      ? (rawType as TaskType)
      : "OTHER";
    const target = Math.floor(Number(obj.target));
    if (!Number.isFinite(target) || target <= 0) continue;

    const meta = TASK_NATURE_META[taskType];
    const titleRaw =
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : typeof obj.label === "string" && obj.label.trim()
          ? obj.label.trim()
          : meta?.label || "Đầu việc KPI";

    let id =
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim().replace(/[^a-zA-Z0-9_-]/g, "")
        : makeFallbackKpiId(taskType, idx);
    while (!id || seenIds.has(id)) {
      id = `${makeFallbackKpiId(taskType, idx)}-${result.length + 1}`;
    }
    seenIds.add(id);

    const projectId =
      typeof obj.projectId === "string" && obj.projectId.trim()
        ? obj.projectId.trim()
        : null;

    result.push({
      id,
      title: titleRaw,
      taskType,
      target: Math.min(999, target),
      ...(projectId ? { projectId } : {}),
    });
  }

  return result;
}

export function buildDailyKpiKey(itemId: string, dateStr: string): string {
  return `kpi:${itemId}:${dateStr}`;
}

export function parseDailyKpiKeyItemId(
  key: string | null | undefined
): string | null {
  if (!key || !key.startsWith("kpi:")) return null;
  const parts = key.split(":");
  return parts.length >= 3 ? parts[1] : null;
}

export function getDefaultDailyKpiTargets(user: {
  departmentScope: DepartmentScope;
  role?: UserRole;
  employmentType?: EmploymentType;
  weeklyImageLimit?: number | null;
  dailyVideoLimit?: number | null;
}): DailyKpiItem[] {
  if (user.dailyVideoLimit && user.dailyVideoLimit > 0) {
    return [
      {
        id: "default-video",
        title: "Quay / Dựng Video",
        taskType: "MEDIA_VIDEO",
        target: user.dailyVideoLimit,
      },
    ];
  }
  if (user.weeklyImageLimit && user.weeklyImageLimit > 0) {
    return [
      {
        id: "default-image",
        title: "Thiết kế Ảnh / Ấn phẩm",
        taskType: "MEDIA_IMAGE",
        target: Math.max(1, Math.round(user.weeklyImageLimit / 5)),
      },
    ];
  }

  const isPartTime = user.employmentType === "PART_TIME";
  switch (user.departmentScope) {
    case "CONTENT":
      return [
        {
          id: "default-fb-post",
          title: "Viết bài Content Facebook",
          taskType: "CONTENT_SOCIAL",
          target: isPartTime ? 1 : 2,
        },
      ];
    case "CONTENT_DESIGN":
      return [
        {
          id: "default-fb-post",
          title: "Viết bài Content Facebook",
          taskType: "CONTENT_SOCIAL",
          target: 2,
        },
        {
          id: "default-design-img",
          title: "Thiết kế ảnh bài đăng",
          taskType: "MEDIA_IMAGE",
          target: 2,
        },
      ];
    case "CONTENT_EDIT":
      return [
        {
          id: "default-fb-post",
          title: "Viết bài Content Facebook",
          taskType: "CONTENT_SOCIAL",
          target: isPartTime ? 1 : 2,
        },
        {
          id: "default-short-video",
          title: "Kịch bản & Dựng Video ngắn",
          taskType: "MEDIA_VIDEO",
          target: 1,
        },
      ];
    case "MEDIA_DESIGN":
      return [
        {
          id: "default-design-img",
          title: "Thiết kế ấn phẩm / Ảnh",
          taskType: "MEDIA_IMAGE",
          target: 3,
        },
      ];
    case "MEDIA_VIDEO":
      return [
        {
          id: "default-video",
          title: "Quay / Dựng Video",
          taskType: "MEDIA_VIDEO",
          target: 2,
        },
      ];
    case "WEB_ADS":
      return [
        {
          id: "default-web-seo",
          title: "Bài SEO Web & Tối ưu Landing",
          taskType: "CONTENT_WEB",
          target: 1,
        },
        {
          id: "default-ads",
          title: "Kiểm tra & Tối ưu chiến dịch Ads",
          taskType: "ADS_CAMPAIGN",
          target: 1,
        },
      ];
    case "SUPPORT":
      return [
        {
          id: "default-seeding",
          title: "Seeding hội nhóm & Comment",
          taskType: "SEEDING_SUPPORT",
          target: 3,
        },
      ];
    case "LEADER":
    default:
      return [
        {
          id: "default-leader-review",
          title: "Duyệt Output & Kế hoạch Team",
          taskType: "OTHER",
          target: 2,
        },
      ];
  }
}

export function resolveEffectiveDailyKpi(user: {
  departmentScope: DepartmentScope;
  role?: UserRole;
  employmentType?: EmploymentType;
  weeklyImageLimit?: number | null;
  dailyVideoLimit?: number | null;
  dailyKpiJson?: unknown;
}): { items: DailyKpiItem[]; isDefaultFallback: boolean } {
  if (
    user.dailyKpiJson !== null &&
    user.dailyKpiJson !== undefined &&
    Array.isArray(user.dailyKpiJson)
  ) {
    return {
      items: normalizeDailyKpiList(user.dailyKpiJson),
      isDefaultFallback: false,
    };
  }
  return {
    items: getDefaultDailyKpiTargets(user),
    isDefaultFallback: true,
  };
}

function getTaskContributionCounts(task: {
  quantity?: number | null;
  status: string;
  subtasksJson?: unknown;
}): { planned: number; submitted: number; done: number } {
  const qty = Math.max(1, Number(task.quantity || 1));
  if (COMPLETED_DAILY_STATUSES.has(task.status)) {
    return { planned: qty, submitted: 0, done: qty };
  }
  if (task.status === "WAITING_APPROVAL") {
    return { planned: qty, submitted: qty, done: 0 };
  }
  const subtasks = normalizeSubtasks(task.subtasksJson);
  if (subtasks.length > 0 && qty > 1) {
    const doneSubCount = subtasks.filter((s) => s.done).length;
    const partialDone = Math.min(
      qty,
      Math.round((doneSubCount / subtasks.length) * qty)
    );
    return { planned: qty, submitted: 0, done: partialDone };
  }
  return { planned: qty, submitted: 0, done: 0 };
}

export function computeDailyKpiProgress(
  targets: DailyKpiItem[],
  dayTasks: Array<{
    title?: string | null;
    taskType: TaskType;
    quantity?: number | null;
    status: string;
    dailyKpiKey?: string | null;
    subtasksJson?: unknown;
  }>
): DailyKpiSummaryResult {
  const tally = new Map<
    string,
    { planned: number; submitted: number; done: number }
  >();
  for (const item of targets) {
    tally.set(item.id, { planned: 0, submitted: 0, done: 0 });
  }

  let extraTasksCount = 0;

  for (const task of dayTasks) {
    const counts = getTaskContributionCounts(task);
    const taggedItemId = parseDailyKpiKeyItemId(task.dailyKpiKey);
    if (taggedItemId && tally.has(taggedItemId)) {
      const slot = tally.get(taggedItemId)!;
      slot.planned += counts.planned;
      slot.submitted += counts.submitted;
      slot.done += counts.done;
      continue;
    }

    const titleLower = String(task.title || "").trim().toLowerCase();
    const sameTitleItem = targets.find(
      (item) =>
        item.title.trim().length > 0 &&
        titleLower.includes(item.title.trim().toLowerCase())
    );
    if (sameTitleItem) {
      const slot = tally.get(sameTitleItem.id)!;
      slot.planned += counts.planned;
      slot.submitted += counts.submitted;
      slot.done += counts.done;
      continue;
    }

    const sameTypeCandidates = targets.filter(
      (item) => item.taskType === task.taskType
    );
    if (sameTypeCandidates.length > 0) {
      const unfilled =
        sameTypeCandidates.find((item) => {
          const cur = tally.get(item.id)!;
          return cur.planned < item.target;
        }) ?? sameTypeCandidates[0];
      const slot = tally.get(unfilled.id)!;
      slot.planned += counts.planned;
      slot.submitted += counts.submitted;
      slot.done += counts.done;
      continue;
    }

    extraTasksCount += 1;
  }

  let totalTarget = 0;
  let totalPlanned = 0;
  let totalSubmitted = 0;
  let totalDone = 0;

  const breakdown: DailyKpiProgressRow[] = targets.map((item) => {
    const meta = TASK_NATURE_META[item.taskType] ?? {
      label: "Công việc khác",
      unit: "việc",
    };
    const counts = tally.get(item.id) ?? { planned: 0, submitted: 0, done: 0 };
    totalTarget += item.target;
    totalPlanned += Math.min(item.target, counts.planned);
    totalDone += Math.min(item.target, counts.done);
    totalSubmitted += Math.min(
      Math.max(0, item.target - counts.done),
      counts.submitted
    );

    return {
      id: item.id,
      title: item.title,
      taskType: item.taskType,
      unit: meta.unit,
      target: item.target,
      projectId: item.projectId ?? null,
      plannedQty: counts.planned,
      submittedQty: counts.submitted,
      doneQty: counts.done,
      remainingToPlan: Math.max(0, item.target - counts.planned),
      remainingToDone: Math.max(0, item.target - counts.done),
      metDone: counts.done >= item.target,
      metPlanned: counts.planned >= item.target,
    };
  });

  const donePercent =
    totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;
  const plannedPercent =
    totalTarget > 0
      ? Math.min(100, Math.round((totalPlanned / totalTarget) * 100))
      : 0;

  return {
    breakdown,
    totalTarget,
    totalPlanned,
    totalSubmitted,
    totalDone,
    donePercent,
    plannedPercent,
    allDoneMet: totalTarget > 0 && breakdown.every((r) => r.metDone),
    allPlannedMet: totalTarget > 0 && breakdown.every((r) => r.metPlanned),
    extraTasksCount,
  };
}

export interface ApprovedLeaveSpan {
  startDate: string;
  endDate: string;
  leaveType: string;
}

/**
 * Kiểm tra một ngày YYYY-MM-DD có phải Chủ Nhật hoặc ngày nghỉ phép đã duyệt cả ngày hay không.
 * (Nghỉ WFH / REMOTE vẫn tính là ngày làm việc bình thường.)
 */
export function isDailyKpiDayOff(
  dateStr: string,
  approvedLeaves: ApprovedLeaveSpan[] = []
): { isOff: boolean; reason: "SUNDAY" | "LEAVE" | null } {
  const anchor = new Date(`${dateStr}T12:00:00+07:00`);
  if (!Number.isNaN(anchor.getTime()) && anchor.getUTCDay() === 0) {
    return { isOff: true, reason: "SUNDAY" };
  }
  const hasFullLeave = approvedLeaves.some(
    (l) =>
      l.leaveType !== "REMOTE" &&
      l.leaveType !== "HALF_MORNING" &&
      l.leaveType !== "HALF_AFTERNOON" &&
      l.startDate <= dateStr &&
      l.endDate >= dateStr
  );
  if (hasFullLeave) {
    return { isOff: true, reason: "LEAVE" };
  }
  return { isOff: false, reason: null };
}

/**
 * Đếm số ngày làm việc chuẩn (Thứ 2 → Thứ 6, trừ ngày nghỉ phép đã duyệt) trong khoảng startDateStr..endDateStr.
 */
export function countKpiWorkingDays(
  startDateStr: string,
  endDateStr: string,
  approvedLeaves: ApprovedLeaveSpan[] = []
): number {
  const cur = new Date(`${startDateStr}T12:00:00+07:00`);
  const end = new Date(`${endDateStr}T12:00:00+07:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return 0;

  let count = 0;
  let guard = 0;
  while (cur <= end && guard < 62) {
    guard += 1;
    const dow = cur.getUTCDay();
    const ymd = cur.toISOString().slice(0, 10);
    if (dow >= 1 && dow <= 5) {
      const hasFullLeave = approvedLeaves.some(
        (l) =>
          l.leaveType !== "REMOTE" &&
          l.leaveType !== "HALF_MORNING" &&
          l.leaveType !== "HALF_AFTERNOON" &&
          l.startDate <= ymd &&
          l.endDate >= ymd
      );
      if (!hasFullLeave) {
        const hasHalfLeave = approvedLeaves.some(
          (l) =>
            (l.leaveType === "HALF_MORNING" || l.leaveType === "HALF_AFTERNOON") &&
            l.startDate <= ymd &&
            l.endDate >= ymd
        );
        count += hasHalfLeave ? 0.5 : 1;
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export function summarizeDailyKpiText(items: DailyKpiItem[]): string {
  if (items.length === 0) return "Chưa đặt KPI/ngày";
  return items
    .map((item) => {
      const meta = TASK_NATURE_META[item.taskType];
      const unit = meta?.unit || "việc";
      return `${item.target} ${unit} • ${item.title}`;
    })
    .join(" | ");
}
