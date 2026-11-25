"use client";

import { useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { EQUIPMENT_CATEGORY_META } from "@/lib/constants";
import {
  formatVnDateTime,
  getVnDateString,
  getVnWeekBounds,
  shiftVnWeekStart,
} from "@/lib/dates";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { useToast } from "@/components/toast-provider";
import type {
  EquipmentBookingItem,
  EquipmentItemType,
  SimpleProject,
} from "@/types/crm";
import type {
  EquipmentCategory,
  EquipmentCondition,
} from "@/generated/prisma/client";

export function EquipmentHubPanel({
  currentUser,
  todayStr,
  initialEquipment,
  initialBookings,
  projects,
}: {
  currentUser: AuthUser;
  todayStr: string;
  initialEquipment: EquipmentItemType[];
  initialBookings: EquipmentBookingItem[];
  projects: SimpleProject[];
}) {
  const { showToast } = useToast();

  const [equipment, setEquipment] =
    useState<EquipmentItemType[]>(initialEquipment);
  const [bookings, setBookings] =
    useState<EquipmentBookingItem[]>(initialBookings);
  const [bookEquipId, setBookEquipId] = useState(
    initialEquipment[0]?.id || ""
  );
  const [bookProjectId, setBookProjectId] = useState(projects[0]?.id || "");
  const [bookPurpose, setBookPurpose] = useState("");
  const [bookStart, setBookStart] = useState(`${todayStr}T09:00`);
  const [bookEnd, setBookEnd] = useState(`${todayStr}T12:00`);
  const [savingBook, setSavingBook] = useState(false);

  // Modal Thêm / Sửa Thiết bị
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipmentItemType | null>(null);
  const [equipName, setEquipName] = useState("");
  const [equipCode, setEquipCode] = useState("");
  const [equipCat, setEquipCat] = useState<EquipmentCategory>("CAMERA");
  const [equipStatus, setEquipStatus] = useState<EquipmentCondition>("AVAILABLE");
  const [equipDesc, setEquipDesc] = useState("");
  const [savingEquip, setSavingEquip] = useState(false);
  const [deleteEquipTarget, setDeleteEquipTarget] =
    useState<EquipmentItemType | null>(null);

  const [nowMs] = useState(() => Date.now());
  const [scheduleWeekStart, setScheduleWeekStart] = useState(
    () => getVnWeekBounds().weekStartStr
  );
  const bookingFormRef = useRef<HTMLFormElement>(null);

  const weekDays = useMemo(() => {
    const startAnchor = new Date(`${scheduleWeekStart}T00:00:00+07:00`);
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return Array.from({ length: 7 }, (_, idx) => {
      const dStart = new Date(startAnchor.getTime() + idx * 24 * 60 * 60 * 1000);
      const dateStr = getVnDateString(dStart);
      const dEnd = new Date(`${dateStr}T23:59:59.999+07:00`);
      return {
        idx,
        dayName: labels[idx],
        dateStr,
        displayDate: `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`,
        startMs: new Date(`${dateStr}T00:00:00+07:00`).getTime(),
        endMs: dEnd.getTime(),
        isToday: dateStr === todayStr,
      };
    });
  }, [scheduleWeekStart, todayStr]);

  function quickPickEquipmentDay(equipmentId: string, dateStr: string) {
    setBookEquipId(equipmentId);
    setBookStart(`${dateStr}T09:00`);
    setBookEnd(`${dateStr}T12:00`);
    bookingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Đã điền sẵn thiết bị & ngày vào biểu mẫu đặt lịch bên dưới!");
  }

  function formatTimeShort(iso: string | Date): string {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  }

  async function handleBookEquipment(e: React.FormEvent) {
    e.preventDefault();
    setSavingBook(true);
    try {
      const res = await fetch("/api/equipment/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: bookEquipId,
          projectId: bookProjectId || null,
          purpose: bookPurpose,
          startAt: new Date(bookStart).toISOString(),
          endAt: new Date(bookEnd).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không đặt được lịch thiết bị.", "error");
        return;
      }
      setBookings((prev) => [data.booking, ...prev]);
      setBookPurpose("");
      showToast("Đã giữ lịch thiết bị thành công!");
    } finally {
      setSavingBook(false);
    }
  }

  async function updateBookingStatus(
    id: string,
    status: "RETURNED" | "CANCELLED"
  ) {
    const res = await fetch("/api/equipment/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
      showToast(
        status === "RETURNED"
          ? "Đã đánh dấu trả thiết bị!"
          : "Đã hủy lịch mượn."
      );
    }
  }

  function openAddEquipmentModal() {
    setEditingEquip(null);
    setEquipName("");
    setEquipCode("");
    setEquipCat("CAMERA");
    setEquipStatus("AVAILABLE");
    setEquipDesc("");
    setEquipModalOpen(true);
  }

  function openEditEquipmentModal(item: EquipmentItemType) {
    setEditingEquip(item);
    setEquipName(item.name);
    setEquipCode(item.code);
    setEquipCat(item.category);
    setEquipStatus(item.status);
    setEquipDesc(item.description || "");
    setEquipModalOpen(true);
  }

  async function handleSaveEquipment(e: React.FormEvent) {
    e.preventDefault();
    setSavingEquip(true);
    try {
      const res = await fetch("/api/equipment", {
        method: editingEquip ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingEquip
            ? {
                id: editingEquip.id,
                name: equipName,
                code: equipCode,
                category: equipCat,
                status: equipStatus,
                description: equipDesc,
              }
            : {
                name: equipName,
                code: equipCode,
                category: equipCat,
                status: equipStatus,
                description: equipDesc,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được thiết bị.", "error");
        return;
      }
      if (editingEquip) {
        setEquipment((prev) =>
          prev.map((eq) => (eq.id === data.item.id ? data.item : eq))
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.equipmentId === data.item.id
              ? { ...b, equipment: data.item }
              : b
          )
        );
        showToast("Đã cập nhật thông tin thiết bị!");
      } else {
        setEquipment((prev) => [...prev, data.item]);
        if (!bookEquipId) setBookEquipId(data.item.id);
        showToast("Đã thêm thiết bị mới!");
      }
      setEquipModalOpen(false);
    } finally {
      setSavingEquip(false);
    }
  }

  async function confirmDeleteEquipment() {
    if (!deleteEquipTarget) return;
    setSavingEquip(true);
    try {
      const res = await fetch(`/api/equipment?id=${deleteEquipTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const nextList = equipment.filter((e) => e.id !== deleteEquipTarget.id);
        setEquipment(nextList);
        setBookings((prev) =>
          prev.filter((b) => b.equipmentId !== deleteEquipTarget.id)
        );
        if (bookEquipId === deleteEquipTarget.id) {
          setBookEquipId(nextList[0]?.id || "");
        }
        setDeleteEquipTarget(null);
        showToast("Đã xóa thiết bị khỏi danh sách.");
      } else {
        showToast("Không xóa được thiết bị.", "error");
      }
    } finally {
      setSavingEquip(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
          📸 Thiết Bị ({equipment.length})
        </h2>
        <button
          type="button"
          onClick={openAddEquipmentModal}
          className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm thiết bị
        </button>
      </div>

      {/* Lưới Tình Trạng Thiết Bị */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {equipment.map((eq) => {
          const cat =
            EQUIPMENT_CATEGORY_META[eq.category] ||
            EQUIPMENT_CATEGORY_META.OTHER;
          const currentBooking = bookings.find(
            (b) =>
              b.equipmentId === eq.id &&
              b.status === "BOOKED" &&
              new Date(b.startAt).getTime() <= nowMs &&
              new Date(b.endAt).getTime() >= nowMs
          );
          const nextBooking = bookings
            .filter(
              (b) =>
                b.equipmentId === eq.id &&
                b.status === "BOOKED" &&
                new Date(b.startAt).getTime() > nowMs
            )
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
            )[0];

          return (
            <div
              key={eq.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between gap-2 shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-slate-400 font-bold">
                        {eq.code}
                      </div>
                      <div className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                        {eq.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0 ${
                      currentBooking
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : eq.status === "MAINTENANCE"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {currentBooking
                      ? "Đang mượn"
                      : eq.status === "MAINTENANCE"
                        ? "Bảo trì"
                        : "Sẵn sàng"}
                  </span>
                </div>

                {eq.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {eq.description}
                  </p>
                )}

                {currentBooking ? (
                  <div className="rounded-lg bg-rose-50/70 border border-rose-200 px-2.5 py-1.5 text-[11px] text-rose-800 truncate">
                    <strong>{currentBooking.user.name}</strong> →{" "}
                    {formatVnDateTime(currentBooking.endAt)}
                  </div>
                ) : nextBooking ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-900 truncate">
                    Kế tiếp: <strong>{nextBooking.user.name}</strong> (
                    {formatVnDateTime(nextBooking.startAt)})
                  </div>
                ) : null}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => quickPickEquipmentDay(eq.id, todayStr)}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Đặt lịch ↓
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditEquipmentModal(eq)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    title="Chỉnh sửa thiết bị"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteEquipTarget(eq)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Xóa thiết bị"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bảng Lịch Tuần / Gantt Trực Quan Theo Từng Máy */}
      <div className="bg-white rounded-2xl border-2 border-blue-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-blue-100 bg-sky-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              📅 Lịch Tuần Thiết Bị Theo Từng Máy ({weekDays[0]?.displayDate} →{" "}
              {weekDays[6]?.displayDate})
            </h2>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
            <button
              type="button"
              onClick={() =>
                setScheduleWeekStart((w) => shiftVnWeekStart(w, -1))
              }
              className="p-1 hover:bg-slate-100 rounded cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setScheduleWeekStart(getVnWeekBounds().weekStartStr)
              }
              className="px-2 hover:text-blue-600 cursor-pointer"
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setScheduleWeekStart((w) => shiftVnWeekStart(w, 1))}
              className="p-1 hover:bg-slate-100 rounded cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Giao diện Mobile dạng thẻ theo từng máy — không cần kéo ngang 900px */}
        <div className="md:hidden divide-y divide-slate-100">
          {equipment.map((eq) => {
            const cat =
              EQUIPMENT_CATEGORY_META[eq.category] ||
              EQUIPMENT_CATEGORY_META.OTHER;
            const weekStartMs = weekDays[0]?.startMs ?? 0;
            const weekEndMs = weekDays[6]?.endMs ?? 0;
            const eqWeekBookings = bookings
              .filter((b) => {
                if (b.equipmentId !== eq.id || b.status === "CANCELLED") {
                  return false;
                }
                const bStart = new Date(b.startAt).getTime();
                const bEnd = new Date(b.endAt).getTime();
                return bStart <= weekEndMs && bEnd >= weekStartMs;
              })
              .sort(
                (a, b) =>
                  new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
              );

            return (
              <div key={eq.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <span>{cat.emoji}</span>
                      <span className="leading-snug">{eq.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {eq.code} •{" "}
                      {eq.status === "MAINTENANCE" ? "Bảo trì" : "Sẵn sàng"}
                    </div>
                  </div>
                  {eq.status !== "MAINTENANCE" && (
                    <button
                      type="button"
                      onClick={() => quickPickEquipmentDay(eq.id, todayStr)}
                      className="rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      + Đặt máy
                    </button>
                  )}
                </div>

                {eqWeekBookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-400">
                    Trống cả tuần này — sẵn sàng đặt mượn.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {eqWeekBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                          b.status === "RETURNED"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-sky-50 border-sky-200 text-sky-950"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">
                            {b.user.name}
                            {b.project ? ` • ${b.project.name}` : ""}
                          </div>
                          <div className="text-[11px] opacity-80 truncate">
                            {formatVnDateTime(b.startAt)} →{" "}
                            {formatTimeShort(b.endAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Giao diện Desktop dạng bảng Gantt 7 ngày */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 text-left w-48 font-bold">
                  Thiết bị
                </th>
                {weekDays.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`py-2.5 px-2 text-center border-l border-slate-200 font-bold ${
                      d.isToday ? "bg-amber-50 text-amber-900" : ""
                    }`}
                  >
                    <div>{d.dayName}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {d.displayDate}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {equipment.map((eq) => {
                const cat =
                  EQUIPMENT_CATEGORY_META[eq.category] ||
                  EQUIPMENT_CATEGORY_META.OTHER;
                return (
                  <tr key={eq.id} className="align-top">
                    <td className="p-2.5 bg-slate-50/70">
                      <div className="flex items-center gap-1.5">
                        <span>{cat.emoji}</span>
                        <span className="font-bold text-slate-900 line-clamp-1">
                          {eq.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {eq.code} •{" "}
                        {eq.status === "MAINTENANCE" ? "Bảo trì" : "Sẵn sàng"}
                      </div>
                    </td>

                    {weekDays.map((d) => {
                      const dayBookings = bookings.filter((b) => {
                        if (
                          b.equipmentId !== eq.id ||
                          b.status === "CANCELLED"
                        ) {
                          return false;
                        }
                        const bStart = new Date(b.startAt).getTime();
                        const bEnd = new Date(b.endAt).getTime();
                        return bStart <= d.endMs && bEnd >= d.startMs;
                      });

                      return (
                        <td
                          key={d.dateStr}
                          className={`p-1.5 border-l border-slate-200 min-w-[115px] ${
                            d.isToday ? "bg-amber-50/30" : "bg-white"
                          }`}
                        >
                          <div className="space-y-1">
                            {dayBookings.map((b) => (
                              <div
                                key={b.id}
                                className={`rounded-lg border px-1.5 py-1 text-[10px] leading-tight ${
                                  b.status === "RETURNED"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-sky-50 border-sky-200 text-sky-900"
                                }`}
                                title={`${b.user.name}: ${b.purpose}`}
                              >
                                <div className="font-bold truncate">
                                  {formatTimeShort(b.startAt)}–
                                  {formatTimeShort(b.endAt)}
                                </div>
                                <div className="truncate font-semibold">
                                  {b.user.name}
                                </div>
                                {b.project && (
                                  <div
                                    className="truncate text-[9px] font-bold"
                                    style={{ color: b.project.color }}
                                  >
                                    • {b.project.name}
                                  </div>
                                )}
                              </div>
                            ))}

                            {eq.status !== "MAINTENANCE" && (
                              <button
                                type="button"
                                onClick={() =>
                                  quickPickEquipmentDay(eq.id, d.dateStr)
                                }
                                className="w-full rounded-md border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 py-1 text-[10px] font-semibold text-slate-400 hover:text-blue-700 cursor-pointer transition"
                              >
                                {dayBookings.length === 0
                                  ? "Trống (+)"
                                  : "+ Thêm ca"}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Đặt Lịch + Danh Sách */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          ref={bookingFormRef}
          onSubmit={handleBookEquipment}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-slate-900">
            🎥 Đặt Lịch Mượn Thiết Bị (Tự chặn trùng giờ)
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn thiết bị *
            </label>
            <select
              value={bookEquipId}
              onChange={(e) => setBookEquipId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thuộc Hải đồ (Dự án)
            </label>
            <select
              value={bookProjectId}
              onChange={(e) => setBookProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">-- Quay chung Team MKT --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bắt đầu mượn *
              </label>
              <input
                type="datetime-local"
                required
                value={bookStart}
                onChange={(e) => setBookStart(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dự kiến trả *
              </label>
              <input
                type="datetime-local"
                required
                value={bookEnd}
                onChange={(e) => setBookEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mục đích quay / chụp *
            </label>
            <input
              type="text"
              required
              value={bookPurpose}
              onChange={(e) => setBookPurpose(e.target.value)}
              placeholder="VD: Quay 3 clip TikTok Inpro tại phòng họp..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={savingBook}
            className="w-full rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 py-2.5 text-xs font-bold cursor-pointer"
          >
            {savingBook ? "Đang kiểm tra trùng lịch..." : "Chốt Lịch Mượn Máy"}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            📋 Lịch Sử & Danh Sách Đặt Thiết Bị ({bookings.length})
          </h2>
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">
                Chưa có lịch mượn nào.
              </p>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {b.equipment.code}
                      </span>
                      <strong className="text-slate-900">
                        {b.equipment.name}
                      </strong>
                      {b.project && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: b.project.color }}
                        >
                          {b.project.name}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === "BOOKED"
                            ? "bg-sky-100 text-sky-800"
                            : b.status === "RETURNED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {b.status === "BOOKED"
                          ? "Đang đặt"
                          : b.status === "RETURNED"
                            ? "Đã trả"
                            : "Đã hủy"}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      <strong>{b.user.name}</strong> • {b.purpose}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ⏰ {formatVnDateTime(b.startAt)} →{" "}
                      {formatVnDateTime(b.endAt)}
                    </div>
                  </div>

                  {b.status === "BOOKED" &&
                    (currentUser.role === "LEADER" ||
                      b.userId === currentUser.id) && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, "RETURNED")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Đã trả
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(b.id, "CANCELLED")}
                          className="rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Thiết Bị */}
      {equipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setEquipModalOpen(false)}
          />
          <form
            onSubmit={handleSaveEquipment}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingEquip ? "✏️ Chỉnh Sửa Thiết Bị" : "➕ Thêm Thiết Bị Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setEquipModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên thiết bị *
              </label>
              <input
                type="text"
                required
                value={equipName}
                onChange={(e) => setEquipName(e.target.value)}
                placeholder="VD: iPhone 15 Pro Max / Sony ZV-E10..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã thiết bị
                </label>
                <input
                  type="text"
                  value={equipCode}
                  onChange={(e) => setEquipCode(e.target.value)}
                  placeholder="VD: CAM-03"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={equipCat}
                  onChange={(e) =>
                    setEquipCat(e.target.value as EquipmentCategory)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                >
                  {Object.entries(EQUIPMENT_CATEGORY_META).map(([k, m]) => (
                    <option key={k} value={k}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tình trạng máy
              </label>
              <select
                value={equipStatus}
                onChange={(e) =>
                  setEquipStatus(e.target.value as EquipmentCondition)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2"
              >
                <option value="AVAILABLE">✅ Sẵn sàng cho mượn</option>
                <option value="MAINTENANCE">🔧 Đang bảo trì / Tạm khóa</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mô tả / Phụ kiện đi kèm
              </label>
              <textarea
                rows={2}
                value={equipDesc}
                onChange={(e) => setEquipDesc(e.target.value)}
                placeholder="VD: Kèm 2 pin + thẻ 128GB + mic thu âm..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEquipModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingEquip}
                className="rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 font-bold cursor-pointer"
              >
                {savingEquip
                  ? "Đang lưu..."
                  : editingEquip
                    ? "Lưu Thay Đổi"
                    : "Thêm Thiết Bị"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteEquipTarget)}
        itemName={
          deleteEquipTarget
            ? `[${deleteEquipTarget.code}] ${deleteEquipTarget.name}`
            : ""
        }
        toneMode={currentUser.preferredTone}
        permanentWarning
        loading={savingEquip}
        onConfirm={confirmDeleteEquipment}
        onCancel={() => setDeleteEquipTarget(null)}
      />
    </div>
  );
}
