"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Đã có lỗi xảy ra
          </h2>
          <p className="text-sm text-slate-500">
            Hệ thống vừa gặp sự cố tạm thời. Vui lòng thử tải lại trang.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
