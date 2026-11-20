import { prisma } from "@/lib/prisma";
import { analyzeTaskOutputs, extractAssetPreviewImageUrl } from "@/lib/output-helpers";
import { getQcCriteriaForTaskType } from "@/lib/qc-standards";
import {
  getActiveLeaderStandardsForTask,
  getIncludeDefaultQcSetting,
  tryFetchExternalStandardText,
} from "@/lib/qc-standard-docs";
import {
  DEFAULT_GEMINI_MODEL,
  type GeminiConfigInfo,
  type GeminiQcCheckResponse,
  type GeminiQcResult,
} from "@/lib/gemini-shared";
import type { UserRole } from "@/generated/prisma/client";
import type { TaskItem } from "@/types/crm";

export type {
  GeminiConfigInfo,
  GeminiQcCheckResponse,
  GeminiQcIssue,
  GeminiQcResult,
} from "@/lib/gemini-shared";

const DB_KEY_SETTING = "gemini_api_key";
const DB_MODEL_SETTING = "gemini_model";
const FREE_FALLBACK_FLASH_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

function isTransientOrModelError(status: number): boolean {
  return (
    status === 404 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function parseGeminiHttpError(res: Response): Promise<string> {
  let errDetail = `HTTP ${res.status}`;
  try {
    const errJson = await res.json();
    if (errJson?.error?.message) errDetail = String(errJson.error.message);
  } catch {
    // ignore non-json body
  }
  return errDetail;
}

async function fetchAvailableGeminiFlashModels(apiKey: string): Promise<{
  validKey: boolean;
  flashModels: string[];
  errorMessage?: string;
}> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=50",
      {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      return {
        validKey: false,
        flashModels: [],
        errorMessage: await parseGeminiHttpError(res),
      };
    }
    const data = await res.json();
    const rawModels: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }> = Array.isArray(data?.models) ? data.models : [];

    const flashModels = rawModels
      .filter(
        (m) =>
          typeof m.name === "string" &&
          m.name.includes("flash") &&
          !m.name.includes("image") &&
          !m.name.includes("tts") &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent")
      )
      .map((m) => String(m.name).replace(/^models\//, ""));

    flashModels.sort((a, b) => b.localeCompare(a));
    return { validKey: true, flashModels };
  } catch {
    return { validKey: true, flashModels: [] };
  }
}

async function probeSingleGeminiModel(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; status: number; errDetail: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "OK" }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      return { ok: true, status: 200, errDetail: "" };
    }
    return {
      ok: false,
      status: res.status,
      errDetail: await parseGeminiHttpError(res),
    };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      errDetail: err instanceof Error ? err.message : "Network timeout",
    };
  }
}

export function maskGeminiKey(rawKey: string | null | undefined): string | null {
  const clean = (rawKey || "").trim();
  if (!clean) return null;
  if (clean.length <= 10) return `${clean.slice(0, 3)}••••`;
  return `${clean.slice(0, 6)}••••••${clean.slice(-4)}`;
}

async function resolveRawGeminiConfig(): Promise<{
  apiKey: string;
  model: string;
  source: "DB" | "ENV" | "NONE";
}> {
  const [keyRow, modelRow] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: DB_KEY_SETTING } }),
    prisma.appSetting.findUnique({ where: { key: DB_MODEL_SETTING } }),
  ]);

  const dbKey = (keyRow?.value || "").trim();
  const envKey = (process.env.GEMINI_API_KEY || "").trim();

  const apiKey = dbKey || envKey;
  const source: "DB" | "ENV" | "NONE" = dbKey
    ? "DB"
    : envKey
      ? "ENV"
      : "NONE";

  const model =
    (modelRow?.value || "").trim() ||
    (process.env.GEMINI_MODEL || "").trim() ||
    DEFAULT_GEMINI_MODEL;

  return { apiKey, model, source };
}

export async function getGeminiConfigStatus(): Promise<GeminiConfigInfo> {
  const [{ apiKey, model, source }, activeStandardsCount, includeDefaultQc] =
    await Promise.all([
      resolveRawGeminiConfig(),
      prisma.qcStandardDoc.count({ where: { isActive: true } }),
      getIncludeDefaultQcSetting(),
    ]);

  return {
    configured: Boolean(apiKey),
    source,
    maskedKey: maskGeminiKey(apiKey),
    model,
    activeStandardsCount,
    includeDefaultQc,
  };
}

