import { apiClient } from './client'
import type { OffersTodoApi } from '@/types/offers'

/**
 * §14.367: «Fatta» sulle offerte, dal browser di chi è entrato (le letture delle pagine /offerte
 * le fa il server di Next, lib/offers-api.ts). Il backend salva la spunta per utente.
 */

/** PUT /offers/:slug/done: segna l'offerta come fatta (di nuovo: la spunta si sposta a adesso). */
export async function markOfferDone(slug: string): Promise<void> {
  await apiClient.put(`/offers/${encodeURIComponent(slug)}/done`)
}

/** DELETE /offers/:slug/done: toglie la spunta. */
export async function unmarkOfferDone(slug: string): Promise<void> {
  await apiClient.delete(`/offers/${encodeURIComponent(slug)}/done`)
}

/** GET /offers/todo: quante offerte restano da fare per tipo, e le prime `limit`. */
export async function getOffersTodo(limit: number): Promise<OffersTodoApi> {
  const { data } = await apiClient.get<OffersTodoApi>('/offers/todo', { params: { limit } })
  return data
}
