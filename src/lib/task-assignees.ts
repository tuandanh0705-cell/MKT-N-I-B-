import type { TaskAssigneeUser, TaskItem } from "@/types/crm";

type TaskWithAssigneesLike = Pick<TaskItem, "assignee" | "assignees">;

/**
 * Trả về danh sách đầy đủ người thực hiện (không trùng lặp), ưu tiên `assignee` chính ở vị trí đầu.
 * Tương thích ngược hoàn toàn với task cũ chỉ lưu `assigneeId` (chưa có dòng trong `TaskAssignee`).
 */
export function getTaskAssignees(
  task?: TaskWithAssigneesLike | null
): TaskAssigneeUser[] {
  if (!task) return [];
  const seen = new Set<string>();
  const out: TaskAssigneeUser[] = [];

  if (task.assignee) {
    seen.add(task.assignee.id);
    out.push(task.assignee);
  }
  if (Array.isArray(task.assignees)) {
    for (const entry of task.assignees) {
      const u = entry?.user;
      if (!u || seen.has(u.id)) continue;
      seen.add(u.id);
      out.push(u);
    }
  }
  return out;
}

export function getTaskAssigneeIds(
  task?: TaskWithAssigneesLike | null
): string[] {
  return getTaskAssignees(task).map((u) => u.id);
}

export function isUserAssignedToTask(
  task: TaskWithAssigneesLike | null | undefined,
  userId: string
): boolean {
  if (!task || !userId) return false;
  if (task.assignee?.id === userId) return true;
  if (Array.isArray(task.assignees)) {
    return task.assignees.some(
      (a) => a?.user?.id === userId || a?.userId === userId
    );
  }
  return false;
}

export function formatTaskAssigneesLabel(
  task?: TaskWithAssigneesLike | null,
  fallback = "Chưa gán"
): string {
  const list = getTaskAssignees(task);
  if (list.length === 0) return fallback;
  return list.map((u) => u.name).join(", ");
}

/**
 * Chuẩn hóa input `assigneeIds` (mảng) hoặc `assigneeId` (đơn lẻ) từ API request body.
 * Trả về `undefined` nếu request không cập nhật trường người thực hiện.
 */
export function parseAssigneeIdsFromBody(body: {
  assigneeIds?: unknown;
  assigneeId?: unknown;
}): string[] | undefined {
  if (Array.isArray(body.assigneeIds)) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of body.assigneeIds) {
      const id = String(raw ?? "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }
  if (body.assigneeId !== undefined) {
    const id = body.assigneeId ? String(body.assigneeId).trim() : "";
    return id ? [id] : [];
  }
  return undefined;
}
