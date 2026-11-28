"use client";

import { useState } from "react";
import { MultiAssigneePicker } from "@/components/multi-assignee-picker";
import { PlatformLogo } from "@/components/platform-logo";
import { PublishChannelInput } from "@/components/publish-channel-input";
import { CONTENT_PLATFORM_OPTIONS } from "@/lib/content-plan";
import { TASK_TYPE_META } from "@/lib/constants";
import { parseVnDateTimeLocalToIso, toVnDateTimeLocalValue } from "@/lib/dates";
import { normalizePlatformSelectValue } from "@/lib/platform-meta";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import type { SimpleUser, TaskItem } from "@/types/crm";
import type { TaskPriority, TaskType } from "@/generated/prisma/client";

interface TaskDrawerEditFormProps {
  task: TaskItem;
  users: SimpleUser[];
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>, successToast: string) => Promise<void>;
}

export function TaskDrawerEditForm({
  task,
  users,
  saving,
  onCancel,
  onSave,
}: TaskDrawerEditFormProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editPlatform, setEditPlatform] = useState(
    normalizePlatformSelectValue(task.platform)
  );
  const [editPublishChannel, setEditPublishChannel] = useState(
    task.publishChannel || ""
  );
  const [editTaskType, setEditTaskType] = useState<TaskType>(task.taskType);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>(() =>
    getTaskAssigneeIds(task)
  );
  const [editQuantity, setEditQuantity] = useState(task.quantity || 1);
  const [editDueAt, setEditDueAt] = useState(toVnDateTimeLocalValue(task.dueAt));
  const [editScheduleAt, setEditScheduleAt] = useState(
    toVnDateTimeLocalValue(task.scheduledPublishAt)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(
      {
        title: editTitle,
        description: editDescription,
        platform: editPlatform,
        publishChannel: editPublishChannel.trim() || null,
        taskType: editTaskType,
        isMediaOrder: TASK_TYPE_META[editTaskType]?.isMediaOrderDefault ?? false,
        priority: editPriority,
        assigneeIds: editAssigneeIds,
        assigneeId: editAssigneeIds[0] || null,
        quantity: editQuantity,
        dueAt: parseVnDateTimeLocalToIso(editDueAt),
        scheduledPublishAt: parseVnDateTimeLocalToIso(editScheduleAt),
      },
      "Đã cập nhật thông tin công việc."
    );
    onCancel();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Chỉnh sửa thông tin đầu việc
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:underline cursor-pointer"
        >
          Đóng
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Tiêu đề *
        </label>
        <input
          type="text"
          required
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Loại việc
          </label>
          <select
            value={editTaskType}
            onChange={(e) => setEditTaskType(e.target.value as TaskType)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            {Object.entries(TASK_TYPE_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
            <PlatformLogo platform={editPlatform} size="xs" />
            <span>Nền tảng</span>
          </label>
          <select
            value={normalizePlatformSelectValue(editPlatform)}
            onChange={(e) => setEditPlatform(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            {CONTENT_PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {!CONTENT_PLATFORM_OPTIONS.includes(
              normalizePlatformSelectValue(
                editPlatform
              ) as (typeof CONTENT_PLATFORM_OPTIONS)[number]
            ) && <option value={editPlatform}>{editPlatform}</option>}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {editTaskType === "MEDIA_VIDEO"
              ? "Số lượng video"
              : editTaskType === "MEDIA_IMAGE"
                ? "Số lượng ảnh"
                : "Số lượng"}
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={editQuantity}
            onChange={(e) =>
              setEditQuantity(Math.max(1, Number(e.target.value)))
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </div>
      </div>

      <PublishChannelInput
        platform={editPlatform}
        value={editPublishChannel}
        onChange={setEditPublishChannel}
        compact
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Người thực hiện (chọn 1 hoặc nhiều)
          </label>
          <MultiAssigneePicker
            users={users}
            value={editAssigneeIds}
            onChange={setEditAssigneeIds}
            placeholder="-- Chưa gán --"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ưu tiên
          </label>
          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          >
            <option value="LOW">Thấp</option>
            <option value="NORMAL">Bình thường</option>
            <option value="HIGH">Ưu tiên cao</option>
            <option value="URGENT">Gấp</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={editDueAt}
            onChange={(e) => setEditDueAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ngày đăng dự kiến
          </label>
          <input
            type="datetime-local"
            value={editScheduleAt}
            onChange={(e) => setEditScheduleAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Brief / Yêu cầu chi tiết
        </label>
        <textarea
          rows={3}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold cursor-pointer"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
