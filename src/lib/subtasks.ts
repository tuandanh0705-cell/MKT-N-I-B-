export interface TaskSubtaskItem {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  remindedAt?: string | null;
}

export function createSubtaskId(): string {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeSubtasks(raw: unknown): TaskSubtaskItem[] {
  if (!Array.isArray(raw)) return [];
  const result: TaskSubtaskItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = String(rec.title ?? "").trim();
    if (!title) continue;
    result.push({
      id: typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : createSubtaskId(),
      title,
      done: Boolean(rec.done),
      dueDate: typeof rec.dueDate === "string" && rec.dueDate.trim() ? rec.dueDate.trim() : null,
      assigneeId:
        typeof rec.assigneeId === "string" && rec.assigneeId.trim()
          ? rec.assigneeId.trim()
          : null,
      assigneeName:
        typeof rec.assigneeName === "string" && rec.assigneeName.trim()
          ? rec.assigneeName.trim()
          : null,
      remindedAt:
        typeof rec.remindedAt === "string" && rec.remindedAt.trim()
          ? rec.remindedAt.trim()
          : null,
    });
  }
  return result;
}
