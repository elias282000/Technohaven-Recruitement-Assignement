import { useRealtime } from '../../hooks/useRealtime'

const statusConfiguration = {
  connected: {
    label: 'Live',
    dotClass: 'bg-emerald-500',
    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  connecting: {
    label: 'Connecting',
    dotClass:
      'bg-amber-500 animate-pulse',
    containerClass:
      'border-amber-200 bg-amber-50 text-amber-700',
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass:
      'bg-amber-500 animate-pulse',
    containerClass:
      'border-amber-200 bg-amber-50 text-amber-700',
  },
  disconnected: {
    label: 'Offline',
    dotClass: 'bg-slate-400',
    containerClass:
      'border-slate-200 bg-slate-100 text-slate-600',
  },
} as const

export function RealtimeStatusBadge() {
  const {
    connectionStatus,
    reconnectAttempt,
  } = useRealtime()

  const configuration =
    statusConfiguration[connectionStatus]

  const title =
    connectionStatus === 'reconnecting'
      ? `Realtime connection retry ${reconnectAttempt}`
      : `Realtime connection: ${configuration.label}`

  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold',
        configuration.containerClass,
      ].join(' ')}
      title={title}
      aria-live="polite"
    >
      <span
        className={[
          'h-2 w-2 rounded-full',
          configuration.dotClass,
        ].join(' ')}
      />

      <span>{configuration.label}</span>
    </div>
  )
}