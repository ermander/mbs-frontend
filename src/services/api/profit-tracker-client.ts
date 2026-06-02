import { getResponseStatus } from '@/lib/error-utils'
import { apiClient } from './client'
import type {
  Account,
  AccountMovement,
  AccountMovementType,
  ActivityFeedFilters,
  ActivityFeedResult,
  ActivityFeedSummary,
  BetLeg,
  BetLegRealizedLedgerListFilters,
  BetLegRealizedLedgerListResult,
  BetLegRealizedLedgerSummaryParams,
  BetLegRealizedLedgerSummaryResult,
  Book,
  EnabledStatus,
  Holder,
  OngoingBet,
  PuntateInCorsoTotale,
  QuickBet,
  Wallet,
  WalletMovement,
  WalletMovementType,
  Reminder,
  ReminderStatus,
  Tag,
  TelegramStatus,
} from '@/types/profit-tracker'

export interface CreateHolderPayload {
  nome: string
  descrizione?: string
}

export interface GetHoldersParams {
  page?: number
  limit?: number
  nome?: string
  descrizione?: string
  stato?: string
}

export interface GetHoldersResponse {
  items: Holder[]
  total: number
}

export async function getHolders(params?: GetHoldersParams): Promise<GetHoldersResponse> {
  const response = await apiClient.get<GetHoldersResponse>('/profit-tracker/holders', {
    params: params ?? {},
  })
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
  genericUrl?: string | null
  externalId?: string | null
}

export interface UpdateBookPayload {
  descrizione?: string
  isExchange?: boolean
  genericUrl?: string | null
  externalId?: string | null
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

// ── Tags ──────────────────────────────────────────────────────────────

export interface CreateTagPayload {
  nome: string
  colore?: string
}

export interface UpdateTagPayload {
  nome?: string
  colore?: string
}

export async function getTags(): Promise<Tag[]> {
  const response = await apiClient.get<Tag[]>('/profit-tracker/tags')
  return response.data
}

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  try {
    const response = await apiClient.post<Tag>('/profit-tracker/tags', payload)
    return response.data
  } catch (error: unknown) {
    if (getResponseStatus(error) === 409) {
      const err = new Error('TAG_NAME_ALREADY_EXISTS') as Error & { code: string }
      err.code = 'TAG_NAME_ALREADY_EXISTS'
      throw err
    }
    throw error
  }
}

export async function updateTag(id: string, payload: UpdateTagPayload): Promise<Tag> {
  const response = await apiClient.patch<Tag>(`/profit-tracker/tags/${id}`, payload)
  return response.data
}

export async function deleteTag(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/tags/${id}`)
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
  /** Comma-separated holder IDs for multi-select filter */
  holderIds?: string
  /** Comma-separated book IDs for multi-select filter */
  bookIds?: string
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
  descrizione?: string | null
  payoutToUserId?: string | null
  creditToUserId?: string | null
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

// Ongoing bets (giocate in corso)
export interface GetBetsParams {
  status?: string
  archiviata?: boolean
  fromDate?: string
  toDate?: string
  sport?: string
}

export interface CreateBetPayload {
  eventoData: string
  source?: 'oddsmatcher'
  sport: string
  eventoNome: string
  modalitaSaldo: string
  accountId: string
  tag?: string | null
  nota?: string | null
}

export interface BetWithLegs {
  bet: OngoingBet
  legs: BetLeg[]
}

export interface CreateBetLegPayload {
  eventoData: string
  sport: string
  eventoNome: string
  competizione: string
  mercato: string
  selezione?: string
  metodo: 'punta' | 'banca'
  tipoBonus: string
  accountId: string
  stake: number
  quota: number
  quotaRiferimento?: number
  rischio?: number
  bonusValore?: number
  rimborsoValore?: number
  commissionePercentuale?: number
  movimento: number
  statoEvento: string
  tag?: string | null
  posizione?: number
}

export async function getBets(params?: GetBetsParams): Promise<OngoingBet[]> {
  const response = await apiClient.get<OngoingBet[]>('/profit-tracker/bets', {
    params: params ?? {},
  })
  return response.data
}

export async function createBet(payload: CreateBetPayload): Promise<OngoingBet> {
  const response = await apiClient.post<OngoingBet>('/profit-tracker/bets', payload)
  return response.data
}

export async function getBetWithLegs(id: string): Promise<BetWithLegs> {
  const response = await apiClient.get<BetWithLegs>(`/profit-tracker/bets/${id}`)
  return response.data
}

export async function updateBet(
  id: string,
  payload: Partial<CreateBetPayload> & { statoEvento?: string; archiviata?: boolean },
): Promise<OngoingBet> {
  const response = await apiClient.patch<OngoingBet>(`/profit-tracker/bets/${id}`, payload)
  return response.data
}

export async function deleteBet(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/bets/${id}`)
}

export async function createBetLegs(
  betId: string,
  payload: { legs: CreateBetLegPayload[] },
): Promise<BetLeg[]> {
  const response = await apiClient.post<BetLeg[]>(`/profit-tracker/bets/${betId}/legs`, payload)
  return response.data
}

