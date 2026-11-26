import type { ResourceLinkEntry, WorkspaceResourceItem } from "@/types/crm";

export function normalizeResourceUrl(
  raw: unknown
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "Đường dẫn Link không được để trống." };
  }
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Đường dẫn Link chỉ hỗ trợ định dạng http:// hoặc https://.",
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return {
        ok: false,
        error: `Đường dẫn "${trimmed}" chưa đúng định dạng URL.`,
      };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return {
      ok: false,
      error: `Đường dẫn "${trimmed}" chưa đúng định dạng URL.`,
    };
  }
}

export function extractResourceHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

/**
 * Chuẩn hóa danh sách link gửi từ form/API (hỗ trợ cả `links: [{ label, url }]` và `url` đơn cũ).
 */
export function parseResourceLinksInput(body: {
  links?: unknown;
  url?: unknown;
  linkLabel?: unknown;
}): { ok: true; links: ResourceLinkEntry[] } | { ok: false; error: string } {
  if (Array.isArray(body.links)) {
    const out: ResourceLinkEntry[] = [];
    for (const item of body.links) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const rawUrl = String(rec.url ?? "").trim();
      const label = String(rec.label ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      if (!rawUrl && !label) continue;
      const parsed = normalizeResourceUrl(rawUrl);
      if (!parsed.ok) return parsed;
      out.push({ label, url: parsed.url });
      if (out.length >= 20) break;
    }
    if (out.length === 0) {
      return {
        ok: false,
        error: "Vui lòng nhập ít nhất 1 đường dẫn Link hợp lệ.",
      };
    }
    return { ok: true, links: out };
  }

  const single = normalizeResourceUrl(body.url);
  if (!single.ok) return single;
  const label = String(body.linkLabel ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return { ok: true, links: [{ label, url: single.url }] };
}

/**
 * Đọc danh sách link của 1 tài nguyên (tương thích ngược với tài nguyên cũ chỉ có trường `url`).
 */
export function getResourceLinks(
  resource: Pick<WorkspaceResourceItem, "url" | "linksJson">
): ResourceLinkEntry[] {
  if (Array.isArray(resource.linksJson)) {
    const valid: ResourceLinkEntry[] = [];
    for (const item of resource.linksJson) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const url = String(rec.url ?? "").trim();
      if (!url) continue;
      const label = String(rec.label ?? "").trim();
      valid.push({ label, url });
    }
    if (valid.length > 0) return valid;
  }
  return resource.url ? [{ label: "", url: resource.url }] : [];
}
