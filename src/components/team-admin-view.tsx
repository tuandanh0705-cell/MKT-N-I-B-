"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Shield,
  FolderPlus,
  Pencil,
  FolderKanban,
} from "lucide-react";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import {
  resolveEffectiveDailyKpi,
  summarizeDailyKpiText,
  type DailyKpiItem,
} from "@/lib/daily-kpi";
import { formatVnDateTime } from "@/lib/dates";
import { PirateAvatar, getPirateCharacter } from "@/components/pirate-art";
import {
  TeamEditUserModal,
  type TeamEditUserTarget,
} from "@/components/team-edit-user-modal";
import { GoogleFormIntakeSetupCard } from "@/components/team-intake-card";
import { PirateCharacterPicker } from "@/components/team-pirate-picker";
import { useToast } from "@/components/toast-provider";
import type {
  DepartmentScope,
  EmploymentType,
  UserRole,
} from "@/generated/prisma/client";

interface TeamUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentScope: DepartmentScope;
  employmentType: EmploymentType;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  birthDate?: string | null;
  weeklyImageLimit: number | null;
  dailyVideoLimit: number | null;
  dailyKpiJson?: unknown;
  isActive: boolean;
  projectMemberships: {
    id: string;
    scope: string;
    project: { id: string; name: string; slug: string };
  }[];
}

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
  channelSummary?: string | null;
  kpiNote?: string | null;
  color: string;
}

interface CronLogRow {
  id: string;
  slot: string;
  runDate: string;
  emailsSent: number;
  notificationsCreated: number;
  summary: string | null;
  createdAt: string | Date;
}

interface TeamAdminViewProps {
  initialUsers: TeamUserRow[];
  initialProjects: ProjectOption[];
  smtpConfigured: boolean;
  smtpUserPreview: string | null;
  initialCronLogs: CronLogRow[];
}

