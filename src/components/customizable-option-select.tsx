"use client";

import { useState } from "react";
import { Check, Settings2, X } from "lucide-react";
import { ensureOptionIncluded } from "@/lib/content-plan";

const ADD_CUSTOM_VALUE = "__ADD_CUSTOM_OPTION__";

interface CustomizableOptionSelectProps {
  label?: React.ReactNode;
  value: string;
  options: string[];
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  selectClassName?: string;
  inputClassName?: string;
  onChange: (nextValue: string) => void;
  onAddOption?: (newValue: string) => Promise<boolean | void> | boolean | void;
  onOpenManager?: () => void;
  managerTitle?: string;
}

export function CustomizableOptionSelect({
  label,
  value,
  options,
  emptyLabel,
  placeholder = "Nhập option mới...",
  disabled = false,
  selectClassName,
  inputClassName,
  onChange,
  onAddOption,
  onOpenManager,
  managerTitle = "Tùy chỉnh danh sách option cho dự án này",
}: CustomizableOptionSelectProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const mergedOptions = ensureOptionIncluded(options, value);
  const matchedValue =
    mergedOptions.find((opt) => opt.toLowerCase() === value.trim().toLowerCase()) ||
    "";

  async function commitNewOption() {
    const cleaned = draft.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!cleaned) {
      setAdding(false);
      setDraft("");
      return;
    }

    const existing = mergedOptions.find(
      (opt) => opt.toLowerCase() === cleaned.toLowerCase()
    );
    if (existing) {
      onChange(existing);
      setAdding(false);
      setDraft("");
      return;
    }

    setSavingNew(true);
    try {
      if (onAddOption) {
        const res = await onAddOption(cleaned);
        if (res === false) return;
      }
      onChange(cleaned);
      setAdding(false);
      setDraft("");
    } finally {
      setSavingNew(false);
    }
  }

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 min-w-0">
            {label}
          </div>
          {onOpenManager && (
            <button
              type="button"
              onClick={onOpenManager}
              title={managerTitle}
              aria-label={managerTitle}
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer shrink-0"
            >
              <Settings2 className="w-3 h-3" />
              <span className="hidden sm:inline">Sửa</span>
            </button>
          )}
        </div>
      )}

      {adding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={draft}
            disabled={savingNew}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void commitNewOption();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setAdding(false);
                setDraft("");
              }
            }}
            placeholder={placeholder}
            className={
              inputClassName ||
              "w-full min-w-0 rounded-xl border-2 border-blue-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
            }
          />
          <button
            type="button"
            disabled={savingNew || !draft.trim()}
            onClick={() => void commitNewOption()}
            title="Lưu & thêm vào dự án"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={savingNew}
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            title="Hủy"
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <select
          value={matchedValue}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === ADD_CUSTOM_VALUE) {
              setAdding(true);
              setDraft("");
            } else {
              onChange(e.target.value);
            }
          }}
          className={
            selectClassName ||
            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"
          }
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {mergedOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          {onAddOption && (
            <option value={ADD_CUSTOM_VALUE}>+ Tự điền / Thêm mới...</option>
          )}
        </select>
      )}
    </div>
  );
}
