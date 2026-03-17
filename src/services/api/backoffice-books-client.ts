import { apiClient } from './client'
import type { Book } from '@/types/profit-tracker'

export interface CreateGlobalBookPayload {
  nome: string
  descrizione?: string
  isExchange: boolean
  genericUrl?: string | null
  externalId?: string | null
}

export interface UpdateGlobalBookPayload {
  nome?: string
  descrizione?: string
  isExchange?: boolean
  genericUrl?: string | null
  externalId?: string | null
}

export async function getGlobalBooks(): Promise<Book[]> {
  const response = await apiClient.get<Book[]>('/profit-tracker/global-books')
  return response.data
}

export async function createGlobalBook(payload: CreateGlobalBookPayload): Promise<Book> {
  const response = await apiClient.post<Book>('/profit-tracker/global-books', payload)
  return response.data
}

export async function updateGlobalBook(
  id: string,
  payload: UpdateGlobalBookPayload,
): Promise<Book> {
  const response = await apiClient.put<Book>(`/profit-tracker/global-books/${id}`, payload)
  return response.data
}

export async function deleteGlobalBook(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/global-books/${id}`)
}
