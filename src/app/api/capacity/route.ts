import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAnonymizedTeamCapacity } from "@/lib/capacity";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(`${dateParam}T12:00:00+07:00`) : new Date();

  const capacity = await getAnonymizedTeamCapacity(
    Number.isNaN(targetDate.getTime()) ? new Date() : targetDate
  );

  return NextResponse.json({ capacity });
}
