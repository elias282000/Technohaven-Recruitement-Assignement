import {
  type FormEvent,
} from 'react'

import type {
  RequestFilters as RequestFiltersValue,
  RequestPriority,
  RequestStatus,
} from '../../types/request'

interface RequestFiltersProps {
  value: RequestFiltersValue
  isLoading: boolean
  onChange: (
    filters: RequestFiltersValue,
  ) => void
  onApply: () => void
  onReset: () => void
}

export function RequestFilters({
  value,
  isLoading,
  onChange,
  onApply,
  onReset,
}: RequestFiltersProps) {
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault()
    onApply()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
        <div>
          <label
            htmlFor="request-search"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            Search
          </label>

          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
              />
              <path
                strokeLinecap="round"
                d="m16 16 4 4"
              />
            </svg>

            <input
              id="request-search"
              type="search"
              value={value.query}
              onChange={(event) =>
                onChange({
                  ...value,
                  query: event.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Title, description, or requester"
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="request-status-filter"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            Status
          </label>

          <select
            id="request-status-filter"
            value={value.status}
            onChange={(event) =>
              onChange({
                ...value,
                status:
                  event.target.value as
                    | RequestStatus
                    | '',
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">
              All statuses
            </option>
            <option value="pending">
              Pending
            </option>
            <option value="in_progress">
              In progress
            </option>
            <option value="completed">
              Completed
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="request-priority-filter"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            Priority
          </label>

          <select
            id="request-priority-filter"
            value={value.priority}
            onChange={(event) =>
              onChange({
                ...value,
                priority:
                  event.target.value as
                    | RequestPriority
                    | '',
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">
              All priorities
            </option>
            <option value="low">
              Low
            </option>
            <option value="medium">
              Medium
            </option>
            <option value="high">
              High
            </option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  )
}