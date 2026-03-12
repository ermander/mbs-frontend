import { create } from 'zustand'

import type {
  Account,
  AccountMovement,
  BetLeg,
  Book,
  Holder,
  OngoingBet,
  QuickBet,
  Wallet,
  WalletMovement,
} from '@/types/profit-tracker'

interface ProfitTrackerState {
  holders: Holder[]
  books: Book[]
  accounts: Account[]
  wallets: Wallet[]
  ongoingBets: OngoingBet[]
  betLegs: BetLeg[]
  quickBets: QuickBet[]
  accountMovements: AccountMovement[]
  walletMovements: WalletMovement[]

  addHolder: (holder: Omit<Holder, 'id'>) => void
  updateHolder: (id: string, patch: Partial<Holder>) => void

  addBook: (book: Omit<Book, 'id'>) => void
  updateBook: (id: string, patch: Partial<Book>) => void

  addAccount: (account: Omit<Account, 'id' | 'saldoAttuale' | 'createdAt'>) => void
  updateAccount: (id: string, patch: Partial<Account>) => void

  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => void
  updateWallet: (id: string, patch: Partial<Wallet>) => void

  addOngoingBet: (bet: Omit<OngoingBet, 'id'>) => void
  updateOngoingBet: (id: string, patch: Partial<OngoingBet>) => void
  removeOngoingBet: (id: string) => void

  addQuickBet: (bet: Omit<QuickBet, 'id'>) => void
  updateQuickBet: (id: string, patch: Partial<QuickBet>) => void
  removeQuickBet: (id: string) => void

