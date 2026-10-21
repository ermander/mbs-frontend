'use client'

import * as React from 'react'

import { CalcChoice } from '@/components/calculators/calc-ds'
import { BET_CATEGORIES } from '@/lib/profit-tracker/categories'
import type { BetCategory } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

/**
 * Pezzi dei calcolatori a schermo intero dell'oddsmatcher (design «OddWise Oddsmatcher», §14.273):
 * il corpo a due colonne, la scheda di una gamba e la scelta della categoria.
 */

/** Il corpo del design: le schede delle gambe a sinistra, la card degli importi a destra (380px). */
export function MatcherCalcLayout({
  legs,
  inputs,
}: {
  legs: React.ReactNode
  inputs: React.ReactNode
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-4">{legs}</div>
      <div className="flex min-w-0 flex-col gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised p-5 shadow-ds-sm">
        {inputs}
      </div>
    </div>
  )
}

const cardTone = {
  info: 'bg-ds-info-soft',
  loss: 'bg-ds-loss-soft',
  plain: 'bg-ds-surface-raised',
} as const

/**
 * La scheda di una gamba: titolo, campo quota, logo, importo con la didascalia e, se c'è, una riga
 * in fondo separata da un filetto (la responsabilità della banca). Nel dutch è un radio: il clic
 * sposta la puntata su quella gamba; il campo quota non sposta la scelta.
 */
export function MatcherLegCard({
  tone,
  title,
  note,
  odds,
  logo,
  figureLabel,
  figure,
  footer,
  selectable,
  selected,
  onSelect,
}: {
  tone: keyof typeof cardTone
  title: string
  /** Una riga sotto il titolo (la quota netta di una gamba exchange). */
  note?: React.ReactNode
  odds: React.ReactNode
  logo: React.ReactNode
  figureLabel: string
  figure: string
  footer?: React.ReactNode
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <div
      role={selectable ? 'radio' : undefined}
      aria-checked={selectable ? selected : undefined}
      aria-label={selectable ? `${title}: puntata su questa gamba` : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col items-center gap-3 rounded-ds-md border p-5 text-center transition-[border-color,box-shadow] duration-150',
        cardTone[tone],
        selectable &&
          'cursor-pointer hover:shadow-ds-md focus-visible:shadow-ds-focus focus-visible:outline-none',
        selected ? 'border-ds-brand shadow-[inset_0_0_0_1px_var(--ds-brand)]' : 'border-ds-line',
      )}
    >
      <div>
        <span className="ds-subheading block">{title}</span>
        {note && <span className="ds-caption mt-0.5 block text-ds-ink-muted">{note}</span>}
      </div>
      {/* Il campo quota non sposta la scelta della gamba. */}
      <div className="w-[120px]" onClick={(e) => e.stopPropagation()}>
        {odds}
      </div>
      <span onClick={(e) => e.stopPropagation()}>{logo}</span>
      <div>
        <div className="ds-caption text-ds-ink-muted">{figureLabel}</div>
        <div aria-live="polite" className="ds-num-xl whitespace-nowrap">
          {figure}
        </div>
      </div>
      {footer && (
        <div className="ds-body-sm flex min-h-11 w-full items-center justify-between gap-2 border-t border-ds-line pt-3 text-left text-ds-ink-muted">
          {footer}
        </div>
      )}
    </div>
  )
}

/** La categoria della giocata con i Button del design: va nella giocata salvata come prima. */
export function MatcherCategoryChoice({
  value,
  onChange,
}: {
  value: BetCategory
  onChange: (value: BetCategory) => void
}) {
  return (
    <div className="border-t border-ds-line pt-4">
      <CalcChoice
        label="Categoria"
        columns={3}
        options={BET_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
