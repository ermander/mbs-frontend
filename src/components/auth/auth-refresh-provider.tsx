'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { loginHref } from '@/lib/auth-redirects'
import { setOnRefreshFailure } from '@/services/api/client'
import { useAuthStore } from '@/stores/auth-store'
import { currentLocation } from '@/components/auth/post-auth-destination'

/**
 * Quando il rinnovo della sessione fatto dall'interceptor di axios fallisce (401 anche sul
 * refresh): via l'utente dallo store e al login con il `?next=` della pagina corrente
 * (§14.326), così dopo l'accesso si torna lì.
 */
export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    setOnRefreshFailure(() => {
      useAuthStore.getState().clearUser()
      router.replace(loginHref(currentLocation()))
    })
    return () => setOnRefreshFailure(null)
  }, [router])

  return <>{children}</>
}
