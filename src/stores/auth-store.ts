import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authClient } from '@/services/api/auth-client'
import type { AuthUser } from '@/services/api/auth-client'
import { THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/theme'

interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
  isBootstrapping: boolean
  setUser: (user: AuthUser | null) => void
  startBootstrapping: () => void
  finishBootstrapping: () => void
  logout: () => Promise<void>
  clearUser: () => void
}

let _hydrated = false
const _listeners = new Set<() => void>()

function setHydrated() {
  _hydrated = true
  _listeners.forEach((l) => l())
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isBootstrapping: false,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      startBootstrapping: () => set({ isBootstrapping: true }),
      finishBootstrapping: () => set({ isBootstrapping: false }),
      clearUser: () => set({ user: null, isLoggedIn: false }),
      logout: async () => {
        try {
          await authClient.logout()
        } catch {
          // ignore logout errors (e.g. already logged out)
        } finally {
          set({ user: null, isLoggedIn: false })
          localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME)
          document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
        }
      },
    }),
    {
      name: 'mbs-auth',
      version: 1,
      migrate: (persisted) => persisted as { isLoggedIn?: boolean },
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as { isLoggedIn?: boolean }),
      }),
      onRehydrateStorage: () => () => {
        setHydrated()
      },
    },
  ),
)

export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => {
      _listeners.add(cb)
      return () => _listeners.delete(cb)
    },
    () => _hydrated,
    () => false,
  )
}
