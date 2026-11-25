export type VideoOrderKind = "SHOOT_AND_EDIT" | "EDIT_ONLY";

export type VideoScriptSection = "HOOK" | "BODY" | "CTA";

/** Một dòng cảnh trong Kịch bản Quay & Dựng (Loại 1) */
export interface ShootScriptRow {
  id: string;
  section: VideoScriptSection;
  duration: string;
  editNote: string;
  cameraAngle: string;
  visualContext: string;
  dialogue: string;
  textOnScreen: string;
  comment: string;
}

/** Khung Kịch bản Quay & Dựng chi tiết (Loại 1 — có VJ, góc máy, bối cảnh, thoại, text on screen) */
export interface ShootScriptBrief {
  scriptTitle: string;
  vjGenderRole: string;
  vjVoiceMood: string;
  vjOutfit: string;
  estimatedDuration: string;
  overallStructure: string;
  settingAndStyle: string;
  rows: ShootScriptRow[];
}

/** Một dòng Scene trong Kịch bản Dựng Video (Loại 2) */
export interface EditScriptSceneRow {
  id: string;
  sceneLabel: string;
  voiceOrCutNote: string;
  visualRef: string;
  textOverlay: string;
}

/** Khung Kịch bản Order Dựng Video chi tiết (Loại 2 — Thumbnail, Deadline Editor, Scene, Visual, Text Overlay) */
export interface EditScriptBrief {
  thumbnailTitle: string;
  editorDeadline: string;
  visualFolderUrl: string;
  sourceVideoNote: string;
  globalEditorNote: string;
  scenes: EditScriptSceneRow[];
}

export interface MediaBriefItem {
  id: string;
  ratio: string;
  content: string;
  sampleUrl: string;
  note: string;
  /** Phân loại Order Video: Loại 1 = Quay & Dựng, Loại 2 = Dựng Video */
  videoKind?: VideoOrderKind;
  shootScript?: ShootScriptBrief;
  editScript?: EditScriptBrief;
}

export const VIDEO_ORDER_KIND_META: Record<
  VideoOrderKind,
  {
    label: string;
    shortLabel: string;
    badgeEmoji: string;
    description: string;
    badgeClass: string;
  }
