import { create } from 'zustand'

import { getErrorCode, getErrorMessage, getResponseDataCode } from '@/lib/error-utils'
import type {
  Account,
  AccountMovement,
  BetLeg,
  Book,
  EnabledStatus,
  Holder,
  OngoingBet,
  QuickBet,
  Wallet,
  WalletMovement,
  Reminder,
  TelegramStatus,
} from '@/types/profit-tracker'
import type {
  CreateBetLegPayload,
  CreateBetPayload,
  GetAccountsParams,
} from '@/services/api/profit-tracker-client'
import {
  createAccount as apiCreateAccount,
  createBet as apiCreateBet,
  createBetLegs as apiCreateBetLegs,
  createAccountMovement as apiCreateAccountMovement,
  createBook as apiCreateBook,
  createHolder as apiCreateHolder,
  createQuickBet as apiCreateQuickBet,
  createWallet as apiCreateWallet,
  createWalletMovement as apiCreateWalletMovement,
  deleteBet as apiDeleteBet,
  deleteBetLeg as apiDeleteBetLeg,
  deleteQuickBet as apiDeleteQuickBet,
  getAccounts as apiGetAccounts,
  getBetWithLegs as apiGetBetWithLegs,
  getBets as apiGetBets,
  getBooks as apiGetBooks,
  getHolders as apiGetHolders,
  getQuickBets as apiGetQuickBets,
  getWallets as apiGetWallets,
  getReminders as apiGetReminders,
  createReminder as apiCreateReminder,
  updateReminder as apiUpdateReminder,
  deleteReminder as apiDeleteReminder,
  completeReminder as apiCompleteReminder,
  getTelegramStatus as apiGetTelegramStatus,
  generateTelegramCode as apiGenerateTelegramCode,
  unlinkTelegram as apiUnlinkTelegram,
  updateAccount as apiUpdateAccount,
  updateBet as apiUpdateBet,
  updateBetLeg as apiUpdateBetLeg,
  updateBook as apiUpdateBook,
  updateQuickBet as apiUpdateQuickBet,
} from '@/services/api/profit-tracker-client'

interface ProfitTrackerState {
  holders: Holder[]
  isLoadingHolders: boolean
  holdersError?: string
  books: Book[]
  booksTotal: number | null
  isLoadingBooks: boolean
  booksError?: string
  accounts: Account[]
  accountsTotal: number | null
  isLoadingAccounts: boolean
  accountsError?: string
  allAccounts: Account[]
  wallets: Wallet[]
  ongoingBets: OngoingBet[]
  betLegs: BetLeg[]
  isLoadingOngoingBets: boolean
  ongoingBetsError?: string
  isSavingOngoingBet: boolean
  quickBets: QuickBet[]
  isLoadingQuickBets: boolean
  quickBetsError?: string
  isSavingQuickBet: boolean
  quickBetError?: string
  accountMovements: AccountMovement[]
  walletMovements: WalletMovement[]
  isSavingAccountMovement: boolean
  accountMovementsError?: string
  isSavingWalletMovement: boolean
  walletMovementsError?: string

  reminders: Reminder[]
  isLoadingReminders: boolean
  remindersError?: string

  telegramStatus: TelegramStatus | null
  telegramStatusError?: string
  isLoadingTelegramStatus: boolean
  isGeneratingTelegramCode: boolean
  generatedTelegramCode?: string

  fetchHolders: () => Promise<void>
  fetchQuickBets: () => Promise<void>
  addHolder: (holder: Omit<Holder, 'id'>) => Promise<void>
  updateHolder: (id: string, patch: Partial<Holder>) => void
  fetchBooks: (params?: {
    page?: number
    limit?: number
    nome?: string
    descrizione?: string
  }) => Promise<void>
  addBook: (book: Omit<Book, 'id'>) => Promise<void>
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>
  fetchAccounts: (params?: GetAccountsParams) => Promise<void>
  fetchAllAccounts: () => Promise<void>
  addAccount: (account: {
    holderId: string
    bookId: string
    descrizione?: string
    stato: EnabledStatus
  }) => Promise<void>
  fetchWallets: () => Promise<void>
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'> & { holderId: string }) => Promise<void>