export async function saveGeminiConfig(input: {
  apiKey?: string;
  model?: string;
  clearDbKey?: boolean;
}): Promise<GeminiConfigInfo> {
  if (input.clearDbKey) {
    await prisma.appSetting.deleteMany({ where: { key: DB_KEY_SETTING } });
  } else if (typeof input.apiKey === "string" && input.apiKey.trim()) {
    await prisma.appSetting.upsert({
      where: { key: DB_KEY_SETTING },
      update: { value: input.apiKey.trim() },
      create: { key: DB_KEY_SETTING, value: input.apiKey.trim() },
    });
  }

  if (typeof input.model === "string" && input.model.trim()) {
    await prisma.appSetting.upsert({
      where: { key: DB_MODEL_SETTING },
      update: { value: input.model.trim() },
      create: { key: DB_MODEL_SETTING, value: input.model.trim() },
    });
  }

  return getGeminiConfigStatus();
}

export async function testGeminiConnection(
  candidateKey?: string,
  candidateModel?: string
): Promise<{
  ok: boolean;
  warning?: boolean;
  keyVerified?: boolean;
  model: string;
  suggestedModel?: string;
  availableFlashModels?: string[];
  message: string;
}> {
  const resolved = await resolveRawGeminiConfig();
  const apiKey = (candidateKey || "").trim() || resolved.apiKey;
  const model = (candidateModel || "").trim() || resolved.model;

  if (!apiKey) {
    return {
      ok: false,
      keyVerified: false,
      model,
      message: "Chưa có Gemini API Key để kiểm tra.",
    };
  }

  const primaryProbe = await probeSingleGeminiModel(apiKey, model);
  if (primaryProbe.ok) {
    return {
      ok: true,
      keyVerified: true,
      model,
      message: `Kết nối thành công tới Google Gemini (${model}).`,
    };
  }

  if (!isTransientOrModelError(primaryProbe.status)) {
    return {
      ok: false,
      keyVerified: false,
      model,
      message: `Kết nối Gemini thất bại: ${primaryProbe.errDetail}`,
    };
  }

  // Primary model hit temporary 503/429/404 -> verify key via /models & probe fallback Flash models
  const catalog = await fetchAvailableGeminiFlashModels(apiKey);
  if (!catalog.validKey) {
    return {
      ok: false,
      keyVerified: false,
      model,
      message: `API Key không hợp lệ: ${catalog.errorMessage || primaryProbe.errDetail}`,
    };
  }

  const fallbackCandidates = Array.from(
    new Set([...FREE_FALLBACK_FLASH_MODELS, ...catalog.flashModels])
  ).filter((m) => m !== model);

  for (const fallback of fallbackCandidates.slice(0, 4)) {
    const probe = await probeSingleGeminiModel(apiKey, fallback);
    if (probe.ok) {
      return {
        ok: true,
        warning: true,
        keyVerified: true,
        model,
        suggestedModel: fallback,
        availableFlashModels: catalog.flashModels.slice(0, 8),
        message: `API Key hợp lệ! Model "${model}" đang quá tải tạm thời (${primaryProbe.errDetail}), nhưng "${fallback}" phản hồi tốt. Bạn có thể chuyển sang "${fallback}" hoặc bấm Lưu cấu hình ngay.`,
      };
    }
  }

  return {
    ok: true,
    warning: true,
    keyVerified: true,
    model,
    availableFlashModels: catalog.flashModels.slice(0, 8),
    message: `API Key hợp lệ (đã xác thực với Google), nhưng server Gemini Free Tier đang cao điểm tạm thời (${primaryProbe.errDetail}). Bạn cứ bấm "Lưu cấu hình" — khi chạy AI Check hệ thống sẽ tự luân phiên các model dự phòng!`,
  };
}

interface InlineImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
  label: string;
}

