'use client'

import * as React from 'react'

import { SearchableSelect } from '@/components/ui/searchable-select'
import { Label } from '@/components/ui/label'
import type { Account, Book, Holder } from '@/types/profit-tracker'

/**
 * Pieces shared by the casino calculators (Baccarat, Roulette): number
 * formatting, the default date of the save modal and the
 * collaborator + account selector of one leg.
 */

export function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

export function formatSigned(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

/** Local date and time, now, in the `datetime-local` format. */
export function defaultEventoData(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

export interface LegAccountsProps {
  idPrefix: string
  title: string
  accountLabel: string
  holders: Holder[]
  books: Book[]
  holderId: string
  accounts: Account[]
  accountId: string
  onChangeHolder: (holderId: string) => void
  onChangeAccount: (accountId: string) => void
  portalContainer: HTMLDivElement | null
}

export function LegAccounts({
  idPrefix,
  title,
  accountLabel,
  holders,
  books,
  holderId,
  accounts,
  accountId,
  onChangeHolder,
  onChangeAccount,
  portalContainer,
}: LegAccountsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
      <Label className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-primary">
        {title}
      </Label>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
        <SearchableSelect
          id={`${idPrefix}-holder`}
          placeholder="Seleziona collaboratore"
          searchPlaceholder="Cerca collaboratore..."
          options={holders
            .filter((h) => h.stato === 'abilitato')
            .map((h) => ({ value: h.id, label: h.nome }))}
          value={holderId}
          onChange={onChangeHolder}
          allowEmpty={false}
          size="sm"
          className="w-full"
          portalContainer={portalContainer}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{accountLabel}</Label>
        <SearchableSelect
          id={`${idPrefix}-account`}
          placeholder={holderId ? 'Seleziona conto' : 'Seleziona prima un collaboratore'}
          searchPlaceholder="Cerca conto..."
          options={accounts.map((acc) => {
            const holderName = getHolderName(holders, acc.holderId)
            const book = books.find((b) => b.id === acc.bookId)
            return { value: acc.id, label: `${holderName} • ${book?.nome ?? acc.nome}` }
          })}
          value={accountId}
          onChange={onChangeAccount}
          disabled={!holderId || accounts.length === 0}
          allowEmpty={false}
          size="sm"
          className="w-full"
          portalContainer={portalContainer}
        />
        {holderId && accounts.length === 0 && (
          <p className="rounded-md bg-ds-warning-soft px-3 py-2 text-xs text-ds-warning">
            Nessun conto disponibile per questo collaboratore. Aggiungine uno in Profit Tracker →
            Conti.
          </p>
        )}
      </div>
    </div>
  )
}
