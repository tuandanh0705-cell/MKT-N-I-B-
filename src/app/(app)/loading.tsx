export default function AppSectionLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Đang tải trang">
      {/* Header skeleton */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <div className="h-6 w-56 rounded-xl bg-amber-100/80" />
          <div className="h-3.5 w-80 max-w-full rounded-lg bg-slate-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-amber-100/70" />
          <div className="h-9 w-28 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-amber-100 p-4 space-y-2.5"
          >
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-7 w-16 rounded-lg bg-amber-100/70" />
            <div className="h-2.5 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-44 rounded bg-slate-200/80" />
          <div className="h-8 w-40 rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-slate-50 border border-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