  updateAccount: (
    id: string,
    patch: Partial<Pick<Account, 'nome' | 'descrizione' | 'stato'>>,
  ) => Promise<void>

  updateWallet: (id: string, patch: Partial<Wallet>) => void

  fetchOngoingBets: () => Promise<void>
  fetchBetWithLegs: (betId: string) => Promise<{ bet: OngoingBet; legs: BetLeg[] }>
  saveOngoingBetFromCalculator: (
    betPayload: CreateBetPayload,
    legs: CreateBetLegPayload[],
  ) => Promise<OngoingBet>
  addOngoingBet: (bet: Omit<OngoingBet, 'id'>) => void
  updateOngoingBet: (id: string, patch: Partial<OngoingBet>) => Promise<void>
  removeOngoingBet: (id: string) => Promise<void>
  updateBetLeg: (
    betId: string,
    legId: string,
    patch: Partial<
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
  ) => Promise<void>
  removeBetLeg: (betId: string, legId: string) => Promise<void>
  addBetLegs: (betId: string, legs: CreateBetLegPayload[]) => Promise<BetLeg[]>

  addQuickBet: (bet: Omit<QuickBet, 'id'>) => Promise<void>
  updateQuickBet: (
    id: string,
    patch: Partial<Pick<QuickBet, 'movimento' | 'tag' | 'nota'>>,
  ) => Promise<void>
  removeQuickBet: (id: string) => Promise<void>

  addAccountMovement: (movement: {
    accountId: string
    tipo: AccountMovement['tipo']
    walletId?: string
    valore: number
    dataRegistrazione: string
    descrizione?: string
  }) => Promise<void>
  addWalletMovement: (movement: Omit<WalletMovement, 'id'>) => Promise<void>

  fetchReminders: (params?: { stato?: Reminder['stato'] }) => Promise<void>
  createReminder: (payload: {
    accountId?: string
    descrizione: string
    dataScadenza: string
    periodoNotifica: '24h' | '12h' | 'scadenza'
  }) => Promise<void>
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  completeReminder: (id: string) => Promise<void>

