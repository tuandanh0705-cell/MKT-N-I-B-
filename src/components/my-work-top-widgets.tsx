"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Plus } from "lucide-react";
import {
  CheckinWidget,
  type TodayPlanCheckinSummary,
} from "@/components/checkin-widget";
import { PirateAvatar, getPirateCharacter } from "@/components/pirate-art";
import { Pirate3DSoloStage } from "@/components/pirate-3d-stage";
import { MotivationalQuoteWidget } from "@/components/motivational-quote-widget";
import { BirthdayCelebrationBanner } from "@/components/birthday-banner";
import { getToneCopy } from "@/lib/tone";
import type { PendingMandatoryCourseSummary } from "@/lib/knowledge-data";
import type {
  BirthdayMemberInfo,
  CheckinItem,
  SimpleProject,
} from "@/types/crm";

interface MyWorkTopWidgetsProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarColor: string;
  currentUserScope: string;
  currentUserPirateCharacter?: string | null;
  currentUserTone: string;
  currentUserIcon?: string | null;
  currentUserMotto?: string | null;
  todayDate: string;
  initialCheckin: CheckinItem | null;
  todayPlanSummary?: TodayPlanCheckinSummary;
  liveCheckinStatus: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE";
  celebrateNonce: number;
  projects: SimpleProject[];
  todayBirthdays: BirthdayMemberInfo[];
  pendingCourses: PendingMandatoryCourseSummary[];
  hideCreateButton?: boolean;
  onOpenCreate: () => void;
  onCheckinStatusChange: (
    status: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE"
  ) => void;
}

export function MyWorkTopWidgets({
  currentUserId,
  currentUserName,
  currentUserAvatarColor,
  currentUserScope,
  currentUserPirateCharacter,
  currentUserTone,
  currentUserIcon,
  currentUserMotto,
  todayDate,
  initialCheckin,
  todayPlanSummary,
  liveCheckinStatus,
  celebrateNonce,
  projects,
  todayBirthdays,
  pendingCourses,
  hideCreateButton = false,
  onOpenCreate,
  onCheckinStatusChange,
}: MyWorkTopWidgetsProps) {
  const tone = getToneCopy(currentUserTone);
  const pirateChar = getPirateCharacter(
    currentUserName,
    currentUserScope,
    currentUserPirateCharacter
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PirateAvatar
            name={currentUserName}
            color={currentUserAvatarColor}
            scope={currentUserScope}
            pirateCharacter={currentUserPirateCharacter}
            size="lg"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {currentUserIcon ? `${currentUserIcon} ` : ""}
              {currentUserName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {currentUserMotto || `${tone.greetingPrefix} ${currentUserName}!`}
            </p>
          </div>
        </div>

        {!hideCreateButton && projects.length > 0 && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="rounded-2xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center gap-2 shadow-md transition hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo Task / Order Media
          </button>
        )}
      </div>

      <MotivationalQuoteWidget toneMode={currentUserTone} compact />

      <BirthdayCelebrationBanner
        todayBirthdays={todayBirthdays}
        currentUserId={currentUserId}
      />

      {/* Widget Check-in 9h sáng bên trái + Nhân vật 3D đồng hành bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8 flex flex-col justify-center">
          <CheckinWidget
            todayDate={todayDate}
            initialCheckin={initialCheckin}
            todayPlanSummary={todayPlanSummary}
            onStatusChange={onCheckinStatusChange}
          />
        </div>
        <div className="lg:col-span-4">
          <Pirate3DSoloStage
            name={currentUserName}
            scope={currentUserScope}
            pirateCharacter={currentUserPirateCharacter}
            checkinStatus={liveCheckinStatus}
            celebrateNonce={celebrateNonce}
            caption={`${pirateChar.characterName} • ${currentUserName}`}
            className="h-48 lg:h-full min-h-[185px] w-full"
          />
        </div>
      </div>

      {/* Widget Khu Luyện Tập: Nhắc các khóa học bắt buộc chưa xong */}
      {pendingCourses.length > 0 && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-indigo-950">
                Khu Luyện Tập: Bạn còn {pendingCourses.length} khóa bắt buộc đang học dở
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {pendingCourses.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    href={`/knowledge?courseId=${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white hover:border-indigo-400 px-2.5 py-1 text-[11px] font-bold text-indigo-900"
                  >
                    <span className="truncate max-w-[200px]">{c.title}</span>
                    <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px]">
                      {c.completedLessons}/{c.totalLessons} ({c.percent}%)
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/knowledge"
            className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] text-amber-300 px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1 shrink-0"
          >
            Vào Khu Luyện Tập
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}
