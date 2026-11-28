const VN_TZ = "Asia/Ho_Chi_Minh";

/** Trả về chuỗi YYYY-MM-DD theo múi giờ Việt Nam (UTC+7). */
export function getVnDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** Trả về chuỗi HH:mm (24h) theo múi giờ Việt Nam (UTC+7). */
export function getVnTimeString(
  date: Date | string | null | undefined,
  fallback = "09:00"
): string {
  if (!date) return fallback;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const rawHour = parts.find((p) => p.type === "hour")?.value ?? "09";
  const hour = rawHour === "24" ? "00" : rawHour;
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Trả về giờ (0-23), phút (0-59) và thứ trong tuần (0=CN..6=T7) theo giờ VN. */
export function getVnClock(date: Date = new Date()) {
  const vnString = date.toLocaleString("en-US", { timeZone: VN_TZ });
  const vnDate = new Date(vnString);
  return {
    hour: vnDate.getHours(),
    minute: vnDate.getMinutes(),
    dayOfWeek: vnDate.getDay(), // 0 = Sun, 5 = Fri, 6 = Sat
    dateStr: getVnDateString(date),
  };
}

/** Trả về khoảng thời gian đầu ngày -> cuối ngày (UTC) tương ứng 1 ngày tại VN. */
export function getVnDayBounds(dateInput: Date | string = new Date()): {
  start: Date;
  end: Date;
  dateStr: string;
} {
  const dateStr =
    typeof dateInput === "string" ? dateInput.slice(0, 10) : getVnDateString(dateInput);
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start, end, dateStr };
}

/** Trả về Thứ 2 đầu tuần và Chủ Nhật cuối tuần (theo giờ VN). */
export function getVnWeekBounds(refDate: Date = new Date()): {
  weekStart: Date;
  weekEnd: Date;
  weekStartStr: string;
  weekEndStr: string;
} {
  const dateStr = getVnDateString(refDate);
  const anchor = new Date(`${dateStr}T12:00:00+07:00`);
  const day = anchor.getUTCDay(); // close enough since anchored at 12:00+07:00 = 05:00 UTC same day
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() + diffToMonday);
  const mondayStr = getVnDateString(monday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const sundayStr = getVnDateString(sunday);

  return {
    weekStart: new Date(`${mondayStr}T00:00:00+07:00`),
    weekEnd: new Date(`${sundayStr}T23:59:59.999+07:00`),
    weekStartStr: mondayStr,
    weekEndStr: sundayStr,
  };
}

/** Kiểm tra đơn đặt gấp theo quy định: nội bộ < 48h, phòng ban ngoài < 7 ngày. */
export function evaluateOrderTiming(
  dueAt: Date | null | undefined,
  isOutsideDepartment: boolean
): {
  isRushOrder: boolean;
  fallsOnWeekend: boolean;
  warningMessage: string | null;
} {
  if (!dueAt) {
    return { isRushOrder: false, fallsOnWeekend: false, warningMessage: null };
  }

  const now = new Date();
  const diffHours = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const requiredHours = isOutsideDepartment ? 7 * 24 : 48;
  const isRushOrder = diffHours < requiredHours;

  const { dayOfWeek } = getVnClock(dueAt);
  const fallsOnWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const reasons: string[] = [];
  if (isRushOrder) {
    reasons.push(
      isOutsideDepartment
        ? "Order phòng ban ngoài đặt gấp dưới 7 ngày"
        : "Order nội bộ đặt gấp dưới 2 ngày (48h)"
    );
  }
  if (fallsOnWeekend) {
    reasons.push("Deadline rơi vào cuối tuần (T7/CN - Media nghỉ)");
  }

  return {
    isRushOrder,
    fallsOnWeekend,
    warningMessage: reasons.length > 0 ? reasons.join(" • ") : null,
  };
}

export function formatVnDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Chưa đặt";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatVnDate(date: Date | string | null | undefined): string {
  if (!date) return "Chưa đặt";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Chuyển Date sang chuỗi YYYY-MM-DDTHH:mm theo giờ VN để gắn vào input datetime-local. */
export function toVnDateTimeLocalValue(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hr = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hr}:${get("minute")}`;
}

export function getPresetDateTimeLocal(
  daysOffset: number,
  hour: number,
  minute = 0
): string {
  const now = new Date();
  const target = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const dateStr = getVnDateString(target);
  return `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getVnMonthKey(date: Date = new Date()): string {
  return getVnDateString(date).slice(0, 7);
}

export function getVnMonthBounds(monthKey?: string): {
  monthKey: string;
  monthStart: Date;
  monthEnd: Date;
  monthStartStr: string;
  monthEndStr: string;
} {
  const safeKey =
    monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : getVnMonthKey();
  const [yStr, mStr] = safeKey.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1..12
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStartStr = `${safeKey}-01`;
  const monthEndStr = `${safeKey}-${String(lastDay).padStart(2, "0")}`;
  return {
    monthKey: safeKey,
    monthStart: new Date(`${monthStartStr}T00:00:00+07:00`),
    monthEnd: new Date(`${monthEndStr}T23:59:59.999+07:00`),
    monthStartStr,
    monthEndStr,
  };
}

export function getVnWeekBoundsFromStart(weekStartStr: string) {
  const anchor = new Date(`${weekStartStr.slice(0, 10)}T12:00:00+07:00`);
  return getVnWeekBounds(anchor);
}

export function shiftVnWeekStart(weekStartStr: string, deltaWeeks: number): string {
  const anchor = new Date(`${weekStartStr.slice(0, 10)}T12:00:00+07:00`);
  anchor.setUTCDate(anchor.getUTCDate() + deltaWeeks * 7);
  return getVnWeekBounds(anchor).weekStartStr;
}

/**
 * Parse chuỗi datetime-local (`YYYY-MM-DDTHH:mm` hoặc `YYYY-MM-DDTHH:mm:ss`) theo múi giờ Việt Nam (+07:00)
 * và trả về ISO string chuẩn UTC, không phụ thuộc múi giờ máy người dùng.
 */
export function parseVnDateTimeLocalToIso(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}+07:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Thay đổi phần ngày (YYYY-MM-DD) nhưng giữ nguyên giờ:phút (HH:mm) theo giờ VN của mốc cũ nếu có.
 */
export function replaceVnDatePreservingTime(
  newDateStr: string | null | undefined,
  existingIso: Date | string | null | undefined,
  fallbackTime = "17:00"
): string | null {
  if (!newDateStr || !newDateStr.trim()) return null;
  const timePart = existingIso
    ? getVnTimeString(existingIso, fallbackTime)
    : fallbackTime;
  const d = new Date(`${newDateStr.trim()}T${timePart}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
