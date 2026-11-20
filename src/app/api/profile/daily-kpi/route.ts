import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVnDateString } from "@/lib/dates";
import {
  normalizeDailyKpiList,
  resolveEffectiveDailyKpi,
} from "@/lib/daily-kpi";
import { syncDailyKpiTasksForDate } from "@/lib/daily-kpi-sync";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const resolved = resolveEffectiveDailyKpi(user);
  return NextResponse.json({
    items: resolved.items,
    isDefaultFallback: resolved.isDefaultFallback,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const resetToDefault = body.resetToDefault === true;
    const syncTodayNow = body.syncTodayNow !== false;
    const normalized = resetToDefault ? null : normalizeDailyKpiList(body.items);

    const videoTarget = normalized?.find((i) => i.taskType === "MEDIA_VIDEO")?.target;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyKpiJson:
          normalized === null
            ? Prisma.JsonNull
            : (normalized as unknown as Prisma.InputJsonValue),
        lastKpiSyncDate: null,
        ...(user.departmentScope === "MEDIA_VIDEO" && videoTarget
          ? { dailyVideoLimit: videoTarget }
          : {}),
      },
      select: {
        id: true,
        role: true,
        departmentScope: true,
        employmentType: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        dailyKpiJson: true,
        lastKpiSyncDate: true,
      },
    });

    const todayStr = getVnDateString();
    const synced = syncTodayNow
      ? await syncDailyKpiTasksForDate({
          user: updated,
          dateStr: todayStr,
          markUserTodaySynced: true,
        })
      : { createdTasks: [] };

    const resolved = resolveEffectiveDailyKpi(updated);
    return NextResponse.json({
      items: resolved.items,
      isDefaultFallback: resolved.isDefaultFallback,
      createdTasks: synced.createdTasks,
    });
  } catch (err) {
    console.error("Update personal daily KPI error:", err);
    return NextResponse.json(
      { error: "Không lưu được chỉ tiêu KPI hàng ngày." },
      { status: 500 }
    );
  }
}
