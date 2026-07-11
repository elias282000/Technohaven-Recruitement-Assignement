import { apiRequest } from '../lib/api'
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from '../types/auth'

export async function loginUser(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    },
  )
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me')
}