export function TeamAdminView({
  initialUsers,
  initialProjects,
  smtpConfigured,
  smtpUserPreview,
  initialCronLogs,
}: TeamAdminViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [users, setUsers] = useState<TeamUserRow[]>(initialUsers);
  const [projects, setProjects] = useState<ProjectOption[]>(initialProjects);
  const [cronLogs, setCronLogs] = useState<CronLogRow[]>(initialCronLogs);

  // Create User form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [role, setRole] = useState<UserRole>("MEMBER");
  const [scope, setScope] = useState<DepartmentScope>("CONTENT");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [pirateCharacter, setPirateCharacter] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Edit User modal state
  const [editingUser, setEditingUser] = useState<TeamUserRow | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  // Create Project form
  const [newProjName, setNewProjName] = useState("");
  const [newProjChannels, setNewProjChannels] = useState("Fanpage, TikTok");
  const [newProjKpiNote, setNewProjKpiNote] = useState("");
  const [newProjSocial, setNewProjSocial] = useState(7);
  const [newProjColor, setNewProjColor] = useState("#2563eb");
  const [creatingProj, setCreatingProj] = useState(false);

  const [assignProjectByUser, setAssignProjectByUser] = useState<
    Record<string, string>
  >({});

  const [runningSlot, setRunningSlot] = useState<string | null>(null);

  async function handleSaveUser(payload: {
    id: string;
    name: string;
    title: string;
    role: UserRole;
    departmentScope: DepartmentScope;
    employmentType: EmploymentType;
    pirateCharacter: string | null;
    birthDate: string | null;
    weeklyImageLimit: number | null;
    dailyVideoLimit: number | null;
    dailyKpiJson?: DailyKpiItem[];
    newPassword?: string;
  }) {
    setSavingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không cập nhật được nhân sự.", "error");
        return;
      }
      setUsers((prev) =>
        prev.map((row) =>
          row.id === payload.id ? { ...row, ...data.user } : row
        )
      );
      setEditingUser(null);
      showToast(`Đã cập nhật tài khoản ${data.user.name}.`);
      router.refresh();
    } finally {
      setSavingUser(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          departmentScope: scope,
          employmentType,
          pirateCharacter: pirateCharacter || null,
          birthDate: birthDate || null,
          title: DEPARTMENT_SCOPE_LABEL[scope],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể tạo tài khoản.", "error");
      } else {
        setUsers((prev) => [
          ...prev,
          {
            ...data.user,
            avatarColor: data.user.avatarColor || "#2563eb",
            pirateCharacter: data.user.pirateCharacter ?? null,
            birthDate: data.user.birthDate ?? null,
            weeklyImageLimit: null,
            dailyVideoLimit: null,
            projectMemberships: [],
          },
        ]);
        setName("");
        setEmail("");
        setPirateCharacter("");
        setBirthDate("");
        showToast(`Đã tạo tài khoản ${data.user.email}.`);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setCreatingProj(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjName,
          channelSummary: newProjChannels,
          kpiNote: newProjKpiNote,
          weeklySocialTarget: newProjSocial,
          color: newProjColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được dự án.", "error");
        return;
      }
      setProjects((prev) => [...prev, data.project]);
      setNewProjName("");
      setNewProjKpiNote("");
      showToast(`Đã tạo dự án "${data.project.name}".`);
      router.refresh();
    } finally {
      setCreatingProj(false);
    }
  }

  async function toggleUserActive(u: TeamUserRow) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, isActive: !u.isActive } : row
        )
      );
      showToast(
        !u.isActive
          ? `Đã mở khóa tài khoản ${u.name}.`
          : `Đã tạm khóa tài khoản ${u.name}.`,
        "info"
      );
      router.refresh();
    }
  }

  async function assignProject(userId: string) {
    const projectId = assignProjectByUser[userId] || projects[0]?.id;
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, scope: "PROJECT_WIDE" }),
    });
    if (res.ok) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            const already = u.projectMemberships.some(
              (m) => m.project.id === projectId
            );
            if (already) return u;
            return {
              ...u,
              projectMemberships: [
                ...u.projectMemberships,
                {
                  id: `${userId}-${projectId}`,
                  scope: "PROJECT_WIDE",
                  project: proj,
                },
              ],
            };
          })
        );
        showToast(`Đã cấp quyền xem dự án ${proj.name}.`);
        router.refresh();
      }
    }
  }

  async function removeProject(userId: string, projectId: string) {
    const res = await fetch(
      `/api/projects/${projectId}/members?userId=${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                projectMemberships: u.projectMemberships.filter(
                  (m) => m.project.id !== projectId
                ),
              }
            : u
        )
      );
      showToast("Đã gỡ quyền dự án.", "info");
      router.refresh();
    }
  }

  async function triggerReminder(slot: string) {
    setRunningSlot(slot);
    try {
      const res = await fetch(`/api/cron/reminders?slot=${slot}&force=1`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Đã chạy ${slot}: ${data.notificationsCreated} thông báo, ${data.emailsSent} email.`
        );
        setCronLogs((prev) => [
          {
            id: `${slot}-${Date.now()}`,
            slot,
            runDate: data.runDate,
            emailsSent: data.emailsSent,
            notificationsCreated: data.notificationsCreated,
            summary: data.summary,
            createdAt: new Date().toISOString(),
          },
          ...prev.slice(0, 9),
        ]);
        router.refresh();
      } else {
        showToast(data.error || "Chạy nhắc lịch thất bại.", "error");
      }
    } finally {
      setRunningSlot(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          🐌 Chiêu Mộ Đồng Đội & Ốc Sên Tin
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Chỉ Thuyền trưởng (Leader) mới có quyền quản lý thuyền viên, hải đồ & nhắc lịch Email.
        </p>
      </div>

      {/* Trạng thái Gmail SMTP & Test Cron */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Ốc Sên Truyền Tin Gmail Team MKT & Nhắc lịch tự động
                </h2>
                <p className="text-xs text-slate-500">
                  Lịch chuẩn: 09:00 Check-in • 15:00 Nộp duyệt • 16:00 Leader duyệt • 17:30 Bàn giao • T6 12:00 Plan
                </p>
              </div>
            </div>

            {smtpConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SMTP Sẵn sàng ({smtpUserPreview})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 text-xs font-semibold shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
                Chưa cài SMTP (Đang log thử)
              </span>
            )}
          </div>

          {!smtpConfigured && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 leading-relaxed">
              Để gửi Email thật bằng <strong>1 Gmail của Team MKT</strong>: vào Google Account → Security → 2-Step Verification → <strong>App passwords</strong> tạo mật khẩu 16 ký tự, sau đó điền{" "}
              <code className="bg-slate-200/70 px-1 rounded">SMTP_USER</code> và{" "}
              <code className="bg-slate-200/70 px-1 rounded">SMTP_PASS</code> vào file <code className="bg-slate-200/70 px-1 rounded">.env</code> (hoặc Settings của Vercel).
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-blue-600" />
              Chạy thử bộ nhắc lịch ngay:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { slot: "MORNING_CHECKIN", label: "09:00 Check-in" },
                { slot: "AFTERNOON_SUBMIT", label: "15:00 Nộp duyệt" },
                { slot: "LEADER_REVIEW", label: "16:00 Leader duyệt" },
                { slot: "EVENING_HANDOVER", label: "17:30 Bàn giao" },
                { slot: "WEEKLY_PLAN", label: "T6 12:00 Plan tuần" },
              ].map((item) => (
                <button
                  key={item.slot}
                  type="button"
                  disabled={runningSlot !== null}
                  onClick={() => triggerReminder(item.slot)}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {runningSlot === item.slot ? "Đang chạy..." : item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Nhật ký Nhắc lịch tự động
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {cronLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Chưa có lượt chạy nhắc lịch nào.
              </p>
            ) : (
              cronLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{log.slot}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatVnDateTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {log.summary} ({log.notificationsCreated} thông báo, {log.emailsSent} email)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cổng Nhận Việc Ngoài Team qua Google Form (D-7 Rule) */}
      <GoogleFormIntakeSetupCard onSimulatedCreated={() => router.refresh()} />

      {/* Tạo Dự án mới */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FolderKanban className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Tạo Dự án mới ({projects.length} dự án đang chạy)
          </h2>
        </div>

        <form
          onSubmit={handleCreateProject}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
        >
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tên dự án *
            </label>
            <input
              type="text"
              required
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Ví dụ: Affiliate TikTok Shop"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Kênh triển khai
            </label>
            <input
              type="text"
              value={newProjChannels}
              onChange={(e) => setNewProjChannels(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              KPI Social/tuần
            </label>
            <input
              type="number"
              min={0}
              value={newProjSocial}
              onChange={(e) => setNewProjSocial(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Ghi chú KPI & Màu
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newProjKpiNote}
                onChange={(e) => setNewProjKpiNote(e.target.value)}
                placeholder="VD: 10 bài + 5 leads"
                className="flex-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
              />
              <input
                type="color"
                value={newProjColor}
                onChange={(e) => setNewProjColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creatingProj}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {creatingProj ? "Đang tạo..." : "+ Tạo Dự án"}
          </button>
        </form>
      </div>

      {/* Form Tạo tài khoản mới */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900">
            ⚓ Chiêu mộ Nhân sự mới vào Băng Hải Tặc
          </h2>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Họ tên *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Phương Anh"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Email đăng nhập *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@metaecom.vn"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Mật khẩu
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Quyền
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-white"
            >
              <option value="MEMBER">Nhân viên</option>
              <option value="LEADER">Leader</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Chuyên môn & Hình thức
            </label>
            <div className="flex gap-1.5">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as DepartmentScope)}
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs bg-white"
              >
                {Object.entries(DEPARTMENT_SCOPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={employmentType}
                onChange={(e) =>
                  setEmploymentType(e.target.value as EmploymentType)
                }
                className="rounded-xl border border-slate-200 px-2 py-2 text-xs bg-white"
              >
                <option value="FULL_TIME">Full</option>
                <option value="PART_TIME">Part</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
          >
            {creating ? "Đang tạo..." : "+ Chiêu mộ thành viên"}
          </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                🎂 Ngày sinh nhật (tùy chọn — để chúc mừng đúng ngày)
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-amber-100">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Chọn nhân vật One Piece 3D cho nhân sự mới (15 nhân vật: Jinbe, Brook, Ace, Sabo, Law, Shanks...)
            </label>
            <PirateCharacterPicker
              value={pirateCharacter}
              onChange={setPirateCharacter}
              users={users}
            />
          </div>
        </form>
      </div>

      {/* Bảng Danh sách Nhân sự & Gán Dự án */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-700" />
          <h2 className="text-sm font-extrabold text-slate-900">
            ⚓ Danh sách Băng Hải Tặc &amp; Hải Đồ được phép xem ({users.length})
          </h2>
        </div>

        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-amber-200 bg-amber-50/70 text-amber-900/80 text-xs uppercase">
              <th className="py-3 px-4">Nhân sự</th>
              <th className="py-3 px-4">Vai trò / Scope</th>
              <th className="py-3 px-4">Công suất chuẩn</th>
              <th className="py-3 px-4">Dự án được xem toàn bộ</th>
              <th className="py-3 px-4">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/80">
            {users.map((u) => {
              const pirate = getPirateCharacter(
                u.name,
                u.departmentScope,
                u.pirateCharacter
              );
              return (
              <tr key={u.id} className="hover:bg-amber-50/40">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <PirateAvatar
                      name={u.name}
                      color={u.avatarColor}
                      scope={u.departmentScope}
                      pirateCharacter={u.pirateCharacter}
                      size="md"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        title="Bấm để đổi nhân vật"
                        className="text-[11px] font-semibold text-amber-700 hover:text-sky-600 hover:underline cursor-pointer text-left"
                      >
                        {pirate.emoji} {pirate.characterName}
                      </button>
                      <div className="text-[11px] text-slate-400">
                        {u.email}
                        {u.birthDate ? ` • 🎂 ${u.birthDate.slice(8, 10)}/${u.birthDate.slice(5, 7)}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          u.role === "LEADER"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-sky-50 text-sky-800 border border-sky-200"
                        }`}
                      >
                        {u.role === "LEADER" ? "Leader" : "Thành viên"}
                      </span>
                      <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">
                        {DEPARTMENT_SCOPE_LABEL[u.departmentScope] || u.departmentScope}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {u.employmentType === "FULL_TIME" ? "Full-time" : "Part-time"}
                      {u.title ? ` • ${u.title}` : ""}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs font-medium text-slate-700">
                  <div className="space-y-0.5">
                    <div>
                      {summarizeDailyKpiText(resolveEffectiveDailyKpi(u).items)}
                    </div>
                    {(u.weeklyImageLimit || u.dailyVideoLimit) && (
                      <div className="text-[11px] text-slate-400">
                        Giới hạn:{" "}
                        {[
                          u.weeklyImageLimit ? `${u.weeklyImageLimit} ảnh/tuần` : null,
                          u.dailyVideoLimit ? `${u.dailyVideoLimit} video/ngày` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {u.role === "LEADER" ? (
                    <span className="text-xs font-semibold text-slate-500">
                      Toàn bộ hệ thống
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {u.projectMemberships.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Chỉ xem task được giao (Shared Pool)
                          </span>
                        ) : (
                          u.projectMemberships.map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {m.project.name}
                              <button
                                type="button"
                                onClick={() => removeProject(u.id, m.project.id)}
                                className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                title="Gỡ khỏi dự án"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={assignProjectByUser[u.id] || projects[0]?.id || ""}
                          onChange={(e) =>
                            setAssignProjectByUser((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] bg-white"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => assignProject(u.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-2 py-1 text-[11px] font-semibold cursor-pointer"
                        >
                          <FolderPlus className="w-3 h-3" />
                          Cấp dự án
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="rounded-lg border border-slate-200 hover:bg-slate-100 p-1.5 text-slate-600 cursor-pointer"
                      title="Sửa thông tin & đặt lại mật khẩu"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUserActive(u)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                        u.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.isActive ? "Hoạt động" : "Tạm khóa"}
                    </button>
                  </div>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>

      <TeamEditUserModal
        user={editingUser as TeamEditUserTarget | null}
        allUsers={users}
        projects={projects}
        saving={savingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
      />
    </div>
  );
}
