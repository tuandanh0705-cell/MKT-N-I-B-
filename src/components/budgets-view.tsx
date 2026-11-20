"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import {
  BUDGET_CATEGORY_LABEL,
  BUDGET_STATUS_META,
} from "@/lib/constants";
import { formatVnDate, formatVnd } from "@/lib/dates";
import { useToast } from "@/components/toast-provider";
import type { BudgetItem, SimpleProject } from "@/types/crm";
import type { BudgetCategory, UserRole } from "@/generated/prisma/client";

interface BudgetsViewProps {
  initialBudgets: BudgetItem[];
  projects: SimpleProject[];
  currentUserRole: UserRole;
}

export function BudgetsView({
  initialBudgets,
  projects,
  currentUserRole,
}: BudgetsViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState<BudgetItem[]>(initialBudgets);
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("SHOOT_PRODUCTION");
  const [amount, setAmount] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          neededBy: neededBy ? new Date(neededBy).toISOString() : null,
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
      setNote("");
      showToast(`Đã gửi đề xuất ${data.budget.code}.`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/budgets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (res.ok) {
      setBudgets((prev) =>
        prev.map((b) => (b.id === id ? data.budget : b))
      );
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
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Danh sách Dự trù ({budgets.length})
          </h2>
        </div>

        {budgets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Chưa có phiếu dự trù chi phí nào.
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((b) => {
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
