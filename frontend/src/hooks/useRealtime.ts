import { useContext } from 'react'

import {
  RealtimeContext,
} from '../contexts/RealtimeContext'

export function useRealtime() {
  const context =
    useContext(RealtimeContext)

  if (context === null) {
    throw new Error(
      'useRealtime must be used within RealtimeProvider.',
    )
  }

  return context
}