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
  UserCog,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { NotificationItem, SimpleProject } from "@/types/crm";
import { isMediaProductionUser } from "@/lib/constants";
import { formatVnDateTime } from "@/lib/dates";
import {
  AccountSettingsModal,
  type AccountSettingsTab,
} from "@/components/account-settings-modal";
import { PushNotificationButton } from "@/components/push-notification-button";
import { TrashBinDrawer } from "@/components/trash-bin-drawer";
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

  const [prevUserProp, setPrevUserProp] = useState<AuthUser>(user);
  const [liveUser, setLiveUser] = useState<AuthUser>(user);
  if (prevUserProp !== user) {
    setPrevUserProp(user);
    setLiveUser(user);
  }

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

  // Modal Cài đặt Tài khoản Cá nhân (Tên, Tài khoản, Mật khẩu, Cá nhân hóa) & Thùng rác
  const [accountModalTab, setAccountModalTab] =
    useState<AccountSettingsTab | null>(null);
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

  useEffect(() => {
    if (!bellOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [bellOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pirateRank = getPirateRankLabel(
    liveUser.departmentScope,
    liveUser.name,
    liveUser.pirateCharacter
  );

  const isMediaProduction = isMediaProductionUser(
    user.role,
    user.departmentScope
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
        ...(!isMediaProduction
          ? [
              {
                href: "/media-orders",
                label: "Order Media",
                icon: Camera,
                badge: 0,
              },
            ]
          : []),
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
        ...(!isMediaProduction
          ? [
              {
                href: "/fanpage-reports",
                label: "Báo Cáo Dữ Liệu Fanpage",
                icon: TrendingUp,
                badge: 0,
              },
            ]
          : []),
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

        {!isMediaProduction && (
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
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-sky-300/15 bg-[#081C36]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setAccountModalTab("PROFILE");
            }}
            title="Cài đặt tài khoản cá nhân (Tên, Tài khoản, Mật khẩu)"
            className="flex items-center gap-2.5 min-w-0 text-left rounded-xl p-1 -m-1 hover:bg-sky-900/50 transition cursor-pointer flex-1"
          >
            <PirateAvatar
              name={liveUser.name}
              color={liveUser.avatarColor}
              scope={liveUser.departmentScope}
              pirateCharacter={liveUser.pirateCharacter}
              size="lg"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {liveUser.preferredIcon ? `${liveUser.preferredIcon} ` : ""}
                {liveUser.name}
              </div>
              <div className="text-[10px] text-sky-200/70 truncate">
                Tài khoản cá nhân
              </div>
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAccountModalTab("CUSTOMIZE");
              }}
              title="Cá nhân hóa (Nhân vật, Giọng văn, Icon)"
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
              onClick={() => {
                setMobileMenuOpen(false);
                setAccountModalTab("SECURITY");
              }}
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

      <div className="flex-1 min-w-0 flex flex-col pb-24 md:pb-6">
        <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur border-b border-amber-200/70 pt-safe print:hidden">
          <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở menu điều hướng"
                className="md:hidden p-2 -ml-1.5 rounded-xl text-slate-700 hover:bg-amber-100/60 shrink-0 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setAccountModalTab("PROFILE")}
                  title="Mở cài đặt tài khoản cá nhân"
                  className="inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[11px] font-bold border bg-amber-50 hover:bg-amber-100 text-slate-900 border-amber-200 shrink-0 max-w-[110px] sm:max-w-none truncate transition cursor-pointer"
                >
                  <span className="shrink-0">{liveUser.preferredIcon || pirateRank.emoji}</span>
                  <span className="truncate">{liveUser.name}</span>
                </button>
                <span className="text-xs font-bold text-slate-700 truncate">
                  {activePageTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
              <PushNotificationButton compact />
              <button
                type="button"
                onClick={() => setAccountModalTab("PROFILE")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                title="Đổi Tên, Tài khoản, Mật khẩu & Cá nhân hóa"
                aria-label="Cài đặt tài khoản cá nhân"
              >
                <UserCog className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Tài khoản</span>
              </button>
              <button
                type="button"
                onClick={() => setBellOpen((prev) => !prev)}
                className="relative px-2 sm:px-2.5 py-1.5 rounded-2xl border border-amber-200 bg-white hover:bg-amber-50 transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                aria-label="Ốc sên truyền tin"
                aria-expanded={bellOpen}
                title="Den Den Mushi — Thông báo"
              >
                <DenDenMushiIcon className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                  Tin Bão
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Popup Thông báo Den Den Mushi render ngoài <header> để không bị backdrop-blur kẹt position:fixed trên iOS */}
      {bellOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Đóng bảng thông báo"
            onClick={() => setBellOpen(false)}
            className="fixed inset-0 w-full h-full bg-slate-950/35 backdrop-blur-[1px] cursor-default"
          />
          <div
            role="dialog"
            aria-label="Danh sách thông báo"
            style={{
              top: "calc(env(safe-area-inset-top) + 3.75rem)",
            }}
            className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-96 max-h-[75dvh] bg-white rounded-2xl border-2 border-amber-200 shadow-2xl z-10 flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/80 flex items-center justify-between gap-2 shrink-0">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 min-w-0 truncate">
                <DenDenMushiIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Den Den Mushi ({unreadCount} tin mới)
                </span>
              </span>
              <div className="flex items-center gap-2 shrink-0">
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
                <button
                  type="button"
                  onClick={() => setBellOpen(false)}
                  aria-label="Đóng thông báo"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-amber-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-amber-100/70">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Biển êm gió lặng — chưa có Tin Bão mới.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickNotification(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-amber-50/50 active:bg-amber-50 transition cursor-pointer ${
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
        </div>
      )}

      <AccountSettingsModal
        open={accountModalTab !== null}
        initialTab={accountModalTab ?? "PROFILE"}
        user={liveUser}
        onClose={() => setAccountModalTab(null)}
        onProfileSaved={(updated) =>
          setLiveUser((prev) => ({
            ...prev,
            ...updated,
          }))
        }
      />

      <TrashBinDrawer
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        userRole={liveUser.role}
        toneMode={liveUser.preferredTone}
      />

      {/* Mobile Bottom Navigation */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFDF7]/95 backdrop-blur border-t border-amber-200 shadow-[0_-2px_10px_rgba(15,23,42,0.06)] ${
          isMediaProduction ? "grid grid-cols-5" : "grid grid-cols-6"
        } min-h-16 pt-1.5 pb-safe px-1 print:hidden`}
      >
        <Link
          href={user.role === "LEADER" ? "/leader" : "/my-work"}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition ${
            pathname === "/leader" || pathname === "/my-work"
              ? "text-red-600 bg-amber-100/70 font-bold"
              : "text-slate-500"
          }`}
        >
          {user.role === "LEADER" ? (
            <Compass className="w-4 h-4" />
          ) : (
            <CheckSquare className="w-4 h-4" />
          )}
          <span className="truncate max-w-full px-0.5">
            {user.role === "LEADER" ? "Boong tàu" : "Hải trình"}
          </span>
        </Link>

        <Link
          href="/chat"
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition ${
            pathname === "/chat"
              ? "text-red-600 bg-amber-100/70 font-bold"
              : "text-slate-500"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="truncate max-w-full px-0.5">Chat</span>
          {chatUnread > 0 && (
            <span className="absolute top-0.5 right-1.5 rounded-full bg-rose-600 text-white text-[9px] font-bold px-1.5 leading-tight">
              {chatUnread}
            </span>
          )}
        </Link>

        {!isMediaProduction && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition cursor-pointer ${
              pathname.startsWith("/projects")
                ? "text-red-600 bg-amber-100/70 font-bold"
                : "text-slate-500"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span className="truncate max-w-full px-0.5">
              Hải đồ ({projects.length})
            </span>
          </button>
        )}

        <Link
          href="/outputs"
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition ${
            pathname === "/outputs"
              ? "text-red-600 bg-amber-100/70 font-bold"
              : "text-slate-500"
          }`}
        >
          <FolderCheck className="w-4 h-4" />
          <span className="truncate max-w-full px-0.5">
            {user.role === "LEADER" ? "Duyệt QC" : "Output"}
          </span>
          {user.role === "LEADER" && pendingReviewsCount > 0 && (
            <span className="absolute top-0.5 right-1.5 rounded-full bg-rose-600 text-white text-[9px] font-bold px-1.5 leading-tight">
              {pendingReviewsCount}
            </span>
          )}
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition ${
            pathname === "/reports"
              ? "text-red-600 bg-amber-100/70 font-bold"
              : "text-slate-500"
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span className="truncate max-w-full px-0.5">Báo cáo</span>
        </Link>

        <Link
          href="/budgets"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold rounded-xl py-1 transition ${
            pathname === "/budgets"
              ? "text-red-600 bg-amber-100/70 font-bold"
              : "text-slate-500"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span className="truncate max-w-full px-0.5">Ngân sách</span>
        </Link>
      </nav>
    </div>
  );
}