> = {
  SHOOT_AND_EDIT: {
    label: "Loại 1: Quay & Dựng",
    shortLabel: "Quay & Dựng",
    badgeEmoji: "🎥",
    description:
      "Kịch bản đầy đủ: Yêu cầu VJ, Thời lượng, Bố cục & Bảng 9 cột (HOOK/BODY/CTA, Góc máy quay, Note dựng, Bối cảnh, Lời thoại, Text on Screen, Comment)",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  EDIT_ONLY: {
    label: "Loại 2: Dựng Video",
    shortLabel: "Dựng Video",
    badgeEmoji: "✂️",
    description:
      "Kịch bản order Editor: Thumbnail, Deadline Editor, Link Visual/Source gốc & Bảng phân cảnh theo Scene (Lời voice / Note đoạn cut, Visual, Text Overlay)",
    badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
  },
};

export const SHOOT_SECTION_META: Record<
  VideoScriptSection,
  {
    label: string;
    cellBg: string;
    pillClass: string;
  }
> = {
  HOOK: {
    label: "HOOK",
    cellBg: "bg-[#F8D7DD]/85 text-[#7A1E2F]",
    pillClass: "bg-[#F8D7DD] text-[#8B1E35] border-[#E7AAB6]",
  },
  BODY: {
    label: "BODY",
    cellBg: "bg-[#FCE8D2]/85 text-[#7C4410]",
    pillClass: "bg-[#FCE8D2] text-[#8C4A0E] border-[#EBBE8D]",
  },
  CTA: {
    label: "CTA",
    cellBg: "bg-[#D9F0DC]/85 text-[#1B5E2A]",
    pillClass: "bg-[#D9F0DC] text-[#1A5E29] border-[#9FD5A6]",
  },
};

export const IMAGE_RATIO_OPTIONS = [
  "1200 × 1200 (Ảnh đơn vuông 1:1)",
  "1200 × 800 (Ảnh đơn ngang 3:2)",
  "960 × 1200 (Ảnh đơn dọc 4:5)",
  "1440 × 1440 (Text + Hình 1:1)",
  "1920 × 1920 (Album vuông 1:1)",
  "1920 × 960 (3 ảnh — Chính ngang)",
  "960 × 1920 (3 ảnh — Chính dọc)",
  "1920 × 1280 (4/5 ảnh — Chính ngang / Phụ ngang)",
  "1280 × 1920 (4 ảnh — Chính dọc)",
  "1200 × 600 (2 ảnh ngang xếp chồng)",
  "600 × 1200 (2 ảnh dọc song song)",
  "1080 × 1920 (Story & Reels 9:16)",
  "1080 × 1080 (Ads Slide Show 1:1)",
  "1200 × 628 (Share Link / Ads Link)",
  "1000 × 1000 (Avatar tròn)",
  "1920 × 1080 (Cover Fanpage • Mobile 1920×710)",
  "1920 × 1008 (Cover Group & Sự kiện)",
  "1:1 (Vuông)",
  "4:5 (Dọc FB)",
  "9:16 (Story / Reels)",
  "16:9 (Ngang)",
  "Khác",
] as const;

export const VIDEO_RATIO_OPTIONS = [
  "1080 × 1920 (9:16 TikTok / Reels / Story)",
  "1920 × 1080 (16:9 YouTube / Ngang)",
  "1080 × 1080 (1:1 Vuông / Ads)",
  "960 × 1200 (4:5 Dọc FB)",
  "9:16 (TikTok / Reels)",
  "Khác",
] as const;

function makeUid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function createEmptyShootScriptRow(
  section: VideoScriptSection = "BODY",
  overrides?: Partial<ShootScriptRow>
): ShootScriptRow {
  return {
    id: makeUid("sr"),
    section,
    duration: "",
    editNote: "",
    cameraAngle: "",
    visualContext: "",
    dialogue: "",
    textOnScreen: "",
    comment: "",
    ...overrides,
  };
}

export function createDefaultShootScript(): ShootScriptBrief {
  return {
    scriptTitle: "",
    vjGenderRole: "",
    vjVoiceMood: "",
    vjOutfit: "",
    estimatedDuration: "",
    overallStructure: "",
    settingAndStyle: "",
    rows: [
      createEmptyShootScriptRow("HOOK"),
      createEmptyShootScriptRow("BODY"),
      createEmptyShootScriptRow("CTA"),
    ],
  };
}

export function createSampleShootScript(): ShootScriptBrief {
  return {
    scriptTitle: "KỊCH BẢN: GIẢI PHÁP LIVESTREAM TRỌN GÓI",
    vjGenderRole: "Nam/Nữ 22–28 tuổi, phong thái chuyên gia tư vấn",
    vjVoiceMood: "Trầm, chắc, điềm tĩnh; nhấn rõ các con số & lợi ích",
    vjOutfit: "Sơ mi trắng, khoác blazer tối màu, gọn gàng (hợp góc bàn làm việc)",
    estimatedDuration: "~60–70 giây (ước tính theo voice)",
    overallStructure:
      "KẾT QUẢ → CÂU HỎI GÂY TÒ MÒ → VẤN ĐỀ → GIẢI PHÁP → LÝ DO TIN → CTA",
    settingAndStyle:
      "Bàn làm việc & studio Meta Ecom; VJ nói thẳng vào camera; Text trắng in đậm, con số tô màu nổi, SFX whoosh chuyển cảnh",
    rows: [
      createEmptyShootScriptRow("HOOK", {
        duration: "0–7s",
        editNote: "Zoom vào con số chính, logo trượt ra",
        cameraAngle: "Trung cảnh VJ ngồi bàn, nhìn thẳng camera",
        visualContext: "VJ ngồi tại bàn làm việc/studio sáng sủa, pop-up bảng số liệu bên cạnh",
        dialogue: "Thay vì tốn 20–25 triệu mỗi tháng nuôi nhân sự, doanh nghiệp tiết kiệm hơn 200 triệu/năm...",
        textOnScreen: "CHI 20–25 TRIỆU/THÁNG?\n🔥 TIẾT KIỆM >200 TRIỆU/NĂM",
        comment: "voice on",
      }),
      createEmptyShootScriptRow("HOOK", {
        duration: "7–10s",
        editNote: "Emoji ❓ + SFX \"hmm\"",
        cameraAngle: "Cận mặt VJ nhướn mày",
        visualContext: "VJ nhướn mày, nghiêng đầu đặt câu hỏi",
        dialogue: "Vì sao lại tiết kiệm nhiều như vậy?",
        textOnScreen: "❓ VÌ SAO TIẾT KIỆM NHIỀU NHƯ VẬY?",
        comment: "voice on",
      }),
      createEmptyShootScriptRow("BODY", {
        duration: "10–35s",
        editNote: "Tông trung tính, cắt nhanh 3 cảnh nỗi đau",
        cameraAngle: "Qua vai / B-roll phòng live & bảng chi phí",
        visualContext: "B-roll chủ shop đào tạo nhân viên, phòng live trống khi host nghỉ đột xuất",
        dialogue: "Khi tự tuyển host in-house, ngoài lương cứng còn chi phí đào tạo, hoa hồng và rủi ro đứt gãy lịch live...",
        textOnScreen: "⚠️ CHI PHÍ THỰC TẾ\n• Lương cứng + Hoa hồng\n• Host nghỉ đột xuất = tắt sóng",
        comment: "voice off",
      }),
      createEmptyShootScriptRow("BODY", {
        duration: "35–55s",
        editNote: "Tông sáng, checklist bật theo từng ý voice",
        cameraAngle: "Trung cảnh VJ đứng tại studio",
        visualContext: "VJ đứng giữa studio, mỗi ý bật 1 dòng ✅ bên cạnh + B-roll studio thực tế",
        dialogue: "Khi vận hành qua Meta Ecom: Không phí tuyển dụng, không đứt gãy lịch live, trọn bộ Host & Studio chuyên nghiệp...",
        textOnScreen: "VẬN HÀNH QUA META ECOM:\n✅ KHÔNG phí tuyển dụng\n✅ KHÔNG đứt gãy lịch live",
        comment: "voice on",
      }),
      createEmptyShootScriptRow("CTA", {
        duration: "55–65s",
        editNote: "Endframe: Logo, hotline, nút Inbox",
        cameraAngle: "Trung cảnh VJ chỉ tay xuống",
        visualContext: "VJ chỉ tay xuống dưới, hiện Logo + nút COMMENT / INBOX + Hotline",
        dialogue: "Inbox ngay để nhận lộ trình livestream và báo giá trọn gói dành riêng cho ngành hàng của bạn!",
        textOnScreen: "NHẬN LỘ TRÌNH & BÁO GIÁ TRỌN GÓI\nCOMMENT / INBOX NGAY!",
        comment: "voice on",
      }),
    ],
  };
}

export function createEmptyEditSceneRow(
  sceneNumber = 1,
  overrides?: Partial<EditScriptSceneRow>
): EditScriptSceneRow {
  return {
    id: makeUid("es"),
    sceneLabel: String(sceneNumber),
    voiceOrCutNote: "",
    visualRef: "",
    textOverlay: "",
    ...overrides,
  };
}

export function createDefaultEditScript(): EditScriptBrief {
  return {
    thumbnailTitle: "",
    editorDeadline: "",
    visualFolderUrl: "",
    sourceVideoNote: "",
    globalEditorNote: "",
    scenes: [
      createEmptyEditSceneRow(1),
      createEmptyEditSceneRow(2),
      createEmptyEditSceneRow(3),
    ],
  };
}

export function createEmptyMediaBriefItem(
  isVideo = false,
  presetRatio?: string,
  presetNote?: string,
  videoKind?: VideoOrderKind
): MediaBriefItem {
  const effectiveVideoKind: VideoOrderKind | undefined = isVideo
    ? videoKind || "SHOOT_AND_EDIT"
    : undefined;
  return {
    id: makeUid("mb"),
    ratio:
      presetRatio ||
      (isVideo
        ? "1080 × 1920 (9:16 TikTok / Reels / Story)"
        : "1200 × 1200 (Ảnh đơn vuông 1:1)"),
    content: "",
    sampleUrl: "",
    note: presetNote || "",
    ...(effectiveVideoKind
      ? {
          videoKind: effectiveVideoKind,
          shootScript:
            effectiveVideoKind === "SHOOT_AND_EDIT"
              ? createDefaultShootScript()
              : undefined,
          editScript:
            effectiveVideoKind === "EDIT_ONLY"
              ? createDefaultEditScript()
              : undefined,
        }
      : {}),
  };
}

function normalizeShootScript(raw: unknown): ShootScriptBrief | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const rawRows = Array.isArray(obj.rows) ? obj.rows : [];
  const rows: ShootScriptRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || typeof r !== "object") continue;
    const ro = r as Record<string, unknown>;
    const secRaw = String(ro.section ?? "BODY").toUpperCase();
    const section: VideoScriptSection =
      secRaw === "HOOK" || secRaw === "CTA" ? secRaw : "BODY";
    rows.push({
      id: String(ro.id ?? "").trim() || `sr-${i + 1}`,
      section,
      duration: String(ro.duration ?? "").trim(),
      editNote: String(ro.editNote ?? "").trim(),
      cameraAngle: String(ro.cameraAngle ?? "").trim(),
      visualContext: String(ro.visualContext ?? "").trim(),
      dialogue: String(ro.dialogue ?? "").trim(),
      textOnScreen: String(ro.textOnScreen ?? "").trim(),
      comment: String(ro.comment ?? "").trim(),
    });
  }
  return {
    scriptTitle: String(obj.scriptTitle ?? "").trim(),
    vjGenderRole: String(obj.vjGenderRole ?? "").trim(),
    vjVoiceMood: String(obj.vjVoiceMood ?? "").trim(),
    vjOutfit: String(obj.vjOutfit ?? "").trim(),
    estimatedDuration: String(obj.estimatedDuration ?? "").trim(),
    overallStructure: String(obj.overallStructure ?? "").trim(),
    settingAndStyle: String(obj.settingAndStyle ?? "").trim(),
    rows,
  };
}

