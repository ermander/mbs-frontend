import { apiClient } from './client'

export type UserRole = 'USER_ROLE' | 'ADMIN_ROLE'

export type UserSettings = Record<string, unknown>

export interface AuthUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  settings: UserSettings
  /** ISO 8601, data di iscrizione */
  createdAt?: string
  /** Strumenti abilitati dal backoffice (§14.122); assente sui backend più vecchi. Un admin li ha tutti. */
  tools?: string[]
  /**
   * §14.249: false per un account entrato con Google (§14.246) che non ha mai impostato una
   * password; assente sui backend più vecchi, che il profilo tratta come «ha una password».
   */
  hasPassword?: boolean
}

export interface AuthResponse {
  user: AuthUser
}

export interface RegisterResponse {
  status: 'pending_verification'
  email: string
}

/**
 * §14.246: dove porta «Continua con Google». Una navigazione, non una chiamata axios: il
 * backend (dietro il rewrite /api) manda il browser a Google e lo riporta su /accesso-google.
 */
export const GOOGLE_AUTH_START_URL = '/api/auth/google'

export const authClient = {
  /** §14.253: il nome è facoltativo, la registrazione del design non lo chiede. */
  async register(payload: { email: string; password: string; name?: string; username: string }) {
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
    }>('/auth/forgot-password', {
      email,
    })
    return data
  },

  async resetPassword(payload: { token: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>('/auth/reset-password', payload)
    return data
  },

  /** Profilo: nome e/o username. */
  async updateMe(payload: { name?: string; username?: string }) {
    const { data } = await apiClient.patch<AuthResponse>('/auth/me', payload)
    return data
  },

  /** Profilo: cambio password con verifica di quella attuale. */
  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
    return data
  },

  /**
   * §14.251: cancellazione dell'account (art. 17 GDPR). Chi ha una password la ridigita, chi
   * accede solo con Google manda la parola di conferma. Il backend risponde 204 e cancella i
   * cookie di sessione: dopo questa chiamata l'utente non esiste più.
   */
  async deleteMe(payload: { password: string } | { confirm: string }) {
    await apiClient.delete('/auth/me', { data: payload })
  },
}