  fetchTelegramStatus: () => Promise<void>
  generateTelegramCode: () => Promise<string | undefined>
  unlinkTelegram: () => Promise<void>
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const useProfitTrackerStore = create<ProfitTrackerState>((set, _get) => {
  const initialHolders: Holder[] = []
  const initialBooks: Book[] = []
  const initialAccounts: Account[] = []
  const initialWallets: Wallet[] = []

  const initialOngoingBets: OngoingBet[] = []
  const initialBetLegs: BetLeg[] = []
  const initialQuickBets: QuickBet[] = []

  const initialAccountMovements: AccountMovement[] = []
  const initialWalletMovements: WalletMovement[] = []

  return {
    holders: initialHolders,
    isLoadingHolders: false,
    holdersError: undefined,
    books: initialBooks,
    booksTotal: null,
    isLoadingBooks: false,
    booksError: undefined,
    accounts: initialAccounts,
    accountsTotal: null,
    isLoadingAccounts: false,
    accountsError: undefined,
    allAccounts: [],
    wallets: initialWallets,
    ongoingBets: initialOngoingBets,
    betLegs: initialBetLegs,
    isLoadingOngoingBets: false,
    ongoingBetsError: undefined,
    isSavingOngoingBet: false,
    quickBets: initialQuickBets,
    isLoadingQuickBets: false,
    quickBetsError: undefined,
    isSavingQuickBet: false,
    quickBetError: undefined,
    accountMovements: initialAccountMovements,
    walletMovements: initialWalletMovements,
    isSavingAccountMovement: false,
    accountMovementsError: undefined,
    isSavingWalletMovement: false,
    walletMovementsError: undefined,

    reminders: [],
    isLoadingReminders: false,
    remindersError: undefined,

    telegramStatus: null,
    telegramStatusError: undefined,
    isLoadingTelegramStatus: false,
    isGeneratingTelegramCode: false,
    generatedTelegramCode: undefined,

    fetchHolders: async () => {
      set(() => ({ isLoadingHolders: true, holdersError: undefined }))
      try {
        const holders = await apiGetHolders()
        set(() => ({ holders, isLoadingHolders: false }))
      } catch (error: unknown) {
        set(() => ({
          isLoadingHolders: false,
          holdersError: getErrorMessage(error) || 'Errore nel caricamento degli intestatari',
        }))
      }
    },
    addHolder: async (holder) => {
      set(() => ({ holdersError: undefined }))
      try {
        const created = await apiCreateHolder({
          nome: holder.nome,
          descrizione: holder.descrizione,
        })
        set((state) => ({
          holders: [...state.holders, created],
        }))
      } catch (error: unknown) {
        if (getErrorCode(error) === 'HOLDER_NAME_ALREADY_EXISTS') {
          set(() => ({
            holdersError: 'Esiste già un intestatario con questo nome',
          }))
          return
        }
        set(() => ({
          holdersError: getErrorMessage(error) || 'Errore nel salvataggio dell’intestatario',
        }))
      }
    },
    updateHolder: (id, patch) =>
      set((state) => ({
        holders: state.holders.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),

    fetchBooks: async (params) => {
      set(() => ({ isLoadingBooks: true, booksError: undefined }))
      try {
        const isPaginated = params && (params.page != null || params.limit != null)
        const queryParams = isPaginated ? params : { limit: 5000 }
        const { items, total } = await apiGetBooks(queryParams)
        set(() => ({
          books: items,
          booksTotal: isPaginated ? total : null,
          isLoadingBooks: false,
        }))
      } catch (error: unknown) {
        set(() => ({
          isLoadingBooks: false,
          booksError: getErrorMessage(error) || 'Errore nel caricamento dei book',
        }))
      }
    },
    addBook: async (book) => {
      set(() => ({ booksError: undefined }))
      try {
        const created = await apiCreateBook({
          nome: book.nome,
          descrizione: book.descrizione,
          isExchange: book.isExchange,
          genericUrl: book.genericUrl ?? null,
          externalId: book.externalId ?? null,
        })
        set((state) => ({
          books: [...state.books, created],
        }))
      } catch (error: unknown) {
        if (getErrorCode(error) === 'BOOK_NAME_ALREADY_EXISTS') {
          set(() => ({
            booksError: 'Esiste già un book con questo nome',
          }))
          return
        }
        set(() => ({
          booksError: getErrorMessage(error) || 'Errore nel salvataggio del book',
        }))
      }
    },
    updateBook: async (id, patch) => {
      set(() => ({ booksError: undefined }))
      try {
        const updated = await apiUpdateBook(id, {
          descrizione: patch.descrizione,
          isExchange: patch.isExchange,
          genericUrl: patch.genericUrl ?? null,
          externalId: patch.externalId ?? null,
        })
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? updated : b)),
        }))
      } catch (error: unknown) {
        set(() => ({
          booksError: getErrorMessage(error) || 'Errore nel salvataggio del book',
        }))
      }
    },

    fetchAccounts: async (params) => {
      set(() => ({ isLoadingAccounts: true, accountsError: undefined }))
      try {
        const { items, total } = await apiGetAccounts({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          sortSaldo: params?.sortSaldo ?? 'desc',
          holderId: params?.holderId,
          bookId: params?.bookId,
          status: params?.status,
        })
        set(() => ({ accounts: items, accountsTotal: total, isLoadingAccounts: false }))
      } catch (error: unknown) {
        set(() => ({
          isLoadingAccounts: false,
          accountsError: getErrorMessage(error) || 'Errore nel caricamento dei conti',
        }))
      }
    },
    fetchAllAccounts: async () => {
      try {
        const { items } = await apiGetAccounts({ limit: 5000 })
        set(() => ({ allAccounts: items }))
      } catch {
        set(() => ({ allAccounts: [] }))
      }
    },
    addAccount: async ({ holderId, bookId, descrizione, stato }) => {
      set(() => ({ accountsError: undefined }))
      try {
        const created = await apiCreateAccount({
          holderId,
          bookId,
          descrizione,
          stato,
        })
        set((state) => ({
          accounts: state.accounts.some((a) => a.id === created.id)
            ? state.accounts
            : [...state.accounts, created],
          allAccounts: state.allAccounts.some((a) => a.id === created.id)
            ? state.allAccounts
            : [...state.allAccounts, created],
        }))
      } catch (error: unknown) {
        set(() => ({
          accountsError: getErrorMessage(error) || 'Errore nel salvataggio del conto',
        }))
      }
    },