function normalizeEditScript(raw: unknown): EditScriptBrief | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const rawScenes = Array.isArray(obj.scenes) ? obj.scenes : [];
  const scenes: EditScriptSceneRow[] = [];
  for (let i = 0; i < rawScenes.length; i++) {
    const s = rawScenes[i];
    if (!s || typeof s !== "object") continue;
    const so = s as Record<string, unknown>;
    scenes.push({
      id: String(so.id ?? "").trim() || `es-${i + 1}`,
      sceneLabel: String(so.sceneLabel ?? i + 1).trim() || String(i + 1),
      voiceOrCutNote: String(so.voiceOrCutNote ?? "").trim(),
      visualRef: String(so.visualRef ?? "").trim(),
      textOverlay: String(so.textOverlay ?? "").trim(),
    });
  }
  return {
    thumbnailTitle: String(obj.thumbnailTitle ?? "").trim(),
    editorDeadline: String(obj.editorDeadline ?? "").trim(),
    visualFolderUrl: String(obj.visualFolderUrl ?? "").trim(),
    sourceVideoNote: String(obj.sourceVideoNote ?? "").trim(),
    globalEditorNote: String(obj.globalEditorNote ?? "").trim(),
    scenes,
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
    const rawKind = String(obj.videoKind ?? "").trim();
    const videoKind: VideoOrderKind | undefined =
      rawKind === "SHOOT_AND_EDIT" || rawKind === "EDIT_ONLY"
        ? rawKind
        : undefined;
    const shootScript = normalizeShootScript(obj.shootScript);
    const editScript = normalizeEditScript(obj.editScript);
    result.push({
      id,
      ratio,
      content,
      sampleUrl,
      note,
      ...(videoKind ? { videoKind } : {}),
      ...(shootScript ? { shootScript } : {}),
      ...(editScript ? { editScript } : {}),
    });
  }
  return result;
}

