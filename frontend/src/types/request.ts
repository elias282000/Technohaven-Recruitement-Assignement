export type RequestPriority =
  | 'low'
  | 'medium'
  | 'high'

export type RequestStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface RequestCreator {
  id: number
  email: string
}

export interface ServiceRequest {
  id: number
  title: string
  description: string
  requester_name: string
  priority: RequestPriority
  status: RequestStatus
  created_by: number
  created_at: string
  updated_at: string
  creator: RequestCreator
}

export interface RequestStatusHistory {
  id: number
  request_id: number
  old_status: RequestStatus
  new_status: RequestStatus
  changed_at: string
}

export interface CreateRequestPayload {
  title: string
  description: string
  requester_name: string
  priority: RequestPriority
}

export interface UpdateRequestStatusPayload {
  status: RequestStatus
}

export interface RequestFilters {
  query: string
  status: RequestStatus | ''
  priority: RequestPriority | ''
}