import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  email: string
}

interface AuthState {
  user: User | null
  login: (data: { email: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (data) => set({ user: { email: data.email } }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'mbs-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
