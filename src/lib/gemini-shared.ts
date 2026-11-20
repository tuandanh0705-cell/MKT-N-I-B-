export const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash — Free Tier $0 (Khuyên dùng test miễn phí)",
    tier: "FREE",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite — Free Tier $0 (Nhanh & nhiều lượt/ngày)",
    tier: "FREE",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash — Flash ổn định (Free / Paid)",
    tier: "FREE",
  },
  {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen — Paid / Ultra Credit ($1.50 / $7.50 per 1M)",
    tier: "PAID",
  },
  {
    id: "gemini-4-carbon",
    label: "Gemini 4 Carbon — Paid / Ultra Credit ($2.00 / $10.00 per 1M)",
    tier: "PAID",
  },
  {
    id: "gemini-4-neon",
    label: "Gemini 4 Neon — Paid / Ultra Credit ($3.00 / $15.00 per 1M)",
    tier: "PAID",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon — Paid / Ultra Credit ($2.00 / $10.00 per 1M)",
    tier: "PAID",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro — Paid / Ultra Credit (Phân tích sâu)",
    tier: "PAID",
  },
] as const;

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export type QcStandardCategory = "ALL" | "CONTENT" | "IMAGE" | "VIDEO";
export type QcStandardSourceType = "TEXT" | "FILE" | "LINK";

export interface QcStandardDocItem {
  id: string;
  title: string;
  category: QcStandardCategory;
  sourceType: QcStandardSourceType;
  contentText: string | null;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  hasBinaryFile: boolean;
  isActive: boolean;
  projectId: string | null;
  project?: { id: string; name: string; color: string } | null;
  updatedBy?: { id: string; name: string } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface GeminiConfigInfo {
  configured: boolean;
  source: "DB" | "ENV" | "NONE";
  maskedKey: string | null;
  model: string;
  activeStandardsCount?: number;
  includeDefaultQc?: boolean;
}

export interface GeminiQcIssue {
  severity: "HIGH" | "MEDIUM" | "LOW";
  qcCode: string;
  title: string;
  detail: string;
  fixSuggestion: string;
}

export interface GeminiQcResult {
  score: number;
  verdict: "DAT" | "CAN_SUA" | "THIEU_DU_LIEU";
  summary: string;
  strengths: string[];
  issues: GeminiQcIssue[];
  suggestedCaption: string;
  matchedQcCodes: string[];
}

export interface GeminiQcCheckResponse {
  result: GeminiQcResult;
  meta: {
    model: string;
    fallbackFrom?: string | null;
    imagesAnalyzedCount: number;
    skippedPrivateImageLinks: string[];
    hasCaptionChecked: boolean;
    standardsSource?: "LEADER_DOCS" | "COMBINED" | "DEFAULT_CRM";
    standardsCount?: number;
    standardsNames?: string[];
    checkedAt: string;
  };
}

/**
 * Chuẩn hóa `task.lastAiQcJson` lưu dưới dạng `Prisma.JsonValue` sang `GeminiQcCheckResponse` an toàn.
 */
export function parseSavedAiQcResult(
  raw: unknown
): GeminiQcCheckResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { result?: unknown; meta?: unknown };
  if (
    !candidate.result ||
    typeof candidate.result !== "object" ||
    !candidate.meta ||
    typeof candidate.meta !== "object"
  ) {
    return null;
  }
  const r = candidate.result as { score?: unknown };
  if (typeof r.score !== "number") return null;
  return candidate as GeminiQcCheckResponse;
}
