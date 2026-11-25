"use client";

import { useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Video,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { formatVnDateTime } from "@/lib/dates";
import { PirateAvatar } from "@/components/pirate-art";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { useToast } from "@/components/toast-provider";
import type { SimpleProject, TeamMeetingItem } from "@/types/crm";
import type { DepartmentScope } from "@/generated/prisma/client";

export interface ScheduleTeamMemberMinimal {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  departmentScope: DepartmentScope;
  birthDate?: string | null;
}

const MEETING_TYPE_META: Record<string, { label: string; badge: string }> = {
  SYNC: {
    label: "🔄 Họp Sync Team",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  BRAINSTORM: {
    label: "💡 Brainstorm Ý Tưởng",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  REVIEW: {
    label: "💎 Review / Chốt KPI",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
  ONE_ON_ONE: {
    label: "☕ Trao Đổi 1-1",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  TEAM_ACTIVITY: {
    label: "🎉 Sinh Nhật / Gắn Kết",
    badge: "bg-pink-50 text-pink-700 border-pink-200",
  },
};

export function formatScheduleTimeShort(iso: string | Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function ScheduleMeetingsSection({
  currentUser,
  todayStr,
  meetings,
  teamMembers,
  projects,
  onMeetingsChange,
}: {
  currentUser: AuthUser;
  todayStr: string;
  meetings: TeamMeetingItem[];
  teamMembers: ScheduleTeamMemberMinimal[];
  projects: SimpleProject[];
  onMeetingsChange: React.Dispatch<React.SetStateAction<TeamMeetingItem[]>>;
}) {
  const { showToast } = useToast();

  const [meetTitle, setMeetTitle] = useState("");
  const [meetType, setMeetType] = useState("SYNC");
  const [meetProjectId, setMeetProjectId] = useState(projects[0]?.id || "");
  const [meetStart, setMeetStart] = useState(`${todayStr}T14:00`);
  const [meetEnd, setMeetEnd] = useState(`${todayStr}T15:00`);
  const [meetLocation, setMeetLocation] = useState("");
  const [meetAgenda, setMeetAgenda] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >(() => teamMembers.filter((m) => m.id !== currentUser.id).map((m) => m.id));
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [deleteMeetingTarget, setDeleteMeetingTarget] =
    useState<TeamMeetingItem | null>(null);

  function toggleParticipant(uid: string) {
    setSelectedParticipantIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (selectedParticipantIds.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 đồng đội để mời họp.", "error");
      return;
    }
    setSavingMeeting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetTitle,
          meetingType: meetType,
          projectId: meetProjectId || null,
          startAt: new Date(meetStart).toISOString(),
          endAt: new Date(meetEnd).toISOString(),
          location: meetLocation || null,
          agenda: meetAgenda || null,
          participantIds: selectedParticipantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được lịch họp.", "error");
        return;
      }
      onMeetingsChange((prev) => [data.meeting, ...prev]);
      setMeetTitle("");
      setMeetAgenda("");
      showToast(
        `Đã chốt lịch họp & gửi thông báo tới ${selectedParticipantIds.length} thành viên!`
      );
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleUpdateRsvp(
    meetingId: string,
    rsvp: "ACCEPTED" | "DECLINED"
  ) {
    const res = await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meetingId, rsvp }),
    });
    const data = await res.json();
    if (res.ok && data.meeting) {
      onMeetingsChange((prev) =>
        prev.map((m) => (m.id === meetingId ? data.meeting : m))
      );
      showToast(
        rsvp === "ACCEPTED"
          ? "Đã xác nhận sẽ tham gia buổi họp!"
          : "Đã báo xin vắng buổi họp."
      );
    }
  }

  async function handleUpdateMeetingStatus(
    meetingId: string,
    status: "COMPLETED" | "CANCELLED"
  ) {
    const res = await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meetingId, status }),
    });
    const data = await res.json();
    if (res.ok && data.meeting) {
      onMeetingsChange((prev) =>
        prev.map((m) => (m.id === meetingId ? data.meeting : m))
      );
      showToast(
        status === "COMPLETED"
          ? "Đã đánh dấu hoàn tất buổi họp."
          : "Đã hủy lịch họp & thông báo cho mọi người."
      );
    }
  }

  async function confirmDeleteMeeting() {
    if (!deleteMeetingTarget) return;
    setSavingMeeting(true);
    try {
      const res = await fetch(`/api/meetings?id=${deleteMeetingTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onMeetingsChange((prev) =>
          prev.filter((m) => m.id !== deleteMeetingTarget.id)
        );
        setDeleteMeetingTarget(null);
        showToast("Đã xóa lịch họp.");
      }
    } finally {
      setSavingMeeting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleCreateMeeting}
          className="lg:col-span-5 bg-white rounded-2xl border-2 border-blue-200/80 p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">
              🤝 Set Lịch Họp Mới & Báo Thông Báo
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
              <BellRing className="w-3 h-3" />
              Tự báo ĐT
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề buổi họp / hoạt động *
            </label>
            <input
              type="text"
              required
              value={meetTitle}
              onChange={(e) => setMeetTitle(e.target.value)}
              placeholder="VD: Họp chốt kế hoạch Content & Media tuần mới..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại hoạt động
              </label>
              <select
                value={meetType}
                onChange={(e) => setMeetType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                {Object.entries(MEETING_TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thuộc Dự án
              </label>
              <select
                value={meetProjectId}
                onChange={(e) => setMeetProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                <option value="">-- Hoạt động chung Băng --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bắt đầu *
              </label>
              <input
                type="datetime-local"
                required
                value={meetStart}
                onChange={(e) => setMeetStart(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kết thúc *
              </label>
              <input
                type="datetime-local"
                required
                value={meetEnd}
                onChange={(e) => setMeetEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phòng họp / Link Google Meet
            </label>
            <input
              type="text"
              value={meetLocation}
              onChange={(e) => setMeetLocation(e.target.value)}
              placeholder="VD: Phòng họp tầng 2 hoặc link Google Meet..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung cần chuẩn bị (Agenda)
            </label>
            <textarea
              rows={2}
              value={meetAgenda}
              onChange={(e) => setMeetAgenda(e.target.value)}
              placeholder="VD: Mỗi bạn chuẩn bị trước 3 ý tưởng video..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="font-bold text-slate-700">
                Mời thành viên ({selectedParticipantIds.length} đã chọn) *
              </label>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedParticipantIds(
                      teamMembers
                        .filter((m) => m.id !== currentUser.id)
                        .map((m) => m.id)
                    )
                  }
                  className="text-[11px] font-bold text-blue-600 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Chọn cả băng
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedParticipantIds([])}
                  className="text-[11px] font-semibold text-slate-500 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2">
              {teamMembers
                .filter((m) => m.id !== currentUser.id)
                .map((m) => {
                  const checked = selectedParticipantIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition ${
                        checked
                          ? "bg-blue-50 border-blue-300 text-blue-950 font-bold"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(m.id)}
                      />
                      <PirateAvatar
                        name={m.name}
                        color={m.avatarColor}
                        scope={m.departmentScope}
                        pirateCharacter={m.pirateCharacter}
                        size="sm"
                        animate={false}
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingMeeting}
            className="w-full rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 py-2.5 text-xs font-bold cursor-pointer"
          >
            {savingMeeting
              ? "Đang gửi lịch họp..."
              : `Chốt Lịch Họp & Gửi Thông Báo (${selectedParticipantIds.length} người)`}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            📅 Danh Sách Lịch Họp & Hoạt Động Băng ({meetings.length})
          </h2>

          <div className="space-y-3 max-h-[650px] overflow-y-auto">
            {meetings.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-10 text-center">
                Chưa có buổi họp nào được đặt. Hãy điền biểu mẫu tạo lịch họp để gửi lời mời cho cả team!
              </p>
            ) : (
              meetings.map((m) => {
                const tMeta =
                  MEETING_TYPE_META[m.meetingType] || MEETING_TYPE_META.SYNC;
                const myInvite = m.participants.find(
                  (p) => p.userId === currentUser.id
                );
                const canManage =
                  currentUser.role === "LEADER" ||
                  m.organizerId === currentUser.id;
                const isUrlLoc = Boolean(
                  m.location && /^https?:\/\//i.test(m.location)
                );

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-4 space-y-2.5 text-xs ${
                      m.status === "CANCELLED"
                        ? "border-slate-200 bg-slate-50 opacity-70"
                        : "border-slate-200 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tMeta.badge}`}
                          >
                            {tMeta.label}
                          </span>
                          {m.project && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: m.project.color }}
                            >
                              {m.project.name}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              m.status === "SCHEDULED"
                                ? "bg-sky-100 text-sky-800"
                                : m.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {m.status === "SCHEDULED"
                              ? "Sắp diễn ra"
                              : m.status === "COMPLETED"
                                ? "Đã họp xong"
                                : "Đã hủy"}
                          </span>
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-900">
                          {m.title}
                        </h3>
                        <div className="text-slate-600 font-semibold">
                          ⏰ {formatVnDateTime(m.startAt)} →{" "}
                          {formatScheduleTimeShort(m.endAt)} • Chủ trì:{" "}
                          <strong>{m.organizer.name}</strong>
                        </div>

                        {m.location && (
                          <div className="text-slate-600 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {isUrlLoc ? (
                              <a
                                href={m.location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                Vào Link Họp
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span>{m.location}</span>
                            )}
                          </div>
                        )}

                        {m.agenda && (
                          <p className="text-slate-600 bg-slate-50 rounded-lg border border-slate-100 px-2.5 py-1.5">
                            {m.agenda}
                          </p>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          {m.status === "SCHEDULED" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMeetingStatus(m.id, "COMPLETED")
                                }
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Xong
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMeetingStatus(m.id, "CANCELLED")
                                }
                                className="rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 px-2 py-1 text-[11px] font-semibold cursor-pointer"
                              >
                                Hủy họp
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteMeetingTarget(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa lịch họp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {m.participants.map((p) => (
                          <span
                            key={p.id}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              p.rsvp === "ACCEPTED"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : p.rsvp === "DECLINED"
                                  ? "bg-rose-50 border-rose-200 text-rose-700"
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            {p.rsvp === "ACCEPTED"
                              ? "✅"
                              : p.rsvp === "DECLINED"
                                ? "❌"
                                : "⏳"}{" "}
                            {p.user.name}
                          </span>
                        ))}
                      </div>

                      {m.status === "SCHEDULED" && myInvite && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateRsvp(m.id, "ACCEPTED")}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer border ${
                              myInvite.rsvp === "ACCEPTED"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            Tham gia
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRsvp(m.id, "DECLINED")}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer border ${
                              myInvite.rsvp === "DECLINED"
                                ? "bg-rose-600 text-white border-rose-600"
                                : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                            }`}
                          >
                            Xin vắng
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteMeetingTarget)}
        itemName={
          deleteMeetingTarget ? `Lịch họp "${deleteMeetingTarget.title}"` : ""
        }
        toneMode={currentUser.preferredTone}
        permanentWarning
        loading={savingMeeting}
        onConfirm={confirmDeleteMeeting}
        onCancel={() => setDeleteMeetingTarget(null)}
      />
    </>
  );
}