export async function updateBetLeg(
  betId: string,
  legId: string,
  payload: Partial<
    Pick<
      BetLeg,
      | 'eventoData'
      | 'eventoNome'
      | 'stake'
      | 'quota'
      | 'quotaRiferimento'
      | 'commissionePercentuale'
      | 'statoEvento'
      | 'tag'
      | 'movimento'
      | 'tipoBonus'
      | 'bonusValore'
      | 'rimborsoValore'
      | 'accountId'
      | 'rischio'
    >
  >,
): Promise<BetLeg> {
  const response = await apiClient.patch<BetLeg>(
    `/profit-tracker/bets/${betId}/legs/${legId}`,
    payload,
  )
  return response.data
}

export async function deleteBetLeg(betId: string, legId: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/bets/${betId}/legs/${legId}`)
}

// Reminders

export interface GetRemindersParams {
  stato?: ReminderStatus
}

export interface CreateReminderPayload {
  accountId?: string
  descrizione: string
  dataScadenza: string
  periodoNotifica: '24h' | '12h' | 'scadenza'
}

export type UpdateReminderPayload = Partial<CreateReminderPayload> & {
  stato?: ReminderStatus
}

export async function getReminders(params?: GetRemindersParams): Promise<Reminder[]> {
  const response = await apiClient.get<Reminder[]>('/profit-tracker/reminders', {
    params: params ?? {},
  })
  return response.data
}

export async function createReminder(payload: CreateReminderPayload): Promise<Reminder> {
  const response = await apiClient.post<Reminder>('/profit-tracker/reminders', payload)
  return response.data
}

export async function updateReminder(
  id: string,
  payload: UpdateReminderPayload,
): Promise<Reminder> {
  const response = await apiClient.put<Reminder>(`/profit-tracker/reminders/${id}`, payload)
  return response.data
}

export async function deleteReminder(id: string): Promise<void> {
  await apiClient.delete(`/profit-tracker/reminders/${id}`)
}

export async function completeReminder(id: string): Promise<Reminder> {
  const response = await apiClient.patch<Reminder>(`/profit-tracker/reminders/${id}/complete`, {})
  return response.data
}

// Bet leg realized P/L ledger

export async function getBetLegRealizedLedger(
  params?: BetLegRealizedLedgerListFilters,
): Promise<BetLegRealizedLedgerListResult> {
  const response = await apiClient.get<BetLegRealizedLedgerListResult>(
    '/profit-tracker/bet-leg-ledger',
    { params: params ?? {} },
  )
  return response.data
}

export async function getBetLegRealizedLedgerSummary(
  params: BetLegRealizedLedgerSummaryParams,
): Promise<BetLegRealizedLedgerSummaryResult> {
  const response = await apiClient.get<BetLegRealizedLedgerSummaryResult>(
    '/profit-tracker/bet-leg-ledger/summary',
    { params },
  )
  return response.data
}

// Unified profit summary (bet_leg_realized_ledger + quick_bets)

export async function getUnifiedProfitSummary(
  params: BetLegRealizedLedgerSummaryParams,
): Promise<BetLegRealizedLedgerSummaryResult> {
  const response = await apiClient.get<BetLegRealizedLedgerSummaryResult>(
    '/profit-tracker/unified-profit-summary',
    { params },
  )
  return response.data
}

// Collaborator profit breakdown (admin only)

export interface CollaboratorBreakdownEntry {
  collaboratorId: string
  name: string
  username: string
  profitSharePercentage: number | null
  totalProfit: number
  myShareAmount: number
  adminShareAmount: number
}

export async function getCollaboratorBreakdown(params?: {
  fromDate?: string
  toDate?: string
}): Promise<CollaboratorBreakdownEntry[]> {
  const response = await apiClient.get<{ items: CollaboratorBreakdownEntry[] }>(
    '/profit-tracker/collaborator-breakdown',
    { params: params ?? {} },
  )
  return response.data.items
}

// Puntate in corso totale

export async function getPuntateInCorsoTotale(): Promise<PuntateInCorsoTotale> {
  const response = await apiClient.get<PuntateInCorsoTotale>(
    '/profit-tracker/puntate-in-corso/totale',
  )
  return response.data
}

// Activity feed (unified transactions)

export async function getActivityFeed(params?: ActivityFeedFilters): Promise<ActivityFeedResult> {
  const response = await apiClient.get<ActivityFeedResult>('/profit-tracker/activity-feed', {
    params: params ?? {},
  })
  return response.data
}

export async function getActivityFeedSummary(
  params?: Omit<ActivityFeedFilters, 'page' | 'limit'>,
): Promise<ActivityFeedSummary> {
  const response = await apiClient.get<ActivityFeedSummary>(
    '/profit-tracker/activity-feed/summary',
    { params: params ?? {} },
  )
  return response.data
}

// Telegram linking

export interface GenerateTelegramCodeResponse {
  code: string
  expiresAt: string
}

export async function generateTelegramCode(): Promise<GenerateTelegramCodeResponse> {
  const response = await apiClient.post<GenerateTelegramCodeResponse>(
    '/profit-tracker/telegram/generate-code',
    {},
  )
  return response.data
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const response = await apiClient.get<TelegramStatus>('/profit-tracker/telegram/status')
  return response.data
}

export async function unlinkTelegram(): Promise<void> {
  await apiClient.delete('/profit-tracker/telegram/unlink')
}
