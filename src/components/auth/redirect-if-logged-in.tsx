'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'

interface RedirectIfLoggedInProps {
  /** Destinazione del redirect. Default: POST_AUTH_REDIRECT (/profit-tracker/dashboard) */
  to?: string
}

/**
 * Variante light di GuestGuard: non blocca il rendering SSR/SEO, esegue il redirect
 * solo lato client quando l'utente risulta loggato dopo l'idratazione dello store.
 *
 * Usala nelle pagine marketing pubbliche (es. Home) che devono restare indicizzabili
 * ma non visibili agli utenti già autenticati.
 */
export function RedirectIfLoggedIn({ to = POST_AUTH_REDIRECT }: RedirectIfLoggedInProps = {}) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isHydrated = useAuthHydrated()

  useEffect(() => {
    if (isHydrated && isLoggedIn) {
      router.replace(to)
    }
  }, [isHydrated, isLoggedIn, router, to])

  return null
}
