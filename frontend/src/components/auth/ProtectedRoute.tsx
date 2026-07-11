import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../ui/LoadingScreen'

export function ProtectedRoute() {
  const {
    isAuthenticated,
    isInitializing,
  } = useAuth()

  const location = useLocation()

  if (isInitializing) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}