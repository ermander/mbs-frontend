import type { Account, AccountOpenStakes, Book } from '@/types/profit-tracker'
import { getAccounts, getAccountsOpenStakes } from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { resolveProfitTrackerBook, type BookmakerIdentity } from '@/lib/bookmakers'

/**
 * Which bookmaker kinds are eligible for an account selector.
 * - `all`: any book — used by the all-back calculators (Punta Punta, Tri Punta),
 *   where every leg is a back bet and an exchange can be used as a normal bookmaker.
 * - `non-exchange`: only regular bookmakers — the "punta" side of Punta Banca / Multipla.
 * - `exchange`: only exchanges — the "bancata"/lay side of Punta Banca / Multipla.
 */
export type AccountBookFilter = 'all' | 'non-exchange' | 'exchange'

/**
 * Loads the enabled accounts of a holder, filtered by the linked book's exchange flag.
 *
 * Reads the cached book list from the profit-tracker store; accounts whose book is no
 * longer present are dropped. This is the single source of truth shared by every
 * calculator save flow — do not duplicate this filter inside the components.
 */
export async function loadHolderAccounts(
  holderId: string,
  filter: AccountBookFilter = 'all',
): Promise<Account[]> {
  if (!holderId) return []
  const res = await getAccounts({ holderId, status: 'abilitato' })
  if (!res.items.length) return []
  const currentBooks = useProfitTrackerStore.getState().allBooks
  return res.items.filter((acc) => {
    const book = currentBooks.find((b) => b.id === acc.bookId)
    if (!book) return false
    if (filter === 'exchange') return book.isExchange
    if (filter === 'non-exchange') return !book.isExchange
    return true
  })
}

/** An account of a bookmaker with the balance really available for a new play (§14.242). */
export interface BookAccountAvailability {
  account: Account
  holderName: string
  /** `saldoAttuale` net of the open drafts (`bozzaStake`). */
  available: number
  /** Stakes on draft legs: saved, not yet taken from the balance. */
  bozzaStake: number
  /** Stakes on legs in progress: already taken from the balance, for information. */
  inCorsoStake: number
}

export interface BookAccountsAvailability {
  /** The Profit Tracker book behind the bookmaker, null when none matches. */
  book: Book | null
  /** Enabled, unblocked accounts of enabled collaborators on that book, poorest first. */
  accounts: BookAccountAvailability[]
  /** The open stakes could not be read (older backend): `available` is the plain balance. */
  bozzeUnknown: boolean
}

/**
 * The accounts of the Profit Tracker book behind a bookmaker, each with the
 * balance available for a new play: the current balance net of the drafts
 * not yet placed (a draft leg does not move the balance, a leg in progress
 * does). The collaborators and books are read from the store, loaded once
 * when missing. Accounts that are blocked, disabled or whose collaborator is
 * disabled are left out: nothing should be recommended on them.
 */
export async function loadBookAccountsAvailability(
  bookmaker: BookmakerIdentity,
): Promise<BookAccountsAvailability> {
  const state = useProfitTrackerStore.getState()
  if (state.allHolders.length === 0) await state.fetchAllHolders()
  if (state.allBooks.length === 0) await state.fetchAllBooks()
  const { allHolders, allBooks } = useProfitTrackerStore.getState()
  const book = resolveProfitTrackerBook(allBooks, bookmaker)
  if (!book) return { book: null, accounts: [], bozzeUnknown: false }

  const [res, openStakes] = await Promise.all([
    getAccounts({ bookId: book.id, status: 'abilitato', limit: 5000 }),
    getAccountsOpenStakes().then(
      (r) => ({ items: r.items, unknown: false }),
      () => ({ items: [] as AccountOpenStakes[], unknown: true }),
    ),
  ])
  const openByAccount = new Map(openStakes.items.map((item) => [item.accountId, item]))
  const holderById = new Map(allHolders.map((h) => [h.id, h]))
  const accounts: BookAccountAvailability[] = []
  for (const account of res.items) {
    if (account.bloccato || account.stato !== 'abilitato') continue
    const holder = holderById.get(account.holderId)
    if (!holder || holder.stato !== 'abilitato') continue
    const open = openByAccount.get(account.id)
    const bozzaStake = open?.bozzaStake ?? 0
    accounts.push({
      account,
      holderName: holder.nome,
      available: Math.round((account.saldoAttuale - bozzaStake) * 100) / 100,
      bozzaStake,
      inCorsoStake: open?.inCorsoStake ?? 0,
    })
  }
  accounts.sort((a, b) => a.available - b.available || a.holderName.localeCompare(b.holderName))
  return { book, accounts, bozzeUnknown: openStakes.unknown }
}
