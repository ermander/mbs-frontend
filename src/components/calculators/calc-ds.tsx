'use client'

import * as React from 'react'
import { ChevronDown, Info, Lock, LockOpen, Minus, Plus, RefreshCw, X } from 'lucide-react'

import { DsField, DsLabel } from '@/components/auth/ds-auth-primitives'
import { DsMoney } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { formatMoney, formatOdds } from '@/lib/landing-format'
import { formatBoostedOdds } from '@/lib/calculators/boost'
import { cn } from '@/lib/utils'

/**
 * Primitive del design «OddWise Calcolatori» (§14.268-14.269) per l'interno dei calcolatori rifatti:
 * campo numerico (TextField numeric del design), stepper, valore con didascalia, intestazione dei
 * Profitti e tabella dei profitti, sui token ds-*.
 */

const controlHeight = { sm: 'h-8', md: 'h-10', lg: 'h-12 text-[17px]' } as const

/**
 * TextField numerico: cifre a destra, peso 600, tabulari, suffisso (€, %, @) separato da un
 * filetto. Testo con inputMode decimal: la virgola si scrive come sul sito.
 */
export function CalcNumberField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  suffix,
  size = 'md',
  placeholder = '0',
  hint,
  className,
}: {
  id: string
  label?: string
  ariaLabel?: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  size?: keyof typeof controlHeight
  placeholder?: string
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <DsField className={className}>
      {label && <DsLabel htmlFor={id}>{label}</DsLabel>}
      <div
        className={cn(
          'flex items-stretch rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised text-ds-ink transition-[border-color,box-shadow] duration-150 focus-within:border-ds-brand focus-within:shadow-ds-focus',
          controlHeight[size],
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-right font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-ds-ink-faint"
        />
        {suffix && (
          <span
            aria-hidden
            className="flex items-center whitespace-nowrap border-l border-ds-line px-3 text-sm font-medium text-ds-ink-muted"
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm leading-5 text-ds-ink-muted">
          {hint}
        </p>
      )}
    </DsField>
  )
}

const stepperFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

/**
 * Stepper del design: − e + di un passo, il valore si può anche scrivere (al decimo, dentro
 * min e max) e vale all'uscita dal campo o con Invio.
 */
export function CalcStepper({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  size = 'md',
  inline,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  size?: 'sm' | 'md'
  /** Etichetta a sinistra in body-sm, come le cifre a lato nelle righe d'esito. */
  inline?: boolean
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10))
  // Testo in modifica: null quando il campo mostra il valore.
  const [draft, setDraft] = React.useState<string | null>(null)
  const commit = () => {
    if (draft == null) return
    const n = Number(draft.replace(/\./g, '').replace(',', '.'))
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(clamp(n))
    setDraft(null)
  }
  const btn =
    'inline-flex items-center justify-center text-ds-ink transition-colors hover:bg-ds-surface-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <DsField className={inline ? 'w-full flex-row items-center justify-between gap-3' : undefined}>
      <DsLabel
        htmlFor={id}
        className={inline ? 'ds-body-sm font-normal text-ds-ink-muted' : undefined}
      >
        {label}
      </DsLabel>
      <div
        className={cn(
          'inline-flex items-stretch overflow-hidden rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised focus-within:border-ds-brand focus-within:shadow-ds-focus',
          size === 'sm' ? 'h-8' : 'h-10',
        )}
      >
        <button
          type="button"
          aria-label="Diminuisci"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className={cn(btn, size === 'sm' ? 'w-7' : 'w-9')}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? stepperFormat.format(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          className={cn(
            'min-w-0 flex-1 border-x border-ds-line bg-transparent text-center font-semibold tabular-nums text-ds-ink outline-none',
            size === 'sm' ? 'w-[52px] text-sm' : 'w-16',
          )}
        />
        {unit && (
          <span className="inline-flex items-center px-2 text-sm text-ds-ink-muted">{unit}</span>
        )}
        <button
          type="button"
          aria-label="Aumenta"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className={cn(btn, size === 'sm' ? 'w-7' : 'w-9')}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </DsField>
  )
}

