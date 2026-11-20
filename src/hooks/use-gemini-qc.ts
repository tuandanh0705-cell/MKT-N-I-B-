"use client";

import { useCallback, useState } from "react";
import {
  parseSavedAiQcResult,
  type GeminiQcCheckResponse,
} from "@/lib/gemini-shared";
import type { TaskItem } from "@/types/crm";

interface UseGeminiQcRunnerOptions {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onResultSaved?: (taskId: string, result: GeminiQcCheckResponse) => void;
}

/**
 * Hook dùng chung cho các màn hình (Outputs Hub, Project Workspace, v.v.)
 * để gọi `/api/outputs/ai-check`, cache state & ưu tiên lấy kết quả mới nhất
 * hoặc kết quả đã lưu trong DB (`task.lastAiQcJson`).
 */
export function useGeminiQcRunner({
  showToast,
  onResultSaved,
}: UseGeminiQcRunnerOptions) {
  const [aiCheckingTaskId, setAiCheckingTaskId] = useState<string | null>(null);
  const [aiResultsByTaskId, setAiResultsByTaskId] = useState<
    Record<string, GeminiQcCheckResponse>
  >({});
  const [aiErrorsByTaskId, setAiErrorsByTaskId] = useState<
    Record<string, string | null>
  >({});

  const getAiResultForTask = useCallback(
    (task: Pick<TaskItem, "id" | "lastAiQcJson">): GeminiQcCheckResponse | null => {
      return aiResultsByTaskId[task.id] ?? parseSavedAiQcResult(task.lastAiQcJson);
    },
    [aiResultsByTaskId]
  );

  const runAiCheckForTask = useCallback(
    async (
      task: Pick<TaskItem, "id">,
      customFocus?: string
    ): Promise<GeminiQcCheckResponse | null> => {
      setAiCheckingTaskId(task.id);
      setAiErrorsByTaskId((prev) => ({ ...prev, [task.id]: null }));

      try {
        const res = await fetch("/api/outputs/ai-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            customFocus: customFocus?.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const errMsg = data.error || "Không thể AI Check Output lúc này.";
          setAiErrorsByTaskId((prev) => ({ ...prev, [task.id]: errMsg }));
          showToast(errMsg, "error");
          return null;
        }

        const typed = data as GeminiQcCheckResponse;
        setAiResultsByTaskId((prev) => ({ ...prev, [task.id]: typed }));
        onResultSaved?.(task.id, typed);
        showToast(`Gemini đã chấm xong: ${typed.result.score}/100 điểm.`);
        return typed;
      } catch {
        const errMsg = "Lỗi kết nối máy chủ khi gọi Gemini AI Check.";
        setAiErrorsByTaskId((prev) => ({ ...prev, [task.id]: errMsg }));
        showToast(errMsg, "error");
        return null;
      } finally {
        setAiCheckingTaskId(null);
      }
    },
    [onResultSaved, showToast]
  );

  return {
    aiCheckingTaskId,
    aiResultsByTaskId,
    aiErrorsByTaskId,
    getAiResultForTask,
    runAiCheckForTask,
  };
}
