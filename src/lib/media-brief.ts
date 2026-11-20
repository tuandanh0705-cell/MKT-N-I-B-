export interface MediaBriefItem {
  id: string;
  ratio: string;
  content: string;
  sampleUrl: string;
  note: string;
}

export const IMAGE_RATIO_OPTIONS = [
  "1:1 (Vuông)",
  "4:5 (Dọc FB)",
  "9:16 (Story / Reels)",
  "16:9 (Ngang)",
  "3:4 (Dọc)",
  "Khác",
] as const;

export const VIDEO_RATIO_OPTIONS = [
  "9:16 (TikTok / Reels)",
  "16:9 (YouTube / Ngang)",
  "1:1 (Vuông)",
  "4:5 (Dọc FB)",
  "Khác",
] as const;

export function createEmptyMediaBriefItem(isVideo = false): MediaBriefItem {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    id: `mb-${Date.now()}-${rand}`,
    ratio: isVideo ? "9:16 (TikTok / Reels)" : "1:1 (Vuông)",
    content: "",
    sampleUrl: "",
    note: "",
  };
}

export function normalizeMediaBriefItems(raw: unknown): MediaBriefItem[] {
  if (!Array.isArray(raw)) return [];
  const result: MediaBriefItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const ratio = String(obj.ratio ?? "").trim() || "1:1 (Vuông)";
    const content = String(obj.content ?? "").trim();
    const sampleUrl = String(obj.sampleUrl ?? "").trim();
    const note = String(obj.note ?? "").trim();
    const id = String(obj.id ?? "").trim() || `mb-${i + 1}`;
    result.push({ id, ratio, content, sampleUrl, note });
  }
  return result;
}

export function buildMediaBriefSummaryText(
  items: MediaBriefItem[],
  isVideo = false
): string {
  const prefix = isVideo ? "Video" : "Ảnh";
  return items
    .map((it, idx) => {
      const parts = [`${prefix} ${idx + 1} [${it.ratio}]`];
      if (it.content) parts.push(it.content);
      if (it.sampleUrl) parts.push(`Mẫu: ${it.sampleUrl}`);
      if (it.note) parts.push(`Ghi chú: ${it.note}`);
      return parts.join(" — ");
    })
    .join("\n");
}
