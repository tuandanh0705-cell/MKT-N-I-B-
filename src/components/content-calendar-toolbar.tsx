"use client";

import {
  ClipboardPaste,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { CONTENT_ROUTE_OPTIONS } from "@/lib/content-plan";

interface ContentCalendarToolbarProps {
  filteredCount: number;
  users: Array<{ id: string; name: string }>;
  availableMonths: string[];
  searchQuery: string;
  onChangeSearchQuery: (v: string) => void;
  monthFilter: string;
  onChangeMonthFilter: (v: string) => void;
  picFilter: string;
  onChangePicFilter: (v: string) => void;
  routeFilter: string;
  onChangeRouteFilter: (v: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (v: string) => void;
  deleteMode: boolean;
  onToggleDeleteMode: () => void;
  selectedDeleteCount: number;
  deletableCount: number;
  deleting: boolean;
  onToggleSelectAllDelete: () => void;
  onRequestDeleteSelected: () => void;
  onExitDeleteMode: () => void;
  pasteOpen: boolean;
  onTogglePasteOpen: () => void;
  pasteRaw: string;
  onChangePasteRaw: (v: string) => void;
  parsedPreviewCount: number;
  importing: boolean;
  onBulkImport: () => void;
  onToggleQuickAdd: () => void;
  onOpenNewEditor: () => void;
}

export function ContentCalendarToolbar({
  filteredCount,
  users,
  availableMonths,
  searchQuery,
  onChangeSearchQuery,
  monthFilter,
  onChangeMonthFilter,
  picFilter,
  onChangePicFilter,
  routeFilter,
  onChangeRouteFilter,
  statusFilter,
  onChangeStatusFilter,
  deleteMode,
  onToggleDeleteMode,
  selectedDeleteCount,
  deletableCount,
  deleting,
  onToggleSelectAllDelete,
  onRequestDeleteSelected,
  onExitDeleteMode,
  pasteOpen,
  onTogglePasteOpen,
  pasteRaw,
  onChangePasteRaw,
  parsedPreviewCount,
  importing,
  onBulkImport,
  onToggleQuickAdd,
  onOpenNewEditor,
}: ContentCalendarToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-sky-200/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-extrabold text-slate-900">
            📝 Nội dung chi tiết ({filteredCount})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleDeleteMode}
            className={`rounded-xl border px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
              deleteMode
                ? "border-rose-600 bg-rose-600 text-white shadow-xs"
                : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteMode ? "Đang bật Chế độ xóa" : "Chế độ xóa"}
          </button>
          <button
            type="button"
            onClick={onTogglePasteOpen}
            className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Dán từ Sheet
          </button>
          <button
            type="button"
            onClick={onToggleQuickAdd}
            className="rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm dòng
          </button>
          <button
            type="button"
            onClick={onOpenNewEditor}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" />
            Viết bài mới
          </button>
        </div>
      </div>

      {deleteMode && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-rose-900 font-semibold">
            <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Chế độ xóa đang bật — Đã chọn{" "}
              <strong>{selectedDeleteCount}</strong> / {deletableCount} bài
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {deletableCount > 0 && (
              <button
                type="button"
                onClick={onToggleSelectAllDelete}
                className="rounded-lg border border-rose-200 bg-white hover:bg-rose-100 text-rose-800 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                {selectedDeleteCount === deletableCount
                  ? "Bỏ chọn hết"
                  : "Chọn tất cả"}
              </button>
            )}
            <button
              type="button"
              disabled={selectedDeleteCount === 0 || deleting}
              onClick={onRequestDeleteSelected}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Xóa đã chọn ({selectedDeleteCount})
            </button>
            <button
              type="button"
              onClick={onExitDeleteMode}
              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </div>
      )}

      {/* Bộ lọc nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Tìm ý tưởng, bài viết..."
            className="w-full rounded-xl border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs"
          />
        </div>
        <select
          value={monthFilter}
          onChange={(e) => onChangeMonthFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
        >
          <option value="ALL">Tất cả tháng</option>
          <option value="UNSCHEDULED">⚠️ Chưa xếp lịch đăng</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
        <select
          value={picFilter}
          onChange={(e) => onChangePicFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
        >
          <option value="ALL">Tất cả PIC</option>
          <option value="MINE">📌 Bài của tôi</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={routeFilter}
          onChange={(e) => onChangeRouteFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
        >
          <option value="ALL">Tất cả Tuyến</option>
          {CONTENT_ROUTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onChangeStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
        >
          <option value="ALL">Mọi tình trạng</option>
          <option value="DRAFT">Nháp</option>
          <option value="IN_PROGRESS">Đang viết</option>
          <option value="WAITING_APPROVAL">Chờ Leader duyệt</option>
          <option value="REVISION_NEEDED">Cần sửa lại</option>
          <option value="APPROVED_FINAL">Đã duyệt Final</option>
          <option value="AIRED">Đã Air / Đăng</option>
        </select>
      </div>

      {/* Khung Paste Google Sheet */}
      {pasteOpen && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-emerald-950">
              📋 Dán các dòng copy từ Google Sheet (TIMELINE ĐĂNG BÀI):
            </div>
            <button
              type="button"
              onClick={onTogglePasteOpen}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-emerald-800">
            Bôi đen các hàng trong Google Sheet theo cột:{" "}
            <code>
              Ngày đăng | Tuyến nội dung | Nội dung | Nền tảng | Bài viết |
              Format | Deadline ảnh | Deadline content | Tình trạng | Link SP
            </code>{" "}
            rồi Ctrl+C → Ctrl+V vào đây.
          </p>
          <textarea
            rows={4}
            value={pasteRaw}
            onChange={(e) => onChangePasteRaw(e.target.value)}
            placeholder={
              "17/11\tEDUCATE\tKhái niệm setup live\tFacebook\tLivestream chuyên nghiệp từ A-Z...\tẢnh\t17/11\t16/11"
            }
            className="w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-xs font-mono"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-emerald-900">
              Nhận diện được: <strong>{parsedPreviewCount}</strong> dòng bài
              viết hợp lệ
            </span>
            <button
              type="button"
              disabled={importing || parsedPreviewCount === 0}
              onClick={onBulkImport}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-bold cursor-pointer"
            >
              {importing
                ? "Đang nhập..."
                : `Nhập ${parsedPreviewCount} bài vào Lịch`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
