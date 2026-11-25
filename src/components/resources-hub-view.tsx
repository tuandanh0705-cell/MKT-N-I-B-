"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  Pencil,
  Globe,
  X,
  FolderKanban,
  Camera,
  Link2,
  Unlink,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { RESOURCE_CATEGORY_META } from "@/lib/constants";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { EquipmentHubPanel } from "@/components/equipment-hub-panel";
import { useToast } from "@/components/toast-provider";
import type {
  EquipmentBookingItem,
  EquipmentItemType,
  SimpleProject,
  WorkspaceResourceItem,
} from "@/types/crm";
import type {
  ResourceCategory,
  ResourceScope,
  UserRole,
} from "@/generated/prisma/client";

function extractHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function ResourceCard({
  item,
  userRole,
  onEdit,
  onDelete,
}: {
  item: WorkspaceResourceItem;
  userRole: UserRole;
  onEdit: (item: WorkspaceResourceItem) => void;
  onDelete: (item: WorkspaceResourceItem) => void;
}) {
  const { showToast } = useToast();
  const catMeta =
    RESOURCE_CATEGORY_META[item.category] || RESOURCE_CATEGORY_META.OTHER;

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-3.5 flex flex-col justify-between gap-2.5 shadow-sm transition">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${catMeta.badgeClass}`}
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label}</span>
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
              title="Sửa"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {(userRole === "LEADER" || item.scope === "PROJECT") && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Xóa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-bold text-slate-900 hover:text-blue-700 leading-snug line-clamp-1"
        >
          {item.title}
        </a>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-1">
            {item.description}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 truncate">
          {extractHost(item.url)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(item.url);
              showToast("Đã copy link!");
            }}
            className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Mở
          </a>
        </div>
      </div>
    </div>
  );
}