async function fetchDeliverableImagesForGemini(
  task: TaskItem,
  extraImageUrls?: string[]
): Promise<{
  parts: InlineImagePart[];
  skippedLinks: string[];
}> {
  const analyzed = analyzeTaskOutputs(task);
  const candidates: Array<{ url: string; label: string }> = [
    ...analyzed.deliverableAssets.map((a) => ({ url: a.url, label: a.label })),
  ];
  const seenUrls = new Set(candidates.map((c) => c.url));
  for (let i = 0; i < (extraImageUrls?.length ?? 0); i++) {
    const raw = (extraImageUrls?.[i] || "").trim();
    if (!raw || seenUrls.has(raw)) continue;
    seenUrls.add(raw);
    candidates.push({
      url: raw,
      label: raw.startsWith("data:image/") ? `Ảnh demo #${i + 1}` : `Link demo #${i + 1}`,
    });
  }

  const parts: InlineImagePart[] = [];
  const skippedLinks: string[] = [];

  for (const asset of candidates) {
    if (parts.length >= 4) break;
    const previewUrl = extractAssetPreviewImageUrl(asset.url);
    if (!previewUrl) continue;

    if (previewUrl.startsWith("data:image/")) {
      const m = previewUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m?.[1] && m?.[2]) {
        parts.push({
          label: asset.label,
          inlineData: { mimeType: m[1], data: m[2] },
        });
      }
      continue;
    }

    try {
      const res = await fetch(previewUrl, {
        headers: {
          "User-Agent": "MetaEcomMktHub-QC/1.0",
        },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) {
        skippedLinks.push(asset.url);
        continue;
      }
      const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (!contentType.startsWith("image/")) {
        skippedLinks.push(asset.url);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > 4 * 1024 * 1024) {
        skippedLinks.push(asset.url);
        continue;
      }
      parts.push({
        label: asset.label,
        inlineData: {
          mimeType: contentType,
          data: buf.toString("base64"),
        },
      });
    } catch {
      skippedLinks.push(asset.url);
    }
  }

  return { parts, skippedLinks };
}

/**
 * Gọi Google Gemini đa phương thức (Text + Vision) để QC kiểm tra Output của nhân viên
 * dựa trên chính bộ tiêu chuẩn QC_CRITERIA của CRM.
 */
