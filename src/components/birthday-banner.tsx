"use client";

import { useState } from "react";
import { Cake, Send, Sparkles } from "lucide-react";
import { PirateAvatar } from "@/components/pirate-art";
import { useToast } from "@/components/toast-provider";
import type { BirthdayMemberInfo } from "@/types/crm";

export function BirthdayCelebrationBanner({
  todayBirthdays,
  currentUserId,
}: {
  todayBirthdays: BirthdayMemberInfo[];
  currentUserId?: string;
}) {
  const { showToast } = useToast();
  const [wishingId, setWishingId] = useState<string | null>(null);
  const [wishedIds, setWishedIds] = useState<Record<string, boolean>>({});

  if (!todayBirthdays || todayBirthdays.length === 0) return null;

  async function sendWish(person: BirthdayMemberInfo) {
    setWishingId(person.id);
    try {
      const res = await fetch("/api/birthdays/wish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: person.id,
          message: `Chúc mừng sinh nhật ${person.name}! Tuổi mới thật nhiều sức khỏe, niềm vui và bứt phá cùng team nhé!`,
        }),
      });
      if (res.ok) {
        setWishedIds((prev) => ({ ...prev, [person.id]: true }));
        showToast(`Đã gửi lời chúc sinh nhật tới ${person.name} & nhóm Chat!`);
      } else {
        showToast("Không gửi được lời chúc.", "error");
      }
    } finally {
      setWishingId(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-amber-50 to-rose-50 p-4 shadow-sm space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-pink-700">
        <Cake className="w-4 h-4 text-pink-600" />
        <span>🎂 Chúc Mừng Sinh Nhật Thành Viên Hôm Nay!</span>
        <Sparkles className="w-4 h-4 text-amber-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {todayBirthdays.map((person) => {
          const isMe = person.id === currentUserId;
          const alreadyWished = wishedIds[person.id];
          return (
            <div
              key={person.id}
              className="rounded-xl border border-pink-200 bg-white/90 px-3.5 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PirateAvatar
                  name={person.name}
                  color={person.avatarColor}
                  scope={person.departmentScope}
                  pirateCharacter={person.pirateCharacter}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">
                    🥳 {person.name}
                    {person.turningAge
                      ? ` (Tròn ${person.turningAge} tuổi)`
                      : ""}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    Sinh nhật {person.displayDayMonth}
                  </div>
                </div>
              </div>

              {!isMe ? (
                <button
                  type="button"
                  disabled={wishingId === person.id || alreadyWished}
                  onClick={() => sendWish(person)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition ${
                    alreadyWished
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white shadow-sm"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {alreadyWished
                    ? "Đã chúc mừng"
                    : wishingId === person.id
                      ? "Đang gửi..."
                      : "Gửi lời chúc"}
                </button>
              ) : (
                <span className="rounded-full bg-pink-100 text-pink-700 px-2.5 py-1 text-[11px] font-bold shrink-0">
                  Chúc bạn sinh nhật vui vẻ!
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
