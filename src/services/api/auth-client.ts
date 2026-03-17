import { apiClient } from './client'

export type UserRole = 'USER_ROLE' | 'ADMIN_ROLE'

export interface AuthUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
}

export interface AuthResponse {
  user: AuthUser
}

export interface RegisterResponse {
  status: 'pending_verification'
  email: string
}

export const authClient = {
  async register(payload: { email: string; password: string; name: string; username: string }) {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', payload)
    return data
  },

  async login(payload: { email: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
    return data
  },

  async logout() {
    await apiClient.post('/auth/logout')
  },

  async me() {
    const { data } = await apiClient.get<AuthResponse>('/auth/me')
    return data
  },

  async refresh() {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh')
    return data
  },

  async verifyEmail(token: string) {
    const { data } = await apiClient.post<AuthResponse>('/auth/verify-email', { token })
    return data
  },

  async requestPasswordReset(email: string) {
    const { data } = await apiClient.post<{
      message: string
      status?: 'pending_verification'
    }>('/auth/forgot-password', {
      email,
    })
    return data
  },

  async resetPassword(payload: { token: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>('/auth/reset-password', payload)
    return data
  },
}
