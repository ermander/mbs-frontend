import { cache } from 'react'
import { cookies } from 'next/headers'

import type { OfferCardApi, OfferDetailApi } from '@/types/offers'

/**
 * Le letture pubbliche delle offerte (backend §14.261) fatte dal server di Next per le pagine
 * /offerte e /offerte/[id] (§14.263): il contenuto arriva già nella pagina e il titolo del
 * dettaglio viene dal database. Lo stesso indirizzo dei rewrite di next.config.ts: in sviluppo il
 * mock (MOCK_API_URL), in produzione il container del backend sulla rete di docker compose.
 *
 * I cookie della richiesta vengono girati al backend: oggi le due rotte sono pubbliche, ma il
 * giorno in cui le pagine vanno dietro login (OFFERS_LOGIN_REQUIRED) e le rotte prendono
 * `authenticated`, la lettura funziona già con la sessione dell'utente.
 */

function apiBaseUrl(): string {
  return process.env.NODE_ENV === 'development'
    ? (process.env.MOCK_API_URL ?? 'http://localhost:4000')
    : 'http://mbs-backend:3000'
}

export type ApiRead<T> = { ok: true; data: T } | { ok: false; status: number | null }

async function read<T>(path: string): Promise<ApiRead<T>> {
  try {
    const cookieHeader = (await cookies()).toString()
    const response = await fetch(`${apiBaseUrl()}/api${path}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, status: null }
  }
}

/** Le carte pubblicate, nell'ordine del backend (tipo, poi ordine dell'editor). */
export const fetchPublishedOffers = cache(async (): Promise<ApiRead<OfferCardApi[]>> => {
  const result = await read<{ offers: OfferCardApi[] }>('/offers')
  return result.ok ? { ok: true, data: result.data.offers } : result
})

/** Un'offerta pubblicata con la guida; status 404 se manca, è bozza o è nascosta. */
export const fetchPublishedOffer = cache(async (slug: string): Promise<ApiRead<OfferDetailApi>> => {
  const result = await read<{ offer: OfferDetailApi }>(`/offers/${encodeURIComponent(slug)}`)
  return result.ok ? { ok: true, data: result.data.offer } : result
})
