export type UserRole = 'operator' | 'supervisor'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}