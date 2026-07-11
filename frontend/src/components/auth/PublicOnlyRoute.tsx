import {
  Navigate,
  Outlet,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../ui/LoadingScreen'

export function PublicOnlyRoute() {
  const {
    isAuthenticated,
    isInitializing,
  } = useAuth()

  if (isInitializing) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return <Outlet />
}