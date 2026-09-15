export type SportType = 'calcio' | 'basket' | 'tennis' | 'altro'

export type BetMethod = 'punta' | 'banca'

export type BetBonusType = 'none' | 'bonus' | 'rimborso' | 'freebet'

export type BetStatus = 'bozza' | 'in_corso' | 'vinto' | 'perso' | 'annullato'

export type EnabledStatus = 'abilitato' | 'disabilitato'

export type AccountMovementType = 'deposito' | 'prelievo' | 'riconciliazione'

/** Solo i prelievi possono essere in attesa: il wallet si accredita quando diventano pagati (§14.109). */
export type AccountMovementStato = 'in_attesa' | 'pagato'

/** Catalogo globale dei metodi di pagamento: un wallet è un collaboratore × un metodo. */
export interface PaymentMethod {
  id: string
  slug: string
  nome: string
  descrizione?: string | null
  attivo: boolean
  createdAt: string
  updatedAt: string
}

export type WalletMovementType = 'trasferimento' | 'ricarica' | 'spesa'

/**
 * §14.111: categorie dei movimenti di wallet (catalogo globale). `direzione` vincola
 * il tipo (entrata = ricariche, uscita = spese); `natura` decide la riga del report:
 * reddito → altre entrate, costo_attivita → costi dell'attività, spesa_personale →
 * spese personali, capitale → fuori dal conto economico.
 */
export type MovementCategoryDirezione = 'entrata' | 'uscita'
export type MovementCategoryNatura = 'reddito' | 'costo_attivita' | 'spesa_personale' | 'capitale'

export interface MovementCategory {
  id: string
  slug: string
  nome: string
  descrizione?: string | null
  direzione: MovementCategoryDirezione
  natura: MovementCategoryNatura
  attivo: boolean
  ordine: number
  /** Movimenti che la usano (solo nel backoffice). */
  inUso?: number
  createdAt: string
  updatedAt: string
}

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

/** Categoria del profitto per le giocate (ongoing bets). Le giocate rapide usano QuickGameMethod. */
export type BetCategory = 'matched_betting' | 'surebet' | 'valuebet'

/** Categoria come appare nella sezione Report: BetCategory oppure un QuickGameMethod. */
export type ProfitCategory = BetCategory | QuickGameMethod

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
  bloccato: boolean
  createdAt: string
}

export interface Wallet {
  id: string
  holderId: string
  paymentMethodId: string
  /** Il nome del metodo di pagamento. */
  nome: string
  descrizione?: string
  saldoAttuale: number
  /** Somma dei prelievi in attesa diretti a questo wallet. */
  inAttesa: number
  stato: EnabledStatus
  bloccato: boolean
  createdAt: string
}

export type ModalitaSaldo = 'reale' | 'bonus' | 'rimborso'

export interface OngoingBet {
  id: string
  eventoData: string
  categoria?: BetCategory
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

// Profit report (sezione "Report")

export interface ProfitReportFilters {
  fromDate?: string
  toDate?: string
  holderId?: string
  accountId?: string
  bookId?: string
  categoria?: string
}

export type ProfitReportSezione = 'giocate' | 'reddito' | 'costo_attivita' | 'spesa_personale'

export interface ProfitReportRow {
  periodStart: string
  /** §14.111: giocate (ledger e rapide) oppure la natura della categoria del movimento. */
  sezione: ProfitReportSezione
  categoria: string
  /** Nome dal catalogo per i movimenti di wallet; null per le giocate. */
  categoriaNome: string | null
  /** Null per i movimenti di wallet, che non hanno un conto. */
  accountId: string | null
  bookId: string | null
  holderId: string
  totale: number
  giocate: number
}

/** §14.111: le voci del conto economico di un periodo. */
export interface ProfitReportAmounts {
  profittoGiocate: number
  altreEntrate: number
  costiAttivita: number
  spesePersonali: number
  /** profittoGiocate - costiAttivita */
  nettoAttivita: number
  /** nettoAttivita + altreEntrate - spesePersonali */
  netto: number
  /** Numero di giocate (bet e rapide) e di movimenti di wallet contati. */
  giocate: number
  movimenti: number
}

export interface ProfitReportBucket extends ProfitReportAmounts {
  periodStart: string
  /** = profittoGiocate, il campo storico. */
  totale: number
}

export interface ProfitReportResult extends ProfitReportAmounts {
  rows: ProfitReportRow[]
  buckets: ProfitReportBucket[]
  /** = profittoGiocate, il campo storico. */
  totale: number
  /** Fuori dal conto: capitale proprio del periodo, e ricariche/spese ancora senza categoria. */
  capitaleVersato: number
  capitaleRitirato: number
  daClassificare: number
}

export type ProfitReportDetailKind = 'bet' | 'quick' | 'ricarica' | 'spesa'

export interface ProfitReportDetailItem {
  kind: ProfitReportDetailKind
  id: string
  nome: string | null
  categoria: string
  categoriaNome: string | null
  sezione: ProfitReportSezione
  data: string
  importo: number
  accountIds: string[]
  walletId: string | null
  holderId: string | null
}

export interface ProfitReportDetailResult {
  items: ProfitReportDetailItem[]
  total: number
  page: number
  limit: number
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
  posizione?: number
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
  stato: AccountMovementStato
  dataPagamento: string | null
  /** Nomi letti in join dal backend, per gli elenchi. */
  accountNome?: string
  holderId?: string
  walletNome?: string | null
}

export interface WalletMovement {
  id: string
  walletId?: string
  tipo: WalletMovementType
  fromWalletId?: string
  toWalletId?: string
  valore: number
  dataRegistrazione: string
  descrizione?: string | null
  /** §14.111: solo su ricariche e spese; null = da classificare. */
  categoryId?: string | null
  categoriaSlug?: string | null
  categoriaNome?: string | null
  natura?: MovementCategoryNatura | null
  /** Il collaboratore a cui il movimento si riferisce, se non è il proprietario del wallet. */
  holderId?: string | null
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
  /** Solo per i movimenti conto (prelievi in attesa o pagati). */
  stato?: AccountMovementStato | null
  dataPagamento?: string | null
  /** §14.111: solo per ricariche e spese; slug/nome null = da classificare. */
  categoriaSlug?: string | null
  categoriaNome?: string | null
  natura?: MovementCategoryNatura | null
  holderId?: string | null
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
  stato?: AccountMovementStato
  /** §14.111: slug della categoria (ricariche e spese). */
  categoria?: string
  /** §14.111: solo le ricariche e spese senza categoria. */
  daClassificare?: boolean
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
