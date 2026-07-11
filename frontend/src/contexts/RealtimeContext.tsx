import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../lib/api'
import {
  getAccessToken,
} from '../lib/tokenStorage'

import type {
  RealtimeConnectionStatus,
  RealtimeEvent,
  RealtimeEventListener,
} from '../types/realtime'

interface RealtimeContextValue {
  connectionStatus: RealtimeConnectionStatus
  reconnectAttempt: number
  subscribe: (
    listener: RealtimeEventListener,
  ) => () => void
}

interface RealtimeProviderProps {
  children: ReactNode
}

const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000

export const RealtimeContext =
  createContext<RealtimeContextValue | null>(
    null,
  )

function buildWebSocketUrl(
  token: string,
): string {
  const websocketUrl = new URL(
    '/ws',
    API_BASE_URL,
  )

  websocketUrl.protocol =
    websocketUrl.protocol === 'https:'
      ? 'wss:'
      : 'ws:'

  websocketUrl.searchParams.set(
    'token',
    token,
  )

  return websocketUrl.toString()
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  )
}

function parseRealtimeEvent(
  rawMessage: string,
): RealtimeEvent | null {
  let parsedMessage: unknown

  try {
    parsedMessage = JSON.parse(rawMessage)
  } catch {
    return null
  }

  if (
    !isObject(parsedMessage) ||
    typeof parsedMessage.type !== 'string' ||
    !isObject(parsedMessage.data)
  ) {
    return null
  }

  if (
    parsedMessage.type ===
      'connection_established' &&
    typeof parsedMessage.data.user_id ===
      'number' &&
    (
      parsedMessage.data.role ===
        'operator' ||
      parsedMessage.data.role ===
        'supervisor'
    )
  ) {
    return parsedMessage as unknown as RealtimeEvent
  }

  if (
    parsedMessage.type ===
      'request_created' &&
    typeof parsedMessage.data.id ===
      'number' &&
    typeof parsedMessage.data.title ===
      'string' &&
    typeof parsedMessage.data.status ===
      'string'
  ) {
    return parsedMessage as unknown as RealtimeEvent
  }

  if (
    parsedMessage.type ===
      'request_updated' &&
    typeof parsedMessage.data.id ===
      'number' &&
    typeof parsedMessage.data.status ===
      'string'
  ) {
    return parsedMessage as unknown as RealtimeEvent
  }

  return null
}

function reconnectDelay(
  attempt: number,
): number {
  const exponentialDelay =
    INITIAL_RECONNECT_DELAY_MS *
    2 ** Math.max(attempt - 1, 0)

  return Math.min(
    exponentialDelay,
    MAX_RECONNECT_DELAY_MS,
  )
}

export function RealtimeProvider({
  children,
}: RealtimeProviderProps) {
  const {
    user,
    isAuthenticated,
    isInitializing,
    logout,
  } = useAuth()

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<RealtimeConnectionStatus>(
      'disconnected',
    )

  const [
    reconnectAttempt,
    setReconnectAttempt,
  ] = useState(0)

  const socketRef =
    useRef<WebSocket | null>(null)

  const reconnectTimerRef =
    useRef<number | null>(null)

  const listenersRef = useRef<
    Set<RealtimeEventListener>
  >(new Set())

  const subscribe = useCallback(
    (
      listener: RealtimeEventListener,
    ): (() => void) => {
      listenersRef.current.add(listener)

      return () => {
        listenersRef.current.delete(listener)
      }
    },
    [],
  )

  useEffect(() => {
    if (
      isInitializing ||
      !isAuthenticated ||
      !user
    ) {
      setConnectionStatus('disconnected')
      setReconnectAttempt(0)
      return
    }

    let isDisposed = false
    let currentAttempt = 0

    function clearReconnectTimer(): void {
      if (
        reconnectTimerRef.current !== null
      ) {
        window.clearTimeout(
          reconnectTimerRef.current,
        )

        reconnectTimerRef.current = null
      }
    }

    function notifyListeners(
      event: RealtimeEvent,
    ): void {
      for (
        const listener
        of listenersRef.current
      ) {
        try {
          listener(event)
        } catch (error) {
          console.error(
            'Realtime event listener failed.',
            error,
          )
        }
      }
    }

    function scheduleReconnect(): void {
      if (isDisposed) {
        return
      }

      currentAttempt += 1
      setReconnectAttempt(currentAttempt)
      setConnectionStatus('reconnecting')

      const delay =
        reconnectDelay(currentAttempt)

      clearReconnectTimer()

      reconnectTimerRef.current =
        window.setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, delay)
    }

    function connect(): void {
      if (isDisposed) {
        return
      }

      const token = getAccessToken()

      if (!token) {
        setConnectionStatus('disconnected')
        return
      }

      clearReconnectTimer()

      setConnectionStatus(
        currentAttempt === 0
          ? 'connecting'
          : 'reconnecting',
      )

      const socket = new WebSocket(
        buildWebSocketUrl(token),
      )

      socketRef.current = socket

      socket.addEventListener(
        'open',
        () => {
          if (
            isDisposed ||
            socketRef.current !== socket
          ) {
            return
          }

          currentAttempt = 0
          setReconnectAttempt(0)
          setConnectionStatus('connected')
        },
      )

      socket.addEventListener(
        'message',
        (messageEvent) => {
          if (
            typeof messageEvent.data !==
            'string'
          ) {
            return
          }

          const realtimeEvent =
            parseRealtimeEvent(
              messageEvent.data,
            )

          if (!realtimeEvent) {
            console.warn(
              'Ignored an invalid realtime event.',
            )
            return
          }

          notifyListeners(realtimeEvent)
        },
      )

      socket.addEventListener(
        'error',
        () => {
          /*
           * The close event handles reconnection.
           * Calling close here ensures a failed
           * connection reaches that path promptly.
           */
          if (
            socket.readyState ===
              WebSocket.OPEN ||
            socket.readyState ===
              WebSocket.CONNECTING
          ) {
            socket.close()
          }
        },
      )

      socket.addEventListener(
        'close',
        (closeEvent) => {
          if (
            socketRef.current === socket
          ) {
            socketRef.current = null
          }

          if (isDisposed) {
            return
          }

          if (closeEvent.code === 1008) {
            setConnectionStatus(
              'disconnected',
            )

            /*
             * The backend uses 1008 for a missing,
             * invalid, expired, or unknown-user JWT.
             */
            logout()
            return
          }

          scheduleReconnect()
        },
      )
    }

    connect()

    return () => {
      isDisposed = true

      clearReconnectTimer()

      const activeSocket =
        socketRef.current

      socketRef.current = null

      if (
        activeSocket &&
        (
          activeSocket.readyState ===
            WebSocket.OPEN ||
          activeSocket.readyState ===
            WebSocket.CONNECTING
        )
      ) {
        activeSocket.close(
          1000,
          'Client cleanup',
        )
      }

      setConnectionStatus('disconnected')
      setReconnectAttempt(0)
    }
  }, [
    isAuthenticated,
    isInitializing,
    logout,
    user,
  ])

  const contextValue =
    useMemo<RealtimeContextValue>(
      () => ({
        connectionStatus,
        reconnectAttempt,
        subscribe,
      }),
      [
        connectionStatus,
        reconnectAttempt,
        subscribe,
      ],
    )

  return (
    <RealtimeContext.Provider
      value={contextValue}
    >
      {children}
    </RealtimeContext.Provider>
  )
}