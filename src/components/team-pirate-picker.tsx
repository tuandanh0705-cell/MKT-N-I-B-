"use client";

import Image from "next/image";
import {
  PIRATE_CHARACTER_CATALOG,
  getPirateCharacter,
} from "@/components/pirate-art";
import type { DepartmentScope } from "@/generated/prisma/client";

export interface PiratePickerUserLike {
  id: string;
  name: string;
  departmentScope: DepartmentScope;
  pirateCharacter?: string | null;
}

export function PirateCharacterPicker({
  value,
  onChange,
  users,
  excludeUserId,
}: {
  value: string;
  onChange: (nextId: string) => void;
  users: PiratePickerUserLike[];
  excludeUserId?: string;
}) {
  const holders = new Map<string, string>();
  for (const u of users) {
    if (u.id === excludeUserId) continue;
    const cid = getPirateCharacter(
      u.name,
      u.departmentScope,
      u.pirateCharacter
    ).id;
    if (!holders.has(cid)) {
      holders.set(cid, u.name);
    }
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`rounded-xl border-2 p-1.5 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[76px] ${
          value === ""
            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-400/40"
            : "border-amber-200/70 bg-white hover:border-sky-400"
        }`}
      >
        <span className="text-xl leading-none mb-1">🎲</span>
        <span className="text-[10px] font-bold text-slate-800 leading-tight">
          Tự động
        </span>
        <span className="text-[9px] text-slate-400">Theo tên/role</span>
      </button>

      {PIRATE_CHARACTER_CATALOG.map((char) => {
        const selected = value === char.id;
        const holder = holders.get(char.id);
        return (
          <button
            key={char.id}
            type="button"
            onClick={() => onChange(char.id)}
            title={`${char.rank}${holder ? ` (Đang dùng: ${holder})` : " (Còn trống)"}`}
            className={`rounded-xl border-2 p-1.5 text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[76px] ${
              selected
                ? "border-amber-500 bg-amber-50 ring-2 ring-amber-400/40"
                : "border-amber-200/70 bg-white hover:border-sky-400"
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300 shrink-0 bg-amber-50">
              <Image
                src={char.avatarSrc}
                alt={char.characterName}
                width={64}
                height={64}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="w-full mt-1">
              <div className="text-[10px] font-extrabold text-slate-900 truncate">
                {char.emoji} {char.characterName}
              </div>
              <div
                className={`text-[9px] truncate ${
                  holder
                    ? "text-amber-700 font-semibold"
                    : "text-emerald-600 font-bold"
                }`}
              >
                {holder ? holder : "Chưa có ai"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
