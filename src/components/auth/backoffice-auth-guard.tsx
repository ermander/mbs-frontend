'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuthStore } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'

const ADMIN_ROLE = 'ADMIN_ROLE'

/**
 * Second-layer guard per le rotte `/backoffice/*`.
 *
 * L'autenticazione + il bootstrap di `/me` sono già garantiti dal `DashboardAuthGuard`
 * montato nel layout `(auth)`. Qui controlliamo solo il ruolo: se l'utente non è admin
 * redirige a `POST_AUTH_REDIRECT`.
 */
export function BackofficeAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user && user.role !== ADMIN_ROLE) {
      router.replace(POST_AUTH_REDIRECT)
    }
  }, [user, router])

  if (!user || user.role !== ADMIN_ROLE) return null

  return <>{children}</>
}
