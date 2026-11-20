import { prisma } from "@/lib/prisma";
import type { OutputCategoryKey } from "@/lib/output-helpers";
import type {
  QcStandardCategory,
  QcStandardDocItem,
  QcStandardSourceType,
} from "@/lib/gemini-shared";

const DB_INCLUDE_DEFAULT_QC_KEY = "gemini_include_default_qc";
const MAX_EXTRACTED_TEXT_CHARS = 50_000;

export function normalizeStandardCategory(raw: unknown): QcStandardCategory {
  const val = String(raw ?? "ALL").toUpperCase();
  if (val === "CONTENT" || val === "IMAGE" || val === "VIDEO") return val;
  return "ALL";
}

export function normalizeStandardSourceType(raw: unknown): QcStandardSourceType {
  const val = String(raw ?? "TEXT").toUpperCase();
  if (val === "FILE" || val === "LINK") return val;
  return "TEXT";
}

/** Chuyển đổi link Google Docs / Sheets sang URL export plain text / CSV để tự đồng bộ. */
export function buildFetchableDocUrl(rawUrl: string): string {
  const url = (rawUrl || "").trim();
  if (!url) return "";

  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch?.[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt`;
  }

  const sheetMatch = url.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (sheetMatch?.[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv`;
  }

  return url;
}

/** Cố gắng kéo nội dung văn bản từ link tài liệu công khai (Google Docs, Sheet, TXT, Markdown). */
export async function tryFetchExternalStandardText(rawUrl: string): Promise<{
  text: string | null;
  warning: string | null;
}> {
  const fetchUrl = buildFetchableDocUrl(rawUrl);
  if (!fetchUrl) {
    return { text: null, warning: "Đường dẫn tài liệu trống." };
  }

  try {
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "MetaEcomMktHub-QC/1.0" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return {
        text: null,
        warning: `Không đọc được link (HTTP ${res.status}). Hãy đặt quyền chia sẻ công khai "Bất kỳ ai có đường liên kết" hoặc dán trực tiếp nội dung vào ô Văn bản.`,
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const rawBody = await res.text();

    if (
      contentType.includes("text/html") &&
      (rawBody.includes("ServiceLogin") || rawBody.includes("accounts.google.com"))
    ) {
      return {
        text: null,
        warning:
          "File Google Docs/Drive đang đặt chế độ riêng tư nên server không đọc được tự động. Hãy bật 'Anyone with the link can view' hoặc dán nội dung trực tiếp.",
      };
    }

    if (contentType.includes("text/html")) {
      const stripped = rawBody
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return {
        text: stripped ? stripped.slice(0, MAX_EXTRACTED_TEXT_CHARS) : null,
        warning: stripped
          ? null
          : "Trang web không chứa nội dung văn bản thuần để trích xuất.",
      };
    }

    const cleaned = rawBody.trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
    return {
      text: cleaned || null,
      warning: cleaned ? null : "Tài liệu không có chữ.",
    };
  } catch {
    return {
      text: null,
      warning:
        "Không thể kết nối tới đường dẫn tài liệu (timeout hoặc bị chặn). Hãy dán nội dung hoặc tải file trực tiếp.",
    };
  }
}

export async function getIncludeDefaultQcSetting(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: DB_INCLUDE_DEFAULT_QC_KEY },
  });
  return row?.value === "true";
}

export async function setIncludeDefaultQcSetting(enabled: boolean): Promise<boolean> {
  await prisma.appSetting.upsert({
    where: { key: DB_INCLUDE_DEFAULT_QC_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: DB_INCLUDE_DEFAULT_QC_KEY, value: enabled ? "true" : "false" },
  });
  return enabled;
}

/** Danh sách đầy đủ tài liệu tiêu chuẩn (CHỈ dùng cho Leader API/UI). */
export async function listAllQcStandardDocsForLeader(): Promise<QcStandardDocItem[]> {
  const rows = await prisma.qcStandardDoc.findMany({
    orderBy: [{ isActive: "desc" }, { projectId: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      sourceType: true,
      contentText: true,
      sourceUrl: true,
      fileName: true,
      mimeType: true,
      fileDataBase64: true,
      isActive: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: normalizeStandardCategory(r.category),
    sourceType: normalizeStandardSourceType(r.sourceType),
    contentText: r.contentText,
    sourceUrl: r.sourceUrl,
    fileName: r.fileName,
    mimeType: r.mimeType,
    hasBinaryFile: Boolean(r.fileDataBase64),
    isActive: r.isActive,
    projectId: r.projectId,
    project: r.project,
    updatedBy: r.updatedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export interface ActiveLeaderStandardForAi {
  id: string;
  title: string;
  category: string;
  projectName: string | null;
  contentText: string | null;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileDataBase64: string | null;
}

/** Lấy các bộ tài liệu tiêu chuẩn Leader đang bật khớp với Dự án & Loại Output (chỉ dùng phía server cho AI Check). */
export async function getActiveLeaderStandardsForTask(
  projectId: string,
  outputCategory: OutputCategoryKey
): Promise<ActiveLeaderStandardForAi[]> {
  const allowedCategories =
    outputCategory === "OTHER" ? ["ALL"] : ["ALL", outputCategory];

  const rows = await prisma.qcStandardDoc.findMany({
    where: {
      isActive: true,
      category: { in: allowedCategories },
      OR: [{ projectId: null }, { projectId }],
    },
    orderBy: [{ projectId: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      contentText: true,
      sourceUrl: true,
      fileName: true,
      mimeType: true,
      fileDataBase64: true,
      project: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    projectName: r.project?.name || null,
    contentText: r.contentText,
    sourceUrl: r.sourceUrl,
    fileName: r.fileName,
    mimeType: r.mimeType,
    fileDataBase64: r.fileDataBase64,
  }));
}
