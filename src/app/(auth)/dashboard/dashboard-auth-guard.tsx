'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'
import { bootstrapRetryDelayMs, isUnauthenticatedError } from '@/lib/auth-session'
import { AuthButton, AuthMessage } from '@/components/auth/auth-primitives'

/**
 * Guard of every `(auth)` page: with `isLoggedIn` persisted it reads /auth/me (the axios
 * interceptor refreshes the cookies on a 401 and retries). Only a 401 that survives the
 * refresh sends the user to /login: a network error or a 5xx (the backend is restarting
 * for a deploy) keeps the user in and retries on its own with a growing wait, with a
 * message and a «Riprova» button meanwhile. Before, any failure cleared the session.
 */
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
  // Failed attempts so far and the wait before the next one (0 = at once).
  const [retry, setRetry] = useState({ attempt: 0, delayMs: 0 })

  useEffect(() => {
    if (!isHydrated) return
    if (user || isBootstrapping) return
    if (!isLoggedIn) {
      router.replace('/login')
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      startBootstrapping()
      try {
        const { user: me } = await authClient.me()
        setUser(me)
      } catch (error) {
        if (isUnauthenticatedError(error)) {
          clearUser()
          router.replace('/login')
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        } else {
          console.error('[DashboardAuthGuard] /me failed, retrying', error)
          setRetry((r) => ({
            attempt: r.attempt + 1,
            delayMs: bootstrapRetryDelayMs(r.attempt + 1),
          }))
        }
      } finally {
        finishBootstrapping()
      }
    }, retry.delayMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    clearUser,
    finishBootstrapping,
    isBootstrapping,
    isHydrated,
    isLoggedIn,
    retry,
    router,
    setUser,
    startBootstrapping,
    user,
  ])

  if (!user) {
    if (retry.attempt === 0) return null
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center gap-3 px-4">
        <AuthMessage tone="error">
          Il server non risponde in questo momento. Riprovo da solo tra poco, oppure puoi riprovare
          subito.
        </AuthMessage>
        <AuthButton
          variant="ghost"
          disabled={isBootstrapping}
          onClick={() => setRetry((r) => ({ attempt: r.attempt + 1, delayMs: 0 }))}
        >
          Riprova
        </AuthButton>
      </div>
    )
  }

  return <>{children}</>
}
