import type {
  AuthUser,
} from '../../types/auth'

import type {
  RequestStatus,
  ServiceRequest,
} from '../../types/request'

import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'

interface RequestListProps {
  requests: ServiceRequest[]
  currentUser: AuthUser
  actionRequestId: number | null
  onView: (
    serviceRequest: ServiceRequest,
  ) => void
  onUpdateStatus: (
    serviceRequest: ServiceRequest,
    status: RequestStatus,
  ) => void
  onCancel: (
    serviceRequest: ServiceRequest,
  ) => void
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value))
}

function canModifyRequest(
  serviceRequest: ServiceRequest,
  currentUser: AuthUser,
): boolean {
  if (
    serviceRequest.status === 'completed' ||
    serviceRequest.status === 'cancelled'
  ) {
    return false
  }

  return (
    currentUser.role === 'supervisor' ||
    serviceRequest.created_by ===
      currentUser.id
  )
}

function nextStatus(
  status: RequestStatus,
): RequestStatus | null {
  if (status === 'pending') {
    return 'in_progress'
  }

  if (status === 'in_progress') {
    return 'completed'
  }

  return null
}

function nextStatusLabel(
  status: RequestStatus,
): string {
  if (status === 'pending') {
    return 'Start work'
  }

  return 'Complete'
}

interface RequestActionsProps {
  serviceRequest: ServiceRequest
  currentUser: AuthUser
  isSubmitting: boolean
  compact?: boolean
  onView: (
    serviceRequest: ServiceRequest,
  ) => void
  onUpdateStatus: (
    serviceRequest: ServiceRequest,
    status: RequestStatus,
  ) => void
  onCancel: (
    serviceRequest: ServiceRequest,
  ) => void
}

function RequestActions({
  serviceRequest,
  currentUser,
  isSubmitting,
  compact = false,
  onView,
  onUpdateStatus,
  onCancel,
}: RequestActionsProps) {
  const modifiable = canModifyRequest(
    serviceRequest,
    currentUser,
  )

  const requestedNextStatus =
    nextStatus(serviceRequest.status)

  return (
    <div
      className={[
        'flex flex-wrap gap-2',
        compact
          ? ''
          : 'justify-end',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() =>
          onView(serviceRequest)
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
      >
        View
      </button>

      {modifiable &&
        requestedNextStatus && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              onUpdateStatus(
                serviceRequest,
                requestedNextStatus,
              )
            }
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Updating…'
              : nextStatusLabel(
                  serviceRequest.status,
                )}
          </button>
        )}

      {modifiable && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() =>
            onCancel(serviceRequest)
          }
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

export function RequestList({
  requests,
  currentUser,
  actionRequestId,
  onView,
  onUpdateStatus,
  onCancel,
}: RequestListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Request
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Requester
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Priority
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Created
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {requests.map(
                (serviceRequest) => (
                  <tr
                    key={serviceRequest.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-5">
                      <button
                        type="button"
                        onClick={() =>
                          onView(
                            serviceRequest,
                          )
                        }
                        className="block text-left"
                      >
                        <p className="max-w-sm truncate text-sm font-bold text-slate-900 hover:text-emerald-700">
                          {serviceRequest.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          ID #{serviceRequest.id}
                          {' · '}
                          {serviceRequest
                            .creator.email}
                        </p>
                      </button>
                    </td>

                    <td className="px-5 py-5 text-sm font-medium text-slate-700">
                      {
                        serviceRequest.requester_name
                      }
                    </td>

                    <td className="px-5 py-5">
                      <PriorityBadge
                        priority={
                          serviceRequest.priority
                        }
                      />
                    </td>

                    <td className="px-5 py-5">
                      <StatusBadge
                        status={
                          serviceRequest.status
                        }
                      />
                    </td>

                    <td className="px-5 py-5 text-sm text-slate-500">
                      {formatDateTime(
                        serviceRequest.created_at,
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <RequestActions
                        serviceRequest={
                          serviceRequest
                        }
                        currentUser={
                          currentUser
                        }
                        isSubmitting={
                          actionRequestId ===
                          serviceRequest.id
                        }
                        onView={onView}
                        onUpdateStatus={
                          onUpdateStatus
                        }
                        onCancel={onCancel}
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        {requests.map((serviceRequest) => (
          <article
            key={serviceRequest.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Request #{serviceRequest.id}
                </p>

                <h2 className="mt-2 text-base font-bold leading-6 text-slate-900">
                  {serviceRequest.title}
                </h2>
              </div>

              <StatusBadge
                status={
                  serviceRequest.status
                }
              />
            </div>

            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
              {serviceRequest.description}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Requester
                </dt>

                <dd className="mt-1 text-sm font-semibold text-slate-700">
                  {
                    serviceRequest.requester_name
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Priority
                </dt>

                <dd className="mt-1">
                  <PriorityBadge
                    priority={
                      serviceRequest.priority
                    }
                  />
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Created
                </dt>

                <dd className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(
                    serviceRequest.created_at,
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Creator
                </dt>

                <dd className="mt-1 truncate text-sm font-semibold text-slate-700">
                  {
                    serviceRequest.creator.email
                  }
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <RequestActions
                serviceRequest={
                  serviceRequest
                }
                currentUser={currentUser}
                isSubmitting={
                  actionRequestId ===
                  serviceRequest.id
                }
                compact
                onView={onView}
                onUpdateStatus={
                  onUpdateStatus
                }
                onCancel={onCancel}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}