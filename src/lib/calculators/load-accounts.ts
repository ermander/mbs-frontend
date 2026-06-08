import type { Account } from '@/types/profit-tracker'
import { getAccounts } from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

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
