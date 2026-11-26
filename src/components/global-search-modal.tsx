"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckSquare,
  Coins,
  Compass,
  ExternalLink,
  FolderCheck,
  FolderOpen,
  Map as MapIcon,
  MessageCircle,
  ScrollText,
  Search,
  Users,
  X,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";

interface SearchResultPayload {
  tasks: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    taskType: string;
    isMediaOrder: boolean;
    project: { id: string; slug: string; name: string; color: string };
    assignee: { name: string } | null;
  }>;
  projects: Array<{
    id: string;
    slug: string;
    name: string;
    color: string;
    masterResourceUrl: string | null;
  }>;
  resources: Array<{
    id: string;
    title: string;
    url: string;
    scope: string;
    project: { name: string; color: string } | null;
  }>;
  equipment: Array<{
    id: string;
    code: string;
    name: string;
    managerName: string | null;
    status: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    title: string;
    role: string;
    avatarColor: string;
  }>;
}

interface FlatActionItem {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  badge?: string;
  color?: string;
  href?: string;
  externalUrl?: string;
}

export function GlobalSearchModal({
  open,
  userRole,
  isMediaProduction,
  onClose,
}: {
  open: boolean;
  userRole: UserRole;
  isMediaProduction: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultPayload | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setQuery("");
      setResults(null);
      setActiveIndex(0);
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      const raf = requestAnimationFrame(() => {
        setResults(null);
        setLoading(false);
      });
      return () => cancelAnimationFrame(raf);
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data: SearchResultPayload = await res.json();
          setResults(data);
          setActiveIndex(0);
        }
      } catch {
        // Ignore abort / transient error
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const quickShortcuts = useMemo<FlatActionItem[]>(() => {
    return [
      ...(userRole === "LEADER"
        ? [
            {
              id: "nav-leader",
              group: "Đi nhanh tới trang",
              title: "Boong Thuyền Trưởng",
              subtitle: "Tổng quan tiến độ toàn đội",
              href: "/leader",
            },
          ]
        : []),
      {
        id: "nav-my-work",
        group: "Đi nhanh tới trang",
        title: "Nhật Ký Hải Trình",
        subtitle: "Công việc & KPI hàng ngày của bạn",
        href: "/my-work",
      },
      {
        id: "nav-chat",
        group: "Đi nhanh tới trang",
        title: "Chat Băng Mũ Rơm",
        subtitle: "Nhắn nhóm, 1-1 & Ẩn danh bảo mật",
        href: "/chat",
      },
      {
        id: "nav-outputs",
        group: "Đi nhanh tới trang",
        title: userRole === "LEADER" ? "Kiểm Tra & Duyệt Output" : "Output Của Tôi",
        subtitle: "Xem & duyệt ấn phẩm, bài viết",
        href: "/outputs",
      },
      {
        id: "nav-resources",
        group: "Đi nhanh tới trang",
        title: "Tài Nguyên & Link Tổng Dự Án",
        subtitle: "Drive, Canva, kho tư liệu chung",
        href: "/resources",
      },
      {
        id: "nav-equipment",
        group: "Đi nhanh tới trang",
        title: "Thiết Bị & Đặt Lịch Máy",
        subtitle: "Máy quay, mic, đèn & người quản lý",
        href: "/resources?tab=equipment",
      },
      {
        id: "nav-budgets",
        group: "Đi nhanh tới trang",
        title: "Kho Báu Ngân Sách & Xuất Hóa Đơn VAT",
        subtitle: "Copy thông tin VAT + mở Sheet thu chi",
        href: "/budgets",
      },
      {
        id: "nav-reports",
        group: "Đi nhanh tới trang",
        title: "Báo Cáo Công Việc",
        subtitle: "Tổng hợp kết quả tuần / tháng",
        href: "/reports",
      },
      ...(userRole === "LEADER"
        ? [
            {
              id: "nav-team",
              group: "Đi nhanh tới trang",
              title: "Băng & Ốc Sên Tin (Quản lý Team & Dự án)",
              subtitle: "Tạo dự án, chia KPI, phân nhân sự",
              href: "/team",
            },
          ]
        : []),
    ];
  }, [userRole]);

  const flatItems = useMemo<FlatActionItem[]>(() => {
    if (!query.trim()) return quickShortcuts;
    if (!results) return [];

    const list: FlatActionItem[] = [];
    for (const p of results.projects) {
      list.push({
        id: `proj-${p.id}`,
        group: "Dự án / Hải đồ",
        title: p.name,
        subtitle: p.masterResourceUrl ? "Có Link tổng dự án" : "Mở không gian dự án",
        color: p.color,
        href: isMediaProduction ? `/resources?projectId=${p.id}` : `/projects/${p.slug}`,
      });
    }
    for (const t of results.tasks) {
      const targetHref = isMediaProduction
        ? `/my-work?taskId=${t.id}`
        : `/projects/${t.project.slug}?tab=${t.isMediaOrder ? "MEDIA_BRIEF" : "CONTENT_CALENDAR"}&taskId=${t.id}`;
      list.push({
        id: `task-${t.id}`,
        group: "Bài viết & Đầu việc",
        title: `[${t.code}] ${t.title}`,
        subtitle: `${t.project.name}${t.assignee ? ` • PIC: ${t.assignee.name}` : ""}`,
        badge: t.isMediaOrder ? "Media" : "Content",
        color: t.project.color,
        href: targetHref,
      });
    }
    for (const r of results.resources) {
      list.push({
        id: `res-${r.id}`,
        group: "Tài nguyên",
        title: r.title,
        subtitle: r.project ? `Dự án: ${r.project.name}` : "Tài nguyên chung toàn team",
        externalUrl: r.url,
      });
    }
    for (const eq of results.equipment) {
      list.push({
        id: `eq-${eq.id}`,
        group: "Thiết bị",
        title: `[${eq.code}] ${eq.name}`,
        subtitle: `${eq.status === "MAINTENANCE" ? "Bảo trì" : "Sẵn sàng"}${
          eq.managerName ? ` • Quản lý: ${eq.managerName}` : ""
        }`,
        href: "/resources?tab=equipment",
      });
    }
    for (const u of results.users) {
      list.push({
        id: `user-${u.id}`,
        group: "Thành viên",
        title: u.name,
        subtitle: u.title,
        href: userRole === "LEADER" ? "/team" : "/chat",
      });
    }
    return list;
  }, [query, results, quickShortcuts, isMediaProduction, userRole]);

  function activateItem(item: FlatActionItem) {
    onClose();
    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  }

  if (!open) return null;

  const grouped = flatItems.reduce<Array<{ group: string; items: Array<{ item: FlatActionItem; index: number }> }>>(
    (acc, item, idx) => {
      const existing = acc.find((g) => g.group === item.group);
      if (existing) {
        existing.items.push({ item, index: idx });
      } else {
        acc.push({ group: item.group, items: [{ item, index: idx }] });
      }
      return acc;
    },
    []
  );

  function renderIcon(item: FlatActionItem) {
    if (item.id.startsWith("proj-")) return <MapIcon className="w-4 h-4 text-amber-600" />;
    if (item.id.startsWith("task-")) return <CheckSquare className="w-4 h-4 text-blue-600" />;
    if (item.id.startsWith("res-")) return <FolderOpen className="w-4 h-4 text-sky-600" />;
    if (item.id.startsWith("eq-")) return <Camera className="w-4 h-4 text-emerald-600" />;
    if (item.id.startsWith("user-")) return <Users className="w-4 h-4 text-violet-600" />;
    if (item.id === "nav-leader") return <Compass className="w-4 h-4 text-amber-600" />;
    if (item.id === "nav-chat") return <MessageCircle className="w-4 h-4 text-indigo-600" />;
    if (item.id === "nav-outputs") return <FolderCheck className="w-4 h-4 text-emerald-600" />;
    if (item.id === "nav-budgets") return <Coins className="w-4 h-4 text-amber-600" />;
    if (item.id === "nav-reports") return <ScrollText className="w-4 h-4 text-slate-600" />;
    return <Search className="w-4 h-4 text-slate-400" />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3"
      role="dialog"
      aria-label="Tìm kiếm nhanh toàn hệ thống"
    >
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl border-2 border-amber-300 shadow-2xl overflow-hidden flex flex-col max-h-[72dvh]">
        <div className="px-3.5 py-3 border-b border-amber-100 bg-[#FFFDF7] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-amber-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) =>
                  flatItems.length === 0 ? 0 : (i + 1) % flatItems.length
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) =>
                  flatItems.length === 0
                    ? 0
                    : (i - 1 + flatItems.length) % flatItems.length
                );
              } else if (e.key === "Enter" && flatItems[activeIndex]) {
                e.preventDefault();
                activateItem(flatItems[activeIndex]);
              }
            }}
            placeholder="Tìm mã bài (LIV-01...), dự án, tài nguyên, thiết bị, nhân sự..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Đang tìm trên toàn hệ thống...
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Không tìm thấy kết quả khớp &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map((section) => (
              <div key={section.group} className="space-y-1">
                <div className="px-2.5 pt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {section.group}
                </div>
                {section.items.map(({ item, index }) => {
                  const active = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => activateItem(item)}
                      className={`w-full text-left rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 transition cursor-pointer ${
                        active
                          ? "bg-amber-100/80 text-slate-900"
                          : "hover:bg-amber-50/70 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white border border-amber-200/80 flex items-center justify-center shrink-0">
                          {renderIcon(item)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {item.color && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                          {item.subtitle && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                        {item.externalUrl && (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-3.5 py-2 border-t border-amber-100 bg-slate-50/70 flex items-center justify-between text-[10px] text-slate-400">
          <span>↑↓ để di chuyển • Enter để mở nhanh</span>
          <span className="hidden sm:inline">Phím tắt: Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
