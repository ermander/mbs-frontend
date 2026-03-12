'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const setUser = useAuthStore((s) => s.setUser)
  const startBootstrapping = useAuthStore((s) => s.startBootstrapping)
  const finishBootstrapping = useAuthStore((s) => s.finishBootstrapping)
  const clearUser = useAuthStore((s) => s.clearUser)

  useEffect(() => {
    const bootstrap = async () => {
      if (user || isBootstrapping) return
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
  }, [clearUser, finishBootstrapping, isBootstrapping, router, setUser, startBootstrapping, user])

  if (!user) return null

  return <>{children}</>
}
