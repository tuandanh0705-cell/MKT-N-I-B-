import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runScheduledReminder, type ReminderSlot } from "@/lib/reminders";
import { isSmtpConfigured } from "@/lib/mailer";

async function handleCron(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization") || "";
  const bearerSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const querySecret = searchParams.get("secret") || "";
  const expectedSecret = process.env.CRON_SECRET || "";

  let authorized = Boolean(
    expectedSecret && (bearerSecret === expectedSecret || querySecret === expectedSecret)
  );

  // Cho phép Leader bấm test nhắc lịch trực tiếp từ giao diện web
  if (!authorized) {
    const user = await getCurrentUser();
    if (user?.role === "LEADER") {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Không có quyền chạy cron." }, { status: 401 });
  }

  const slotParam = searchParams.get("slot") as ReminderSlot | null;
  const force = searchParams.get("force") === "1";

  const result = await runScheduledReminder(slotParam ?? undefined, { force });
  return NextResponse.json({
    ...result,
    smtpConfigured: isSmtpConfigured(),
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
