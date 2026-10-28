'use client'

import { useCallback, useEffect, useMemo } from 'react'

import { OmBookLogo, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account, Book } from '@/types/profit-tracker'

export interface AccountInfo {
  account?: Account
  book?: Book
  /** Il titolare, o il nome del conto se manca. */
  holderName: string
  /** «Sisal · Marco Rinaldi». */
  label: string
}

/**
 * Conto, book e titolare di un accountId, e le voci dei menu dei conti (logo del book e
 * titolare), ordinate per etichetta. Carica conti, book e titolari se mancano.
 */
export function useAccountInfo() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchAllBooks()
    void fetchAllHolders()
  }, [fetchAllAccounts, fetchAllBooks, fetchAllHolders])

  const accountInfo = useCallback(
    (accountId: string): AccountInfo => {
      const account = allAccounts.find((a) => a.id === accountId)
      const book = account ? books.find((b) => b.id === account.bookId) : undefined
      const holder = account ? holders.find((h) => h.id === account.holderId) : undefined
      const label = book && holder ? `${book.nome} · ${holder.nome}` : (account?.nome ?? '—')
      return { account, book, holderName: holder?.nome ?? account?.nome ?? '', label }
    },
    [allAccounts, books, holders],
  )

  const accountOptions = useMemo<OmOption[]>(
    () =>
      allAccounts
        .map((a) => {
          const info = accountInfo(a.id)
          return {
            value: a.id,
            label: info.label,
            render: <AccountChip info={info} />,
          }
        })
        .sort((x, y) => x.label.localeCompare(y.label, 'it')),
    [allAccounts, accountInfo],
  )

  return { accountInfo, accountOptions }
}

/** Logo del book e titolare in una riga, come nei menu del design. */
export function AccountChip({ info }: { info: AccountInfo }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {info.book && <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />}
      <span className="truncate">{info.holderName}</span>
    </span>
  )
}
