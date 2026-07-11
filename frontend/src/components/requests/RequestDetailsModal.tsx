import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { ApiError } from '../../lib/api'
import {
  getRequestById,
  getRequestHistory,
} from '../../services/requestService'

import type {
  RequestStatusHistory,
  ServiceRequest,
} from '../../types/request'

import { Modal } from './Modal'
import { PriorityBadge } from './PriorityBadge'
import {
  requestStatusLabel,
  StatusBadge,
} from './StatusBadge'

interface RequestDetailsModalProps {
  requestId: number
  refreshKey: number
  onClose: () => void
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'medium',
    },
  ).format(new Date(value))
}

export function RequestDetailsModal({
  requestId,
  refreshKey,
  onClose,
}: RequestDetailsModalProps) {
  const [serviceRequest, setServiceRequest] =
    useState<ServiceRequest | null>(null)

  const [history, setHistory] =
    useState<RequestStatusHistory[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const loadDetails = useCallback(
    async (): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const [
          requestResponse,
          historyResponse,
        ] = await Promise.all([
          getRequestById(requestId),
          getRequestHistory(requestId),
        ])

        setServiceRequest(
          requestResponse,
        )
        setHistory(historyResponse)
      } catch (requestError) {
        if (
          requestError instanceof ApiError
        ) {
          setError(requestError.message)
        } else {
          setError(
            'Unable to load request details.',
          )
        }
      } finally {
        setIsLoading(false)
      }
    },
    [requestId],
  )

  useEffect(() => {
    void loadDetails()
  }, [loadDetails, refreshKey])

  return (
    <Modal
      title={`Request #${requestId}`}
      description="Request information and status history"
      size="large"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      }
    >
      {isLoading && (
        <div
          className="flex min-h-72 items-center justify-center"
          role="status"
        >
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading request details…
            </p>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadDetails()
            }
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading &&
        !error &&
        serviceRequest && (
          <div className="space-y-7">
            <section>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold leading-8 text-slate-950">
                    {serviceRequest.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Created by{' '}
                    {
                      serviceRequest.creator
                        .email
                    }
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PriorityBadge
                    priority={
                      serviceRequest.priority
                    }
                  />

                  <StatusBadge
                    status={
                      serviceRequest.status
                    }
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {
                    serviceRequest.description
                  }
                </p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Requester
                </p>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {
                    serviceRequest.requester_name
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Created
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                  {formatDateTime(
                    serviceRequest.created_at,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Last updated
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                  {formatDateTime(
                    serviceRequest.updated_at,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current status
                </p>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {requestStatusLabel(
                    serviceRequest.status,
                  )}
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Status history
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Chronological lifecycle changes
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {history.length}{' '}
                  {history.length === 1
                    ? 'transition'
                    : 'transitions'}
                </span>
              </div>

              {history.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No status transitions have occurred yet.
                  </p>
                </div>
              ) : (
                <ol className="mt-5 space-y-4">
                  {history.map(
                    (
                      historyEntry,
                      index,
                    ) => (
                      <li
                        key={historyEntry.id}
                        className="relative flex gap-4"
                      >
                        {index <
                          history.length -
                            1 && (
                          <span className="absolute left-[15px] top-8 h-[calc(100%+0.5rem)] w-px bg-slate-200" />
                        )}

                        <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
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
                              d="m7 12 3 3 7-7"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-bold text-slate-800">
                              {requestStatusLabel(
                                historyEntry.old_status,
                              )}
                              {' → '}
                              {requestStatusLabel(
                                historyEntry.new_status,
                              )}
                            </p>

                            <time className="text-xs font-medium text-slate-400">
                              {formatDateTime(
                                historyEntry.changed_at,
                              )}
                            </time>
                          </div>
                        </div>
                      </li>
                    ),
                  )}
                </ol>
              )}
            </section>
          </div>
        )}
    </Modal>
  )
}