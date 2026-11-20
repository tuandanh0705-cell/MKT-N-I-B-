import type { TaskItem } from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

export function canUserDeleteTask(
  task: Pick<TaskItem, "status" | "requester">,
  currentUserId?: string,
  currentUserRole?: UserRole
): boolean {
  if (currentUserRole === "LEADER") return true;
  return Boolean(
    currentUserId &&
      task.requester?.id === currentUserId &&
      task.status === "DRAFT"
  );
}

export async function softDeleteTasksByIds(
  ids: string[]
): Promise<{ deletedIds: string[]; failedCount: number }> {
  if (ids.length === 0) return { deletedIds: [], failedCount: 0 };
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        return { id, ok: res.ok };
      } catch {
        return { id, ok: false };
      }
    })
  );
  const deletedIds = results.filter((r) => r.ok).map((r) => r.id);
  return { deletedIds, failedCount: results.length - deletedIds.length };
}
