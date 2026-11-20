"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  CheckSquare,
  ScrollText,
  Users,
  LogOut,
  Map as MapIcon,
  Menu,
  X,
  CheckCheck,
  Coins,
  KeyRound,
  MessageCircle,
  FolderCheck,
  FolderOpen,
  GraduationCap,
  CalendarClock,
  Camera,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { NotificationItem, SimpleProject } from "@/types/crm";
import { formatVnDateTime } from "@/lib/dates";
import { ICON_PRESETS, TONE_OPTIONS } from "@/lib/tone";
import { PushNotificationButton } from "@/components/push-notification-button";
import { TrashBinDrawer } from "@/components/trash-bin-drawer";
import { useToast } from "@/components/toast-provider";
import {
  DenDenMushiIcon,
  PirateAvatar,
  StrawHatLogo,
  getPirateRankLabel,
} from "@/components/pirate-art";

interface AppShellProps {
  user: AuthUser;
  projects: SimpleProject[];
  initialNotifications: NotificationItem[];
  pendingReviewsCount: number;
  initialChatUnreadCount?: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  projects,
  initialNotifications,
  pendingReviewsCount,
  initialChatUnreadCount = 0,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications
  );
  const [chatUnreadOverride, setChatUnreadOverride] = useState<{
    base: number;
    value: number;
  } | null>(null);
  const chatUnread =
    chatUnreadOverride && chatUnreadOverride.base === initialChatUnreadCount
      ? chatUnreadOverride.value
      : initialChatUnreadCount;

  // Modal đổi mật khẩu cá nhân
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Modal Custom Giọng văn & Icon cá nhân + Ngày sinh + Thùng rác
  const [prefOpen, setPrefOpen] = useState(false);
  const [prefTone, setPrefTone] = useState(user.preferredTone || "PIRATE");
  const [prefIcon, setPrefIcon] = useState(user.preferredIcon || "");
  const [prefMotto, setPrefMotto] = useState(user.personalMotto || "");
  const [prefBirthDate, setPrefBirthDate] = useState(user.birthDate || "");
  const [prefSaving, setPrefSaving] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const syncUnread = () => {
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data) return;
          if (data.notifications) setNotifications(data.notifications);
          if (typeof data.chatUnreadCount === "number") {
            setChatUnreadOverride({
              base: initialChatUnreadCount,
              value: data.chatUnreadCount,
            });
          }
        })
        .catch(() => {});
    };

    const timer = setInterval(syncUnread, 30_000);
    const onChatSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === "number") {
        setChatUnreadOverride({
          base: initialChatUnreadCount,
          value: detail.unreadCount,
        });
      } else {
        syncUnread();
      }
    };
    window.addEventListener("chat-unread-updated", onChatSync);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("chat-unread-updated", onChatSync);
    };
  }, [initialChatUnreadCount]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pirateRank = getPirateRankLabel(
    user.departmentScope,
    user.name,
    user.pirateCharacter
  );

  const navGroups = [
    {
      label: "Hằng ngày",
      items: [
        ...(user.role === "LEADER"
          ? [
              {
                href: "/leader",
                label: "Boong Thuyền Trưởng",
                icon: Compass,
                badge: 0,
              },
            ]
          : []),
        {
          href: "/my-work",
          label: "Nhật Ký Hải Trình",
          icon: CheckSquare,
          badge: 0,
        },
        {
          href: "/media-orders",
          label: "Order Media",
          icon: Camera,
          badge: 0,
        },
        {
          href: "/chat",
          label: "Chat Băng Mũ Rơm",
          icon: MessageCircle,
          badge: chatUnread,
        },
      ],
    },
    {
      label: "Kiểm tra & Báo cáo",
      items: [
        {
          href: "/outputs",
          label:
            user.role === "LEADER"
              ? "Kiểm Tra & Duyệt Output"
              : "Output Của Tôi",
          icon: FolderCheck,
          badge: user.role === "LEADER" ? pendingReviewsCount : 0,
        },
        {
          href: "/reports",
          label: "Báo Cáo Công Việc",
          icon: ScrollText,
          badge: 0,
        },
        {
          href: "/fanpage-reports",
          label: "Báo Cáo Dữ Liệu Fanpage",
          icon: TrendingUp,
          badge: 0,
        },
      ],
    },
    {
      label: "Hậu cần / Quản trị",
      items: [
        {
          href: "/knowledge",
          label: "Khu Luyện Tập",
          icon: GraduationCap,
          badge: 0,
        },
        {
          href: "/resources",
          label: "Tài Nguyên & Thiết Bị",
          icon: FolderOpen,
          badge: 0,
        },
        {
          href: "/schedule",
          label: "Lịch Hoạt Động Băng",
          icon: CalendarClock,
          badge: 0,
        },
        {
          href: "/budgets",
          label: "Kho Báu Ngân Sách",
          icon: Coins,
          badge: 0,
        },
        ...(user.role === "LEADER"
          ? [
              {
                href: "/team",
                label: "Băng & Ốc Sên Tin",
                icon: Users,
                badge: 0,
              },
            ]
          : []),
      ],
    },
  ];

  const activePageTitle = (() => {
    const matchedNav = navGroups
      .flatMap((g) => g.items)
      .find(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      );
    if (matchedNav) return matchedNav.label;
    const matchedProj = projects.find((p) => pathname === `/projects/${p.slug}`);
    if (matchedProj) return `Dự án • ${matchedProj.name}`;
    return "Meta Ecom MKT Hub";
  })();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
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
      showToast("Đã đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setPwOpen(false);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredTone: prefTone,
          preferredIcon: prefIcon || null,
          personalMotto: prefMotto || null,
          birthDate: prefBirthDate || null,
        }),
      });
      if (res.ok) {
        showToast("Đã cập nhật giọng hệ thống & icon cá nhân!");
        setPrefOpen(false);
        router.refresh();
      } else {
        showToast("Không lưu được tùy chỉnh.", "error");
      }
    } finally {
      setPrefSaving(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleClickNotification(item: NotificationItem) {
    if (!item.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    setBellOpen(false);
    if (item.linkUrl) {
      router.push(item.linkUrl);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B2545] text-slate-100 border-r border-amber-400/20">
      <div className="px-4 py-4 border-b border-sky-300/15 flex items-center justify-between">
        <Link
          href={user.role === "LEADER" ? "/leader" : "/my-work"}
          className="flex items-center gap-2.5"
        >
          <div className="h-10 w-10 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0">
            <StrawHatLogo className="w-8 h-8" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-amber-300 leading-tight">
              Băng Mũ Rơm
            </div>
            <div className="text-[11px] text-sky-200/80">
              Meta Ecom • Sunny Hub
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-sky-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md"
                        : "text-sky-100/80 hover:bg-sky-900/50 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge > 0 && (
                      <span className="rounded-full bg-amber-300 text-slate-950 text-[11px] font-extrabold px-2 py-0.5 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/70">
              {user.role === "LEADER" ? "🗺️ Toàn bộ Hải Đồ" : "🗺️ Hải Đồ Của Bạn"}
            </span>
            <span className="text-[11px] text-sky-200/60">{projects.length}</span>
          </div>

          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-sky-200/60">
                Chưa tham gia đảo nào
              </div>
            ) : (
              projects.map((p) => {
                const href = `/projects/${p.slug}`;
                const active = pathname === href;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-sky-900/70 text-amber-200 font-bold border border-amber-300/30"
                        : "text-sky-100/80 hover:bg-sky-900/40 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/30"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-sky-300/15 bg-[#081C36]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <PirateAvatar
              name={user.name}
              color={user.avatarColor}
              scope={user.departmentScope}
              pirateCharacter={user.pirateCharacter}
              size="lg"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {prefIcon || user.preferredIcon ? `${prefIcon || user.preferredIcon} ` : ""}
                {user.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setPrefOpen(true)}
              title="Custom Giọng & Icon"
              className="p-2 rounded-lg text-sky-200/70 hover:text-amber-300 hover:bg-sky-900/60 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTrashOpen(true)}
              title="Thùng rác & Khôi phục"
              className="p-2 rounded-lg text-sky-200/70 hover:text-amber-300 hover:bg-sky-900/60 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPwOpen(true)}
              title="Đổi mật khẩu"
              className="p-2 rounded-lg text-sky-200/70 hover:text-amber-300 hover:bg-sky-900/60 transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Rời tàu (Đăng xuất)"
              className="p-2 rounded-lg text-sky-200/70 hover:text-rose-400 hover:bg-sky-900/60 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FFFDF7]">
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen print:hidden">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-6">
        <header className="sticky top-0 z-30 bg-[#FFFDF7]/90 backdrop-blur border-b border-amber-200/70 px-4 sm:px-6 h-14 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-amber-100/60"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border bg-amber-50 text-slate-900 border-amber-200 shrink-0">
                {pirateRank.emoji} {user.name}
              </span>
              <span className="hidden sm:inline text-xs font-bold text-slate-700 truncate">
                {activePageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <PushNotificationButton compact />
            <button
              type="button"
              onClick={() => setPrefOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
              title="Đổi giọng hệ thống & Icon cá nhân"
            >
              <span>{prefIcon || user.preferredIcon || "🏴‍☠️"}</span>
              <span>Giọng / Icon</span>
            </button>
            <button
              type="button"
              onClick={() => setBellOpen((prev) => !prev)}
              className="relative px-2.5 py-1.5 rounded-2xl border border-amber-200 bg-white hover:bg-amber-50 transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              aria-label="Ốc sên truyền tin"
              title="Den Den Mushi — Thông báo"
            >
              <DenDenMushiIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                Tin báo
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setBellOpen(false)}
                />
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl border-2 border-amber-200 shadow-xl z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <DenDenMushiIcon className="w-4 h-4" />
                      Den Den Mushi ({unreadCount} tin mới)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Đọc hết
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-amber-100/70">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500">
                        Biển êm gió lặng — chưa có tin báo mới.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleClickNotification(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-amber-50/50 transition cursor-pointer ${
                            !n.isRead ? "bg-sky-50/50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{formatVnDateTime(n.createdAt)}</span>
                            {n.emailSent && (
                              <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5">
                                Đã gửi Email
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Modal Đổi mật khẩu */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setPwOpen(false)}
          />
          <form
            onSubmit={handleChangePassword}
            className="relative z-10 w-full max-w-sm bg-white rounded-2xl border-2 border-amber-200 shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Đổi mật mã lên tàu
              </h3>
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={pwSaving}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold cursor-pointer"
              >
                {pwSaving ? "Đang lưu..." : "Lưu mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Custom Giọng & Icon */}
      {prefOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setPrefOpen(false)}
          />
          <form
            onSubmit={handleSavePreferences}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Custom Giọng văn & Icon cá nhân
              </h3>
              <button
                type="button"
                onClick={() => setPrefOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Chọn giọng điệu toàn hệ thống (cho riêng bạn)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setPrefTone(opt.mode)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                      prefTone === opt.mode
                        ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-200"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl leading-none">{opt.emoji}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn Icon đại diện cạnh tên
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_PRESETS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setPrefIcon(ic)}
                    className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center cursor-pointer ${
                      prefIcon === ic
                        ? "bg-amber-100 border-amber-500 ring-2 ring-amber-200"
                        : "bg-slate-50 border-slate-200 hover:bg-amber-50"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Châm ngôn cá nhân (tùy chọn)
              </label>
              <input
                type="text"
                value={prefMotto}
                onChange={(e) => setPrefMotto(e.target.value)}
                placeholder="VD: Deadline chỉ là phù du, đi uống trà sữa mới là chân ái..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🎂 Ngày sinh nhật (để Băng chúc mừng đúng ngày)
              </label>
              <input
                type="date"
                value={prefBirthDate}
                onChange={(e) => setPrefBirthDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrefOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={prefSaving}
                className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                {prefSaving ? "Đang lưu..." : "Lưu tùy chỉnh"}
              </button>
            </div>
          </form>
        </div>
      )}

      <TrashBinDrawer
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        userRole={user.role}
        toneMode={prefTone || user.preferredTone}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFDF7] border-t border-amber-200 grid grid-cols-6 h-16 px-1 print:hidden">
        <Link
          href={user.role === "LEADER" ? "/leader" : "/my-work"}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname === "/leader" || pathname === "/my-work"
              ? "text-red-600"
              : "text-slate-500"
          }`}
        >
          {user.role === "LEADER" ? (
            <Compass className="w-4 h-4" />
          ) : (
            <CheckSquare className="w-4 h-4" />
          )}
          <span>{user.role === "LEADER" ? "Boong tàu" : "Hải trình"}</span>
        </Link>

        <Link
          href="/chat"
          className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname === "/chat" ? "text-red-600" : "text-slate-500"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat</span>
          {chatUnread > 0 && (
            <span className="absolute top-1 right-2 rounded-full bg-rose-600 text-white text-[9px] font-bold px-1.5">
              {chatUnread}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname.startsWith("/projects") ? "text-red-600" : "text-slate-500"
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Hải đồ ({projects.length})</span>
        </button>

        <Link
          href="/outputs"
          className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname === "/outputs" ? "text-red-600" : "text-slate-500"
          }`}
        >
          <FolderCheck className="w-4 h-4" />
          <span>{user.role === "LEADER" ? "Duyệt QC" : "Output"}</span>
          {user.role === "LEADER" && pendingReviewsCount > 0 && (
            <span className="absolute top-1 right-2 rounded-full bg-rose-600 text-white text-[9px] font-bold px-1.5">
              {pendingReviewsCount}
            </span>
          )}
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname === "/reports" ? "text-red-600" : "text-slate-500"
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>Tổng kết</span>
        </Link>

        <Link
          href="/budgets"
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
            pathname === "/budgets" ? "text-red-600" : "text-slate-500"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Ngân sách</span>
        </Link>
      </nav>
    </div>
  );
}
