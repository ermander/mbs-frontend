'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { loginHref } from '@/lib/auth-redirects'
import { isPublicPageMounted } from '@/lib/public-page'
import { setOnRefreshFailure } from '@/services/api/client'
import { useAuthStore } from '@/stores/auth-store'
import { currentLocation } from '@/components/auth/post-auth-destination'

/**
 * Quando il rinnovo della sessione fatto dall'interceptor di axios fallisce (401 anche sul
 * refresh): via l'utente dallo store e al login con il `?next=` della pagina corrente
 * (§14.326), così dopo l'accesso si torna lì. Su una pagina aperta anche agli ospiti
 * (§14.339-14.340) resta lì: la guard mostra la versione pubblica.
 */
export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    setOnRefreshFailure(() => {
      useAuthStore.getState().clearUser()
      if (isPublicPageMounted()) return
      router.replace(loginHref(currentLocation()))
    })
    return () => setOnRefreshFailure(null)
  }, [router])

  return <>{children}</>
}
