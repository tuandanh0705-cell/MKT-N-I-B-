import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getVnDateString } from "@/lib/dates";
import { getOutputsWorkspaceData } from "@/lib/outputs-data";
import { OutputsHubView } from "@/components/outputs-hub-view";
import type {
  OutputCategoryFilter,
  OutputReadinessFilter,
} from "@/lib/output-helpers";

const VALID_CATEGORIES = new Set<OutputCategoryFilter>([
  "ALL",
  "CONTENT",
  "IMAGE",
  "VIDEO",
  "OTHER",
]);

const VALID_READINESS = new Set<OutputReadinessFilter>([
  "ALL",
  "HAS_OUTPUT",
  "NEEDS_REVIEW",
  "APPROVED_OR_DONE",
  "REVISION_NEEDED",
  "MISSING_OUTPUT",
]);

export default async function OutputsPage({
  searchParams,
}: {
  searchParams: Promise<{
    memberId?: string;
    category?: string;
    projectId?: string;
    readiness?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const data = await getOutputsWorkspaceData(user);

  const rawCategory = (resolvedParams.category || "ALL").toUpperCase();
  const initialCategory: OutputCategoryFilter = VALID_CATEGORIES.has(
    rawCategory as OutputCategoryFilter
  )
    ? (rawCategory as OutputCategoryFilter)
    : "ALL";

  const rawReadiness = (resolvedParams.readiness || "").toUpperCase();
  const initialReadiness: OutputReadinessFilter = VALID_READINESS.has(
    rawReadiness as OutputReadinessFilter
  )
    ? (rawReadiness as OutputReadinessFilter)
    : user.role === "LEADER"
      ? "NEEDS_REVIEW"
      : "ALL";

  const initialMemberId =
    user.role === "LEADER" && resolvedParams.memberId
      ? resolvedParams.memberId
      : "ALL";

  const initialProjectId = resolvedParams.projectId || "ALL";

  return (
    <OutputsHubView
      initialTasks={data.tasks}
      projects={data.projects}
      users={data.users}
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserRole={user.role}
      todayDateStr={getVnDateString()}
      initialAiConfig={data.aiConfig}
      initialMemberId={initialMemberId}
      initialCategory={initialCategory}
      initialProjectId={initialProjectId}
      initialReadiness={initialReadiness}
    />
  );
}
