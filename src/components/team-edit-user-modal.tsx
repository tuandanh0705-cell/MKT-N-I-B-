"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DailyKpiTargetEditor } from "@/components/daily-kpi-editor";
import {
  PirateCharacterPicker,
  type PiratePickerUserLike,
} from "@/components/team-pirate-picker";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import { resolveEffectiveDailyKpi, type DailyKpiItem } from "@/lib/daily-kpi";
import type { SimpleProject } from "@/types/crm";
import type {
  DepartmentScope,
  EmploymentType,
  UserRole,
} from "@/generated/prisma/client";

export interface TeamEditUserTarget extends PiratePickerUserLike {
  role: UserRole;
  employmentType: EmploymentType;
  title: string;
  birthDate?: string | null;
  weeklyImageLimit: number | null;
  dailyVideoLimit: number | null;
  dailyKpiJson?: unknown;
}

interface TeamEditUserModalProps {
  user: TeamEditUserTarget | null;
  allUsers: PiratePickerUserLike[];
  projects?: SimpleProject[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
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
    dailyKpiJson: DailyKpiItem[];
    newPassword?: string;
  }) => Promise<void>;
}

export function TeamEditUserModal(props: TeamEditUserModalProps) {
  if (!props.user) return null;
  return (
    <TeamEditUserModalInner
      key={props.user.id}
      user={props.user}
      allUsers={props.allUsers}
      projects={props.projects}
      saving={props.saving}
      onClose={props.onClose}
      onSave={props.onSave}
    />
  );
}

function TeamEditUserModalInner({
  user,
  allUsers,
  projects = [],
  saving,
  onClose,
  onSave,
}: Omit<TeamEditUserModalProps, "user"> & { user: TeamEditUserTarget }) {
  const [editName, setEditName] = useState(user.name);
  const [editTitle, setEditTitle] = useState(user.title);
  const [editRole, setEditRole] = useState<UserRole>(user.role);
  const [editScope, setEditScope] = useState<DepartmentScope>(
    user.departmentScope
  );
  const [editEmployment, setEditEmployment] = useState<EmploymentType>(
    user.employmentType
  );
  const [editPirateCharacter, setEditPirateCharacter] = useState(
    user.pirateCharacter || ""
  );
  const [editBirthDate, setEditBirthDate] = useState(user.birthDate || "");
  const [editImgLimit, setEditImgLimit] = useState(
    user.weeklyImageLimit ? String(user.weeklyImageLimit) : ""
  );
  const [editVidLimit, setEditVidLimit] = useState(
    user.dailyVideoLimit ? String(user.dailyVideoLimit) : ""
  );
  const [editDailyKpi, setEditDailyKpi] = useState<DailyKpiItem[]>(
    () => resolveEffectiveDailyKpi(user).items
  );
  const [editNewPw, setEditNewPw] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      id: user.id,
      name: editName,
      title: editTitle,
      role: editRole,
      departmentScope: editScope,
      employmentType: editEmployment,
      pirateCharacter: editPirateCharacter || null,
      birthDate: editBirthDate || null,
      weeklyImageLimit: editImgLimit ? Number(editImgLimit) : null,
      dailyVideoLimit: editVidLimit ? Number(editVidLimit) : null,
      dailyKpiJson: editDailyKpi,
      newPassword: editNewPw.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Chỉnh sửa tài khoản: {user.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ tên
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chức danh hiển thị
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quyền
            </label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              <option value="MEMBER">Nhân viên</option>
              <option value="LEADER">Leader</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chuyên môn
            </label>
            <select
              value={editScope}
              onChange={(e) => setEditScope(e.target.value as DepartmentScope)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              {Object.entries(DEPARTMENT_SCOPE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hình thức
            </label>
            <select
              value={editEmployment}
              onChange={(e) =>
                setEditEmployment(e.target.value as EmploymentType)
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              🎂 Sinh nhật
            </label>
            <input
              type="date"
              value={editBirthDate}
              onChange={(e) => setEditBirthDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Ảnh / tuần
            </label>
            <input
              type="number"
              min={0}
              value={editImgLimit}
              onChange={(e) => setEditImgLimit(e.target.value)}
              placeholder="VD: 16"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Video / ngày
            </label>
            <input
              type="number"
              min={0}
              value={editVidLimit}
              onChange={(e) => setEditVidLimit(e.target.value)}
              placeholder="VD: 2"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reset mật khẩu mới
            </label>
            <input
              type="text"
              value={editNewPw}
              onChange={(e) => setEditNewPw(e.target.value)}
              placeholder="Bỏ trống nếu giữ cũ"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            🎯 Các đầu việc KPI hàng ngày (tự đồng bộ sang Nhật Ký Hải Trình)
          </label>
          <DailyKpiTargetEditor
            items={editDailyKpi}
            projects={projects}
            onChange={setEditDailyKpi}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            ⚓ Nhân vật One Piece 3D (chọn hoặc đổi nhân vật khác)
          </label>
          <PirateCharacterPicker
            value={editPirateCharacter}
            onChange={setEditPirateCharacter}
            users={allUsers}
            excludeUserId={user.id}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold cursor-pointer"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