export function getItemVideoOrderKind(
  item: MediaBriefItem
): VideoOrderKind | null {
  if (item.videoKind === "SHOOT_AND_EDIT" || item.videoKind === "EDIT_ONLY") {
    return item.videoKind;
  }
  if (item.shootScript) return "SHOOT_AND_EDIT";
  if (item.editScript) return "EDIT_ONLY";
  return null;
}

export function getTaskPrimaryVideoKind(
  mediaBriefItemsJson: unknown
): VideoOrderKind | null {
  const items = normalizeMediaBriefItems(mediaBriefItemsJson);
  for (const it of items) {
    const k = getItemVideoOrderKind(it);
    if (k) return k;
  }
  return null;
}

export function hasStructuredVideoScript(item: MediaBriefItem): boolean {
  const kind = getItemVideoOrderKind(item);
  if (kind === "SHOOT_AND_EDIT" && item.shootScript) {
    const s = item.shootScript;
    return Boolean(
      s.scriptTitle ||
        s.vjGenderRole ||
        s.vjVoiceMood ||
        s.vjOutfit ||
        s.estimatedDuration ||
        s.settingAndStyle ||
        s.rows.some(
          (r) =>
            r.editNote ||
            r.cameraAngle ||
            r.visualContext ||
            r.dialogue ||
            r.textOnScreen ||
            r.comment
        )
    );
  }
  if (kind === "EDIT_ONLY" && item.editScript) {
    const e = item.editScript;
    return Boolean(
      e.thumbnailTitle ||
        e.editorDeadline ||
        e.visualFolderUrl ||
        e.sourceVideoNote ||
        e.globalEditorNote ||
        e.scenes.some((sc) => sc.voiceOrCutNote || sc.visualRef || sc.textOverlay)
    );
  }
  return false;
}

