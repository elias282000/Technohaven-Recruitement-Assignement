import { BrandMark } from '../layout/BrandMark'

export function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div
        className="flex flex-col items-center gap-5"
        role="status"
        aria-live="polite"
      >
        <BrandMark />

        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

        <p className="text-sm font-medium text-slate-600">
          Restoring your session…
        </p>
      </div>
    </main>
  )
}