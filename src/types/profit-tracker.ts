export type SportType = 'calcio' | 'basket' | 'tennis' | 'altro'

export type BetMethod = 'punta' | 'banca'

export type BetBonusType = 'none' | 'bonus' | 'rimborso' | 'freebet'

export type BetStatus = 'bozza' | 'in_corso' | 'vinto' | 'perso' | 'annullato'

export type EnabledStatus = 'abilitato' | 'disabilitato'

export type AccountMovementType = 'deposito' | 'prelievo' | 'riconciliazione'

export type WalletMovementType = 'trasferimento' | 'ricarica' | 'spesa'

export type QuickGameMethod =
  | 'baccarat'
  | 'bingo'
  | 'blackjack'
  | 'casino_live'
  | 'gratta_e_vinci'
  | 'quick_games'
  | 'roulette'
  | 'slot_machine'
  | 'sport'
  | 'trading'
  | 'altro'

export interface Holder {
  id: string
  nome: string
  descrizione?: string
  stato: EnabledStatus
}

export interface Book {
  id: string
  nome: string
  descrizione?: string
  isExchange: boolean
  genericUrl?: string | null
  externalId?: string | null
  isGlobal?: boolean
}

export interface Account {
  id: string
  holderId: string
  bookId: string
  nome: string
  descrizione?: string
  saldoAttuale: number
  stato: EnabledStatus
  createdAt: string
}

export interface Wallet {
  id: string
  holderId: string
  nome: string
  descrizione?: string
  saldoAttuale: number
  stato: EnabledStatus
  createdAt: string
}

export type ModalitaSaldo = 'reale' | 'bonus' | 'rimborso'

export interface OngoingBet {
  id: string
  eventoData: string
  eventoNotificato?: boolean
  hasOpenLegs?: boolean
  sport: SportType
  eventoNome: string
  modalitaSaldo: ModalitaSaldo
  accountId: string
  tag?: string
  nota?: string
  statoEvento: BetStatus
  archiviata?: boolean
  createdAt: string
}

export type BetLegRealizedLedgerEntryType = 'settlement_delta' | 'account_transfer'

export interface BetLegRealizedLedgerMetadata {
  sport: string
  source?: string | null
  modalitaSaldo: string
  metodo: BetMethod
  competizione: string
  mercato: string
  isMultipla: boolean
  stake: number
  quota: number
}

export interface BetLegRealizedLedgerEntry {
  id: string
  userId: string
  betId: string
  betLegId: string
  accountId: string
  bookId: string
  entryType: BetLegRealizedLedgerEntryType
  amount: number
  recordedAt: string
  previousStatoEvento: BetStatus
  newStatoEvento: BetStatus
  previousMovimento: number
  newMovimento: number
  metadata: BetLegRealizedLedgerMetadata
}

export interface BetLegRealizedLedgerListFilters {
  fromDate?: string
  toDate?: string
  accountId?: string
  bookId?: string
  betId?: string
  page?: number
  limit?: number
}

export interface BetLegRealizedLedgerListResult {
  items: BetLegRealizedLedgerEntry[]
  total: number
  page: number
  limit: number
}

export type BetLegRealizedLedgerGranularity = 'day' | 'week' | 'month'

export interface BetLegRealizedLedgerSummaryParams {
  granularity: BetLegRealizedLedgerGranularity
  fromDate?: string
  toDate?: string
  accountId?: string
  bookId?: string
}

export interface BetLegRealizedLedgerSummaryBucket {
  periodStart: string
  total: number
}

export interface BetLegRealizedLedgerSummaryResult {
  granularity: BetLegRealizedLedgerGranularity
  rangeTotal: number
  buckets: BetLegRealizedLedgerSummaryBucket[]
}

export interface BetLeg {
  id: string
  betId: string
  eventoData: string
  sport: SportType
  eventoNome: string
  competizione: string
  mercato: string
  selezione?: string
  metodo: BetMethod
  tipoBonus: BetBonusType
  accountId: string
  stake: number
  quota: number
  quotaRiferimento?: number
  rischio: number
  bonusValore?: number
  rimborsoValore?: number
  commissionePercentuale?: number
  movimento: number
  eventoNotificato?: boolean
  statoEvento: BetStatus
  tag?: string
}

export interface QuickBet {
  id: string
  dataRegistrazione: string
  accountId: string
  quickMethod: QuickGameMethod
  tag?: string
  nota?: string
  movimento: number
  createdAt?: string
  updatedAt?: string
}

export interface AccountMovement {
  id: string
  accountId: string
  tipo: AccountMovementType
  walletId?: string
  valore: number
  dataRegistrazione: string
  descrizione?: string
}

export interface WalletMovement {
  id: string
  walletId?: string
  tipo: WalletMovementType
  fromWalletId?: string
  toWalletId?: string
  valore: number
  dataRegistrazione: string
  descrizione?: string
}

export interface Tag {
  id: string
  nome: string
  colore: string
  createdAt: string
  updatedAt: string
}

export type ReminderPeriod = '24h' | '12h' | 'scadenza'
export type ReminderStatus = 'attivo' | 'completato' | 'scaduto'

export interface Reminder {
  id: string
  accountId?: string
  descrizione: string
  dataScadenza: string
  periodoNotifica: ReminderPeriod
  notificaInviata: boolean
  stato: ReminderStatus
  createdAt: string
  updatedAt: string
}

export interface TelegramStatus {
  linked: boolean
  linkedAt?: string
}

// Activity feed (unified transactions)

export type ActivityFeedSource =
  | 'bet_settlement'
  | 'quick_bet'
  | 'deposito'
  | 'prelievo'
  | 'riconciliazione'
  | 'ricarica'
  | 'spesa'
  | 'trasferimento'

export interface ActivityFeedEntry {
  id: string
  source: ActivityFeedSource
  data: string
  importo: number
  accountId: string | null
  walletId: string | null
  descrizione: string | null
  eventoNome?: string | null
  competizione?: string | null
  mercato?: string | null
  metodo?: string | null
}

export interface ActivityFeedSummary {
  totaleEntrate: number
  totaleUscite: number
  saldoNetto: number
}

export interface PuntateInCorsoTotale {
  totale: number
}

export interface ActivityFeedFilters {
  source?: ActivityFeedSource
  accountId?: string
  walletId?: string
  fromDate?: string
  toDate?: string
  page?: number
  limit?: number
}

export interface ActivityFeedResult {
  items: ActivityFeedEntry[]
  total: number
  page: number
  limit: number
}
