"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  PIRATE_CHARACTER_CATALOG,
  PirateAvatar,
} from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import type { AuthUser } from "@/lib/auth";
import { DEPARTMENT_SCOPE_LABEL } from "@/lib/constants";
import { ICON_PRESETS, TONE_OPTIONS } from "@/lib/tone";

export type AccountSettingsTab = "PROFILE" | "SECURITY" | "CUSTOMIZE";

export interface UpdatedAccountProfile {
  name: string;
  email: string;
  title: string;
  avatarColor: string;
  pirateCharacter: string | null;
  preferredTone: string;
  preferredIcon: string | null;
  personalMotto: string | null;
  birthDate: string | null;
}

const AVATAR_COLOR_PRESETS = [
  "#0f172a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#e11d48",
  "#ea580c",
  "#d97706",
  "#059669",
  "#0891b2",
  "#65a30d",
];

interface AccountSettingsModalProps {
  open: boolean;
  initialTab?: AccountSettingsTab;
  user: AuthUser;
  onClose: () => void;
  onProfileSaved: (updated: UpdatedAccountProfile) => void;
}

export function AccountSettingsModal({
  open,
  initialTab = "PROFILE",
  user,
  onClose,
  onProfileSaved,
}: AccountSettingsModalProps) {
  if (!open) return null;
  return (
    <AccountSettingsModalInner
      key={`${user.id}-${initialTab}-${user.email}-${user.name}`}
      initialTab={initialTab}
      user={user}
      onClose={onClose}
      onProfileSaved={onProfileSaved}
    />
  );
}