  addAccountMovement: (movement: Omit<AccountMovement, 'id'>) => void
  addWalletMovement: (movement: Omit<WalletMovement, 'id'>) => void
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

// Use a fixed timestamp to avoid SSR/CSR hydration mismatches
const STATIC_NOW_ISO = '2024-01-01T00:00:00.000Z'
const nowIso = () => STATIC_NOW_ISO

export const useProfitTrackerStore = create<ProfitTrackerState>((set, _get) => {
  const initialHolders: Holder[] = [
    { id: 'holder-1', nome: 'Emanuele', stato: 'abilitato' },
    { id: 'holder-2', nome: 'Maria', stato: 'abilitato' },
  ]

  const initialBooks: Book[] = [
    { id: 'book-1', nome: 'Bet365', isExchange: false },
    { id: 'book-2', nome: 'Betfair Exchange', isExchange: true },
  ]

  const initialAccounts: Account[] = [
    {
      id: 'account-1',
      holderId: 'holder-1',
      bookId: 'book-1',
      nome: 'Bet365 (Emanuele)',
      saldoAttuale: 250,
      stato: 'abilitato',
      createdAt: nowIso(),
    },
    {
      id: 'account-2',
      holderId: 'holder-1',
      bookId: 'book-2',
      nome: 'Betfair (Emanuele)',
      saldoAttuale: 520,
      stato: 'abilitato',
      createdAt: nowIso(),
    },
  ]

  const initialWallets: Wallet[] = [
    {
      id: 'wallet-1',
      holderId: 'holder-1',
      nome: 'Revolut',
      saldoAttuale: 1200,
      stato: 'abilitato',
      createdAt: nowIso(),
    },
    {
      id: 'wallet-2',
      holderId: 'holder-1',
      nome: 'PayPal',
      saldoAttuale: 300,
      stato: 'abilitato',
      createdAt: nowIso(),
    },
  ]

  const initialOngoingBets: OngoingBet[] = [
    {
      id: 'bet-1',
      eventoData: nowIso(),
      sport: 'calcio',
      eventoNome: 'Milan vs Inter',
      modalitaSaldo: 'reale',
      accountId: 'account-1',
      statoEvento: 'in_corso',
      tag: 'Welcome bonus',
    },
  ]

  const initialBetLegs: BetLeg[] = [
    {
      id: 'leg-1',
      betId: 'bet-1',
      eventoData: nowIso(),
      sport: 'calcio',
      eventoNome: 'Milan vs Inter',
      competizione: 'Serie A',
      mercato: '1X2',
      metodo: 'punta',
      tipoBonus: 'bonus',
      accountId: 'account-1',
      stake: 50,
      quota: 2.1,
      rischio: 50,
      bonusValore: 50,
      movimento: 55,
      statoEvento: 'in_corso',
    },
  ]

  const initialQuickBets: QuickBet[] = [
    {
      id: 'quick-1',
      dataRegistrazione: nowIso(),
      accountId: 'account-1',
      quickMethod: 'slot_machine',
      movimento: -20,
      tag: 'Slot serata',
      nota: 'Sessione breve su Starburst',
    },
  ]

  const initialAccountMovements: AccountMovement[] = []
  const initialWalletMovements: WalletMovement[] = []

  return {
    holders: initialHolders,
    books: initialBooks,
    accounts: initialAccounts,
    wallets: initialWallets,
    ongoingBets: initialOngoingBets,
    betLegs: initialBetLegs,
    quickBets: initialQuickBets,
    accountMovements: initialAccountMovements,
    walletMovements: initialWalletMovements,

    addHolder: (holder) =>
      set((state) => ({
        holders: [...state.holders, { ...holder, id: generateId('holder') }],
      })),
    updateHolder: (id, patch) =>
      set((state) => ({
        holders: state.holders.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),

    addBook: (book) =>
      set((state) => ({
        books: [...state.books, { ...book, id: generateId('book') }],
      })),
    updateBook: (id, patch) =>
      set((state) => ({
        books: state.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),

    addAccount: (account) =>
      set((state) => ({
        accounts: [
          ...state.accounts,
          {
            ...account,
            id: generateId('account'),
            saldoAttuale: 0,
            createdAt: nowIso(),
          },
        ],
      })),
    updateAccount: (id, patch) =>
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),

    addWallet: (wallet) =>
      set((state) => ({
        wallets: [
          ...state.wallets,
          {
            ...wallet,
            id: generateId('wallet'),
            createdAt: nowIso(),
          },
        ],
      })),
    updateWallet: (id, patch) =>
      set((state) => ({
        wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),

    addOngoingBet: (bet) =>
      set((state) => ({
        ongoingBets: [...state.ongoingBets, { ...bet, id: generateId('bet') }],
      })),
    updateOngoingBet: (id, patch) =>
      set((state) => ({
        ongoingBets: state.ongoingBets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),
    removeOngoingBet: (id) =>
      set((state) => ({
        ongoingBets: state.ongoingBets.filter((b) => b.id !== id),
      })),

    addQuickBet: (bet) =>
      set((state) => ({
        quickBets: [...state.quickBets, { ...bet, id: generateId('quick') }],
      })),
    updateQuickBet: (id, patch) =>
      set((state) => ({
        quickBets: state.quickBets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),
    removeQuickBet: (id) =>
      set((state) => ({
        quickBets: state.quickBets.filter((b) => b.id !== id),
      })),

    addAccountMovement: (movement) =>
      set((state) => {
        const movementWithId: AccountMovement = { ...movement, id: generateId('acc-mov') }
        const account = state.accounts.find((a) => a.id === movement.accountId)
        if (!account) return state

        let delta = movement.valore
        if (movement.tipo === 'prelievo') delta = -movement.valore
        if (movement.tipo === 'riconciliazione') {
          delta = movement.valore - account.saldoAttuale
        }

        return {
          ...state,
          accountMovements: [...state.accountMovements, movementWithId],
          accounts: state.accounts.map((a) =>
            a.id === movement.accountId ? { ...a, saldoAttuale: a.saldoAttuale + delta } : a,
          ),
        }
      }),

    addWalletMovement: (movement) =>
      set((state) => {
        const movementWithId: WalletMovement = { ...movement, id: generateId('wal-mov') }
        const wallets = [...state.wallets]

        const applyDelta = (walletId: string | undefined, delta: number) => {
          if (!walletId) return
          const idx = wallets.findIndex((w) => w.id === walletId)
          if (idx === -1) return
          wallets[idx] = { ...wallets[idx], saldoAttuale: wallets[idx].saldoAttuale + delta }
        }

        if (movement.tipo === 'trasferimento') {
          applyDelta(movement.fromWalletId, -movement.valore)
          applyDelta(movement.toWalletId, movement.valore)
        } else if (movement.tipo === 'ricarica') {
          applyDelta(movement.walletId, movement.valore)
        } else if (movement.tipo === 'spesa') {
          applyDelta(movement.walletId, -movement.valore)
        }

        return {
          ...state,
          walletMovements: [...state.walletMovements, movementWithId],
          wallets,
        }
      }),
  }
})
