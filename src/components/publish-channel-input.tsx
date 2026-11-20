"use client";

import { useId } from "react";
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
  const listId = useId();
  const meta = getPlatformChannelMeta(platform);
  const options = getSuggestionsForPlatform(platform, suggestions);

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
      <input
        type="text"
        list={options.length > 0 ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={meta.channelPlaceholder}
        className={
          inputClassName ||
          "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
        }
      />
      {options.length > 0 && (
        <>
          <datalist id={listId}>
            {options.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {options.slice(0, 6).map((opt) => {
              const active = value.trim().toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition cursor-pointer ${
                    active
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