function AccountSettingsModalInner({
  initialTab,
  user,
  onClose,
  onProfileSaved,
}: {
  initialTab: AccountSettingsTab;
  user: AuthUser;
  onClose: () => void;
  onProfileSaved: (updated: UpdatedAccountProfile) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AccountSettingsTab>(initialTab);

  // Tab 1: Thông tin & Tài khoản đăng nhập
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [title, setTitle] = useState(user.title || "");
  const [birthDate, setBirthDate] = useState(user.birthDate || "");
  const [personalMotto, setPersonalMotto] = useState(user.personalMotto || "");
  const [confirmPwForAccount, setConfirmPwForAccount] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Tab 2: Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Tab 3: Cá nhân hóa
  const [pirateCharacter, setPirateCharacter] = useState<string>(
    user.pirateCharacter || ""
  );
  const [avatarColor, setAvatarColor] = useState<string>(
    user.avatarColor || "#2563eb"
  );
  const [preferredIcon, setPreferredIcon] = useState<string>(
    user.preferredIcon || ""
  );
  const [preferredTone, setPreferredTone] = useState<string>(
    user.preferredTone || "PIRATE"
  );
  const [savingCustomize, setSavingCustomize] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isAccountChanged = normalizedEmail !== user.email.toLowerCase();
  const passwordsMismatch =
    confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast("Tên hiển thị cần ít nhất 2 ký tự.", "error");
      return;
    }
    if (isAccountChanged && !confirmPwForAccount) {
      showToast(
        "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi tài khoản đăng nhập.",
        "error"
      );
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          title: title.trim(),
          birthDate: birthDate.trim() || null,
          personalMotto: personalMotto.trim() || null,
          ...(isAccountChanged
            ? { currentPassword: confirmPwForAccount }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể cập nhật thông tin tài khoản.", "error");
        return;
      }

      const saved = data.user as UpdatedAccountProfile;
      onProfileSaved(saved);
      setConfirmPwForAccount("");
      showToast(
        data.accountChanged
          ? `Đã cập nhật tài khoản đăng nhập mới: ${saved.email}`
          : "Đã lưu thông tin tài khoản cá nhân!"
      );
      router.refresh();
      onClose();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Mật khẩu mới cần tối thiểu 6 ký tự.", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("Mật khẩu nhập lại chưa khớp.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Đổi mật khẩu thất bại.", "error");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      showToast("Đổi mật khẩu thành công!");
      onClose();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveCustomize(e: React.FormEvent) {
    e.preventDefault();
    setSavingCustomize(true);
    try {
      const res = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pirateCharacter: pirateCharacter || null,
          avatarColor,
          preferredIcon: preferredIcon || null,
          preferredTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể lưu tùy chỉnh cá nhân.", "error");
        return;
      }

      const saved = data.user as UpdatedAccountProfile;
      onProfileSaved(saved);
      showToast("Đã cập nhật giao diện & nhân vật cá nhân!");
      router.refresh();
      onClose();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSavingCustomize(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] bg-white rounded-2xl border-2 border-amber-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PirateAvatar
              name={name || user.name}
              color={avatarColor}
              scope={user.departmentScope}
              pirateCharacter={pirateCharacter || null}
              size="lg"
            />
            <div className="min-w-0">
              <div className="text-base font-extrabold truncate">
                {preferredIcon ? `${preferredIcon} ` : ""}
                {name || user.name}
              </div>
              <div className="text-xs text-sky-200/85 truncate">
                {email || user.email} •{" "}
                {DEPARTMENT_SCOPE_LABEL[user.departmentScope]}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/70 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("PROFILE")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              tab === "PROFILE"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "text-slate-700 hover:bg-amber-100/80"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Thông tin &amp; Tài khoản
          </button>
          <button
            type="button"
            onClick={() => setTab("SECURITY")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              tab === "SECURITY"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "text-slate-700 hover:bg-amber-100/80"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Đổi mật khẩu
          </button>
          <button
            type="button"
            onClick={() => setTab("CUSTOMIZE")}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              tab === "CUSTOMIZE"
                ? "bg-[#0B2545] text-amber-300 shadow-xs"
                : "text-slate-700 hover:bg-amber-100/80"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Cá nhân hóa
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "PROFILE" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Nguyễn Mai"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chức danh hiển thị
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Graphic Designer"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tài khoản / Email đăng nhập{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@metaecom.vn hoặc tên đăng nhập"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none pl-9 pr-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dùng để đăng nhập vào hệ thống (hỗ trợ cả email lẫn tên đăng nhập không dấu, không khoảng trắng).
                </p>
              </div>

              {isAccountChanged && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Xác nhận mật khẩu để đổi tài khoản đăng nhập
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      required
                      value={confirmPwForAccount}
                      onChange={(e) => setConfirmPwForAccount(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại của bạn..."
                      className="w-full rounded-xl border border-amber-300 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🎂 Ngày sinh nhật
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khẩu hiệu cá nhân
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={personalMotto}
                    onChange={(e) => setPersonalMotto(e.target.value)}
                    placeholder="VD: Hôm nay chốt gọn mọi deadline!"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 disabled:opacity-50 text-white px-5 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          )}

          {tab === "SECURITY" && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurPw ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none pl-9 pr-9 py-2 text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCurPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none pl-9 pr-9 py-2 text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`w-full rounded-xl border focus:outline-none pl-9 pr-3 py-2 text-sm text-slate-900 ${
                      passwordsMismatch
                        ? "border-rose-400 bg-rose-50/40"
                        : "border-slate-200 focus:border-amber-500"
                    }`}
                  />
                </div>
                {passwordsMismatch && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">
                    Mật khẩu nhập lại chưa trùng khớp.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || passwordsMismatch}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 disabled:opacity-50 text-white px-5 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  {savingPassword ? "Đang đổi..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          )}

          {tab === "CUSTOMIZE" && (
            <form onSubmit={handleSaveCustomize} className="space-y-4">
              {/* Chọn nhân vật 3D */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Nhân vật đại diện
                  </label>
                  {pirateCharacter && (
                    <button
                      type="button"
                      onClick={() => setPirateCharacter("")}
                      className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Dùng mặc định theo vị trí
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PIRATE_CHARACTER_CATALOG.map((ch) => {
                    const selected = pirateCharacter === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setPirateCharacter(ch.id)}
                        className={`rounded-xl border p-2 flex flex-col items-center gap-1 transition cursor-pointer ${
                          selected
                            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                            : "border-slate-200 bg-white hover:border-amber-300"
                        }`}
                      >
                        <PirateAvatar
                          name={ch.characterName}
                          color={avatarColor}
                          pirateCharacter={ch.id}
                          size="md"
                        />
                        <span className="text-[11px] font-bold text-slate-800 truncate w-full text-center">
                          {ch.characterName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Màu đại diện */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Màu đại diện
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {AVATAR_COLOR_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAvatarColor(hex)}
                      style={{ backgroundColor: hex }}
                      title={hex}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                        avatarColor.toLowerCase() === hex.toLowerCase()
                          ? "ring-2 ring-offset-2 ring-amber-500 scale-110"
                          : "hover:scale-105"
                      }`}
                    >
                      {avatarColor.toLowerCase() === hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={avatarColor}
                    onChange={(e) => setAvatarColor(e.target.value)}
                    title="Chọn màu tùy ý"
                    className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                </div>
              </div>

              {/* Icon cá nhân */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Icon đứng trước tên
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreferredIcon("")}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                      !preferredIcon
                        ? "border-amber-500 bg-amber-100 text-amber-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Không dùng
                  </button>
                  {ICON_PRESETS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setPreferredIcon(ic)}
                      className={`w-8 h-8 rounded-lg border text-base flex items-center justify-center cursor-pointer transition ${
                        preferredIcon === ic
                          ? "border-amber-500 bg-amber-100 ring-2 ring-amber-200 scale-105"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giọng điệu hệ thống */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Giọng điệu toàn hệ thống (cho riêng bạn)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setPreferredTone(opt.mode)}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        preferredTone === opt.mode
                          ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-200"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-lg leading-none">{opt.emoji}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingCustomize}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 disabled:opacity-50 text-white px-5 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
                >
                  {savingCustomize ? "Đang lưu..." : "Lưu tùy chỉnh"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
