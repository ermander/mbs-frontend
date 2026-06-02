'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuthStore } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'

/**
 * Path prefix che un utente COLLABORATOR_ROLE può visitare. Tutti gli altri
 * vengono redirezionati a POST_AUTH_REDIRECT (di solito la dashboard).
 */
const COLLABORATOR_ALLOWED_PREFIXES = [
  '/profit-tracker/dashboard',
  '/profit-tracker/giocate',
  '/profit-tracker/archivio',
  '/profit-tracker/gestione-conti',
  '/calcolatori',
]

function isAllowedForCollaborator(pathname: string | null): boolean {
  if (!pathname) return false
  return COLLABORATOR_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * Guard che limita la navigazione degli utenti COLLABORATOR_ROLE alle sole
 * sezioni concesse. Per gli altri ruoli è un no-op.
 */
export function CollaboratorRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isCollaborator = user?.role === 'COLLABORATOR_ROLE'
  const allowed = !isCollaborator || isAllowedForCollaborator(pathname)

  useEffect(() => {
    if (isCollaborator && !isAllowedForCollaborator(pathname)) {
      router.replace(POST_AUTH_REDIRECT)
    }
  }, [isCollaborator, pathname, router])

  if (!allowed) return null
  return <>{children}</>
}
