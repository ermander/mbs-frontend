import { apiClient } from './client'
import type { PaymentMethod } from '@/types/profit-tracker'

// Catalogo globale dei metodi di pagamento, solo admin (§14.109).
export interface CreatePaymentMethodPayload {
  nome: string
  descrizione?: string | null
  attivo?: boolean
}

export interface UpdatePaymentMethodPayload {
  nome?: string
  descrizione?: string | null
  attivo?: boolean
}

export async function getGlobalPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await apiClient.get<PaymentMethod[]>('/profit-tracker/global-payment-methods')
  return response.data
}

export async function createGlobalPaymentMethod(
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethod> {
  const response = await apiClient.post<PaymentMethod>(
    '/profit-tracker/global-payment-methods',
    payload,
  )
  return response.data
}

export async function updateGlobalPaymentMethod(
  id: string,
  payload: UpdatePaymentMethodPayload,
): Promise<PaymentMethod> {
  const response = await apiClient.put<PaymentMethod>(
    `/profit-tracker/global-payment-methods/${id}`,
    payload,
  )
  return response.data
}

export async function deleteGlobalPaymentMethod(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/global-payment-methods/${id}`)
}
