"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Không tải được dữ liệu
        </h2>
        <p className="text-sm text-slate-500">
          Kết nối tới máy chủ hoặc cơ sở dữ liệu vừa bị gián đoạn. Bấm thử lại để khôi phục ngay.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold cursor-pointer"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 text-sm font-medium"
          >
            Về trang chính
          </Link>
        </div>
      </div>
    </div>
  );
}