export function countFilledScriptRows(item: MediaBriefItem): number {
  const kind = getItemVideoOrderKind(item);
  if (kind === "SHOOT_AND_EDIT" && item.shootScript) {
    return item.shootScript.rows.filter(
      (r) =>
        r.dialogue ||
        r.visualContext ||
        r.textOnScreen ||
        r.cameraAngle ||
        r.editNote
    ).length;
  }
  if (kind === "EDIT_ONLY" && item.editScript) {
    return item.editScript.scenes.filter(
      (sc) => sc.voiceOrCutNote || sc.visualRef || sc.textOverlay
    ).length;
  }
  return 0;
}

export function formatSingleBriefItemText(
  it: MediaBriefItem,
  idx: number,
  isVideo = false
): string {
  const prefix = isVideo ? "Video" : "Ảnh";
  const kind = isVideo ? getItemVideoOrderKind(it) : null;

  if (kind === "SHOOT_AND_EDIT" && it.shootScript && hasStructuredVideoScript(it)) {
    const s = it.shootScript;
    const lines: string[] = [
      `${prefix} ${idx + 1} [🎥 Quay & Dựng | ${it.ratio}]${s.scriptTitle ? ` — ${s.scriptTitle}` : ""}`,
    ];
    const vjParts = [
      s.vjGenderRole && `Giới tính/Đối tượng: ${s.vjGenderRole}`,
      s.vjVoiceMood && `Mood giọng: ${s.vjVoiceMood}`,
      s.vjOutfit && `Trang phục: ${s.vjOutfit}`,
    ].filter(Boolean);
    if (vjParts.length > 0) lines.push(`• Yêu cầu VJ: ${vjParts.join(" | ")}`);
    if (s.estimatedDuration) lines.push(`• Thời lượng: ${s.estimatedDuration}`);
    if (s.overallStructure) lines.push(`• Bố cục: ${s.overallStructure}`);
    if (s.settingAndStyle) lines.push(`• Bối cảnh & Style: ${s.settingAndStyle}`);
    s.rows.forEach((r, rIdx) => {
      const rowBits = [
        `[${r.section}${r.duration ? ` ${r.duration}` : ""}]`,
        r.cameraAngle && `Góc máy: ${r.cameraAngle}`,
        r.editNote && `Note dựng: ${r.editNote}`,
        r.visualContext && `Hình ảnh: ${r.visualContext}`,
        r.dialogue && `Thoại: "${r.dialogue}"`,
        r.textOnScreen && `Text: ${r.textOnScreen}`,
        r.comment && `Comment: ${r.comment}`,
      ].filter(Boolean);
      if (rowBits.length > 1) {
        lines.push(`  ${rIdx + 1}. ${rowBits.join(" | ")}`);
      }
    });
    if (it.sampleUrl) lines.push(`• Mẫu tham khảo: ${it.sampleUrl}`);
    if (it.note) lines.push(`• Ghi chú thêm: ${it.note}`);
    return lines.join("\n");
  }

  if (kind === "EDIT_ONLY" && it.editScript && hasStructuredVideoScript(it)) {
    const e = it.editScript;
    const lines: string[] = [
      `${prefix} ${idx + 1} [✂️ Dựng Video | ${it.ratio}]${e.thumbnailTitle ? ` — Thumbnail: ${e.thumbnailTitle}` : ""}`,
    ];
    if (e.editorDeadline) lines.push(`• Deadline Editor: ${e.editorDeadline}`);
    if (e.visualFolderUrl) lines.push(`• Link Visual / Thumbnail: ${e.visualFolderUrl}`);
    if (e.sourceVideoNote) lines.push(`• Source / Ref: ${e.sourceVideoNote}`);
    if (e.globalEditorNote) lines.push(`• Lưu ý Editor: ${e.globalEditorNote}`);
    e.scenes.forEach((sc, sIdx) => {
      const bits = [
        `Scene ${sc.sceneLabel || sIdx + 1}:`,
        sc.voiceOrCutNote,
        sc.visualRef && `Visual: ${sc.visualRef}`,
        sc.textOverlay && `Text overlay: ${sc.textOverlay}`,
      ].filter(Boolean);
      if (bits.length > 1) {
        lines.push(`  - ${bits.join(" | ")}`);
      }
    });
    if (it.sampleUrl) lines.push(`• Mẫu tham khảo: ${it.sampleUrl}`);
    if (it.note) lines.push(`• Ghi chú thêm: ${it.note}`);
    return lines.join("\n");
  }

  const parts = [`${prefix} ${idx + 1} [${it.ratio}]`];
  if (kind) parts[0] = `${prefix} ${idx + 1} [${VIDEO_ORDER_KIND_META[kind].shortLabel} | ${it.ratio}]`;
  if (it.content) parts.push(it.content);
  if (it.sampleUrl) parts.push(`Mẫu: ${it.sampleUrl}`);
  if (it.note) parts.push(`Ghi chú: ${it.note}`);
  return parts.join(" — ");
}

export function buildMediaBriefSummaryText(
  items: MediaBriefItem[],
  isVideo = false
): string {
  return items
    .map((it, idx) => formatSingleBriefItemText(it, idx, isVideo))
    .join("\n\n");
}
