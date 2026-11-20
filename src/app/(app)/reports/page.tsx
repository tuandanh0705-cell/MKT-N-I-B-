import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getVnMonthKey, getVnWeekBounds } from "@/lib/dates";
import { WeeklyReportsView } from "@/components/weekly-reports-view";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { weekStartStr, weekEndStr } = getVnWeekBounds();
  const monthKey = getVnMonthKey();

  return (
    <WeeklyReportsView
      initialWeekStart={weekStartStr}
      initialWeekEnd={weekEndStr}
      initialMonthKey={monthKey}
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserRole={user.role}
    />
  );
}
