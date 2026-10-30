import { useSearchParams } from 'next/navigation'

import { NEXT_PARAM, postAuthDestination } from '@/lib/auth-redirects'

/**
 * §14.326: dove mandare chi entra (DsLoginForm) o è già entrato (GuestGuard) dalla pagina
 * corrente: il `?next=` lasciato da DashboardAuthGuard, validato, altrimenti la dashboard.
 * Usa useSearchParams: la pagina che rende il componente lo avvolge in un Suspense.
 */
export function usePostAuthDestination(): string {
  const searchParams = useSearchParams()
  return postAuthDestination(searchParams.get(NEXT_PARAM))
}

/**
 * pathname + search della pagina che si sta lasciando, da ricordare in `?next=` con loginHref;
 * null sul server (chi lo chiama lo fa da un effetto o da un gestore, cioè nel browser).
 */
export function currentLocation(): string | null {
  if (typeof window === 'undefined') return null
  return window.location.pathname + window.location.search
}

/**
 * sessionStorage del browser, o null dove non c'è o è negato (server, modalità privata di
 * qualche browser, iframe di terzi): chi lo riceve va alla dashboard.
 */
export function browserSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}
