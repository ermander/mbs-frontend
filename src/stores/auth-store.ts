import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authClient } from '@/services/api/auth-client'
import type { AuthUser } from '@/services/api/auth-client'
import { THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/theme'

interface AuthState {
  user: AuthUser | null
  isBootstrapping: boolean
  setUser: (user: AuthUser | null) => void
  startBootstrapping: () => void
  finishBootstrapping: () => void
  logout: () => Promise<void>
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isBootstrapping: false,
      setUser: (user) => set({ user }),
      startBootstrapping: () => set({ isBootstrapping: true }),
      finishBootstrapping: () => set({ isBootstrapping: false }),
      clearUser: () => set({ user: null }),
      logout: async () => {
        try {
          await authClient.logout()
        } catch {
          // ignore logout errors (e.g. already logged out)
        } finally {
          set({ user: null })
          localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME)
          document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
        }
      },
    }),
    {
      name: 'mbs-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
