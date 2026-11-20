import { cache } from 'react'
import { cookies } from 'next/headers'

import { OFFERS_PAGE_SIZE } from '@/lib/offers-content'
import type { OfferCardPageApi, OfferDetailApi, OfferType } from '@/types/offers'

/**
 * Le letture delle offerte (backend §14.261) fatte dal server di Next per le pagine /offerte e
 * /offerte/[id] (§14.263): il contenuto arriva già nella pagina e il titolo del dettaglio viene
 * dal database. Lo stesso indirizzo dei rewrite di next.config.ts: in sviluppo il mock
 * (MOCK_API_URL), in produzione il container del backend sulla rete di docker compose.
 *
 * I cookie della richiesta vengono girati al backend, che dal §14.315 vuole la sessione
 * (`authenticated`): senza cookie o con l'access_token scaduto risponde 401, e la pagina lo
 * passa a OffersLoadError, che rinnova la sessione e rilegge invece di mostrare un errore.
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

/**
 * Una pagina delle carte pubblicate (§14.345): OFFERS_PAGE_SIZE per volta, di un tipo e di un
 * sito (null = tutti), con le sezioni, i numeri delle schede e i siti del filtro. Ordine, sezioni
 * e pagine li fa il backend, che oltre l'ultima pagina serve l'ultima. Una risposta senza
 * `sections` viene da un backend di prima del §14.345 (che ignora `page` e manda tutto): la
 * pagina la tratta come una lettura non riuscita invece di rompersi.
 */
export const fetchPublishedOffersPage = cache(
  async (
    type: OfferType,
    book: string | null,
    page: number,
  ): Promise<ApiRead<OfferCardPageApi>> => {
    const query = new URLSearchParams({ type, page: String(page), limit: String(OFFERS_PAGE_SIZE) })
    if (book) query.set('book', book)
    const result = await read<OfferCardPageApi>(`/offers?${query}`)
    if (result.ok && !Array.isArray(result.data.sections)) return { ok: false, status: null }
    return result
  },
)

/** Un'offerta pubblicata con la guida; status 404 se manca, è bozza o è nascosta. */
export const fetchPublishedOffer = cache(async (slug: string): Promise<ApiRead<OfferDetailApi>> => {
  const result = await read<{ offer: OfferDetailApi }>(`/offers/${encodeURIComponent(slug)}`)
  return result.ok ? { ok: true, data: result.data.offer } : result
})
