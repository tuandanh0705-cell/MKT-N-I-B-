"use client";

import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type {
  QcStandardCategory,
  QcStandardDocItem,
  QcStandardSourceType,
} from "@/lib/gemini-shared";
import type { SimpleProject } from "@/types/crm";

interface QcStandardsManagerModalProps {
  open: boolean;
  projects: SimpleProject[];
  onClose: () => void;
  onStandardsChanged?: (activeCount: number, includeDefaultQc: boolean) => void;
}

const CATEGORY_LABELS: Record<QcStandardCategory, string> = {
  ALL: "Tất cả (Content + Ảnh + Video)",
  CONTENT: "Nội dung Content",
  IMAGE: "Ấn phẩm Ảnh / Design",
  VIDEO: "Video / Quay dựng",
};

const SAMPLE_STANDARD_TEMPLATE = `1. GIỌNG VĂN & THÔNG ĐIỆP (CONTENT):
- Câu đầu tiên (Hook) phải đánh trúng nỗi đau hoặc lợi ích thực tế trong 2 dòng đầu.
- Không sai chính tả tiếng Việt, không dùng từ ngữ phóng đại/vi phạm chính sách quảng cáo.
- Luôn có CTA rõ ràng phù hợp kênh đăng (Inbox/Comment/Link).

2. ẤN PHẨM ẢNH & NHẬN DIỆN THƯƠNG HIỆU:
- Logo đặt đúng góc quy định, rõ nét, không bị cắt hay che chữ.
- Chữ trên ảnh ngắn gọn, dễ đọc trên màn hình điện thoại, tương phản cao.
- Hình ảnh minh họa đồng nhất thông điệp với caption bài viết.

3. YÊU CẦU KIỂM DUYỆT CHUNG:
- Kiểm tra kỹ số liệu, giá bán, chương trình ưu đãi trước khi gửi Leader duyệt.`;

export function QcStandardsManagerModal(props: QcStandardsManagerModalProps) {
  if (!props.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border-2 border-amber-300 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold">
                Tài Liệu Tiêu Chí &amp; Tiêu Chuẩn QC (Chỉ Leader Quản Lý)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Google Gemini sẽ căn cứ trực tiếp vào các tài liệu bạn đưa lên tại đây để chấm bài Content, Ấn phẩm Ảnh &amp; Video của cả team.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <QcStandardsManagerPanel
          projects={props.projects}
          onClose={props.onClose}
          onStandardsChanged={props.onStandardsChanged}
        />
      </div>
    </div>
  );
}

