import { prisma } from "@/lib/prisma";
import type {
  ActivityAction,
  ActivityEntityType,
  Prisma,
} from "@/generated/prisma/client";

export interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Tiêu đề",
  description: "Mô tả",
  caption: "Caption bài đăng",
  platform: "Kênh triển khai",
  publishChannel: "Kênh / Page / Web cụ thể",
  mediaBriefItemsJson: "Brief chi tiết từng ảnh / video",
  taskType: "Loại công việc",
  status: "Trạng thái",
  priority: "Mức độ ưu tiên",
  assigneeId: "Người thực hiện",
  quantity: "Số lượng",
  dueAt: "Deadline chốt App",
  scheduledPublishAt: "Lịch đăng chốt App",
  proposedBriefDueAt: "Mốc chuẩn bị (Content)",
  proposedPublishAt: "Giờ đề xuất đăng (Content)",
  timelineNote: "Ghi chú Timeline",
  timelineStatus: "Trạng thái duyệt Timeline",
  contentPillar: "Chủ đề / Topic (Matrix)",
  campaignWeek: "Tuần chiến dịch",
  contentAngle: "Tuyến nội dung",
  postFormat: "Format bài viết",
  mediaDueAt: "Deadline ảnh / Media",
  productLink: "Link sản phẩm",
  isAired: "Trạng thái Air bài",
  fbPostLayout: "Bố cục Facebook",
};

function stringifyValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "(Trống)";
  if (val instanceof Date) {
    return val.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  }
  return String(val);
}

export function buildFieldDiffs(
  beforeObj: Record<string, unknown>,
  afterObj: Record<string, unknown>,
  fields: string[] = Object.keys(FIELD_LABELS)
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of fields) {
    if (!(field in afterObj) || afterObj[field] === undefined) continue;
    const prevRaw = beforeObj[field];
    const nextRaw = afterObj[field];
    const prevStr =
      prevRaw instanceof Date ? prevRaw.toISOString() : String(prevRaw ?? "");
    const nextStr =
      nextRaw instanceof Date ? nextRaw.toISOString() : String(nextRaw ?? "");
    if (prevStr === nextStr) continue;
    changes.push({
      field,
      label: FIELD_LABELS[field] || field,
      before: stringifyValue(prevRaw),
      after: stringifyValue(nextRaw),
    });
  }
  return changes;
}

export async function recordActivity({
  entityType = "TASK",
  entityId,
  taskId,
  actorId,
  action,
  summary,
  changes,
}: {
  entityType?: ActivityEntityType;
  entityId: string;
  taskId?: string | null;
  actorId?: string | null;
  action: ActivityAction;
  summary: string;
  changes?: FieldChange[];
}) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        taskId: taskId ?? undefined,
        actorId: actorId ?? undefined,
        action,
        summary,
        changesJson:
          changes && changes.length > 0
            ? (changes as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to record activity log:", err);
  }
}
