import { getResponseStatus } from '@/lib/error-utils'
import { apiClient } from './client'
import type {
  Account,
  AccountMovement,
  AccountMovementType,
  Book,
  EnabledStatus,
  Holder,
  QuickBet,
  Wallet,
  WalletMovement,
  WalletMovementType,
} from '@/types/profit-tracker'

export interface CreateHolderPayload {
  nome: string
  descrizione?: string
}

export async function getHolders(): Promise<Holder[]> {
  const response = await apiClient.get<Holder[]>('/profit-tracker/holders')
  return response.data
}

export async function createHolder(payload: CreateHolderPayload): Promise<Holder> {
  try {
    const response = await apiClient.post<Holder>('/profit-tracker/holders', payload)
    return response.data
  } catch (error: unknown) {
    if (getResponseStatus(error) === 409) {
      const err = new Error('HOLDER_NAME_ALREADY_EXISTS') as Error & { code: string }
      err.code = 'HOLDER_NAME_ALREADY_EXISTS'
      throw err
    }
    throw error
  }
}

export interface CreateBookPayload {
  nome: string
  descrizione?: string
  isExchange: boolean
}

export interface UpdateBookPayload {
  descrizione?: string
  isExchange?: boolean
}

export interface GetBooksParams {
  page?: number
  limit?: number
  nome?: string
  descrizione?: string
}

export interface GetBooksResponse {
  items: Book[]
  total: number
}

export async function getBooks(params?: GetBooksParams): Promise<GetBooksResponse> {
  const response = await apiClient.get<GetBooksResponse>('/profit-tracker/books', {
    params: params ?? {},
  })
  return response.data
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  try {
    const response = await apiClient.post<Book>('/profit-tracker/books', payload)
    return response.data
  } catch (error: unknown) {
    if (getResponseStatus(error) === 409) {
      const err = new Error('BOOK_NAME_ALREADY_EXISTS') as Error & { code: string }
      err.code = 'BOOK_NAME_ALREADY_EXISTS'
      throw err
    }
    throw error
  }
}

export async function updateBook(id: string, payload: UpdateBookPayload): Promise<Book> {
  const response = await apiClient.put<Book>(`/profit-tracker/books/${id}`, payload)
  return response.data
}

export interface CreateAccountPayload {
  holderId: string
  bookId: string
  descrizione?: string
  stato: EnabledStatus
}

export interface GetAccountsParams {
  holderId?: string
  bookId?: string
  status?: string
  page?: number
  limit?: number
  sortSaldo?: 'asc' | 'desc'
}

export interface GetAccountsResponse {
  items: Account[]
  total: number
}

export async function getAccounts(params?: GetAccountsParams): Promise<GetAccountsResponse> {
  const response = await apiClient.get<GetAccountsResponse>('/profit-tracker/accounts', {
    params: params ?? {},
  })
  return response.data
}

export async function createAccount(payload: CreateAccountPayload): Promise<Account> {
  const response = await apiClient.post<Account>('/profit-tracker/accounts', payload)
  return response.data
}

export interface UpdateAccountPayload {
  nome?: string
  descrizione?: string | null
  stato?: EnabledStatus
}

export async function updateAccount(id: string, payload: UpdateAccountPayload): Promise<Account> {
  const response = await apiClient.patch<Account>(`/profit-tracker/accounts/${id}`, payload)
  return response.data
}

export interface CreateWalletPayload {
  holderId: string
  nome: string
  descrizione?: string
  saldoIniziale?: number
  stato: EnabledStatus
}

export async function getWallets(): Promise<Wallet[]> {
  const response = await apiClient.get<Wallet[]>('/profit-tracker/wallets')
  return response.data
}

export async function createWallet(payload: CreateWalletPayload): Promise<Wallet> {
  const response = await apiClient.post<Wallet>('/profit-tracker/wallets', payload)
  return response.data
}

export interface UpdateWalletPayload {
  descrizione?: string | null
  stato?: EnabledStatus
}

export async function updateWallet(id: string, payload: UpdateWalletPayload): Promise<Wallet> {
  const response = await apiClient.patch<Wallet>(`/profit-tracker/wallets/${id}`, payload)
  return response.data
}

export interface CreateAccountMovementPayload {
  accountId: string
  tipo: AccountMovementType
  walletId?: string
  valore: number
  dataRegistrazione: string
  descrizione?: string
}

export async function createAccountMovement(
  payload: CreateAccountMovementPayload,
): Promise<AccountMovement> {
  const response = await apiClient.post<AccountMovement>(
    '/profit-tracker/account-movements',
    payload,
  )
  return response.data
}

export interface CreateWalletMovementPayload {
  tipo: WalletMovementType
  walletId?: string
  fromWalletId?: string
  toWalletId?: string
  valore: number
  dataRegistrazione: string
  descrizione?: string
}

export async function createWalletMovement(
  payload: CreateWalletMovementPayload,
): Promise<WalletMovement> {
  const response = await apiClient.post<WalletMovement>('/profit-tracker/wallet-movements', payload)
  return response.data
}

export interface GetQuickBetsParams {
  accountId?: string
  fromDate?: string
  toDate?: string
  method?: string
}

export interface CreateQuickBetPayload {
  accountId: string
  quickMethod: string
  movimento: number
  dataRegistrazione: string
  tag?: string
  nota?: string
}

export interface UpdateQuickBetPayload {
  movimento?: number
  tag?: string | null
  nota?: string | null
}

export async function getQuickBets(params?: GetQuickBetsParams): Promise<QuickBet[]> {
  const response = await apiClient.get<QuickBet[]>('/profit-tracker/quick-bets', {
    params: params ?? {},
  })
  return response.data
}

export async function createQuickBet(payload: CreateQuickBetPayload): Promise<QuickBet> {
  const response = await apiClient.post<QuickBet>('/profit-tracker/quick-bets', payload)
  return response.data
}

export async function updateQuickBet(
  id: string,
  payload: UpdateQuickBetPayload,
): Promise<QuickBet> {
  const response = await apiClient.patch<QuickBet>(`/profit-tracker/quick-bets/${id}`, payload)
  return response.data
}

export async function deleteQuickBet(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/quick-bets/${id}`)
}
