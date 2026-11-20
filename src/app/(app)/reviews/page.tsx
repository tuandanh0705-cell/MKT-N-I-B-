import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  redirect("/outputs?readiness=NEEDS_REVIEW");
}