export function QcStandardsManagerPanel({
  projects,
  onClose,
  onStandardsChanged,
}: Omit<QcStandardsManagerModalProps, "open">) {
  const { showToast } = useToast();

  const [docs, setDocs] = useState<QcStandardDocItem[]>([]);
  const [includeDefaultQc, setIncludeDefaultQc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state (create / edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<QcStandardCategory>("ALL");
  const [projectId, setProjectId] = useState<string>("ALL");
  const [sourceType, setSourceType] = useState<QcStandardSourceType>("TEXT");
  const [contentText, setContentText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileDataBase64, setFileDataBase64] = useState<string | null>(null);

  function notifyParent(nextDocs: QcStandardDocItem[], nextIncludeDefault: boolean) {
    const activeCount = nextDocs.filter((d) => d.isActive).length;
    onStandardsChanged?.(activeCount, nextIncludeDefault);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/outputs/standards", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Không thể tải danh sách tài liệu.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        const loadedDocs: QcStandardDocItem[] = Array.isArray(data.docs)
          ? data.docs
          : [];
        const inc = Boolean(data.includeDefaultQc);
        setDocs(loadedDocs);
        setIncludeDefaultQc(inc);
        notifyParent(loadedDocs, inc);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Không tải được tài liệu."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setCategory("ALL");
    setProjectId("ALL");
    setSourceType("TEXT");
    setContentText("");
    setSourceUrl("");
    setFileName(null);
    setMimeType(null);
    setFileDataBase64(null);
  }

  function startEditDoc(doc: QcStandardDocItem) {
    setEditingId(doc.id);
    setTitle(doc.title);
    setCategory(doc.category);
    setProjectId(doc.projectId || "ALL");
    setSourceType(doc.sourceType);
    setContentText(doc.contentText || "");
    setSourceUrl(doc.sourceUrl || "");
    setFileName(doc.fileName);
    setMimeType(doc.mimeType);
    setFileDataBase64(null);
  }

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      showToast(
        "File vượt quá 3.5 MB. Hãy chọn file nhẹ hơn hoặc xuất PDF/text ngắn gọn.",
        "error"
      );
      return;
    }

    const lower = file.name.toLowerCase();
    if (
      lower.endsWith(".txt") ||
      lower.endsWith(".md") ||
      lower.endsWith(".csv") ||
      lower.endsWith(".json") ||
      file.type.startsWith("text/")
    ) {
      const text = await file.text();
      setContentText(text.slice(0, 50_000));
      setFileName(file.name);
      setMimeType(file.type || "text/plain");
      setFileDataBase64(null);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
      showToast(`Đã đọc nội dung từ "${file.name}".`);
      return;
    }

    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("read failed"));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() || "" : "";
      setFileDataBase64(base64);
      setFileName(file.name);
      setMimeType(file.type);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
      showToast(
        `Đã đính kèm "${file.name}" — Gemini sẽ đọc trực tiếp file này khi check!`
      );
      return;
    }

    showToast(
      "Với file Word (.docx), hãy xuất PDF hoặc copy dán nội dung sang tab Nhập văn bản để AI đọc chuẩn 100%.",
      "error"
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Vui lòng nhập Tên tài liệu tiêu chuẩn.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category,
        projectId,
        sourceType,
        contentText: contentText.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        fileName,
        mimeType,
      };
      if (fileDataBase64 !== null) {
        payload.fileDataBase64 = fileDataBase64;
      }

      const res = await fetch("/api/outputs/standards", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, resyncLink: sourceType === "LINK", ...payload } : payload
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể lưu tài liệu tiêu chuẩn.", "error");
        return;
      }

      const nextDocs: QcStandardDocItem[] = Array.isArray(data.docs)
        ? data.docs
        : docs;
      setDocs(nextDocs);
      notifyParent(nextDocs, includeDefaultQc);
      if (data.syncWarning) {
        showToast(String(data.syncWarning), "info");
      } else {
        showToast(
          editingId
            ? "Đã cập nhật Tài liệu Tiêu chuẩn QC."
            : "Đã thêm Tài liệu Tiêu chuẩn QC mới — AI sẽ chấm theo tài liệu này!"
        );
      }
      resetForm();
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(doc: QcStandardDocItem) {
    const res = await fetch("/api/outputs/standards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, isActive: !doc.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Không thể đổi trạng thái.", "error");
      return;
    }
    const nextDocs: QcStandardDocItem[] = data.docs || [];
    setDocs(nextDocs);
    notifyParent(nextDocs, includeDefaultQc);
    showToast(
      !doc.isActive
        ? `Đã bật áp dụng "${doc.title}".`
        : `Đã tạm tắt "${doc.title}".`
    );
  }

  async function handleSyncLink(doc: QcStandardDocItem) {
    setSyncingId(doc.id);
    try {
      const res = await fetch("/api/outputs/standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_LINK", id: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không thể đồng bộ link.", "error");
        return;
      }
      if (Array.isArray(data.docs)) {
        setDocs(data.docs);
        notifyParent(data.docs, includeDefaultQc);
      }
      if (data.syncWarning) {
        showToast(String(data.syncWarning), "info");
      } else {
        showToast(`Đã đồng bộ nội dung mới nhất từ "${doc.title}".`);
      }
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDeleteDoc(doc: QcStandardDocItem) {
    if (!window.confirm(`Xóa tài liệu tiêu chuẩn "${doc.title}"?`)) return;
    const res = await fetch(`/api/outputs/standards?id=${encodeURIComponent(doc.id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Không thể xóa tài liệu.", "error");
      return;
    }
    const nextDocs: QcStandardDocItem[] = data.docs || [];
    setDocs(nextDocs);
    notifyParent(nextDocs, includeDefaultQc);
    if (editingId === doc.id) resetForm();
    showToast(`Đã xóa "${doc.title}".`);
  }

  async function handleToggleIncludeDefault(nextVal: boolean) {
    setIncludeDefaultQc(nextVal);
    const res = await fetch("/api/outputs/standards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SET_INCLUDE_DEFAULT",
        includeDefaultQc: nextVal,
      }),
    });
    if (res.ok) {
      notifyParent(docs, nextVal);
      showToast(
        nextVal
          ? "AI sẽ kết hợp Tài liệu Leader + Bộ QC kỹ thuật CRM."
          : "AI sẽ CHỈ dựa trên Tài liệu Tiêu chuẩn Leader đưa ra (khi có tài liệu khớp)."
      );
    }
  }

  return (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Uploaded / Saved Standards */}
          <div className="lg:col-span-5 p-5 bg-slate-50/70 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
              <label className="flex items-start gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!includeDefaultQc}
                  onChange={(e) => handleToggleIncludeDefault(!e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 accent-amber-600"
                />
                <span>
                  Ưu tiên chấm hoàn toàn theo Tài liệu Leader đưa ra{" "}
                  <span className="font-normal text-amber-800">
                    (Tắt bớt bộ checklist mặc định nếu đã có tài liệu của Leader khớp)
                  </span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                Danh sách tài liệu ({docs.length})
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm tài liệu mới
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                Đang tải bộ tiêu chuẩn...
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{loadError}</span>
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center space-y-1.5">
                <BookOpenCheck className="w-7 h-7 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  Chưa có tài liệu tiêu chuẩn riêng của Leader
                </div>
                <p className="text-[11px] text-slate-500">
                  Hãy nhập nội dung, tải file PDF/TXT/Ảnh hoặc dán link Google Docs ở khung bên phải để AI chấm theo đúng chuẩn team bạn.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-xl border p-3 space-y-2 transition ${
                      doc.isActive
                        ? "border-indigo-200 bg-white shadow-2xs"
                        : "border-slate-200 bg-slate-100/70 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-extrabold text-slate-900 leading-snug">
                          {doc.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-bold text-indigo-800">
                            {CATEGORY_LABELS[doc.category] || doc.category}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {doc.project?.name || "Toàn phòng MKT"}
                          </span>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            {doc.sourceType === "FILE"
                              ? `File: ${doc.fileName || "Đính kèm"}`
                              : doc.sourceType === "LINK"
                                ? "Link tài liệu"
                                : "Văn bản"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(doc)}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                          doc.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                      >
                        {doc.isActive ? "Đang bật" : "Đang tắt"}
                      </button>
                    </div>

                    {doc.contentText && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 whitespace-pre-wrap">
                        {doc.contentText}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditDoc(doc)}
                          className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Sửa
                        </button>
                        {doc.sourceUrl && (
                          <>
                            <button
                              type="button"
                              disabled={syncingId === doc.id}
                              onClick={() => handleSyncLink(doc)}
                              className="rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${
                                  syncingId === doc.id ? "animate-spin" : ""
                                }`}
                              />
                              Đồng bộ link
                            </button>
                            <a
                              href={doc.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Mở
                            </a>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc)}
                        className="rounded-lg text-rose-600 hover:bg-rose-50 p-1 cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Create / Edit Standard Document */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900">
                {editingId
                  ? "Cập nhật Tài liệu Tiêu chuẩn"
                  : "Thêm Tài liệu Tiêu chuẩn Mới"}
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Tên bộ tiêu chí / tài liệu *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="vd: Bộ quy chuẩn Content & Ấn phẩm Ảnh Meta Ecom 2026"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Áp dụng cho loại Output
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as QcStandardCategory)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phạm vi Dự án
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">Áp dụng tất cả Dự án</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Riêng dự án: {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source Type Tabs */}
            <div className="space-y-3">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSourceType("TEXT")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    sourceType === "TEXT"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Nhập / Dán trực tiếp
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("FILE")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    sourceType === "FILE"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-600" />
                  Tải file (PDF / Ảnh / TXT)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("LINK")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                    sourceType === "LINK"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  Link Google Docs / Sheet
                </button>
              </div>

              {sourceType === "FILE" && (
                <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      Chọn file tài liệu từ máy tính (.pdf, .png, .jpg, .txt, .md, .csv)
                    </span>
                    <label className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5" />
                      Chọn file
                      <input
                        type="file"
                        accept=".txt,.md,.csv,.json,.pdf,image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          void handleFileSelected(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {fileName && (
                    <div className="text-[11px] font-bold text-emerald-700">
                      ✓ File đang chọn: {fileName} ({mimeType || "tài liệu"})
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Mẹo: Gemini đọc trực tiếp file <strong>PDF</strong> và <strong>ảnh chụp bảng tiêu chuẩn</strong> rất chuẩn. Nếu tài liệu là Word (.docx), bạn xuất sang PDF hoặc dán chữ vào ô bên dưới nhé.
                  </p>
                </div>
              )}

              {sourceType === "LINK" && (
                <div className="space-y-1.5 text-xs">
                  <label className="block font-bold text-slate-700">
                    Đường dẫn Google Docs / Google Sheets / Tài liệu công khai
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/.../edit"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    Hệ thống sẽ tự trích xuất nội dung chữ từ Google Docs/Sheet khi bấm Lưu (hãy bật chia sẻ &ldquo;Bất kỳ ai có đường liên kết đều xem được&rdquo;).
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700">
                    {sourceType === "TEXT"
                      ? "Nội dung Tiêu chí & Tiêu chuẩn chi tiết *"
                      : "Ghi chú / Nội dung bổ sung (tùy chọn)"}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setContentText((prev) =>
                        prev.trim()
                          ? `${prev.trim()}\n\n${SAMPLE_STANDARD_TEMPLATE}`
                          : SAMPLE_STANDARD_TEMPLATE
                      )
                    }
                    className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Chèn mẫu tiêu chuẩn
                  </button>
                </div>
                <textarea
                  rows={sourceType === "TEXT" ? 10 : 5}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Nhập các tiêu chuẩn bắt buộc về Content (Hook, Tone giọng, CTA, từ cấm...), Hình ảnh (Logo, Font, Safe zone, Bố cục...), Video..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white p-3 text-xs sm:text-sm text-slate-800 leading-relaxed focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-60 text-amber-300 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Cập nhật Tài liệu"
                    : "Lưu Tài liệu Tiêu chuẩn"}
              </button>
            </div>
          </form>
        </div>
  );
}
