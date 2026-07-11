import { getAccessToken } from './tokenStorage'

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim()

if (!configuredApiBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL is required in the frontend environment.',
  )
}

export const API_BASE_URL = configuredApiBaseUrl.replace(
  /\/+$/,
  '',
)

interface ApiErrorBody {
  detail?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(
    message: string,
    status: number,
    body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function extractErrorMessage(
  body: unknown,
  fallbackMessage: string,
): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'detail' in body
  ) {
    const detail = (body as ApiErrorBody).detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (
            typeof item === 'object' &&
            item !== null &&
            'msg' in item &&
            typeof item.msg === 'string'
          ) {
            return item.msg
          }

          return null
        })
        .filter(
          (message): message is string =>
            message !== null,
        )

      if (messages.length > 0) {
        return messages.join(' ')
      }
    }
  }

  return fallbackMessage
}

async function parseResponseBody(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  return text || null
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()

  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (
    options.body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
      },
    )
  } catch {
    throw new ApiError(
      'Unable to connect to the server.',
      0,
      null,
    )
  }

  const body = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(
        body,
        `Request failed with status ${response.status}.`,
      ),
      response.status,
      body,
    )
  }

  return body as T
}