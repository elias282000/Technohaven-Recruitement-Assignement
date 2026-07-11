import type {
  RequestStatus,
} from '../../types/request'

interface StatusBadgeProps {
  status: RequestStatus
}

const statusStyles: Record<
  RequestStatus,
  string
> = {
  pending:
    'border-amber-200 bg-amber-50 text-amber-700',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled:
    'border-slate-200 bg-slate-100 text-slate-600',
}

const statusLabels: Record<
  RequestStatus,
  string
> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function StatusBadge({
  status,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
        statusStyles[status],
      ].join(' ')}
    >
      {statusLabels[status]}
    </span>
  )
}

export function requestStatusLabel(
  status: RequestStatus,
): string {
  return statusLabels[status]
}