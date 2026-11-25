"use client";

import { useState } from "react";
import { PlatformLogo } from "@/components/platform-logo";
import {
  getPlatformChannelMeta,
  getSuggestionsForPlatform,
} from "@/lib/platform-meta";
import type { ProjectChannelSuggestions } from "@/types/crm";

interface PublishChannelInputProps {
  platform: string;
  value: string;
  onChange: (nextValue: string) => void;
  suggestions?: ProjectChannelSuggestions | null;
  showLabel?: boolean;
  compact?: boolean;
  labelClassName?: string;
  inputClassName?: string;
}

const CUSTOM_OPTION_VALUE = "__CUSTOM_CHANNEL__";

export function PublishChannelInput({
  platform,
  value,
  onChange,
  suggestions,
  showLabel = true,
  compact = false,
  labelClassName,
  inputClassName,
}: PublishChannelInputProps) {
  const meta = getPlatformChannelMeta(platform);
  const options = getSuggestionsForPlatform(platform, suggestions);
  const [customMode, setCustomMode] = useState(false);

  const trimmed = value.trim();
  const hasSavedCustomValue =
    Boolean(trimmed) &&
    options.length > 0 &&
    !options.some((opt) => opt.toLowerCase() === trimmed.toLowerCase());

  const mergedOptions = hasSavedCustomValue ? [trimmed, ...options] : options;
  const matchedOption =
    mergedOptions.find((opt) => opt.toLowerCase() === trimmed.toLowerCase()) ||
    "";

  const controlClass =
    inputClassName ||
    "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {showLabel && (
        <label
          className={
            labelClassName ||
            "flex items-center gap-1.5 text-xs font-bold text-slate-700"
          }
        >
          <PlatformLogo platform={platform} size="xs" />
          <span>{meta.channelFieldLabel}</span>
        </label>
      )}

      {mergedOptions.length > 0 && !customMode ? (
        <select
          value={matchedOption}
          onChange={(e) => {
            if (e.target.value === CUSTOM_OPTION_VALUE) {
              setCustomMode(true);
              onChange("");
            } else {
              onChange(e.target.value);
            }
          }}
          className={controlClass}
        >
          <option value="">-- Chọn {meta.channelFieldLabel} --</option>
          {mergedOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>+ Nhập tên kênh khác...</option>
        </select>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={meta.channelPlaceholder}
            className={controlClass}
          />
          {mergedOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer"
            >
              Danh sách
            </button>
          )}
        </div>
      )}
    </div>
  );
}
