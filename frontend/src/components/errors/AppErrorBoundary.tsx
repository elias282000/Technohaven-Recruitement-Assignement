import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return {
      hasError: true,
    }
  }

  componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo,
  ): void {
    console.error(
      'Unhandled React application error.',
      error,
      errorInfo,
    )
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  private handleClearSession = (): void => {
    window.localStorage.removeItem(
      'service_request_access_token',
    )

    window.location.assign('/login')
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-7 text-center shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v5m0 3.25v.01M10.05 4.6 3.8 15.5A2.25 2.25 0 0 0 5.75 18.9h12.5a2.25 2.25 0 0 0 1.95-3.4L13.95 4.6a2.25 2.25 0 0 0-3.9 0Z"
              />
            </svg>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Application error
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            The interface could not be displayed
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-500">
            An unexpected frontend error occurred. Your
            saved requests remain safely stored in the
            database.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Reload application
            </button>

            <button
              type="button"
              onClick={this.handleClearSession}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              Clear session
            </button>
          </div>
        </section>
      </main>
    )
  }
}