'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'
import { syncThemeToLocalStorage } from '@/hooks/use-theme'

const ADMIN_ROLE = 'ADMIN_ROLE'

export function BackofficeAuthGuard({ children }: { children: React.ReactNode }) {
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
        syncThemeToLocalStorage(me.settings.theme)
      } catch (error) {
        console.error('[BackofficeAuthGuard] /me failed', error)
        clearUser()
        router.replace('/backoffice/login')
        if (typeof window !== 'undefined') {
          window.location.href = '/backoffice/login'
        }
      } finally {
        finishBootstrapping()
      }
    }

    void bootstrap()
  }, [clearUser, finishBootstrapping, isBootstrapping, router, setUser, startBootstrapping, user])

  if (!user) return null

  if (user.role !== ADMIN_ROLE) {
    if (typeof window !== 'undefined') {
      router.replace('/')
      window.location.href = '/'
    }
    return null
  }

  return <>{children}</>
}
