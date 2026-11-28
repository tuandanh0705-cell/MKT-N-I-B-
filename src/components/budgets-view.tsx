"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  Receipt,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Pencil,
  X,
  Save,
} from "lucide-react";
import {
  BUDGET_CATEGORY_LABEL,
  BUDGET_STATUS_META,
} from "@/lib/constants";
import {
  formatVnDate,
  formatVnd,
  parseVnDateTimeLocalToIso,
} from "@/lib/dates";
import { useToast } from "@/components/toast-provider";
import type { BudgetGeneralInfo } from "@/lib/budget-settings";
import type { BudgetItem, SimpleProject } from "@/types/crm";
import type { BudgetCategory, UserRole } from "@/generated/prisma/client";

interface BudgetsViewProps {
  initialBudgets: BudgetItem[];
  projects: SimpleProject[];
  initialGeneralInfo: BudgetGeneralInfo;
  currentUserRole: UserRole;
}

export function BudgetsView({
  initialBudgets,
  projects,
  initialGeneralInfo,
  currentUserRole,
}: BudgetsViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState<BudgetItem[]>(initialBudgets);
  const [generalInfo, setGeneralInfo] =
    useState<BudgetGeneralInfo>(initialGeneralInfo);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] =
    useState<BudgetGeneralInfo>(initialGeneralInfo);
  const [savingInfo, setSavingInfo] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("SHOOT_PRODUCTION");
  const [amount, setAmount] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (projectFilter !== "ALL" && b.project.id !== projectFilter) return false;
      if (categoryFilter !== "ALL" && b.category !== categoryFilter) return false;
      return true;
    });
  }, [budgets, statusFilter, projectFilter, categoryFilter]);

  async function handleCopy(key: string, text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`Đã copy ${label}!`);
      setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur));
      }, 1800);
    } catch {
      showToast("Không thể copy vào bộ nhớ tạm.", "error");
    }
  }

  function handleCopyAllInvoiceInfo() {
    const fullText = [
      `- Email nhận hóa đơn: ${generalInfo.invoiceEmail}`,
      `- Tên đơn vị: ${generalInfo.companyName}`,
      `- Mã số thuế: ${generalInfo.taxCode}`,
      `- Địa chỉ: ${generalInfo.address}`,
      `- Hình thức thanh toán: ${generalInfo.paymentMethod}`,
      `- Tên hàng hóa dịch vụ: ${generalInfo.goodsServiceName}`,
    ].join("\n");
    void handleCopy("all-invoice", fullText, "toàn bộ thông tin xuất hóa đơn");
  }

  async function handleSaveGeneralInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await fetch("/api/budgets/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(infoForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không lưu được thông tin chung.", "error");
        return;
      }
      setGeneralInfo(data.info);
      setInfoForm(data.info);
      setEditingInfo(false);
      showToast("Đã cập nhật thông tin chung & link Sheet ngân sách.");
      router.refresh();
    } catch {
      showToast("Lỗi kết nối khi lưu thông tin chung.", "error");
    } finally {
      setSavingInfo(false);
    }
  }

  const totalApproved = budgets
    .filter((b) => b.status === "APPROVED")
    .reduce((sum, b) => sum + b.amount, 0);
  const totalPending = budgets
    .filter((b) => b.status === "PENDING")
    .reduce((sum, b) => sum + b.amount, 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title,
          category,
          amount: Number(amount),
          neededBy: parseVnDateTimeLocalToIso(neededBy),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Không tạo được đề xuất chi phí.", "error");
        return;
      }
      setBudgets((prev) => [data.budget, ...prev]);
      setTitle("");
      setAmount("");
      setNeededBy("");
      setNote("");
      showToast(`Đã gửi đề xuất ${data.budget.code}.`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: "APPROVED" | "REJECTED") {
    const reviewNote = (reviewNotes[id] || "").trim();
    const res = await fetch("/api/budgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, reviewNote: reviewNote || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? data.budget : b))
      );
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast(
        status === "APPROVED" ? "Đã duyệt chi phí." : "Đã từ chối đề xuất.",
        status === "APPROVED" ? "success" : "info"
      );
      router.refresh();
    } else {
      showToast(data.error || "Không thể xử lý.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            💰 Kho Báu & Ngân Sách Team MKT
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Luật băng Mũ Rơm: xin cấp kho báu quay dựng / Ads trước ít nhất 2 ngày để Hoa Tiêu chuẩn bị kịp.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs">
            <div className="text-emerald-700 font-medium">Đã duyệt chi</div>
            <div className="text-base font-bold text-emerald-800">
              {formatVnd(totalApproved)}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs">
            <div className="text-amber-700 font-medium">Đang chờ duyệt</div>
            <div className="text-base font-bold text-amber-800">
              {formatVnd(totalPending)}
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin chung xuất Hóa Đơn & Link Sheet Đề Xuất / Thu Chi Ngân Sách */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cột trái: Thông tin xuất Hóa Đơn công ty */}
        <div className="lg:col-span-8 bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  🧾 Thông tin chung xuất Hóa Đơn (VAT)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Bấm để copy nhanh từng mục hoặc copy toàn bộ gửi cho nhà cung cấp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyAllInvoiceInfo}
                className="rounded-xl bg-[#0B2545] hover:bg-slate-800 text-amber-300 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {copiedKey === "all-invoice" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy toàn bộ</span>
                  </>
                )}
              </button>

              {currentUserRole === "LEADER" && (
                <button
                  type="button"
                  onClick={() => {
                    if (editingInfo) {
                      setInfoForm(generalInfo);
                      setEditingInfo(false);
                    } else {
                      setInfoForm(generalInfo);
                      setEditingInfo(true);
                    }
                  }}
                  className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                  title="Chỉnh sửa thông tin chung ngân sách"
                >
                  {editingInfo ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Hủy</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {editingInfo ? (
            <form
              onSubmit={handleSaveGeneralInfo}
              className="space-y-3 pt-1 border-t border-amber-100"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email nhận hóa đơn
                  </label>
                  <input
                    type="text"
                    required
                    value={infoForm.invoiceEmail}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, invoiceEmail: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mã số thuế
                  </label>
                  <input
                    type="text"
                    required
                    value={infoForm.taxCode}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, taxCode: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tên đơn vị
                  </label>
                  <input
                    type="text"
                    required
                    value={infoForm.companyName}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, companyName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Hình thức thanh toán
                  </label>
                  <input
                    type="text"
                    required
                    value={infoForm.paymentMethod}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, paymentMethod: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    required
                    value={infoForm.address}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, address: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tên hàng hóa dịch vụ (mẫu ghi chú)
                  </label>
                  <input
                    type="text"
                    value={infoForm.goodsServiceName}
                    onChange={(e) =>
                      setInfoForm((p) => ({
                        ...p,
                        goodsServiceName: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Link Google Sheet Đề xuất & Thu chi ngân sách
                  </label>
                  <input
                    type="url"
                    required
                    value={infoForm.sheetUrl}
                    onChange={(e) =>
                      setInfoForm((p) => ({ ...p, sheetUrl: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInfoForm(generalInfo);
                    setEditingInfo(false);
                  }}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingInfo ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  key: "invoiceEmail",
                  label: "Email nhận hóa đơn",
                  value: generalInfo.invoiceEmail,
                  mono: false,
                  fullWidth: false,
                },
                {
                  key: "taxCode",
                  label: "Mã số thuế",
                  value: generalInfo.taxCode,
                  mono: true,
                  fullWidth: false,
                },
                {
                  key: "companyName",
                  label: "Tên đơn vị",
                  value: generalInfo.companyName,
                  mono: false,
                  fullWidth: false,
                },
                {
                  key: "paymentMethod",
                  label: "Hình thức thanh toán",
                  value: generalInfo.paymentMethod,
                  mono: false,
                  fullWidth: false,
                },
                {
                  key: "address",
                  label: "Địa chỉ",
                  value: generalInfo.address,
                  mono: false,
                  fullWidth: true,
                },
                {
                  key: "goodsServiceName",
                  label: "Tên hàng hóa dịch vụ",
                  value: generalInfo.goodsServiceName,
                  mono: false,
                  fullWidth: true,
                  hint: "Điền theo thực tế hạng mục mua / sử dụng dịch vụ",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`group rounded-xl border border-amber-100 bg-[#FFFDF7] hover:border-amber-300 px-3 py-2 flex items-start justify-between gap-2 transition ${
                    item.fullWidth ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500">
                      {item.label}
                    </div>
                    <div
                      className={`text-xs sm:text-sm font-bold text-slate-900 break-words mt-0.5 ${
                        item.mono ? "font-mono tracking-wide" : ""
                      }`}
                    >
                      {item.value}
                    </div>
                    {item.hint && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.hint}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(item.key, item.value, item.label.toLowerCase())
                    }
                    className="rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-900 p-1.5 shrink-0 cursor-pointer transition"
                    title={`Copy ${item.label}`}
                    aria-label={`Copy ${item.label}`}
                  >
                    {copiedKey === item.key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cột phải: Link Google Sheet Đề xuất & Thu chi ngân sách */}
        <div className="lg:col-span-4 rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#133560] to-[#0B2545] border-2 border-amber-400/70 shadow-sm p-4 sm:p-5 text-white flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Google Sheets Ngân Sách
            </div>
            <h2 className="text-base sm:text-lg font-black text-amber-300 leading-snug">
              📊 Điền Đề Xuất & Thu Chi Ngân Sách
            </h2>
            <p className="text-xs text-slate-200/90 leading-relaxed">
              Mở trực tiếp bảng tính chuẩn của công ty để điền đề xuất ngân sách, tạm ứng và kê khai thu chi cho kế toán đối soát.
            </p>
          </div>

          <div className="space-y-2">
            <a
              href={generalInfo.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-[#0B2545] px-4 py-2.5 text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-md transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Mở Sheet Đề Xuất & Thu Chi</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() =>
                handleCopy(
                  "sheet-url",
                  generalInfo.sheetUrl,
                  "link Sheet ngân sách"
                )
              }
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100 px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              {copiedKey === "sheet-url" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Đã copy link Sheet!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy link Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Form Đề xuất chi phí */}
      {projects.length > 0 && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-sm p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Plus className="w-4 h-4 text-amber-600" />
            💎 Tạo phiếu Xin cấp Kho báu / Chi phí mới
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Dự án *
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Khoản chi / Mục đích *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Thuê studio / đạo cụ quay Olympic AI"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BudgetCategory)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-white"
              >
                {Object.entries(BUDGET_CATEGORY_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Số tiền (VNĐ) *
              </label>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ngày cần sử dụng
              </label>
              <input
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chi tiết thiết bị / giải trình
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi rõ số lượng thiết bị, địa điểm quay hoặc mục tiêu Ads..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {submitting ? "Đang gửi..." : "Gửi đề xuất"}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách Dự trù chi phí */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Danh sách Dự trù ({filteredBudgets.length}/{budgets.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc trạng thái ngân sách"
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Lọc dự án ngân sách"
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Lọc hạng mục ngân sách"
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Mọi phân loại</option>
              {Object.entries(BUDGET_CATEGORY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredBudgets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            {budgets.length === 0
              ? "Chưa có phiếu dự trù chi phí nào."
              : "Không có phiếu chi phí khớp bộ lọc hiện tại."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBudgets.map((b) => {
              const st = BUDGET_STATUS_META[b.status];
              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">
                        {b.code}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: b.project.color }}
                      >
                        {b.project.name}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.colorClass}`}
                      >
                        {st.label}
                      </span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {BUDGET_CATEGORY_LABEL[b.category]}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {b.title}
                    </h3>
                    {b.note && (
                      <p className="text-xs text-slate-600">{b.note}</p>
                    )}
                    {b.reviewNote && (
                      <p className="text-xs font-medium text-indigo-800 bg-indigo-50/70 border border-indigo-100 rounded-lg px-2.5 py-1 inline-block">
                        Ghi chú duyệt: {b.reviewNote}
                      </p>
                    )}
                    <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                      <span>
                        Người đề xuất:{" "}
                        <strong className="text-slate-800">
                          {b.requester.name}
                        </strong>
                      </span>
                      {b.neededBy && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ngày cần: {formatVnDate(b.neededBy)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-lg font-bold text-slate-900">
                      {formatVnd(b.amount)}
                    </div>
                    {currentUserRole === "LEADER" && b.status === "PENDING" && (
                      <div className="flex flex-col sm:items-end gap-1.5">
                        <input
                          type="text"
                          value={reviewNotes[b.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [b.id]: e.target.value,
                            }))
                          }
                          placeholder="Ghi chú duyệt / lý do (tùy chọn)..."
                          className="w-full sm:w-56 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white px-2.5 py-1 text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReview(b.id, "APPROVED")}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Duyệt chi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(b.id, "REJECTED")}
                            className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