export function ResourcesHubView({
  currentUser,
  todayStr,
  initialResources,
  initialEquipment,
  initialBookings,
  projects,
  userRole,
  toneMode,
  initialProjectFilter = "ALL",
  initialTab = "RESOURCES",
}: {
  currentUser: AuthUser;
  todayStr: string;
  initialResources: WorkspaceResourceItem[];
  initialEquipment: EquipmentItemType[];
  initialBookings: EquipmentBookingItem[];
  projects: SimpleProject[];
  userRole: UserRole;
  toneMode?: string;
  initialProjectFilter?: string;
  initialTab?: "RESOURCES" | "EQUIPMENT";
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"RESOURCES" | "EQUIPMENT">(
    initialTab
  );
  const [resources, setResources] =
    useState<WorkspaceResourceItem[]>(initialResources);
  const [projectList, setProjectList] = useState<SimpleProject[]>(projects);
  const [sectionFilter, setSectionFilter] = useState(initialProjectFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Form thêm / sửa tài nguyên chi tiết
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceResourceItem | null>(null);
  const [scope, setScope] = useState<ResourceScope>("PROJECT");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [category, setCategory] = useState<ResourceCategory>("LOGO_BRAND");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal gắn / sửa Link tổng dự án
  const [masterLinkProject, setMasterLinkProject] =
    useState<SimpleProject | null>(null);
  const [masterLinkUrl, setMasterLinkUrl] = useState("");
  const [masterLinkNote, setMasterLinkNote] = useState("");
  const [savingMasterLink, setSavingMasterLink] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<WorkspaceResourceItem | null>(null);

  const matchesSearchAndCat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (q) {
        const hay = `${r.title} ${r.description || ""} ${r.tags || ""} ${
          r.project?.name || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resources, categoryFilter, search]);

  const globalResources = useMemo(
    () => matchesSearchAndCat.filter((r) => r.scope === "GLOBAL"),
    [matchesSearchAndCat]
  );

  const visibleProjectsList = useMemo(() => {
    if (sectionFilter === "GLOBAL") return [];
    if (sectionFilter !== "ALL" && sectionFilter !== "PROJECTS_ONLY") {
      return projectList.filter((p) => p.id === sectionFilter);
    }
    return projectList;
  }, [projectList, sectionFilter]);

  function openMasterLinkModal(proj: SimpleProject) {
    setMasterLinkProject(proj);
    setMasterLinkUrl(proj.masterResourceUrl || "");
    setMasterLinkNote(proj.masterResourceNote || "");
  }

  async function submitMasterLink(nextUrl: string, nextNote: string) {
    if (!masterLinkProject) return;
    setSavingMasterLink(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: masterLinkProject.id,
          masterResourceUrl: nextUrl.trim(),
          masterResourceNote: nextUrl.trim() ? nextNote.trim() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được Link tổng dự án.", "error");
        return;
      }
      setProjectList((prev) =>
        prev.map((p) =>
          p.id === masterLinkProject.id
            ? {
                ...p,
                masterResourceUrl: data.project?.masterResourceUrl ?? null,
                masterResourceNote: data.project?.masterResourceNote ?? null,
              }
            : p
        )
      );
      showToast(
        nextUrl.trim()
          ? `Đã lưu Link tổng cho ${masterLinkProject.name}!`
          : `Đã gỡ Link tổng của ${masterLinkProject.name}.`
      );
      setMasterLinkProject(null);
    } finally {
      setSavingMasterLink(false);
    }
  }

  async function handleSaveMasterLink(e: React.FormEvent) {
    e.preventDefault();
    if (!masterLinkUrl.trim()) {
      showToast("Vui lòng nhập đường dẫn Link tổng dự án.", "error");
      return;
    }
    await submitMasterLink(masterLinkUrl, masterLinkNote);
  }

  function openAddModal(targetScope: ResourceScope, targetProjId?: string) {
    setEditing(null);
    setScope(targetScope);
    setProjectId(targetProjId || projectList[0]?.id || "");
    setCategory(targetScope === "GLOBAL" ? "LOGO_BRAND" : "PHOTO_FOLDER");
    setTitle("");
    setUrl("");
    setDescription("");
    setTags("");
    setModalOpen(true);
  }

  function openEditModal(item: WorkspaceResourceItem) {
    setEditing(item);
    setScope(item.scope);
    setProjectId(item.projectId || projectList[0]?.id || "");
    setCategory(item.category);
    setTitle(item.title);
    setUrl(item.url);
    setDescription(item.description || "");
    setTags(item.tags || "");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/resources", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { id: editing.id, title, url, category, description, tags }
            : {
                scope,
                projectId: scope === "PROJECT" ? projectId : null,
                category,
                title,
                url,
                description,
                tags,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được tài nguyên.", "error");
        return;
      }
      if (editing) {
        setResources((prev) =>
          prev.map((r) => (r.id === data.resource.id ? data.resource : r))
        );
        showToast("Đã cập nhật tài nguyên.");
      } else {
        setResources((prev) => [data.resource, ...prev]);
        showToast("Đã thêm tài nguyên mới vào kho!");
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/resources?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        showToast("Đã xóa tài nguyên.");
        setDeleteTarget(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Không xóa được mục này.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  const showGlobalSection =
    sectionFilter === "ALL" || sectionFilter === "GLOBAL";
  const projectResourcesCount = matchesSearchAndCat.filter(
    (r) => r.scope === "PROJECT"
  ).length;
  const isSingleProjectFilter =
    sectionFilter !== "ALL" &&
    sectionFilter !== "GLOBAL" &&
    sectionFilter !== "PROJECTS_ONLY";

  const searchLower = search.trim().toLowerCase();
  const projectHasContent = (proj: SimpleProject) => {
    const hasResources = matchesSearchAndCat.some(
      (r) => r.scope === "PROJECT" && r.projectId === proj.id
    );
    if (hasResources) return true;
    if (!proj.masterResourceUrl || categoryFilter !== "ALL") return false;
    if (!searchLower) return true;
    const hay = `${proj.name} ${proj.masterResourceNote || ""} ${proj.masterResourceUrl}`.toLowerCase();
    return hay.includes(searchLower);
  };

  const projectsWithItems = visibleProjectsList.filter(projectHasContent);
  const emptyProjects = isSingleProjectFilter
    ? []
    : visibleProjectsList.filter((proj) => !projectHasContent(proj));
  const displayedProjects = isSingleProjectFilter
    ? visibleProjectsList
    : projectsWithItems;

  return (
    <div className="space-y-4">
      {/* Header gọn 1 hàng */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
          📂 Kho Tài Nguyên & Thiết Bị
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("RESOURCES")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                activeTab === "RESOURCES"
                  ? "bg-[#0B2545] text-amber-300 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Tài Nguyên ({resources.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("EQUIPMENT")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                activeTab === "EQUIPMENT"
                  ? "bg-[#0B2545] text-amber-300 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Thiết Bị & Đặt Máy ({initialEquipment.length})
            </button>
          </div>

          {activeTab === "RESOURCES" && (
            <button
              type="button"
              onClick={() =>
                openAddModal(
                  sectionFilter === "GLOBAL" ? "GLOBAL" : "PROJECT",
                  isSingleProjectFilter ? sectionFilter : undefined
                )
              }
              className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm tài nguyên
            </button>
          )}
        </div>
      </div>

      {activeTab === "EQUIPMENT" ? (
        <EquipmentHubPanel
          currentUser={currentUser}
          todayStr={todayStr}
          initialEquipment={initialEquipment}
          initialBookings={initialBookings}
          projects={projectList}
        />
      ) : (
        <>
          {/* Thanh lọc 1 hàng gọn nhẹ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, mô tả, link..."
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSectionFilter("ALL")}
                className={`rounded-lg px-2.5 py-1.5 font-bold cursor-pointer ${
                  sectionFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Tất cả ({matchesSearchAndCat.length})
              </button>
              <button
                type="button"
                onClick={() => setSectionFilter("GLOBAL")}
                className={`rounded-lg px-2.5 py-1.5 font-bold cursor-pointer ${
                  sectionFilter === "GLOBAL"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Chung ({globalResources.length})
              </button>
              <button
                type="button"
                onClick={() => setSectionFilter("PROJECTS_ONLY")}
                className={`rounded-lg px-2.5 py-1.5 font-bold cursor-pointer ${
                  sectionFilter === "PROJECTS_ONLY"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Dự án ({projectResourcesCount})
              </button>
            </div>

            {projectList.length > 0 && (
              <select
                value={isSingleProjectFilter ? sectionFilter : ""}
                onChange={(e) =>
                  setSectionFilter(e.target.value || "PROJECTS_ONLY")
                }
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="">Mọi dự án</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Mọi loại ({resources.length})</option>
              {Object.entries(RESOURCE_CATEGORY_META).map(([key, meta]) => {
                const count = resources.filter((r) => r.category === key).length;
                return (
                  <option key={key} value={key}>
                    {meta.emoji} {meta.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* KHU VỰC 1: TÀI NGUYÊN CHUNG */}
          {showGlobalSection && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Globe className="w-4 h-4 text-sky-600" />
                  <span>Tài nguyên chung ({globalResources.length})</span>
                </div>
              </div>

              {globalResources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                  Chưa có tài nguyên chung khớp bộ lọc.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {globalResources.map((item) => (
                    <ResourceCard
                      key={item.id}
                      item={item}
                      userRole={userRole}
                      onEdit={openEditModal}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* KHU VỰC 2: TÀI NGUYÊN THEO DỰ ÁN */}
          {visibleProjectsList.length > 0 && (
            <div className="space-y-3">
              {displayedProjects.map((proj) => {
                const projItems = matchesSearchAndCat.filter(
                  (r) => r.scope === "PROJECT" && r.projectId === proj.id
                );
                return (
                  <section
                    key={proj.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm"
                    style={{ borderTopWidth: 3, borderTopColor: proj.color }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {proj.name}
                        </h3>
                        <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[11px] font-bold">
                          {projItems.length}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {proj.masterResourceUrl ? (
                          <div className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                            <a
                              href={proj.masterResourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={
                                proj.masterResourceNote ||
                                proj.masterResourceUrl
                              }
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 inline-flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              Link tổng
                              <ExternalLink className="w-3 h-3 opacity-75" />
                            </a>
                            <button
                              type="button"
                              onClick={() => openMasterLinkModal(proj)}
                              className="px-1.5 py-1 text-amber-700 hover:bg-amber-100 border-l border-amber-200 cursor-pointer"
                              title="Sửa link tổng"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openMasterLinkModal(proj)}
                            className="rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
                            Gắn link tổng
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAddModal("PROJECT", proj.id)}
                          className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700 px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Thêm
                        </button>
                      </div>
                    </div>

                    {projItems.length === 0 ? (
                      !proj.masterResourceUrl && (
                        <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                          Chưa có tài nguyên trong dự án này.
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {projItems.map((item) => (
                          <ResourceCard
                            key={item.id}
                            item={item}
                            userRole={userRole}
                            onEdit={openEditModal}
                            onDelete={setDeleteTarget}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Gom gọn các dự án chưa có tài nguyên thành 1 hàng chip */}
              {emptyProjects.length > 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold inline-flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                    Chưa có tài nguyên:
                  </span>
                  {emptyProjects.map((p) => (
                    <div
                      key={p.id}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => openAddModal("PROJECT", p.id)}
                        className="hover:bg-amber-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title={`Thêm tài nguyên cho ${p.name}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>+ {p.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openMasterLinkModal(p)}
                        className="px-2 py-1 text-amber-800 bg-amber-50/70 hover:bg-amber-100 border-l border-slate-200 inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title={`Gắn link tổng cho ${p.name}`}
                      >
                        <Link2 className="w-3 h-3" />
                        Link tổng
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Thêm / Sửa Tài Nguyên */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <form
            onSubmit={handleSave}
            className="relative z-10 w-full max-w-lg bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? "✏️ Sửa Tài Nguyên" : "➕ Thêm Tài Nguyên Công Việc"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuộc nhóm
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as ResourceScope)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  >
                    <option value="PROJECT">🗺️ Riêng 1 Dự án (Hải đồ)</option>
                    <option value="GLOBAL">🌐 Tài nguyên Chung Team</option>
                  </select>
                </div>
                {scope === "PROJECT" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chọn Dự án
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                    >
                      {projectList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phân loại tài nguyên
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ResourceCategory)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                {Object.entries(RESOURCE_CATEGORY_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên tài nguyên *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Folder Ảnh Sản Phẩm Inpro Tháng 11..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đường dẫn Link (Drive / Canva / Figma / Notion) *
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả ngắn / Hướng dẫn dùng
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Chứa file PNG, font chuẩn, guideline kích thước..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#0B2545] text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                {saving ? "Đang lưu..." : "Lưu Tài Nguyên"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Gắn / Sửa Link Tổng Dự Án */}
      {masterLinkProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => !savingMasterLink && setMasterLinkProject(null)}
          />
          <form
            onSubmit={handleSaveMasterLink}
            className="relative z-10 w-full max-w-lg bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: masterLinkProject.color }}
                />
                <h3 className="text-base font-bold text-slate-900 truncate">
                  🔗 Link tổng — {masterLinkProject.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !savingMasterLink && setMasterLinkProject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Gắn đường dẫn thư mục tổng (Google Drive / Notion / Google Sheet / Lark) để mọi thành viên mở nhanh toàn bộ dữ liệu dự án.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đường dẫn Link tổng dự án *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={masterLinkUrl}
                onChange={(e) => setMasterLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhãn / Ghi chú ngắn (không bắt buộc)
              </label>
              <input
                type="text"
                maxLength={160}
                value={masterLinkNote}
                onChange={(e) => setMasterLinkNote(e.target.value)}
                placeholder="VD: Drive tổng dự án, Notion Hub, Sheet quản lý..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {masterLinkProject.masterResourceUrl && (
                  <button
                    type="button"
                    disabled={savingMasterLink}
                    onClick={() => submitMasterLink("", "")}
                    className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Gỡ link tổng
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingMasterLink}
                  onClick={() => setMasterLinkProject(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingMasterLink}
                  className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  {savingMasterLink ? "Đang lưu..." : "Lưu Link Tổng"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        itemName={deleteTarget?.title || ""}
        toneMode={toneMode}
        permanentWarning
        loading={saving}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
