'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { isUnauthenticatedError } from '@/lib/auth-session'
import { OFFERS_COPY } from '@/lib/offers-content'
import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { DsCallout } from '@/components/offers/offer-parts'

/**
 * Quando l'ultimo rinnovo della sessione è partito da qui: un 401 che torna subito dopo un
 * rinnovo non ne chiede un altro (altrimenti refresh → rilettura → 401 → refresh all'infinito).
 */
let lastRenewalAt = 0
const RENEWAL_WINDOW_MS = 10_000

/**
 * Cosa mostrano /offerte e /offerte/[id] quando la lettura fatta dal server di Next non è andata
 * (§14.315). Un 401 non è un guasto: le rotte vogliono la sessione e l'access_token dura 15
 * minuti, quindi chi torna sulla pagina dopo un po' arriva qui con il solo refresh_token valido.
 * Si rende solo nel layout di (auth) (§14.324), cioè con un utente entrato: rinnova i cookie con
 * POST /auth/refresh e fa rileggere la pagina al server (router.refresh), che ora passa. Se il
 * rinnovo risponde 401 la sessione è davvero finita: si esce come fa la guard. Per ogni altro
 * stato (503, rete) l'avviso di sempre.
 */
export function OffersLoadError({ status }: { status: number | null }) {
  const router = useRouter()
  const clearUser = useAuthStore((s) => s.clearUser)
  const [renewalFailed, setRenewalFailed] = useState(false)
  const renewing = status === 401 && !renewalFailed

  useEffect(() => {
    if (status !== 401) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const now = Date.now()
      const tooSoon = now - lastRenewalAt < RENEWAL_WINDOW_MS
      lastRenewalAt = now
      if (tooSoon) {
        if (!cancelled) setRenewalFailed(true)
        return
      }
      try {
        await authClient.refresh()
        if (!cancelled) router.refresh()
      } catch (error) {
        if (cancelled) return
        if (isUnauthenticatedError(error)) {
          clearUser()
          router.replace('/login')
          return
        }
        setRenewalFailed(true)
      }
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [clearUser, router, status])

  if (renewing) {
    return (
      <p className="ds-body text-ds-ink-muted" role="status">
        {OFFERS_COPY.loading}
      </p>
    )
  }
  return (
    <DsCallout tone="warning">
      <p>{OFFERS_COPY.loadError}</p>
    </DsCallout>
  )
}
