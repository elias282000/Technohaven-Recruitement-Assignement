import { useRealtime } from '../../hooks/useRealtime'

export function RealtimeRecoveryBanner() {
  const {
    connectionStatus,
    reconnectAttempt,
  } = useRealtime()

  if (
    connectionStatus === 'connected' ||
    connectionStatus === 'connecting'
  ) {
    return null
  }

  if (
    connectionStatus === 'reconnecting'
  ) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-500" />

          <p className="text-sm font-semibold text-amber-800">
            Real-time connection lost. Reconnecting
            automatically
            {reconnectAttempt > 0
              ? ` — attempt ${reconnectAttempt}`
              : ''}
            …
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-slate-300 bg-slate-100 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500" />

        <p className="text-sm font-semibold text-slate-700">
          Real-time updates are offline. Existing data
          remains available, and the application will
          reconnect automatically.
        </p>
      </div>
    </div>
  )
}