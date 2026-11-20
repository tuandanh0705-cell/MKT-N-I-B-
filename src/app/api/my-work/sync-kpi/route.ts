import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVnDateString } from "@/lib/dates";
import { syncDailyKpiTasksForDate } from "@/lib/daily-kpi-sync";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const todayStr = getVnDateString();
    const rawDate = typeof body.dateStr === "string" ? body.dateStr.trim() : "";
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr;

    const { createdTasks } = await syncDailyKpiTasksForDate({
      user,
      dateStr,
      markUserTodaySynced: dateStr === todayStr,
    });

    return NextResponse.json({
      dateStr,
      createdTasks,
      createdCount: createdTasks.length,
    });
  } catch (err) {
    console.error("Sync daily KPI error:", err);
    return NextResponse.json(
      { error: "Không đồng bộ được đầu việc KPI sang To-Do List." },
      { status: 500 }
    );
  }
}
