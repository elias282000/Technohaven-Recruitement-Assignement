import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'

import { useAuth } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import { ApiError } from '../lib/api'
import { getRequests } from '../services/requestService'
import type {
  ServiceRequest,
} from '../types/request'

function roleLabel(
  role: 'operator' | 'supervisor',
): string {
  return role === 'supervisor'
    ? 'Supervisor'
    : 'Operator'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { subscribe } = useRealtime()

  const [requests, setRequests] =
    useState<ServiceRequest[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const loadSequenceRef = useRef(0)

  const loadSummary = useCallback(
    async (
      showLoadingState = true,
    ): Promise<void> => {
      const sequence =
        loadSequenceRef.current + 1

      loadSequenceRef.current = sequence

      if (showLoadingState) {
        setIsLoading(true)
      }

      try {
        const loadedRequests =
          await getRequests({
            query: '',
            status: '',
            priority: '',
          })

        if (
          sequence !==
          loadSequenceRef.current
        ) {
          return
        }

        setRequests(loadedRequests)
        setError(null)
      } catch (requestError) {
        if (
          sequence !==
          loadSequenceRef.current
        ) {
          return
        }

        if (
          requestError instanceof ApiError
        ) {
          setError(requestError.message)
        } else {
          setError(
            'Unable to load request summary.',
          )
        }
      } finally {
        if (
          sequence ===
            loadSequenceRef.current
        ) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    void loadSummary(true)
  }, [loadSummary])

  useEffect(() => {
    const unsubscribe = subscribe(
      (realtimeEvent) => {
        if (
          realtimeEvent.type ===
            'connection_established' ||
          realtimeEvent.type ===
            'request_created' ||
          realtimeEvent.type ===
            'request_updated'
        ) {
          void loadSummary(false)
        }
      },
    )

    return unsubscribe
  }, [loadSummary, subscribe])

  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter(
        (request) =>
          request.status === 'pending',
      ).length,
      inProgress: requests.filter(
        (request) =>
          request.status ===
          'in_progress',
      ).length,
      completed: requests.filter(
        (request) =>
          request.status ===
          'completed',
      ).length,
      cancelled: requests.filter(
        (request) =>
          request.status ===
          'cancelled',
      ).length,
    }),
    [requests],
  )

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
            Monitor the complete request lifecycle through
            live counts synchronized with the backend.
          </p>

          <Link
            to="/requests"
            className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white bg-white px-5 py-3 text-sm font-bold !text-emerald-700 shadow-lg transition hover:bg-emerald-50 hover:!text-emerald-800 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            <span>Open requests</span>

            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 5 7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-bold text-red-800">
              Summary unavailable
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadSummary(true)
            }
            className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      <section
        className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-5"
        aria-label="Live request summary"
        aria-busy={isLoading}
      >
        {isLoading ? (
          Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))
        ) : (
          <>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-950">
                {summary.total}
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Pending
              </p>

              <p className="mt-3 text-3xl font-bold text-amber-800">
                {summary.pending}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                In progress
              </p>

              <p className="mt-3 text-3xl font-bold text-blue-800">
                {summary.inProgress}
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Completed
              </p>

              <p className="mt-3 text-3xl font-bold text-emerald-800">
                {summary.completed}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-300 bg-slate-100 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cancelled
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-700">
                {summary.cancelled}
              </p>
            </article>
          </>
        )}
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Authenticated
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your JWT has been validated and your account
            remains active.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
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
          <h2 className="text-base font-bold text-slate-900">
            Live synchronization
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Counts refresh automatically after request
            creation, status transitions, cancellation,
            and WebSocket reconnection.
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