/** Un valore calcolato: didascalia in ink-muted sopra, cifra tabulare sotto. */
export function CalcFigure({
  label,
  value,
  size = 'xl',
  align = 'right',
  live,
  onDark,
  className,
}: {
  label: string
  value: React.ReactNode
  size?: 'xl' | 'md'
  align?: 'left' | 'right'
  live?: boolean
  /** Su una riga scura (Rosso, Nero della roulette): didascalia chiara. */
  onDark?: boolean
  className?: string
}) {
  return (
    <div className={cn(align === 'right' ? 'text-right' : 'text-left', className)}>
      <div className={cn('ds-caption', onDark ? 'text-white/75' : 'text-ds-ink-muted')}>
        {label}
      </div>
      <div
        aria-live={live ? 'polite' : undefined}
        className={cn('whitespace-nowrap', size === 'xl' ? 'ds-num-xl' : 'ds-num')}
      >
        {value}
      </div>
    </div>
  )
}

/** Un importo senza segno (puntate, bancate, responsabilità), «—» quando manca. */
export function amount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : formatMoney(value, { sign: false })
}

/**
 * Sezione «Profitti»: etichetta a sinistra, esborso e guadagno minimo a destra, sotto la tabella o
 * il riquadro che spiega cosa manca.
 */
export function CalcProfits({
  outlayLabel = 'Esborso totale',
  outlay,
  gainLabel = 'Guadagno minimo',
  minGain,
  children,
}: {
  outlayLabel?: string
  outlay: number | null
  /** «Guadagno minimo», o il risultato che il calcolatore sa dare (la multipla). */
  gainLabel?: string
  minGain: number | null
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby="calc-profits-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ds-line pb-2">
        <h2 id="calc-profits-title" className="ds-label m-0 uppercase text-ds-ink-muted">
          Profitti
        </h2>
        <span className="ds-body-sm text-ds-ink-muted">
          {outlayLabel} <b className="ds-num text-ds-ink">{amount(outlay)}</b> · {gainLabel}{' '}
          <b className="ds-num text-ds-ink">
            {minGain == null || !Number.isFinite(minGain) ? '—' : formatMoney(minGain)}
          </b>
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Il riquadro «note» del design: cosa serve perché compaia il risultato. */
export function CalcNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-ds-md bg-ds-info-soft p-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-ds-info" aria-hidden />
      <div>
        <p className="ds-subheading mb-1 text-ds-info">{title}</p>
        <p className="ds-body m-0 text-ds-ink">{children}</p>
      </div>
    </div>
  )
}

export interface CalcColumn<Row> {
  key: string
  label: string
  num?: boolean
  render: (row: Row) => React.ReactNode
}

/**
 * La Table del design: intestazioni label maiuscole su surface-sunken, righe con filetto, colonne
 * numeriche a destra in cifre tabulari; scorre in orizzontale sul telefono.
 */
