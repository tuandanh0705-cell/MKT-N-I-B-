import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgeWorkspaceData } from "@/lib/knowledge-data";
import { KnowledgeHubView } from "@/components/knowledge-hub-view";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ courseId }, data] = await Promise.all([
    searchParams,
    getKnowledgeWorkspaceData(user),
  ]);

  return (
    <KnowledgeHubView
      initialCourses={data.courses}
      initialMyProgresses={data.myProgresses}
      projects={data.projects}
      teamMembers={data.teamMembers}
      initialTeamProgresses={data.teamProgresses}
      currentUserId={user.id}
      currentUserRole={user.role}
      initialCourseId={courseId}
    />
  );
}