export async function runGeminiOutputQcCheck(
  task: TaskItem,
  options?: {
    customFocus?: string;
    projectDescription?: string | null;
    extraImageUrls?: string[];
    viewerRole?: UserRole;
  }
): Promise<GeminiQcCheckResponse> {
  const { apiKey, model } = await resolveRawGeminiConfig();
  if (!apiKey) {
    throw new Error(
      "Chưa cấu hình Google Gemini API Key. Leader vui lòng bấm 'Cấu hình Gemini AI' hoặc thêm GEMINI_API_KEY vào .env."
    );
  }

  const analyzed = analyzeTaskOutputs(task);
  const criteria = getQcCriteriaForTaskType(task.taskType);
  const validCodes = new Set(criteria.map((c) => c.code));

  const [{ parts: imageParts, skippedLinks }, leaderDocs, includeDefaultQc] =
    await Promise.all([
      fetchDeliverableImagesForGemini(task, options?.extraImageUrls),
      getActiveLeaderStandardsForTask(task.project.id, analyzed.category),
      getIncludeDefaultQcSetting(),
    ]);

  // Nếu có tài liệu LINK chưa kịp snapshot chữ thì thử đọc bổ sung on-the-fly
  const leaderDocBlocks: string[] = [];
  const leaderBinaryParts: Array<{
    label: string;
    inlineData: { mimeType: string; data: string };
  }> = [];

  for (const doc of leaderDocs) {
    let textBody = (doc.contentText || "").trim();
    if (!textBody && doc.sourceUrl && !doc.fileDataBase64) {
      const fetched = await tryFetchExternalStandardText(doc.sourceUrl);
      if (fetched.text) {
        textBody = fetched.text;
        await prisma.qcStandardDoc
          .update({
            where: { id: doc.id },
            data: { contentText: fetched.text },
          })
          .catch(() => {});
      }
    }

    const scopeNote = doc.projectName
      ? `Riêng dự án: ${doc.projectName}`
      : "Áp dụng toàn team";
    const header = `### Tài liệu Leader: "${doc.title}" (Loại: ${doc.category} | ${scopeNote})`;

    if (
      doc.fileDataBase64 &&
      doc.mimeType &&
      (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/")) &&
      leaderBinaryParts.length < 3
    ) {
      leaderBinaryParts.push({
        label: `${doc.title}${doc.fileName ? ` (${doc.fileName})` : ""}`,
        inlineData: {
          mimeType: doc.mimeType,
          data: doc.fileDataBase64,
        },
      });
    }

    leaderDocBlocks.push(
      [
        header,
        textBody ||
          (doc.fileDataBase64
            ? `(Xem nội dung chi tiết trong file "${doc.fileName || doc.title}" được đính kèm bên dưới.)`
            : doc.sourceUrl
              ? `(Link tham chiếu: ${doc.sourceUrl})`
              : ""),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const hasLeaderDocs = leaderDocs.length > 0;
  const useDefaultCriteria = !hasLeaderDocs || includeDefaultQc;
  const standardsSource: "LEADER_DOCS" | "COMBINED" | "DEFAULT_CRM" =
    hasLeaderDocs
      ? includeDefaultQc
        ? "COMBINED"
        : "LEADER_DOCS"
      : "DEFAULT_CRM";

  const criteriaPrompt = criteria
    .map((c) => `- ${c.code} [${c.group} | ${c.owner}]: ${c.detail}`)
    .join("\n");

  const briefItemsPrompt =
    analyzed.mediaBriefItems.length > 0
      ? analyzed.mediaBriefItems
          .map(
            (item, idx) =>
              `  * Mục ${idx + 1} (Tỷ lệ: ${item.ratio}): ${
                item.content || "(Chưa ghi nội dung)"
              }${item.note ? ` | Ghi chú: ${item.note}` : ""}`
          )
          .join("\n")
      : "  (Không có danh sách brief từng ảnh/video tách lẻ)";

  const extraNonDataLinks = (options?.extraImageUrls ?? []).filter(
    (u) => Boolean(u.trim()) && !u.startsWith("data:image/") && !task.assets.some((a) => a.url === u)
  );
  const allAssetLines = [
    ...task.assets.map((a) => `  * [${a.kind}] v${a.version} "${a.label}": ${a.url}`),
    ...extraNonDataLinks.map((url) => `  * [DEMO_DRAFT] "${url}"`),
  ];

  const assetListPrompt =
    allAssetLines.length > 0
      ? allAssetLines.join("\n")
      : "  (Chưa có link Demo / Final / Đã đăng)";

  const promptText = [
    "Bạn là Marketing QC Lead khó tính nhưng công tâm tại đội ngũ Meta Ecom MKT.",
    "Hãy kiểm tra chất lượng Output mà nhân viên nộp bên dưới bằng tiếng Việt rõ ràng, thực tế, bám sát bộ tiêu chuẩn QC của công ty.",
    "",
    "=== THÔNG TIN ĐẦU VIỆC ===",
    `- Mã task: ${task.code}`,
    `- Tiêu đề: ${task.title}`,
    `- Dự án: ${task.project.name}${
      options?.projectDescription
        ? ` (Bối cảnh dự án: ${options.projectDescription})`
        : ""
    }`,
    `- Nhân viên thực hiện: ${task.assignee?.name || "Chưa gán"}`,
    `- Loại công việc: ${task.taskType} (Số lượng: ${task.quantity} ${analyzed.unitLabel})`,
    `- Nền tảng / Kênh đăng: ${task.platform}${
      task.publishChannel ? ` -> ${task.publishChannel}` : ""
    }`,
    task.contentAngle ? `- Tuyến bài: ${task.contentAngle}` : "",
    task.contentPillar ? `- Chủ đề: ${task.contentPillar}` : "",
    task.postFormat ? `- Định dạng: ${task.postFormat}` : "",
    options?.customFocus?.trim()
      ? `- YÊU CẦU KIỂM TRA BỔ SUNG CỦA LEADER: ${options.customFocus.trim()}`
      : "",
    "",
    "=== MÔ TẢ / BRIEF GỐC ===",
    task.description?.trim() || "(Không có mô tả thêm)",
    "",
    "=== BRIEF TỪNG ẢNH / VIDEO ===",
    briefItemsPrompt,
    "",
    "=== NỘI DUNG CAPTION / BÀI VIẾT NHÂN VIÊN NỘP ===",
    task.caption?.trim() || "(Chưa nộp caption)",
    "",
    "=== FILE / LINK OUTPUT ĐÍNH KÈM ===",
    assetListPrompt,
    skippedLinks.length > 0
      ? `(Lưu ý: ${skippedLinks.length} link ảnh không tải trực tiếp được byte ảnh do quyền riêng tư hoặc không phải ảnh tĩnh; hãy nhắc Leader mở link gốc để xem visual nếu cần.)`
      : "",
    imageParts.length > 0
      ? `(Đính kèm ${imageParts.length} hình ảnh thực tế của sản phẩm để bạn soi chữ trên ảnh, bố cục, lỗi AI và độ khớp với caption/brief.)`
      : "",
    "",
    hasLeaderDocs
      ? "=== BỘ TIÊU CHÍ & TÀI LIỆU TIÊU CHUẨN DO LEADER ĐƯA RA (CĂN CỨ CHẤM ĐIỂM CHÍNH) ==="
      : "",
    hasLeaderDocs ? leaderDocBlocks.join("\n\n") : "",
    hasLeaderDocs
      ? "Hãy đối chiếu trực tiếp sản phẩm với từng tiêu chí/quy chuẩn trong tài liệu của Leader ở trên; ở mỗi issue, ghi qcCode ngắn gọn (vd: 'TC-01', 'Brand Voice', 'Hình ảnh', hoặc tên mục trong tài liệu Leader)."
      : "",
    useDefaultCriteria
      ? hasLeaderDocs
        ? "\n=== BỘ TIÊU CHUẨN KỸ THUẬT BỔ SUNG CỦA CRM ==="
        : "=== BỘ TIÊU CHUẨN QC CHÍNH THỨC (Chỉ dùng mã qcCode trong danh sách này) ==="
      : "",
    useDefaultCriteria ? criteriaPrompt : "",
    "",
    "Yêu cầu chấm điểm:",
    "- score (0-100): chấm khách quan theo mức độ hoàn thiện & bám sát đúng bộ tiêu chí ở trên.",
    "- verdict: 'DAT' (nếu sẵn sàng duyệt), 'CAN_SUA' (nếu vi phạm tiêu chí, sai chính tả, thiếu CTA, lệch brief hoặc lỗi hình ảnh), 'THIEU_DU_LIEU' (nếu chưa có caption lẫn ảnh/link để check).",
    "- Nếu task có caption và còn điểm chưa mượt/thiếu CTA/chưa khớp tiêu chuẩn Leader, viết lại một phiên bản suggestedCaption tốt hơn, giữ nguyên thông tin đúng thực tế (không bịa số liệu). Nếu caption đã ổn hoặc task không cần caption, để chuỗi rỗng.",
  ]
    .filter(Boolean)
    .join("\n");

  const requestParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: promptText }];

  for (const stdFile of leaderBinaryParts) {
    requestParts.push({
      text: `Tài liệu Tiêu chuẩn QC của Leader (căn cứ đối chiếu): "${stdFile.label}"`,
    });
    requestParts.push({ inlineData: stdFile.inlineData });
  }

  for (const img of imageParts) {
    requestParts.push({ text: `Ảnh Output nhân viên cần kiểm tra: "${img.label}"` });
    requestParts.push({ inlineData: img.inlineData });
  }

  const responseSchema = {
    type: "OBJECT",
    properties: {
      score: { type: "INTEGER", description: "Điểm chất lượng QC từ 0 đến 100" },
      verdict: {
        type: "STRING",
        enum: ["DAT", "CAN_SUA", "THIEU_DU_LIEU"],
      },
      summary: {
        type: "STRING",
        description: "Nhận xét tổng quan ngắn gọn 2-4 câu bằng tiếng Việt",
      },
      strengths: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Các điểm làm tốt của output",
      },
      issues: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            severity: { type: "STRING", enum: ["HIGH", "MEDIUM", "LOW"] },
            qcCode: { type: "STRING" },
            title: { type: "STRING" },
            detail: { type: "STRING" },
            fixSuggestion: { type: "STRING" },
          },
          required: ["severity", "qcCode", "title", "detail", "fixSuggestion"],
        },
      },
      suggestedCaption: {
        type: "STRING",
        description:
          "Caption đề xuất chỉnh sửa mượt hơn (hoặc chuỗi rỗng nếu không cần sửa)",
      },
      matchedQcCodes: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Danh sách mã lỗi IMG-xx hoặc VID-xx cần tick khi trả sửa",
      },
    },
    required: [
      "score",
      "verdict",
      "summary",
      "strengths",
      "issues",
      "suggestedCaption",
      "matchedQcCodes",
    ],
  };

  // Thử model chính trước; nếu gặp lỗi tạm thời (503 high demand / 429 / 404) tự động dự phòng qua các model Flash Free Tier
  const candidateQueue = Array.from(
    new Set([model, ...FREE_FALLBACK_FLASH_MODELS])
  );

  let payload: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  } | null = null;
  let usedModel = model;
  let lastErrorMessage = "Không thể kết nối Google Gemini.";
  let triedDynamicList = false;

  for (let i = 0; i < candidateQueue.length; i++) {
    const candidateModel = candidateQueue[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      candidateModel
    )}:generateContent`;

    const apiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: requestParts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (apiRes.ok) {
      payload = await apiRes.json();
      usedModel = candidateModel;
      break;
    }

    const errDetail = await parseGeminiHttpError(apiRes);
    lastErrorMessage = `Gemini API lỗi (${candidateModel}): ${errDetail}`;

    if (!isTransientOrModelError(apiRes.status)) {
      throw new Error(lastErrorMessage);
    }

    // Nếu danh sách cứng đều quá tải, thử lấy danh sách model trực tiếp từ API key
    if (i === candidateQueue.length - 1 && !triedDynamicList) {
      triedDynamicList = true;
      const catalog = await fetchAvailableGeminiFlashModels(apiKey);
      for (const extraModel of catalog.flashModels) {
        if (!candidateQueue.includes(extraModel)) {
          candidateQueue.push(extraModel);
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  if (!payload) {
    throw new Error(
      `${lastErrorMessage}. Các model dự phòng đều đang quá tải tạm thời, vui lòng thử lại sau vài chục giây.`
    );
  }
  const rawText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") || "";

  if (!rawText.trim()) {
    throw new Error("Gemini không trả về nội dung đánh giá hợp lệ.");
  }

  let parsed: GeminiQcResult;
  try {
    parsed = JSON.parse(rawText) as GeminiQcResult;
  } catch {
    throw new Error("Không thể phân tích JSON kết quả đánh giá từ Gemini.");
  }

  const normalizedCodes = Array.from(
    new Set(
      [
        ...(Array.isArray(parsed.matchedQcCodes) ? parsed.matchedQcCodes : []),
        ...(Array.isArray(parsed.issues)
          ? parsed.issues.map((i) => i.qcCode)
          : []),
      ]
        .map((c) => String(c || "").trim())
        .filter((code) =>
          code.length > 0 && (hasLeaderDocs ? true : validCodes.has(code))
        )
    )
  ).slice(0, 15);

  const safeScore = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const safeVerdict: GeminiQcResult["verdict"] =
    parsed.verdict === "DAT" ||
    parsed.verdict === "CAN_SUA" ||
    parsed.verdict === "THIEU_DU_LIEU"
      ? parsed.verdict
      : analyzed.hasSubmittedOutput
        ? "CAN_SUA"
        : "THIEU_DU_LIEU";

  return {
    result: {
      score: safeScore,
      verdict: safeVerdict,
      summary: String(parsed.summary || "").trim(),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((s) => String(s)).filter(Boolean)
        : [],
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((item) => ({
            severity:
              item.severity === "HIGH" ||
              item.severity === "MEDIUM" ||
              item.severity === "LOW"
                ? item.severity
                : "MEDIUM",
            qcCode: String(item.qcCode || "QC"),
            title: String(item.title || "Điểm cần kiểm tra"),
            detail: String(item.detail || ""),
            fixSuggestion: String(item.fixSuggestion || ""),
          }))
        : [],
      suggestedCaption: String(parsed.suggestedCaption || "").trim(),
      matchedQcCodes: normalizedCodes,
    },
    meta: {
      model: usedModel,
      fallbackFrom: usedModel !== model ? model : null,
      imagesAnalyzedCount: imageParts.length,
      skippedPrivateImageLinks: skippedLinks,
      hasCaptionChecked: analyzed.hasCaption,
      standardsSource,
      standardsCount: leaderDocs.length,
      standardsNames:
        options?.viewerRole === "LEADER" ? leaderDocs.map((d) => d.title) : [],
      checkedAt: new Date().toISOString(),
    },
  };
}