export function CalcTable<Row extends { id: string }>({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: CalcColumn<Row>[]
  rows: Row[]
}) {
  return (
    <div className="overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'ds-label whitespace-nowrap bg-ds-surface-sunken p-3 uppercase text-ds-ink-muted first:pl-4 last:pr-4',
                  c.num ? 'text-right' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'border-t border-ds-line p-3 align-middle first:pl-4 last:pr-4',
                    c.num && 'whitespace-nowrap text-right font-semibold tabular-nums',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Il corpo dei calcolatori del design: esiti a sinistra (560px che si allargano), la card degli
 * input a destra (380px); sotto i 940px circa la card va a capo sotto gli esiti.
 */
export function CalcLayout({
  outcomes,
  inputs,
}: {
  outcomes: React.ReactNode
  inputs: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-6">
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">{outcomes}</div>
      <div className="flex min-w-0 flex-[0_1_380px] flex-col gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised p-5 shadow-ds-sm">
        {inputs}
      </div>
    </div>
  )
}

/**
 * Una riga d'esito del design: titolo, quota, importo e, se c'è, una colonna a destra separata da
 * un filetto; azzurra per le punte, rosata per la banca. Sul telefono va su più righe. `children`
 * è una nota a tutta larghezza sotto.
 */
export function OutcomeRow({
  tone = 'info',
  title,
  odds,
  figure,
  aside,
  children,
}: {
  tone?: 'info' | 'loss'
  title: string
  odds: React.ReactNode
  figure: React.ReactNode
  aside?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'grid flex-1 grid-cols-[72px_minmax(0,1fr)] items-center gap-4 rounded-ds-md border border-ds-line px-5 py-4',
        aside
          ? 'sm:grid-cols-[72px_120px_minmax(110px,1fr)_auto]'
          : 'sm:grid-cols-[72px_120px_minmax(110px,1fr)]',
        tone === 'info' ? 'bg-ds-info-soft' : 'bg-ds-loss-soft',
      )}
    >
      <span className="ds-subheading">{title}</span>
      {odds}
      <div className="col-span-2 sm:col-span-1">{figure}</div>
      {aside && (
        <div className="col-span-2 flex items-center border-t border-ds-line pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

/** «Sbilancia …» del design: stepper da −30 a +30 % (o fra `min` e `max`) e il pulsante che lo azzera. */
export function CalcImbalance({
  label,
  value,
  onChange,
  leading,
  min = -30,
  max = 30,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Un campo prima dello stepper sulla stessa riga (la commissione in punta-banca). */
  leading?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'grid items-end gap-2',
        leading ? 'grid-cols-[104px_minmax(0,1fr)_40px]' : 'grid-cols-[minmax(0,1fr)_40px]',
      )}
    >
      {leading}
      <CalcStepper
        id="sbilanciamento"
        label={label}
        value={value}
        min={min}
        max={max}
        unit="%"
        onChange={onChange}
      />
      <button
        type="button"
        aria-label="Azzera lo sbilanciamento"
        disabled={value === 0}
        onClick={() => onChange(0)}
        className={cn(
          dsButtonClass('ghost', 'md'),
          'w-10 px-0 disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

export interface PartialEntry {
  amount: string
  newOdds: string
}

/**
 * Coperture parziali (fino a 6): l'importo già giocato alla quota di prima e il resto calcolato
 * alla nuova quota, una scheda per passo, con le cifre che il calcolatore ricava per ognuno.
 */
export function CalcPartials<Result>({
  idPrefix,
  title,
  amountLabel,
  oddsLabel,
  addLabel,
  entries,
  results,
  figures,
  total,
  onAdd,
  onRemove,
  onChange,
}: {
  idPrefix: string
  title: string
  amountLabel: string
  oddsLabel: string
  addLabel: string
  entries: PartialEntry[]
  results: (Result | null)[]
  figures: (result: Result | null) => { label: string; value: string }[]
  /** Il totale da mostrare accanto ad «Aggiungi», quando tutti i passi sono validi. */
  total?: React.ReactNode
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, field: keyof PartialEntry, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, i) => {
        const shown = figures(results[i] ?? null)
        return (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised px-5 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="ds-label uppercase text-ds-ink-muted">
                {title}
                {entries.length > 1 ? ` ${i + 1}` : ''}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Rimuovi: ${title.toLowerCase()} ${i + 1}`}
                className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0')}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div
              className={cn(
                'grid grid-cols-2 gap-3 sm:items-end sm:gap-4',
                shown.length > 1
                  ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]'
                  : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
              )}
            >
              <CalcNumberField
                id={`${idPrefix}-amount-${i}`}
                label={amountLabel}
                size="sm"
                suffix="€"
                value={entry.amount}
                onChange={(v) => onChange(i, 'amount', v)}
              />
              <CalcNumberField
                id={`${idPrefix}-odds-${i}`}
                label={oddsLabel}
                size="sm"
                value={entry.newOdds}
                onChange={(v) => onChange(i, 'newOdds', v)}
              />
              {shown.map((f, k) => (
                <CalcFigure
                  key={f.label}
                  label={f.label}
                  size="md"
                  live={k === 0}
                  value={f.value}
                  className="sm:min-w-24"
                />
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {entries.length < 6 ? (
          <button type="button" onClick={onAdd} className={dsButtonClass('ghost', 'sm')}>
            <Plus className="h-4 w-4" aria-hidden />
            {addLabel}
          </button>
        ) : (
          <span />
        )}
        {total != null && <span className="ds-body-sm text-ds-ink-muted">{total}</span>}
      </div>
    </div>
  )
}

/** Una riga della tabella dei profitti: gli importi per gamba nell'ordine delle colonne. */
export interface OutcomeProfitRow {
  id: string
  esito: string
  legs: (number | null)[]
  rimborso: number
  totale: number | null
}

const yieldFormat = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function SignedMoney({ value, md }: { value: number | null; md?: boolean }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-ds-ink-muted">—</span>
  return <DsMoney value={value} size={md ? 'md' : 'sm'} />
}

/** Resa: il totale sulla puntata reale, col segno e il colore del risultato. */
function Yield({ total, stake }: { total: number | null; stake: number }) {
  if (total == null || !Number.isFinite(total) || stake <= 0) {
    return <span className="font-normal text-ds-ink-muted">—</span>
  }
  const pct = (total / stake) * 100
  if (Math.abs(pct) < 0.005) return <span className="text-ds-ink-muted">0,00&nbsp;%</span>
  return (
    <span className={pct < 0 ? 'text-ds-loss' : 'text-ds-profit'}>
      {pct < 0 ? '−' : '+'}
      {yieldFormat.format(Math.abs(pct))}&nbsp;%
    </span>
  )
}

/**
 * La tabella dei profitti del design: Esito, una colonna per gamba, Rimborso, Totale e Resa (il
 * totale sulla puntata reale `stake`); senza righe, la nota con `emptyText`.
 */
export function CalcOutcomeTable({
  legLabels,
  rows,
  stake,
  emptyText,
}: {
  legLabels: string[]
  rows: OutcomeProfitRow[]
  stake: number
  emptyText: string
}) {
  if (rows.length === 0) return <CalcNote title="Servono puntata e quote">{emptyText}</CalcNote>
  const columns: CalcColumn<OutcomeProfitRow>[] = [
    {
      key: 'esito',
      label: 'Esito',
      render: (r) => <span className="font-semibold text-ds-ink">{r.esito}</span>,
    },
    ...legLabels.map((label, k) => ({
      key: `leg-${k}`,
      label,
      num: true,
      render: (r: OutcomeProfitRow) => <SignedMoney value={r.legs[k] ?? null} />,
    })),
    {
      key: 'rimborso',
      label: 'Rimborso',
      num: true,
      render: (r) =>
        r.rimborso ? (
          <DsMoney value={r.rimborso} size="sm" neutral />
        ) : (
          <span className="font-normal text-ds-ink-muted">—</span>
        ),
    },
    {
      key: 'totale',
      label: 'Totale',
      num: true,
      render: (r) => <SignedMoney value={r.totale} md />,
    },
    {
      key: 'resa',
      label: 'Resa',
      num: true,
      render: (r) => <Yield total={r.totale} stake={stake} />,
    },
  ]
  return <CalcTable caption="Profitto per ciascun esito" columns={columns} rows={rows} />
}

/**
 * Scelta fra poche voci con i Button del design: la scelta in primary, le altre in secondary
 * (Player/Banco, il tavolo, la fiche minima). `columns` le mette in griglia.
 */
export function CalcChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  columns,
}: {
  label: string
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (value: T) => void
  columns?: number
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold leading-5 text-ds-ink">{label}</span>
      <div
        className={columns ? 'grid gap-1.5' : 'flex flex-wrap gap-2'}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              dsButtonClass(o.value === value ? 'primary' : 'secondary', 'sm'),
              columns && 'px-1',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Switch del design: binario da 44px, in brand quando è acceso, con la riga di aiuto sotto. */
export function CalcSwitch({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  hint?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group inline-flex items-center gap-3 self-start text-left text-ds-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden
          className={cn(
            'relative h-6 w-11 flex-none rounded-full transition-colors group-focus-visible:shadow-ds-focus',
            checked ? 'bg-ds-brand' : 'bg-ds-line-strong',
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ds-surface-raised shadow-ds-sm transition-transform',
              checked && 'translate-x-5',
            )}
          />
        </span>
        <span className="text-sm font-semibold leading-5">{label}</span>
      </button>
      {hint && <p className="ds-body-sm m-0 text-ds-ink-muted">{hint}</p>}
    </div>
  )
}

/**
 * «Maggiorazione» del design (§14.274): lo Switch («Magg.» quando è acceso, per lasciare posto) e
 * il campo della percentuale a destra; sotto, la quota effettiva su cui calcola il calcolatore. Il
 * clic non risale (la scheda dutch che lo contiene è un radio).
 */
export function CalcBoost({
  id,
  boost,
  onChange,
  effectiveOdds,
  className,
}: {
  id: string
  boost: { on: boolean; percent: string }
  onChange: (boost: { on: boolean; percent: string }) => void
  /** La quota dopo la maggiorazione; null quando non c'è o non cambia. */
  effectiveOdds: number | null
  className?: string
}) {
  return (
    <div
      className={cn('flex w-full flex-col gap-1', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={boost.on}
          aria-label="Maggiorazione della quota"
          onClick={() => onChange({ ...boost, on: !boost.on })}
          className="group inline-flex items-center gap-2.5 text-left text-ds-ink"
        >
          <span
            aria-hidden
            className={cn(
              'relative h-6 w-11 flex-none rounded-full transition-colors group-focus-visible:shadow-ds-focus',
              boost.on ? 'bg-ds-brand' : 'bg-ds-line-strong',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ds-surface-raised shadow-ds-sm transition-transform',
                boost.on && 'translate-x-5',
              )}
            />
          </span>
          <span className="text-sm font-semibold leading-5">
            {boost.on ? 'Magg.' : 'Maggiorazione'}
          </span>
        </button>
        {boost.on && (
          <CalcNumberField
            id={id}
            ariaLabel="Maggiorazione in percentuale"
            size="sm"
            suffix="%"
            value={boost.percent}
            onChange={(percent) => onChange({ ...boost, percent })}
            className="w-[84px] flex-none"
          />
        )}
      </div>
      {boost.on && effectiveOdds != null && (
        <span className="ds-caption text-left text-ds-ink-muted">
          Quota effettiva{' '}
          <b className="font-semibold text-ds-ink">{formatBoostedOdds(effectiveOdds)}</b>
        </span>
      )}
    </div>
  )
}

const casinoTone = {
  info: 'bg-ds-info-soft text-ds-ink',
  loss: 'bg-ds-loss-soft text-ds-ink',
  profit: 'bg-ds-profit-soft text-ds-ink',
  red: 'bg-ds-loss text-white',
  black: 'bg-[#2b302d] text-white',
} as const

/**
 * Una riga d'esito dei calcolatori del casinò: ruolo (Puntata, Copertura) e nome, la quota fissa
 * del tavolo in un riquadro e l'importo. Rosso e Nero della roulette sono righe piene.
 */
export function CasinoRow({
  tone,
  caption,
  name,
  odds,
  figure,
}: {
  tone: keyof typeof casinoTone
  caption: string
  name: string
  odds: number
  figure: React.ReactNode
}) {
  const dark = tone === 'red' || tone === 'black'
  return (
    <div
      className={cn(
        'grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-ds-md border border-ds-line px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(110px,1fr)]',
        casinoTone[tone],
      )}
    >
      <div>
        <div className={cn('ds-caption', dark ? 'text-white/75' : 'text-ds-ink-muted')}>
          {caption}
        </div>
        <div className="ds-subheading">{name}</div>
      </div>
      <span className="ds-num rounded-ds-sm border border-ds-line bg-ds-surface-raised px-2.5 py-1.5 text-ds-ink">
        {formatOdds(odds)}
      </span>
      <div className="col-span-2 sm:col-span-1">{figure}</div>
    </div>
  )
}

/**
 * La copertura con il lucchetto: aperto mostra l'importo calcolato, chiuso diventa un campo dove
 * scrivere quanto è stato giocato davvero, con il calcolato sotto.
 */
export function CalcLockableFigure({
  id,
  label,
  amount: value,
  rounded,
  locked,
  editValue,
  onToggle,
  onEdit,
  onDark,
}: {
  id: string
  label: string
  amount: number | null
  /** Il valore calcolato (arrotondato alla fiche), mostrato sotto quando è bloccata. */
  rounded: number | null
  locked: boolean
  editValue: string
  onToggle: () => void
  onEdit: (value: string) => void
  onDark?: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {locked ? (
        <div className="flex flex-col items-end gap-1">
          <CalcNumberField
            id={id}
            ariaLabel={`${label}: importo giocato`}
            size="sm"
            suffix="€"
            value={editValue}
            onChange={onEdit}
            className="w-32"
          />
          <span className={cn('ds-caption', onDark ? 'text-white/75' : 'text-ds-ink-muted')}>
            calcolata {amount(rounded)}
          </span>
        </div>
      ) : (
        <CalcFigure label={label} live onDark={onDark} value={amount(value)} />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={locked}
        aria-label={locked ? 'Sblocca la copertura' : 'Blocca e modifica la copertura'}
        title={locked ? 'Sblocca: torna al valore calcolato' : "Blocca: scrivi l'importo giocato"}
        className={cn(
          'inline-flex h-8 w-8 flex-none items-center justify-center rounded-ds-sm border transition-colors',
          locked
            ? 'border-ds-brand bg-ds-brand-soft text-ds-brand'
            : 'border-ds-line-strong bg-ds-surface-raised text-ds-ink-muted hover:text-ds-ink',
        )}
      >
        {locked ? (
          <Lock className="h-4 w-4" aria-hidden />
        ) : (
          <LockOpen className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  )
}

const textControl =
  'h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-ds-ink outline-none placeholder:text-ds-ink-faint'
const controlBox =
  'flex items-stretch rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised transition-[border-color,box-shadow] duration-150 focus-within:border-ds-brand focus-within:shadow-ds-focus'

/** TextField del design per testo e date (nome evento, competizione, data e ora). */
export function CalcTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  size = 'sm',
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'date' | 'datetime-local'
  size?: keyof typeof controlHeight
  className?: string
}) {
  return (
    <DsField className={className}>
      <DsLabel htmlFor={id}>{label}</DsLabel>
      <div className={cn(controlBox, controlHeight[size])}>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(textControl, 'text-sm')}
        />
      </div>
    </DsField>
  )
}

/** Select nativo del design, con lo stesso contorno del TextField. */
export function CalcSelect({
  id,
  label,
  value,
  onChange,
  options,
  size = 'sm',
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  size?: keyof typeof controlHeight
  className?: string
}) {
  return (
    <DsField className={className}>
      <DsLabel htmlFor={id}>{label}</DsLabel>
      <div className={cn(controlBox, controlHeight[size], 'relative')}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(textControl, 'appearance-none pr-8 text-sm')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-ink-muted"
        />
      </div>
    </DsField>
  )
}