    fetchWallets: async () => {
      set((state) => ({ ...state }))
      const wallets = await apiGetWallets()
      set((state) => ({ ...state, wallets }))
    },
    addWallet: async (wallet) => {
      const created = await apiCreateWallet({
        holderId: wallet.holderId,
        nome: wallet.nome,
        descrizione: wallet.descrizione,
        saldoIniziale: wallet.saldoAttuale,
        stato: wallet.stato,
      })
      set((state) => ({
        wallets: [...state.wallets, created],
      }))
    },

    updateAccount: async (id, patch) => {
      try {
        const updated = await apiUpdateAccount(id, {
          nome: patch.nome,
          descrizione: patch.descrizione,
          stato: patch.stato,
        })
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updated } : a)),
          allAccounts: state.allAccounts.map((a) => (a.id === id ? { ...a, ...updated } : a)),
        }))
      } catch {
        // Keep local state unchanged on error; could set accountsError
      }
    },

    updateWallet: (id, patch) =>
      set((state) => ({
        wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),

    fetchOngoingBets: async () => {
      set(() => ({ isLoadingOngoingBets: true, ongoingBetsError: undefined }))
      try {
        const bets = await apiGetBets()
        set(() => ({
          ongoingBets: bets,
          isLoadingOngoingBets: false,
          ongoingBetsError: undefined,
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || 'Errore nel caricamento delle giocate in corso'
        set(() => ({
          isLoadingOngoingBets: false,
          ongoingBetsError: message,
        }))
      }
    },

    fetchBetWithLegs: async (betId) => {
      const { bet, legs } = await apiGetBetWithLegs(betId)
      const hasOpenLegs = legs.some(
        (l) => l.statoEvento === 'bozza' || l.statoEvento === 'in_corso',
      )
      const eventoNotificato = legs.some(
        (l) => l.eventoNotificato && (l.statoEvento === 'bozza' || l.statoEvento === 'in_corso'),
      )
      const enrichedBet = { ...bet, hasOpenLegs, eventoNotificato }
      set((state) => {
        const hasBet = state.ongoingBets.some((b) => b.id === betId)
        const ongoingBets = hasBet
          ? state.ongoingBets.map((b) => (b.id === betId ? enrichedBet : b))
          : [...state.ongoingBets, enrichedBet]
        const otherLegs = state.betLegs.filter((l) => l.betId !== betId)
        return {
          ongoingBets,
          betLegs: [...otherLegs, ...legs],
        }
      })
      return { bet: enrichedBet, legs }
    },

    saveOngoingBetFromCalculator: async (betPayload, legsPayload) => {
      set(() => ({ isSavingOngoingBet: true, ongoingBetsError: undefined }))
      try {
        const bet = await apiCreateBet(betPayload)
        const legs = await apiCreateBetLegs(bet.id, { legs: legsPayload })
        set((state) => ({
          ongoingBets: [...state.ongoingBets, bet],
          betLegs: [...state.betLegs, ...legs],
          isSavingOngoingBet: false,
          ongoingBetsError: undefined,
        }))
        return bet
      } catch (err: unknown) {
        const message = getErrorMessage(err) || 'Errore nel salvataggio della giocata'
        set(() => ({
          isSavingOngoingBet: false,
          ongoingBetsError: message,
        }))
        throw err
      }
    },

    addOngoingBet: (bet) =>
      set((state) => ({
        ongoingBets: [...state.ongoingBets, { ...bet, id: generateId('bet') }],
      })),

    updateOngoingBet: async (id, patch) => {
      try {
        const updated = await apiUpdateBet(id, patch)
        set((state) => ({
          ongoingBets: state.ongoingBets.map((b) => (b.id === id ? updated : b)),
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'aggiornamento della giocata"
        set((s) => ({ ...s, ongoingBetsError: message }))
        throw err
      }
    },

    removeOngoingBet: async (id) => {
      try {
        await apiDeleteBet(id)
        set((state) => ({
          ongoingBets: state.ongoingBets.filter((b) => b.id !== id),
          betLegs: state.betLegs.filter((l) => l.betId !== id),
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'eliminazione della giocata"
        set((s) => ({ ...s, ongoingBetsError: message }))
        throw err
      }
    },

    updateBetLeg: async (betId, legId, patch) => {
      try {
        const updated = await apiUpdateBetLeg(betId, legId, patch)
        set((state) => {
          const newBetLegs = state.betLegs.map((l) => (l.id === legId ? updated : l))
          const legsOfBet = newBetLegs.filter((l) => l.betId === betId)
          const hasOpenLegs = legsOfBet.some(
            (l) => l.statoEvento === 'bozza' || l.statoEvento === 'in_corso',
          )
          const hasNotifiedOpenLegs = legsOfBet.some(
            (l) =>
              l.eventoNotificato && (l.statoEvento === 'bozza' || l.statoEvento === 'in_corso'),
          )

          return {
            betLegs: newBetLegs,
            ongoingBets: state.ongoingBets.map((b) =>
              b.id === betId
                ? {
                    ...b,
                    hasOpenLegs,
                    eventoNotificato: hasNotifiedOpenLegs,
                  }
                : b,
            ),
          }
        })
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'aggiornamento del leg"
        set((s) => ({ ...s, ongoingBetsError: message }))
        throw err
      }
    },

    removeBetLeg: async (betId, legId) => {
      try {
        await apiDeleteBetLeg(betId, legId)
        set((state) => ({
          betLegs: state.betLegs.filter((l) => l.id !== legId),
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'eliminazione del leg"
        set((s) => ({ ...s, ongoingBetsError: message }))
        throw err
      }
    },

    addBetLegs: async (betId, legsPayload) => {
      try {
        const created = await apiCreateBetLegs(betId, { legs: legsPayload })
        set((state) => ({
          betLegs: [...state.betLegs, ...created],
        }))
        return created
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'aggiunta degli elementi"
        set((s) => ({ ...s, ongoingBetsError: message }))
        throw err
      }
    },

    fetchQuickBets: async () => {
      set(() => ({ isLoadingQuickBets: true, quickBetsError: undefined }))
      try {
        const list = await apiGetQuickBets()
        set(() => ({ quickBets: list, isLoadingQuickBets: false, quickBetsError: undefined }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || 'Errore nel caricamento delle giocate rapide'
        set(() => ({ isLoadingQuickBets: false, quickBetsError: message }))
      }
    },

    addQuickBet: async (bet) => {
      set((s) => ({ ...s, isSavingQuickBet: true, quickBetError: undefined }))
      try {
        const created = await apiCreateQuickBet({
          accountId: bet.accountId,
          quickMethod: bet.quickMethod,
          movimento: bet.movimento,
          dataRegistrazione: bet.dataRegistrazione,
          tag: bet.tag,
          nota: bet.nota,
        })
        set((state) => ({
          ...state,
          quickBets: [...state.quickBets, created],
          accounts: state.accounts.map((a) =>
            a.id === created.accountId
              ? { ...a, saldoAttuale: a.saldoAttuale + created.movimento }
              : a,
          ),
          allAccounts: state.allAccounts.map((a) =>
            a.id === created.accountId
              ? { ...a, saldoAttuale: a.saldoAttuale + created.movimento }
              : a,
          ),
          isSavingQuickBet: false,
          quickBetError: undefined,
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || 'Errore nel salvataggio della giocata rapida'
        set((s) => ({ ...s, isSavingQuickBet: false, quickBetError: message }))
      }
    },

    updateQuickBet: async (id, patch) => {
      try {
        const oldBet = _get().quickBets.find((b) => b.id === id)
        const updated = await apiUpdateQuickBet(id, {
          movimento: patch.movimento,
          tag: patch.tag,
          nota: patch.nota,
        })
        const delta = oldBet ? updated.movimento - oldBet.movimento : 0
        set((state) => ({
          quickBets: state.quickBets.map((b) => (b.id === id ? updated : b)),
          accounts:
            delta !== 0
              ? state.accounts.map((a) =>
                  a.id === updated.accountId ? { ...a, saldoAttuale: a.saldoAttuale + delta } : a,
                )
              : state.accounts,
          allAccounts:
            delta !== 0
              ? state.allAccounts.map((a) =>
                  a.id === updated.accountId ? { ...a, saldoAttuale: a.saldoAttuale + delta } : a,
                )
              : state.allAccounts,
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'aggiornamento della giocata rapida"
        set((s) => ({ ...s, quickBetError: message }))
      }
    },

    removeQuickBet: async (id) => {
      try {
        const bet = _get().quickBets.find((b) => b.id === id)
        await apiDeleteQuickBet(id)
        set((state) => ({
          quickBets: state.quickBets.filter((b) => b.id !== id),
          accounts: bet
            ? state.accounts.map((a) =>
                a.id === bet.accountId ? { ...a, saldoAttuale: a.saldoAttuale - bet.movimento } : a,
              )
            : state.accounts,
          allAccounts: bet
            ? state.allAccounts.map((a) =>
                a.id === bet.accountId ? { ...a, saldoAttuale: a.saldoAttuale - bet.movimento } : a,
              )
            : state.allAccounts,
        }))
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Errore nell'eliminazione della giocata rapida"
        set((s) => ({ ...s, quickBetError: message }))
      }
    },

    addAccountMovement: async (movement) => {
      set((state) => ({
        ...state,
        isSavingAccountMovement: true,
        accountMovementsError: undefined,
      }))
      const state = _get()
      const account = state.accounts.find((a) => a.id === movement.accountId)
      if (!account) {
        set((s) => ({
          ...s,
          isSavingAccountMovement: false,
          accountMovementsError: 'Conto non valido',
        }))
        return
      }

      const importo = movement.valore
      if (!Number.isFinite(importo) || importo === 0) {
        set((s) => ({
          ...s,
          isSavingAccountMovement: false,
          accountMovementsError: "L'importo deve essere diverso da zero",
        }))
        return
      }

      if (movement.tipo === 'deposito') {
        if (!movement.walletId) {
          set((s) => ({
            ...s,
            isSavingAccountMovement: false,
            accountMovementsError: 'Seleziona un wallet per il deposito',
          }))
          return
        }
        const wallet = state.wallets.find((w) => w.id === movement.walletId)
        if (!wallet || wallet.saldoAttuale < importo) {
          set((s) => ({
            ...s,
            isSavingAccountMovement: false,
            accountMovementsError: 'Saldo wallet insufficiente per il deposito',
          }))
          return
        }
      }

      if (movement.tipo === 'prelievo') {
        if (!movement.walletId) {
          set((s) => ({
            ...s,
            isSavingAccountMovement: false,
            accountMovementsError: 'Seleziona un wallet per il prelievo',
          }))
          return
        }
        if (account.saldoAttuale < importo) {
          set((s) => ({
            ...s,
            isSavingAccountMovement: false,
            accountMovementsError: 'Saldo conto insufficiente per il prelievo',
          }))
          return
        }
      }

      try {
        const created = await apiCreateAccountMovement(movement)
        set((prev) => {
          const applyAccountDelta = (a: Account) => {
            if (a.id !== created.accountId) return a
            let delta = 0
            if (created.tipo === 'deposito') delta = importo
            if (created.tipo === 'prelievo') delta = -importo
            if (created.tipo === 'riconciliazione') delta = importo
            return { ...a, saldoAttuale: a.saldoAttuale + delta }
          }
          const accounts = prev.accounts.map(applyAccountDelta)
          const allAccounts = prev.allAccounts.map(applyAccountDelta)

          const wallets = prev.wallets.map((w) => {
            if (!created.walletId || w.id !== created.walletId) return w
            let delta = 0
            if (created.tipo === 'deposito') delta = -importo
            if (created.tipo === 'prelievo') delta = importo
            return { ...w, saldoAttuale: w.saldoAttuale + delta }
          })

          return {
            ...prev,
            isSavingAccountMovement: false,
            accountMovementsError: undefined,
            accountMovements: [...prev.accountMovements, created],
            accounts,
            allAccounts,
            wallets,
          }
        })
      } catch (error: unknown) {
        const code = getErrorCode(error) || getResponseDataCode(error)
        let message = getErrorMessage(error) || 'Errore nel salvataggio del movimento conto'
        if (code === 'INSUFFICIENT_WALLET_FUNDS') {
          message = 'Saldo wallet insufficiente per il deposito'
        }
        if (code === 'INSUFFICIENT_ACCOUNT_FUNDS') {
          message = "Saldo conto insufficiente per l'operazione richiesta"
        }
        set((s) => ({
          ...s,
          isSavingAccountMovement: false,
          accountMovementsError: message,
        }))
      }
    },

    addWalletMovement: async (movement) => {
      set((state) => ({ ...state, isSavingWalletMovement: true, walletMovementsError: undefined }))
      const state = _get()
      const importo = movement.valore
      if (!Number.isFinite(importo) || importo <= 0) {
        set((s) => ({
          ...s,
          isSavingWalletMovement: false,
          walletMovementsError: "L'importo deve essere maggiore di zero",
        }))
        return
      }

      if ((movement.tipo === 'ricarica' || movement.tipo === 'spesa') && !movement.walletId) {
        set((s) => ({
          ...s,
          isSavingWalletMovement: false,
          walletMovementsError: 'Seleziona un wallet valido',
        }))
        return
      }

      if (movement.tipo === 'spesa' && movement.walletId) {
        const wallet = state.wallets.find((w) => w.id === movement.walletId)
        if (!wallet || wallet.saldoAttuale < importo) {
          set((s) => ({
            ...s,
            isSavingWalletMovement: false,
            walletMovementsError: 'Saldo wallet insufficiente per la spesa',
          }))
          return
        }
      }

      if (movement.tipo === 'trasferimento') {
        if (!movement.fromWalletId || !movement.toWalletId) {
          set((s) => ({
            ...s,
            isSavingWalletMovement: false,
            walletMovementsError: 'Seleziona wallet origine e destinazione per il trasferimento',
          }))
          return
        }
        if (movement.fromWalletId === movement.toWalletId) {
          set((s) => ({
            ...s,
            isSavingWalletMovement: false,
            walletMovementsError: 'I wallet di origine e destinazione devono essere diversi',
          }))
          return
        }
        const fromWallet = state.wallets.find((w) => w.id === movement.fromWalletId)
        if (!fromWallet || fromWallet.saldoAttuale < importo) {
          set((s) => ({
            ...s,
            isSavingWalletMovement: false,
            walletMovementsError: 'Saldo wallet insufficiente per il trasferimento',
          }))
          return
        }
      }

      try {
        const created = await apiCreateWalletMovement(movement)
        set((prev) => {
          const wallets = [...prev.wallets]

          const applyDelta = (walletId: string | undefined | null, delta: number) => {
            if (!walletId) return
            const idx = wallets.findIndex((w) => w.id === walletId)
            if (idx === -1) return
            wallets[idx] = { ...wallets[idx], saldoAttuale: wallets[idx].saldoAttuale + delta }
          }

          if (created.tipo === 'trasferimento') {
            applyDelta(created.fromWalletId, -created.valore)
            applyDelta(created.toWalletId, created.valore)
          } else if (created.tipo === 'ricarica') {
            applyDelta(created.walletId, created.valore)
          } else if (created.tipo === 'spesa') {
            applyDelta(created.walletId, -created.valore)
          }

          return {
            ...prev,
            isSavingWalletMovement: false,
            walletMovementsError: undefined,
            walletMovements: [...prev.walletMovements, { ...created }],
            wallets,
          }
        })
      } catch (error: unknown) {
        const code = getErrorCode(error) || getResponseDataCode(error)
        let message = getErrorMessage(error) || 'Errore nel salvataggio del movimento wallet'
        if (code === 'INSUFFICIENT_WALLET_FUNDS') {
          message = 'Saldo wallet insufficiente per il movimento richiesto'
        }
        set((s) => ({
          ...s,
          isSavingWalletMovement: false,
          walletMovementsError: message,
        }))
      }
    },

    fetchReminders: async (params) => {
      set(() => ({ isLoadingReminders: true, remindersError: undefined }))
      try {
        const reminders = await apiGetReminders({
          stato: params?.stato,
        })
        set(() => ({
          reminders,
          isLoadingReminders: false,
          remindersError: undefined,
        }))
      } catch (error: unknown) {
        set(() => ({
          isLoadingReminders: false,
          remindersError: getErrorMessage(error) || 'Errore nel caricamento dei promemoria',
        }))
      }
    },

    createReminder: async (payload) => {
      set(() => ({ remindersError: undefined }))
      try {
        const created = await apiCreateReminder(payload)
        set((state) => ({
          reminders: [...state.reminders, created],
        }))
      } catch (error: unknown) {
        set(() => ({
          remindersError: getErrorMessage(error) || 'Errore nel salvataggio del promemoria',
        }))
      }
    },

    updateReminder: async (id, patch) => {
      set(() => ({ remindersError: undefined }))
      try {
        const updated = await apiUpdateReminder(id, {
          accountId: patch.accountId,
          descrizione: patch.descrizione ?? '',
          dataScadenza: patch.dataScadenza ?? '',
          periodoNotifica: patch.periodoNotifica ?? 'scadenza',
          stato: patch.stato,
        })
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
        }))
      } catch (error: unknown) {
        set(() => ({
          remindersError: getErrorMessage(error) || 'Errore nell’aggiornamento del promemoria',
        }))
      }
    },

    deleteReminder: async (id) => {
      set(() => ({ remindersError: undefined }))
      try {
        await apiDeleteReminder(id)
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        }))
      } catch (error: unknown) {
        set(() => ({
          remindersError: getErrorMessage(error) || 'Errore nella cancellazione del promemoria',
        }))
      }
    },

    completeReminder: async (id) => {
      set(() => ({ remindersError: undefined }))
      try {
        const updated = await apiCompleteReminder(id)
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
        }))
      } catch (error: unknown) {
        set(() => ({
          remindersError: getErrorMessage(error) || 'Errore nel completamento del promemoria',
        }))
      }
    },

    fetchTelegramStatus: async () => {
      set(() => ({
        isLoadingTelegramStatus: true,
        telegramStatusError: undefined,
      }))
      try {
        const status = await apiGetTelegramStatus()
        set(() => ({
          telegramStatus: status,
          isLoadingTelegramStatus: false,
          telegramStatusError: undefined,
        }))
      } catch (error: unknown) {
        set(() => ({
          isLoadingTelegramStatus: false,
          telegramStatusError:
            getErrorMessage(error) || 'Errore nel caricamento dello stato Telegram',
        }))
      }
    },

    generateTelegramCode: async () => {
      set(() => ({
        isGeneratingTelegramCode: true,
        telegramStatusError: undefined,
        generatedTelegramCode: undefined,
      }))
      try {
        const { code } = await apiGenerateTelegramCode()
        set(() => ({
          isGeneratingTelegramCode: false,
          generatedTelegramCode: code,
        }))
        return code
      } catch (error: unknown) {
        set(() => ({
          isGeneratingTelegramCode: false,
          telegramStatusError:
            getErrorMessage(error) || 'Errore nella generazione del codice Telegram',
        }))
        return undefined
      }
    },

    unlinkTelegram: async () => {
      set(() => ({ telegramStatusError: undefined }))
      try {
        await apiUnlinkTelegram()
        set(() => ({
          telegramStatus: { linked: false },
          generatedTelegramCode: undefined,
        }))
      } catch (error: unknown) {
        set(() => ({
          telegramStatusError: getErrorMessage(error) || 'Errore nello scollegamento di Telegram',
        }))
      }
    },
  }
})
