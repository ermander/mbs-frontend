import { apiClient } from './client'
import type { OfferAdmin, OfferInput, OfferVisibility } from '@/types/offers'

// Offerte e guide del backoffice, solo admin (backend §14.261, editor §14.262). Le nuove nascono
// bozze; il salvataggio non tocca la visibilità, che ha la sua rotta.

export async function getBackofficeOffers(): Promise<OfferAdmin[]> {
  const response = await apiClient.get<{ offers: OfferAdmin[] }>('/backoffice/offers')
  return response.data.offers
}

export async function getBackofficeOffer(id: string): Promise<OfferAdmin> {
  const response = await apiClient.get<{ offer: OfferAdmin }>(`/backoffice/offers/${id}`)
  return response.data.offer
}

export async function createBackofficeOffer(input: OfferInput): Promise<OfferAdmin> {
  const response = await apiClient.post<{ offer: OfferAdmin }>('/backoffice/offers', input)
  return response.data.offer
}

export async function updateBackofficeOffer(id: string, input: OfferInput): Promise<OfferAdmin> {
  const response = await apiClient.put<{ offer: OfferAdmin }>(`/backoffice/offers/${id}`, input)
  return response.data.offer
}

export async function setBackofficeOfferVisibility(
  id: string,
  visibility: OfferVisibility,
): Promise<OfferAdmin> {
  const response = await apiClient.patch<{ offer: OfferAdmin }>(
    `/backoffice/offers/${id}/visibility`,
    { visibility },
  )
  return response.data.offer
}

export async function deleteBackofficeOffer(id: string): Promise<void> {
  await apiClient.delete(`/backoffice/offers/${id}`)
}

/** I messaggi di un 400 del backend ({ errors: [...] } dalla validazione Joi), se ci sono. */
export function validationErrorsOf(error: unknown): string[] {
  const data = (error as { response?: { data?: { errors?: unknown } } })?.response?.data
  return Array.isArray(data?.errors)
    ? data.errors.filter((e): e is string => typeof e === 'string')
    : []
}
