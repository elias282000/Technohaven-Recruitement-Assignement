import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ConfirmDialog } from '../components/requests/ConfirmDialog'
import { CreateRequestModal } from '../components/requests/CreateRequestModal'
import { RequestDetailsModal } from '../components/requests/RequestDetailsModal'
import { RequestFilters } from '../components/requests/RequestFilters'
import { RequestList } from '../components/requests/RequestList'
import { useAuth } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import { ApiError } from '../lib/api'

import {
  cancelRequest,
  getRequests,
  updateRequestStatus,
} from '../services/requestService'

import type {
  RequestFilters as RequestFiltersValue,
  RequestStatus,
  ServiceRequest,
} from '../types/request'

const emptyFilters: RequestFiltersValue = {
  query: '',
  status: '',
  priority: '',
}

function updateRequestInList(
  requests: ServiceRequest[],
  updatedRequest: ServiceRequest,
): ServiceRequest[] {
  return requests.map((serviceRequest) =>
    serviceRequest.id ===
    updatedRequest.id
      ? updatedRequest
      : serviceRequest,
  )
}

export function RequestsPage() {
  const { user } = useAuth()

  const { subscribe } = useRealtime()

  const requestLoadSequenceRef =
    useRef(0)

  const [requests, setRequests] =
    useState<ServiceRequest[]>([])

  const [draftFilters, setDraftFilters] =
    useState<RequestFiltersValue>(
      emptyFilters,
    )

  const [appliedFilters, setAppliedFilters] =
    useState<RequestFiltersValue>(
      emptyFilters,
    )

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false)

  const [
    selectedRequestId,
    setSelectedRequestId,
  ] = useState<number | null>(null)

  const [
    pendingCancellation,
    setPendingCancellation,
  ] = useState<ServiceRequest | null>(
    null,
  )

  const [
    actionRequestId,
    setActionRequestId,
  ] = useState<number | null>(null)

  const [
    detailsRefreshKey,
    setDetailsRefreshKey,
  ] = useState(0)

  const loadRequests = useCallback(
    async (
        showLoadingState = true,
    ): Promise<void> => {
        const requestSequence =
        requestLoadSequenceRef.current + 1

        requestLoadSequenceRef.current =
        requestSequence

        if (showLoadingState) {
        setIsLoading(true)
        }

        try {
        const loadedRequests =
            await getRequests(appliedFilters)

        if (
            requestSequence !==
            requestLoadSequenceRef.current
        ) {
            return
        }

        setRequests(loadedRequests)
        setError(null)
        } catch (requestError) {
        if (
            requestSequence !==
            requestLoadSequenceRef.current
        ) {
            return
        }

        if (
            requestError instanceof ApiError
        ) {
            setError(requestError.message)
        } else {
            setError(
            'Unable to load service requests.',
            )
        }
        } finally {
        if (
            showLoadingState &&
            requestSequence ===
            requestLoadSequenceRef.current
        ) {
            setIsLoading(false)
        }
        }
    },
    [appliedFilters],
  )

  useEffect(() => {
    void loadRequests(true)
  }, [loadRequests])

  useEffect(() => {
    const unsubscribe = subscribe(
        (realtimeEvent) => {
        if (
            realtimeEvent.type !==
            'request_created' &&
            realtimeEvent.type !==
            'request_updated'
        ) {
            return
        }

        /*
        * Reload from the REST API so active search,
        * status, and priority filters remain exact.
        */
        void loadRequests(false)

        /*
        * If the details modal is open, this causes
        * it to reload the request and history.
        */
        setDetailsRefreshKey(
            (currentKey) =>
            currentKey + 1,
        )
        },
    )

    return unsubscribe
  }, [loadRequests, subscribe])

  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter(
        (serviceRequest) =>
          serviceRequest.status ===
          'pending',
      ).length,
      inProgress: requests.filter(
        (serviceRequest) =>
          serviceRequest.status ===
          'in_progress',
      ).length,
      completed: requests.filter(
        (serviceRequest) =>
          serviceRequest.status ===
          'completed',
      ).length,
    }),
    [requests],
  )

  function handleApplyFilters(): void {
    setAppliedFilters({
      query: draftFilters.query.trim(),
      status: draftFilters.status,
      priority: draftFilters.priority,
    })
  }

  function handleResetFilters(): void {
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  function handleRequestCreated(
    createdRequest: ServiceRequest,
  ): void {
    setIsCreateModalOpen(false)

    const filtersAreActive =
      appliedFilters.query !== '' ||
      appliedFilters.status !== '' ||
      appliedFilters.priority !== ''

    if (filtersAreActive) {
      void loadRequests(false)
      return
    }

    setRequests((currentRequests) => [
      createdRequest,
      ...currentRequests.filter(
        (serviceRequest) =>
          serviceRequest.id !==
          createdRequest.id,
    ),
    ])
  }

  async function handleUpdateStatus(
    serviceRequest: ServiceRequest,
    requestedStatus: RequestStatus,
  ): Promise<void> {
    setActionRequestId(serviceRequest.id)
    setError(null)

    try {
      const updatedRequest =
        await updateRequestStatus(
          serviceRequest.id,
          requestedStatus,
        )

      setRequests((currentRequests) =>
        updateRequestInList(
          currentRequests,
          updatedRequest,
        ),
      )

      setDetailsRefreshKey(
        (currentKey) =>
          currentKey + 1,
      )

      if (
        appliedFilters.status &&
        updatedRequest.status !==
          appliedFilters.status
      ) {
        await loadRequests(false)
      }
    } catch (requestError) {
      if (
        requestError instanceof ApiError
      ) {
        setError(requestError.message)
      } else {
        setError(
          'Unable to update the request status.',
        )
      }
    } finally {
      setActionRequestId(null)
    }
  }

  async function handleConfirmCancellation(): Promise<void> {
    if (!pendingCancellation) {
      return
    }

    const requestId =
      pendingCancellation.id

    setActionRequestId(requestId)
    setError(null)

    try {
      const cancelledRequest =
        await cancelRequest(requestId)

      setRequests((currentRequests) =>
        updateRequestInList(
          currentRequests,
          cancelledRequest,
        ),
      )

      setPendingCancellation(null)

      setDetailsRefreshKey(
        (currentKey) =>
          currentKey + 1,
      )

      if (
        appliedFilters.status &&
        appliedFilters.status !==
          'cancelled'
      ) {
        await loadRequests(false)
      }
    } catch (requestError) {
      if (
        requestError instanceof ApiError
      ) {
        setError(requestError.message)
      } else {
        setError(
          'Unable to cancel the request.',
        )
      }
    } finally {
      setActionRequestId(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Service operations
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Service requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create, search, review, progress,
            and cancel service requests.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Updates automatically
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRequests(true)
            }
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              className={[
                'h-5 w-5',
                isLoading
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 6v5h-5M4 18v-5h5m9.25-4A7 7 0 0 0 6.1 6.1L4 8m16 8-2.1 1.9A7 7 0 0 1 5.75 15"
              />
            </svg>

            Refresh now
          </button>

          <button
            type="button"
            onClick={() =>
              setIsCreateModalOpen(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                d="M12 5v14M5 12h14"
              />
            </svg>

            New request
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Displayed
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
      </section>

      <section className="mt-6">
        <RequestFilters
          value={draftFilters}
          isLoading={isLoading}
          onChange={setDraftFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </section>

      {error && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadRequests(true)
            }
            className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      <section className="mt-6">
        {isLoading && (
          <div
            className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white"
            role="status"
          >
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading service requests…
              </p>
            </div>
          </div>
        )}

        {!isLoading &&
          !error &&
          requests.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
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
                    d="M7 7.5h10M7 12h6m-6 4.5h4M5.5 3.75h13A2.25 2.25 0 0 1 20.75 6v12A2.25 2.25 0 0 1 18.5 20.25h-13A2.25 2.25 0 0 1 3.25 18V6A2.25 2.25 0 0 1 5.5 3.75Z"
                  />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                No requests found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create a request or reset the
                current search and filters.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    handleResetFilters
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                >
                  Reset filters
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsCreateModalOpen(
                      true,
                    )
                  }
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
                >
                  Create request
                </button>
              </div>
            </div>
          )}

        {!isLoading &&
          !error &&
          requests.length > 0 && (
            <RequestList
              requests={requests}
              currentUser={user}
              actionRequestId={
                actionRequestId
              }
              onView={(serviceRequest) =>
                setSelectedRequestId(
                  serviceRequest.id,
                )
              }
              onUpdateStatus={
                handleUpdateStatus
              }
              onCancel={
                setPendingCancellation
              }
            />
          )}
      </section>

      {isCreateModalOpen && (
        <CreateRequestModal
          onCreated={
            handleRequestCreated
          }
          onClose={() =>
            setIsCreateModalOpen(false)
          }
        />
      )}

      {selectedRequestId !== null && (
        <RequestDetailsModal
          requestId={selectedRequestId}
          refreshKey={
            detailsRefreshKey
          }
          onClose={() =>
            setSelectedRequestId(null)
          }
        />
      )}

      {pendingCancellation && (
        <ConfirmDialog
          title="Cancel service request?"
          message={`Request #${pendingCancellation.id} — “${pendingCancellation.title}” will be marked as cancelled. This terminal status cannot be changed later.`}
          confirmLabel="Cancel request"
          isSubmitting={
            actionRequestId ===
            pendingCancellation.id
          }
          onConfirm={() =>
            void handleConfirmCancellation()
          }
          onClose={() =>
            setPendingCancellation(null)
          }
        />
      )}
    </div>
  )
}