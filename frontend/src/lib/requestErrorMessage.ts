import { ApiError } from './api'

export interface RequestErrorPresentation {
  title: string
  message: string
  shouldReload: boolean
}

export function getRequestErrorPresentation(
  error: unknown,
  fallbackMessage: string,
): RequestErrorPresentation {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Unexpected error',
      message: fallbackMessage,
      shouldReload: false,
    }
  }

  if (error.status === 0) {
    return {
      title: 'Server unavailable',
      message:
        'The application could not reach the backend. Check that the server is running and try again.',
      shouldReload: true,
    }
  }

  if (error.status === 403) {
    return {
      title: 'Permission denied',
      message:
        error.message ||
        'Your account is not permitted to perform this action.',
      shouldReload: true,
    }
  }

  if (error.status === 404) {
    return {
      title: 'Request not found',
      message:
        'This request no longer exists or could not be loaded.',
      shouldReload: true,
    }
  }

  if (error.status === 409) {
    return {
      title: 'Request state changed',
      message:
        `${error.message} The request may have changed in another browser or through automatic processing.`,
      shouldReload: true,
    }
  }

  if (error.status === 422) {
    return {
      title: 'Invalid request data',
      message: error.message,
      shouldReload: false,
    }
  }

  return {
    title: 'Request failed',
    message: error.message,
    shouldReload: false,
  }
}