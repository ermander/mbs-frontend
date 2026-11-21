'use client'

import { useAuthHydrated, useAuthStore } from '@/stores/auth-store'
import { OffersLoadError } from '@/components/offers/offers-load-error'

/**
 * §14.351: quello che /offerte e /offerte/[id] mostrano quando il server di Next ha letto la
 * versione per gli ospiti (la lettura da iscritto ha risposto 401, o non c'era il cookie). Le
 * pagine stanno nel gruppo (open): a chi non è entrato la guard mostra il guscio della landing e
 * qui arriva la versione per gli ospiti (`children`). Chi è nello store invece è un iscritto con
 * l'access_token scaduto (dura 15 minuti, il refresh_token di più): non deve vedere le carte
 * chiuse, ma «Carico le offerte…» mentre OffersLoadError rinnova la sessione e fa rileggere la
 * pagina, come prima del §14.351.
 */
export function OffersGuestGate({
  children,
  renewalClassName,
}: {
  children: React.ReactNode
  /** Il contenitore del messaggio di rinnovo (il dettaglio non ne ha uno suo intorno). */
  renewalClassName?: string
}) {
  const isHydrated = useAuthHydrated()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isHydrated) return null
  if (isLoggedIn) {
    return renewalClassName ? (
      <div className={renewalClassName}>
        <OffersLoadError status={401} />
      </div>
    ) : (
      <OffersLoadError status={401} />
    )
  }
  return <>{children}</>
}
