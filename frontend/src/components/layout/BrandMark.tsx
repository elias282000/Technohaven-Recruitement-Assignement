interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({
  compact = false,
}: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 7.5h10M7 12h6m-6 4.5h4M5.5 3.75h13A2.25 2.25 0 0 1 20.75 6v12A2.25 2.25 0 0 1 18.5 20.25h-13A2.25 2.25 0 0 1 3.25 18V6A2.25 2.25 0 0 1 5.5 3.75Z"
          />
        </svg>
      </div>

      {!compact && (
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-700">
            TECHNOHAVEN
          </p>

          <p className="text-sm font-medium text-slate-700">
            Service Request System
          </p>
        </div>
      )}
    </div>
  )
}