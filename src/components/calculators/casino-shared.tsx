'use client'

import * as React from 'react'

import { Lock, LockOpen } from 'lucide-react'

import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CHIP_OPTIONS } from '@/lib/calculators/engines/casino-common'
import { cn } from '@/lib/utils'
import type { Account, Book, Holder } from '@/types/profit-tracker'

/**
 * Pieces shared by the casino calculators (Baccarat, Roulette): number
 * formatting, the default date of the save modal, an amount field and the
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
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            Nessun conto disponibile per questo collaboratore. Aggiungine uno in Profit Tracker →
            Conti.
          </p>
        )}
      </div>
    </div>
  )
}

export interface AmountFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

export function AmountField({ id, label, value, onChange }: AmountFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          €
        </span>
      </div>
    </div>
  )
}

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  className?: string
}

/** Mutually exclusive buttons in a row, the style of the category selector. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div
        className="grid gap-1 rounded-lg border border-input bg-muted/30 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={opt.disabled}
            aria-pressed={value === opt.value}
            className={cn(
              'rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              value === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function formatChipLabel(chip: number): string {
  return chip < 1 ? `${chip.toFixed(2).replace('.', ',')} €` : `${chip} €`
}

const CHIP_SEGMENTS = CHIP_OPTIONS.map((c) => ({ value: String(c), label: formatChipLabel(c) }))

export interface ChipSelectorProps {
  value: number
  onChange: (chip: number) => void
}

/** The table's minimum chip: the covers are rounded to a multiple of it. */
export function ChipSelector({ value, onChange }: ChipSelectorProps) {
  return (
    <SegmentedControl
      label="Fiche minima"
      options={CHIP_SEGMENTS}
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
    />
  )
}

export interface LockableAmountProps {
  id: string
  /** The computed amount shown while unlocked. */
  amount: number | null
  locked: boolean
  /** The text of the field while locked. */
  editValue: string
  onToggle: () => void
  onEdit: (value: string) => void
}

/**
 * An amount with a lock: unlocked it shows the computed value, locked it
 * becomes a field where the user types what was really played.
 */
export function LockableAmount({
  id,
  amount,
  locked,
  editValue,
  onToggle,
  onEdit,
}: LockableAmountProps) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {locked ? (
        <span className="inline-flex items-center gap-1">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={editValue}
            onChange={(e) => onEdit(e.target.value)}
            aria-label="Importo della copertura giocato"
            className="h-7 w-28 px-2 py-0 text-right font-mono text-sm"
          />
          <span className="font-mono font-medium text-primary">€</span>
        </span>
      ) : (
        <span className="font-mono font-medium text-primary">{formatNum(amount)} €</span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={locked}
        aria-label={locked ? 'Sblocca la copertura' : 'Blocca e modifica la copertura'}
        title={locked ? 'Sblocca: torna al valore calcolato' : "Blocca: scrivi l'importo giocato"}
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
          locked
            ? 'border-primary bg-accent text-primary'
            : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}
