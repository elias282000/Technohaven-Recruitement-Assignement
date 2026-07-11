import type {
  RequestPriority,
} from '../../types/request'

interface PriorityBadgeProps {
  priority: RequestPriority
}

const priorityStyles: Record<
  RequestPriority,
  string
> = {
  low:
    'border-slate-200 bg-white text-slate-600',
  medium:
    'border-violet-200 bg-violet-50 text-violet-700',
  high:
    'border-red-200 bg-red-50 text-red-700',
}

const priorityLabels: Record<
  RequestPriority,
  string
> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function PriorityBadge({
  priority,
}: PriorityBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold',
        priorityStyles[priority],
      ].join(' ')}
    >
      {priorityLabels[priority]}
    </span>
  )
}