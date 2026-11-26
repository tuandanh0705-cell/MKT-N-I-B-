"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Users, X } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import type { SimpleUser } from "@/types/crm";

interface MultiAssigneePickerProps {
  users: SimpleUser[];
  value: string[];
  onChange: (nextIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  popoverAlign?: "left" | "right";
  prioritizeScopes?: string[];
  prioritizeGroupLabel?: string;
  otherGroupLabel?: string;
  className?: string;
}

export function MultiAssigneePicker({
  users,
  value,
  onChange,
  placeholder = "-- Chọn người thực hiện --",
  disabled = false,
  compact = false,
  popoverAlign = "left",
  prioritizeScopes,
  prioritizeGroupLabel = "Nhóm ưu tiên",
  otherGroupLabel = "Thành viên khác",
  className = "",
}: MultiAssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const activeUsers = useMemo(
    () => users.filter((u) => u.isActive !== false),
    [users]
  );

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedUsers = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    return value
      .map((id) => map.get(id))
      .filter((u): u is SimpleUser => Boolean(u));
  }, [users, value]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeUsers;
    return activeUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.title || "").toLowerCase().includes(q)
    );
  }, [activeUsers, query]);

  const { priorityGroup, otherGroup } = useMemo(() => {
    if (!prioritizeScopes || prioritizeScopes.length === 0) {
      return { priorityGroup: [] as SimpleUser[], otherGroup: filteredUsers };
    }
    const scopeSet = new Set(prioritizeScopes);
    return {
      priorityGroup: filteredUsers.filter((u) =>
        scopeSet.has(u.departmentScope)
      ),
      otherGroup: filteredUsers.filter(
        (u) => !scopeSet.has(u.departmentScope)
      ),
    };
  }, [filteredUsers, prioritizeScopes]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  function toggleUser(uid: string) {
    if (selectedSet.has(uid)) {
      onChange(value.filter((id) => id !== uid));
    } else {
      onChange([...value, uid]);
    }
  }

  function renderUserRow(u: SimpleUser) {
    const checked = selectedSet.has(u.id);
    return (
      <button
        key={u.id}
        type="button"
        onClick={() => toggleUser(u.id)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
          checked
            ? "bg-blue-50 text-blue-950 font-bold"
            : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
              checked
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-300 bg-white"
            }`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <PirateAvatar
            name={u.name}
            color={u.avatarColor}
            scope={u.departmentScope}
            pirateCharacter={u.pirateCharacter}
            size="sm"
          />
          <div className="min-w-0">
            <div className="truncate">{u.name}</div>
            {!compact && u.title && (
              <div className="text-[10px] font-normal text-slate-400 truncate">
                {u.title}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`w-full rounded-xl border bg-white transition flex items-center justify-between gap-1.5 cursor-pointer ${
          open
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-60 pointer-events-none" : ""} ${
          compact ? "px-2 py-1 min-h-[30px]" : "px-2.5 py-1.5 min-h-[38px]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
          {selectedUsers.length === 0 ? (
            <span
              className={`text-slate-400 truncate ${
                compact ? "text-[11px]" : "text-xs"
              }`}
            >
              {placeholder}
            </span>
          ) : compact ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 truncate">
              <span className="truncate">{selectedUsers[0].name}</span>
              {selectedUsers.length > 1 && (
                <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-extrabold shrink-0">
                  +{selectedUsers.length - 1}
                </span>
              )}
            </span>
          ) : (
            selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 pl-1 pr-1.5 py-0.5 text-[11px] font-bold max-w-[160px]"
              >
                <PirateAvatar
                  name={u.name}
                  color={u.avatarColor}
                  scope={u.departmentScope}
                  pirateCharacter={u.pirateCharacter}
                  size="sm"
                />
                <span className="truncate">{u.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUser(u.id);
                  }}
                  aria-label={`Bỏ chọn ${u.name}`}
                  className="rounded-full p-0.5 hover:bg-blue-200/70 text-blue-700 cursor-pointer shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition ${
            open ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </div>

      {open && (
        <div
          className={`absolute mt-1 z-40 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden ${
            popoverAlign === "right"
              ? "right-0 w-64"
              : "left-0 right-0 sm:min-w-[240px]"
          }`}
        >
          {activeUsers.length > 6 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm thành viên..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {priorityGroup.length > 0 && (
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                  {prioritizeGroupLabel}
                </div>
                {priorityGroup.map(renderUserRow)}
              </div>
            )}

            {otherGroup.length > 0 && (
              <div className="space-y-0.5">
                {priorityGroup.length > 0 && (
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-slate-100 mt-1 pt-1.5">
                    {otherGroupLabel}
                  </div>
                )}
                {otherGroup.map(renderUserRow)}
              </div>
            )}

            {filteredUsers.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400">
                Không tìm thấy thành viên phù hợp.
              </div>
            )}
          </div>

          <div className="px-2.5 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 inline-flex items-center gap-1 font-medium">
              <Users className="w-3 h-3 text-blue-600" />
              Đã chọn <strong className="text-slate-800">{value.length}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-500 hover:text-rose-600 font-semibold px-1.5 py-0.5 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 font-bold cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
