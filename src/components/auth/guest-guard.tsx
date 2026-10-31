'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'
import { usePostAuthDestination } from '@/components/auth/post-auth-destination'

/**
 * /login e /registrazione per chi è già entrato: via verso il `?next=` validato o la dashboard
 * (§14.326; prima sempre POST_AUTH_REDIRECT). Legge i parametri della pagina: va dentro un
 * Suspense.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isHydrated = useAuthHydrated()
  const destination = usePostAuthDestination()

  useEffect(() => {
    if (!isHydrated) return
    if (isLoggedIn) {
      router.replace(destination)
    }
  }, [destination, isHydrated, isLoggedIn, router])

  if (!isHydrated || isLoggedIn) return null

  return <>{children}</>
}
