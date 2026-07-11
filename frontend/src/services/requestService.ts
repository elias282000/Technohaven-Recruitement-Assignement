import { apiRequest } from '../lib/api'

import type {
  CreateRequestPayload,
  RequestFilters,
  RequestStatus,
  RequestStatusHistory,
  ServiceRequest,
} from '../types/request'

function buildRequestQuery(
  filters: RequestFilters,
): string {
  const searchParams = new URLSearchParams()

  const normalizedQuery = filters.query.trim()

  if (normalizedQuery) {
    searchParams.set('q', normalizedQuery)
  }

  if (filters.status) {
    searchParams.set('status', filters.status)
  }

  if (filters.priority) {
    searchParams.set(
      'priority',
      filters.priority,
    )
  }

  const queryString = searchParams.toString()

  return queryString
    ? `/requests?${queryString}`
    : '/requests'
}

export async function getRequests(
  filters: RequestFilters,
): Promise<ServiceRequest[]> {
  return apiRequest<ServiceRequest[]>(
    buildRequestQuery(filters),
  )
}

export async function getRequestById(
  requestId: number,
): Promise<ServiceRequest> {
  return apiRequest<ServiceRequest>(
    `/requests/${requestId}`,
  )
}

export async function getRequestHistory(
  requestId: number,
): Promise<RequestStatusHistory[]> {
  return apiRequest<RequestStatusHistory[]>(
    `/requests/${requestId}/history`,
  )
}

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<ServiceRequest> {
  return apiRequest<ServiceRequest>(
    '/requests',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function updateRequestStatus(
  requestId: number,
  requestStatus: RequestStatus,
): Promise<ServiceRequest> {
  return apiRequest<ServiceRequest>(
    `/requests/${requestId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: requestStatus,
      }),
    },
  )
}

export async function cancelRequest(
  requestId: number,
): Promise<ServiceRequest> {
  return apiRequest<ServiceRequest>(
    `/requests/${requestId}`,
    {
      method: 'DELETE',
    },
  )
}