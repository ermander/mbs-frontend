'use client'

import { useAuthStore } from '@/stores/auth-store'

/**
 * Mostra `signedIn` quando nello store c'è l'utente letto da /auth/me, altrimenti `fallback`
 * (anche finché la sessione non è nota). Non legge la sessione da sé: lo fa una
 * DashboardAuthGuard nello stesso guscio, come la barra di SiteShell per il suo piè di pagina.
 */
export function SignedInSwitch({
  signedIn,
  fallback,
}: {
  signedIn: React.ReactNode
  fallback: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  return <>{user ? signedIn : fallback}</>
}
