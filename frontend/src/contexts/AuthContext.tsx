import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ApiError } from '../lib/api'
import {
  getAccessToken,
  removeAccessToken,
  setAccessToken,
} from '../lib/tokenStorage'
import {
  getCurrentUser,
  loginUser,
} from '../services/authService'
import type {
  AuthUser,
  LoginCredentials,
} from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (
    credentials: LoginCredentials,
  ) => Promise<void>
  logout: () => void
}

export const AuthContext =
  createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null)

  const [isInitializing, setIsInitializing] =
    useState(true)

  const logout = useCallback((): void => {
    removeAccessToken()
    setUser(null)
  }, [])

  useEffect(() => {
    let isActive = true

    async function restoreSession(): Promise<void> {
      const token = getAccessToken()

      if (!token) {
        if (isActive) {
          setIsInitializing(false)
        }

        return
      }

      try {
        const currentUser =
          await getCurrentUser()

        if (isActive) {
          setUser(currentUser)
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          removeAccessToken()
        }

        if (isActive) {
          setUser(null)
        }
      } finally {
        if (isActive) {
          setIsInitializing(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(
    async (
      credentials: LoginCredentials,
    ): Promise<void> => {
      const loginResponse =
        await loginUser(credentials)

      setAccessToken(loginResponse.access_token)

      try {
        const currentUser =
          await getCurrentUser()

        setUser(currentUser)
      } catch (error) {
        removeAccessToken()
        setUser(null)
        throw error
      }
    },
    [],
  )

  const contextValue =
    useMemo<AuthContextValue>(
      () => ({
        user,
        isAuthenticated: user !== null,
        isInitializing,
        login,
        logout,
      }),
      [
        user,
        isInitializing,
        login,
        logout,
      ],
    )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}