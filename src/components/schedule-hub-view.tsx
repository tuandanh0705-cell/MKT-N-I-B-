"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarOff,
  Users,
  Cake,
  ChevronLeft,
  ChevronRight,
  Camera,
  Clock,
  ExternalLink,
  MapPin,
  Video,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { LEAVE_TYPE_META } from "@/lib/constants";
import {
  formatVnDateTime,
  getVnDateString,
  getVnWeekBounds,
  shiftVnWeekStart,
} from "@/lib/dates";
import { PirateAvatar } from "@/components/pirate-art";
import { BirthdayCelebrationBanner } from "@/components/birthday-banner";
import {
  ScheduleMeetingsSection,
  formatScheduleTimeShort,
  type ScheduleTeamMemberMinimal,
} from "@/components/schedule-meetings-section";
import { ScheduleLeavesSection } from "@/components/schedule-leaves-section";
import type {
  BirthdayMemberInfo,
  LeaveRequestItem,
  SimpleProject,
  TeamMeetingItem,
} from "@/types/crm";

export function ScheduleHubView({
  currentUser,
  todayStr,
  initialLeaves,
  initialMeetings,
  teamMembers,
  todayBirthdays,
  upcomingBirthdays,
  projects,
}: {
  currentUser: AuthUser;
  todayStr: string;
  initialLeaves: LeaveRequestItem[];
  initialMeetings: TeamMeetingItem[];
  teamMembers: ScheduleTeamMemberMinimal[];
  todayBirthdays: BirthdayMemberInfo[];
  upcomingBirthdays: BirthdayMemberInfo[];
  projects: SimpleProject[];
}) {
  const [tab, setTab] = useState<"MEETINGS" | "LEAVE" | "BIRTHDAYS">(
    "MEETINGS"
  );
  const [weekStart, setWeekStart] = useState(
    () => getVnWeekBounds().weekStartStr
  );
  const [meetings, setMeetings] = useState<TeamMeetingItem[]>(initialMeetings);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>(initialLeaves);
  const [activeMeeting, setActiveMeeting] = useState<TeamMeetingItem | null>(null);
  const [activeLeave, setActiveLeave] = useState<LeaveRequestItem | null>(null);

  const weekDays = useMemo(() => {
    const startAnchor = new Date(`${weekStart}T00:00:00+07:00`);
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(startAnchor.getTime() + idx * 24 * 60 * 60 * 1000);
      const dateStr = getVnDateString(d);
      const mmdd = dateStr.slice(5, 10);
      const dayStartMs = new Date(`${dateStr}T00:00:00+07:00`).getTime();
      const dayEndMs = new Date(`${dateStr}T23:59:59.999+07:00`).getTime();

      const dayMeetings = meetings.filter((m) => {
        if (m.status === "CANCELLED") return false;
        const s = new Date(m.startAt).getTime();
        const e = new Date(m.endAt).getTime();
        return s <= dayEndMs && e >= dayStartMs;
      });
      const dayLeaves = leaves.filter(
        (l) =>
          l.status === "APPROVED" &&
          l.startDate <= dateStr &&
          l.endDate >= dateStr
      );
      const dayBirthdays = teamMembers.filter(
        (u) => u.birthDate && u.birthDate.slice(5, 10) === mmdd
      );

      return {
        dateStr,
        dayName: labels[idx],
        displayDate: `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`,
        isToday: dateStr === todayStr,
        dayMeetings,
        dayLeaves,
        dayBirthdays,
      };
    });
  }, [weekStart, todayStr, meetings, leaves, teamMembers]);

  const activeTodayLeaves = leaves.filter(
    (l) =>
      l.status === "APPROVED" &&
      l.startDate <= todayStr &&
      l.endDate >= todayStr
  );

  const scheduledMeetingsCount = meetings.filter(
    (m) => m.status === "SCHEDULED"
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              🗓️ Lịch Hoạt Động Băng Mũ Rơm
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lịch họp, lịch nghỉ và sinh nhật team.
            </p>
          </div>

          <Link
            href="/resources?tab=equipment"
            className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-800 px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            Thiết Bị & Đặt Máy ở Kho Tài Nguyên →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("MEETINGS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer ${
                tab === "MEETINGS"
                  ? "bg-[#0B2545] text-amber-300 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Users className="w-4 h-4" />
              Lịch Họp Băng ({scheduledMeetingsCount})
            </button>
            <button
              type="button"
              onClick={() => setTab("LEAVE")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer ${
                tab === "LEAVE"
                  ? "bg-[#0B2545] text-amber-300 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <CalendarOff className="w-4 h-4" />
              Lịch Nghỉ / WFH ({leaves.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("BIRTHDAYS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold cursor-pointer ${
                tab === "BIRTHDAYS"
                  ? "bg-[#0B2545] text-amber-300 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Cake className="w-4 h-4" />
              Sinh Nhật Băng (
              {todayBirthdays.length > 0
                ? `${todayBirthdays.length} hôm nay!`
                : upcomingBirthdays.length}
              )
            </button>
          </div>
        </div>
      </div>

      <BirthdayCelebrationBanner
        todayBirthdays={todayBirthdays}
        currentUserId={currentUser.id}
      />

      {activeTodayLeaves.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center gap-2 text-xs text-amber-900">
          <span className="font-bold">
            🏖️ Hôm nay ({todayStr}) có lịch nghỉ/vắng mặt:
          </span>
          {activeTodayLeaves.map((l) => (
            <span
              key={l.id}
              className="rounded-full bg-white border border-amber-300 px-2.5 py-0.5 font-semibold"
            >
              {l.user.name} ({LEAVE_TYPE_META[l.leaveType]?.label || l.leaveType})
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-amber-50/40 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900">
            📆 Toàn Cảnh Tuần Hoạt Động Băng ({weekDays[0]?.displayDate} →{" "}
            {weekDays[6]?.displayDate})
          </h2>
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setWeekStart((w) => shiftVnWeekStart(w, -1))}
              className="p-1 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getVnWeekBounds().weekStartStr)}
              className="px-2 hover:text-blue-600 cursor-pointer"
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => shiftVnWeekStart(w, 1))}
              className="p-1 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {weekDays.map((d) => (
            <div
              key={d.dateStr}
              className={`p-3 space-y-2 min-h-[130px] ${
                d.isToday ? "bg-amber-50/40" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs">
                <span className="font-extrabold text-slate-900">
                  {d.dayName} ({d.displayDate})
                </span>
                {d.isToday && (
                  <span className="rounded bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[9px] font-black">
                    Hôm nay
                  </span>
                )}
              </div>

              {d.dayBirthdays.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg bg-pink-50 border border-pink-200 px-2 py-1 text-[11px] font-bold text-pink-800"
                >
                  🎂 Sinh nhật {b.name}
                </div>
              ))}

              {d.dayMeetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMeeting(m)}
                  title="Bấm xem chi tiết lịch họp & link phòng họp"
                  className="w-full text-left rounded-lg bg-blue-50 hover:bg-blue-100/90 border border-blue-200 hover:border-blue-400 px-2 py-1 text-[11px] text-blue-900 transition cursor-pointer"
                >
                  <div className="font-bold truncate">
                    🤝 {formatScheduleTimeShort(m.startAt)} {m.title}
                  </div>
                  <div className="text-[10px] text-blue-700 flex items-center justify-between gap-1">
                    <span>{m.participants.length} người</span>
                    {m.location && /^https?:\/\//i.test(m.location) && (
                      <span className="font-bold text-blue-600">Link ↗</span>
                    )}
                  </div>
                </button>
              ))}

              {d.dayLeaves.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveLeave(l)}
                  title="Bấm xem chi tiết đơn nghỉ / WFH"
                  className="w-full text-left rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-400 px-2 py-1 text-[11px] text-amber-900 transition cursor-pointer"
                >
                  🏖️ {l.user.name} (
                  {l.leaveType === "REMOTE" ? "WFH" : "Nghỉ"})
                </button>
              ))}

              {d.dayBirthdays.length === 0 &&
                d.dayMeetings.length === 0 &&
                d.dayLeaves.length === 0 && (
                  <div className="text-[11px] text-slate-300 italic pt-2">
                    Không có lịch
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {tab === "MEETINGS" && (
        <ScheduleMeetingsSection
          currentUser={currentUser}
          todayStr={todayStr}
          meetings={meetings}
          teamMembers={teamMembers}
          projects={projects}
          onMeetingsChange={setMeetings}
        />
      )}

      {tab === "LEAVE" && (
        <ScheduleLeavesSection
          currentUser={currentUser}
          todayStr={todayStr}
          leaves={leaves}
          onLeavesChange={setLeaves}
        />
      )}

      {tab === "BIRTHDAYS" && (
        <div className="bg-white rounded-2xl border-2 border-pink-200/80 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900">
              🎂 Sinh Nhật Thành Viên ({teamMembers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((m) => {
              const hasBd = Boolean(
                m.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(m.birthDate)
              );
              const upcomingItem =
                todayBirthdays.find((b) => b.id === m.id) ||
                upcomingBirthdays.find((b) => b.id === m.id);
              const isToday = Boolean(
                todayBirthdays.some((b) => b.id === m.id)
              );
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
                    isToday
                      ? "bg-gradient-to-r from-pink-50 to-amber-50 border-pink-300 shadow-sm"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PirateAvatar
                      name={m.name}
                      color={m.avatarColor}
                      scope={m.departmentScope}
                      pirateCharacter={m.pirateCharacter}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {m.name}
                      </div>
                      <div className="text-xs font-bold mt-0.5">
                        {hasBd && m.birthDate ? (
                          <span className="text-pink-700">
                            🎂 {m.birthDate.slice(8, 10)}/
                            {m.birthDate.slice(5, 7)}/{m.birthDate.slice(0, 4)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">
                            Chưa cập nhật
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isToday ? (
                    <span className="rounded-full bg-pink-600 text-white px-2.5 py-1 text-[10px] font-extrabold shrink-0">
                      🥳 Hôm nay!
                    </span>
                  ) : upcomingItem ? (
                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-[10px] font-bold shrink-0">
                      Còn {upcomingItem.daysUntil} ngày
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal chi tiết Lịch họp khi bấm vào thẻ lịch tuần */}
      {activeMeeting && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setActiveMeeting(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border-2 border-blue-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/70 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 mb-1">
                  <Video className="w-3.5 h-3.5" />
                  <span>Lịch họp băng</span>
                  {activeMeeting.project && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: activeMeeting.project.color }}
                    >
                      {activeMeeting.project.name}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activeMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMeeting(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-100 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {formatVnDateTime(activeMeeting.startAt)} →{" "}
                  {formatVnDateTime(activeMeeting.endAt)}
                </span>
              </div>

              {activeMeeting.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  {/^https?:\/\//i.test(activeMeeting.location) ? (
                    <a
                      href={activeMeeting.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Mở link phòng họp ngay
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="font-semibold text-slate-800">
                      Địa điểm: {activeMeeting.location}
                    </span>
                  )}
                </div>
              )}

              {activeMeeting.agenda && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Nội dung / Agenda
                  </div>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {activeMeeting.agenda}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  Người tham gia ({activeMeeting.participants.length}) • Chủ trì:{" "}
                  <span className="text-slate-800 normal-case">
                    {activeMeeting.organizer.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeMeeting.participants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      <PirateAvatar
                        name={p.user.name}
                        color={p.user.avatarColor}
                        scope={p.user.departmentScope}
                        pirateCharacter={p.user.pirateCharacter}
                        size="sm"
                        animate={false}
                      />
                      {p.user.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab("MEETINGS");
                  setActiveMeeting(null);
                }}
                className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Mở tab Quản lý lịch họp →
              </button>
              <button
                type="button"
                onClick={() => setActiveMeeting(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết Lịch Nghỉ / WFH khi bấm vào thẻ lịch tuần */}
      {activeLeave && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setActiveLeave(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border-2 border-amber-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/70 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PirateAvatar
                  name={activeLeave.user.name}
                  color={activeLeave.user.avatarColor}
                  scope={activeLeave.user.departmentScope}
                  pirateCharacter={activeLeave.user.pirateCharacter}
                  size="md"
                  animate={false}
                />
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    {activeLeave.user.name}
                  </h3>
                  <span className="inline-block rounded-full bg-white border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {LEAVE_TYPE_META[activeLeave.leaveType]?.label ||
                      activeLeave.leaveType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeave(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-100 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Từ <strong>{activeLeave.startDate}</strong> đến{" "}
                  <strong>{activeLeave.endDate}</strong>
                </span>
              </div>
              {activeLeave.reason && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase text-slate-500">
                    Lý do / Ghi chú
                  </div>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {activeLeave.reason}
                  </p>
                </div>
              )}
              {activeLeave.reviewedBy && (
                <div className="text-[11px] text-emerald-700 font-semibold">
                  ✓ Đã duyệt bởi {activeLeave.reviewedBy.name}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab("LEAVE");
                  setActiveLeave(null);
                }}
                className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
              >
                Mở tab Lịch Nghỉ / WFH →
              </button>
              <button
                type="button"
                onClick={() => setActiveLeave(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
