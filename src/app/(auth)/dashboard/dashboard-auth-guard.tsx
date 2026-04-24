'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const isHydrated = useAuthHydrated()
  const setUser = useAuthStore((s) => s.setUser)
  const startBootstrapping = useAuthStore((s) => s.startBootstrapping)
  const finishBootstrapping = useAuthStore((s) => s.finishBootstrapping)
  const clearUser = useAuthStore((s) => s.clearUser)

  useEffect(() => {
    const bootstrap = async () => {
      if (!isHydrated) return
      if (user || isBootstrapping) return
      if (!isLoggedIn) {
        router.replace('/login')
        return
      }
      startBootstrapping()
      try {
        const { user: me } = await authClient.me()
        setUser(me)
      } catch (error) {
        console.error('[DashboardAuthGuard] /me failed', error)
        clearUser()
        router.replace('/login')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      } finally {
        finishBootstrapping()
      }
    }

    void bootstrap()
  }, [
    clearUser,
    finishBootstrapping,
    isBootstrapping,
    isHydrated,
    isLoggedIn,
    router,
    setUser,
    startBootstrapping,
    user,
  ])

  if (!user) return null

  return <>{children}</>
}
