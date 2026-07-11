import type {
  RequestPriority,
  RequestStatus,
} from './request'

export type RealtimeConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export interface ConnectionEstablishedEvent {
  type: 'connection_established'
  data: {
    user_id: number
    role: 'operator' | 'supervisor'
  }
}

export interface RequestCreatedEvent {
  type: 'request_created'
  data: {
    id: number
    title: string
    description: string
    requester_name: string
    priority: RequestPriority
    status: RequestStatus
    created_by: number
    created_at: string
    updated_at: string
  }
}

export interface RequestUpdatedEvent {
  type: 'request_updated'
  data: {
    id: number
    status: RequestStatus
    updated_at: string
  }
}

export type RealtimeEvent =
  | ConnectionEstablishedEvent
  | RequestCreatedEvent
  | RequestUpdatedEvent

export type RealtimeEventListener = (
  event: RealtimeEvent,
) => void