"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { MediaBriefBoard, type MediaBriefKind } from "@/components/media-brief-board";
import { CreateTaskModal } from "@/components/create-task-modal";
import { TaskDrawer } from "@/components/task-drawer";
import type { VideoOrderKind } from "@/lib/media-brief";
import type {
  CapacityItem,
  SimpleProject,
  SimpleUser,
  TaskItem,
} from "@/types/crm";
import type { UserRole } from "@/generated/prisma/client";

interface MediaOrdersPageClientProps {
  initialTasks: TaskItem[];
  projects: SimpleProject[];
  users: SimpleUser[];
  capacity: CapacityItem[];
  currentUserId: string;
  currentUserRole: UserRole;
}

export function MediaOrdersPageClient({
  initialTasks,
  projects,
  users,
  capacity,
  currentUserId,
  currentUserRole,
}: MediaOrdersPageClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBriefKind, setCreateBriefKind] =
    useState<MediaBriefKind>("MEDIA_IMAGE");
  const [createVideoKind, setCreateVideoKind] =
    useState<VideoOrderKind>("SHOOT_AND_EDIT");

  function handleTaskUpdated(updated: TaskItem) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Order Media &amp; Brief Ảnh / Video
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Chọn 1 trong 2: <strong>Brief Ảnh</strong> hoặc{" "}
              <strong>Brief Video</strong> để theo dõi Ngày order, Tình trạng, Deadline và Số lượng.
            </p>
          </div>
        </div>
      </div>

      <MediaBriefBoard
        tasks={tasks}
        projects={projects}
        defaultProjectId={projects[0]?.id}
        users={users}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        showProjectColumn
        onSelectTask={(taskId) => setActiveTaskId(taskId)}
        onTaskCreated={(createdTask) =>
          setTasks((prev) => [createdTask, ...prev])
        }
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        onOpenCreateModal={(kind, videoKind) => {
          setCreateBriefKind(kind);
          if (videoKind) setCreateVideoKind(videoKind);
          setCreateOpen(true);
        }}
      />

      <CreateTaskModal
        key={`global-media-${createBriefKind}-${createVideoKind}-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        users={users}
        initialCapacity={capacity}
        currentUserId={currentUserId}
        defaultProjectId={projects[0]?.id}
        defaultTaskType={createBriefKind}
        defaultOrderMode="MEDIA"
        defaultVideoKind={createVideoKind}
        onCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
      />

      <TaskDrawer
        taskId={activeTaskId}
        currentUserRole={currentUserRole}
        centeredModal
        onClose={() => setActiveTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
        onDuplicated={(dup) => setTasks((prev) => [dup, ...prev])}
      />
    </div>
  );
}
