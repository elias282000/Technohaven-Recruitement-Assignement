import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
          Error 404
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
          Page not found
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-500">
          The page you requested does not exist or is no
          longer available.
        </p>

        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  )
}