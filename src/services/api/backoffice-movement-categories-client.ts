import { apiClient } from './client'
import type {
  MovementCategory,
  MovementCategoryDirezione,
  MovementCategoryNatura,
} from '@/types/profit-tracker'

// Catalogo globale delle categorie dei movimenti di wallet, solo admin (§14.111).
export interface CreateMovementCategoryPayload {
  nome: string
  descrizione?: string | null
  direzione: MovementCategoryDirezione
  natura: MovementCategoryNatura
  attivo?: boolean
  ordine?: number
}

export interface UpdateMovementCategoryPayload {
  nome?: string
  descrizione?: string | null
  direzione?: MovementCategoryDirezione
  natura?: MovementCategoryNatura
  attivo?: boolean
  ordine?: number
}

export async function getGlobalMovementCategories(): Promise<MovementCategory[]> {
  const response = await apiClient.get<MovementCategory[]>(
    '/profit-tracker/global-movement-categories',
  )
  return response.data
}

export async function createGlobalMovementCategory(
  payload: CreateMovementCategoryPayload,
): Promise<MovementCategory> {
  const response = await apiClient.post<MovementCategory>(
    '/profit-tracker/global-movement-categories',
    payload,
  )
  return response.data
}

export async function updateGlobalMovementCategory(
  id: string,
  payload: UpdateMovementCategoryPayload,
): Promise<MovementCategory> {
  const response = await apiClient.put<MovementCategory>(
    `/profit-tracker/global-movement-categories/${id}`,
    payload,
  )
  return response.data
}

export async function deleteGlobalMovementCategory(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/global-movement-categories/${id}`)
}
