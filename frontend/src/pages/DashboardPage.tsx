import { useAuth } from '../hooks/useAuth'

function roleLabel(
  role: 'operator' | 'supervisor',
): string {
  return role === 'supervisor'
    ? 'Supervisor'
    : 'Operator'
}

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
            {roleLabel(user.role)} workspace
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to your service dashboard
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50 sm:text-base">
            Your authentication session is active. Request
            creation, management, history, search, and
            filtering will be added in the next
            implementation step.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12.5 10.5 15 16 9.5M12 3.75 19.25 7v5c0 4.25-2.8 7.2-7.25 8.25C7.55 19.2 4.75 16.25 4.75 12V7L12 3.75Z"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-base font-bold text-slate-900">
            Authenticated
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your JWT was validated against the backend and
            the current user record was loaded.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6.5h16v11H4v-11Zm3 3h4m-4 3h10"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-base font-bold text-slate-900">
            Role assigned
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Current access level:{' '}
            <span className="font-semibold text-slate-700">
              {roleLabel(user.role)}
            </span>
            .
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5v5l3 1.75M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-base font-bold text-slate-900">
            Request workspace
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            The complete REST request workflow will be
            connected during Step 8.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Signed-in account
            </p>

            <h2 className="mt-2 text-lg font-bold text-slate-900">
              {user.email}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              User ID: {user.id}
            </p>
          </div>

          <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            {roleLabel(user.role)}
          </span>
        </div>
      </section>
    </div>
  )
}