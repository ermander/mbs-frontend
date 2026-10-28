'use client'

import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { bookmakerLogoSrc, shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { formatOdds, formatRating } from '@/lib/landing-format'
import { cn } from '@/lib/utils'

/**
 * Primitive del design «OddWise Oddsmatcher» di Claude Design (§14.272) sui token ds-*: menu a
 * tendina con ricerca e spunte, logo del bookmaker, gamba (logo, esito, quota), icona dello sport,
 * rating, stato vuoto e paginazione. I campi numerici e di testo vengono da calc-ds.
 */

/* ---------- Menu a tendina ---------- */

export interface OmOption {
  value: string
  label: string
  /** Contenuto della riga al posto dell'etichetta (il logo del bookmaker). */
  render?: React.ReactNode
  /** Icona prima dell'etichetta (lo sport). */
  icon?: React.ReactNode
  /** Cifra a destra, in ink-muted (le combinazioni di una competizione). */
  count?: number
}

/**
 * Il menu del design: un pulsante con il valore scelto (e il numero delle voci quando sono più di
 * una) che apre un pannello con la ricerca, l'elenco con le spunte e «Azzera»/«Fatto». Con
 * `single` le voci sono radio: una scelta, «Azzera» torna a «tutti». Si chiude con un clic fuori,
 * con Esc (il fuoco torna sul pulsante) e con «Fatto».
 */
export function OmDropdown({
  id,
  label,
  allLabel,
  options,
  selected,
  onChange,
  single,
  size = 'md',
  searchable = true,
  panelWidth = 280,
  emptyText = 'Nessun risultato. Prova con un altro nome.',
  disabled,
  className,
}: {
  id: string
  label: string
  /** Il valore mostrato quando non è scelto niente: «Tutti gli sport». */
  allLabel: string
  options: OmOption[]
  selected: string[]
  onChange: (next: string[]) => void
  single?: boolean
  size?: 'sm' | 'md'
  searchable?: boolean
  panelWidth?: number
  emptyText?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const rootRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const close = React.useCallback((focusButton: boolean) => {
    setOpen(false)
    setQuery('')
    if (focusButton) buttonRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc chiude il menu, non la pagina o il dialogo sotto.
        e.preventDefault()
        e.stopPropagation()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, close])

  const labels = new Map(options.map((o) => [o.value, o.label]))
  const names = selected.map((v) => labels.get(v) ?? v)
  const display =
    names.length === 0
      ? allLabel
      : names.length === 1
        ? names[0]
        : `${names.slice(0, 2).join(', ')}${names.length > 2 ? ', …' : ''}`

  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  const toggle = (value: string) => {
    if (single) onChange(selected.includes(value) ? [] : [value])
    else
      onChange(
        selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
      )
  }

  return (
    <div ref={rootRef} className={cn('relative flex min-w-0 flex-col gap-1.5', className)}>
      <span id={`${id}-label`} className="text-sm font-semibold leading-5 text-ds-ink">
        {label}
      </span>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="true"
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-ds-sm border bg-ds-surface-raised text-left text-ds-ink transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'ds-body-sm h-8 pl-2.5 pr-2' : 'ds-body h-10 pl-3 pr-2.5',
          open
            ? 'border-ds-brand shadow-ds-focus'
            : 'border-ds-line-strong focus-visible:border-ds-brand focus-visible:shadow-ds-focus focus-visible:outline-none',
        )}
      >
        <span className="truncate">{display}</span>
        <span className="inline-flex flex-none items-center gap-1.5">
          {selected.length > 1 && (
            <span className="ds-caption rounded-full bg-ds-brand-soft px-1.5 py-px text-ds-brand">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-ds-ink-muted" aria-hidden />
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 max-w-[calc(100vw-32px)] rounded-ds-md border border-ds-line bg-ds-surface-raised p-2 shadow-ds-md"
          style={{ width: panelWidth }}
        >
          {searchable && (
            <div className="flex h-8 items-center gap-2 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-2.5 focus-within:border-ds-brand">
              <Search className="h-4 w-4 flex-none text-ds-ink-muted" aria-hidden />
              <input
                type="search"
                autoFocus
                aria-label={`Cerca ${label.toLowerCase()}`}
                placeholder="Cerca"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ds-body-sm min-w-0 flex-1 border-0 bg-transparent text-ds-ink outline-none placeholder:text-ds-ink-faint"
              />
            </div>
          )}
          <div
            role="group"
            aria-label={label}
            className={cn('flex max-h-56 flex-col overflow-auto', searchable && 'mt-1.5')}
          >
            {shown.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <label
                  key={o.value}
                  className="ds-body-sm flex cursor-pointer items-center gap-2.5 rounded-ds-sm px-2 py-[7px] text-ds-ink hover:bg-ds-surface-sunken"
                >
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name={single ? id : undefined}
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    // Un radio già scelto non manda onChange: il clic lo toglie come una spunta.
                    onClick={single && checked ? () => toggle(o.value) : undefined}
                    className="m-0 h-4 w-4 flex-none accent-[var(--ds-brand)]"
                  />
                  {o.icon && (
                    <span className="inline-flex flex-none text-ds-ink-muted">{o.icon}</span>
                  )}
                  <span className="flex min-w-0 flex-1 items-center">
                    {o.render ?? <span className="truncate">{o.label}</span>}
                  </span>
                  {o.count != null && (
                    <span className="ds-caption flex-none tabular-nums text-ds-ink-muted">
                      {o.count}
                    </span>
                  )}
                </label>
              )
            })}
            {shown.length === 0 && (
              <p className="ds-body-sm m-0 px-2 py-3 text-ds-ink-muted">{emptyText}</p>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-ds-line pt-2">
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className={cn(dsButtonClass('ghost', 'sm'), 'disabled:opacity-50')}
            >
              Azzera
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={dsButtonClass('primary', 'sm')}
            >
              Fatto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Bookmaker ---------- */

const logoHeight = { sm: 'h-5', md: 'h-6', lg: 'h-8' } as const

/** Il BookmakerLogo del design: il file del logo a raggio 4px; senza file, il nome in un riquadro. */
export function OmBookLogo({
  slug,
  name,
  size = 'md',
}: {
  slug: string
  name: string
  size?: keyof typeof logoHeight
}) {
  const src = bookmakerLogoSrc(slug)
  const label = shortBookmakerName(name)
  if (!src) {
    return (
      <span
        title={label}
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-ds-xs border border-ds-line bg-ds-surface-raised px-2 text-xs font-semibold leading-4 tracking-[0.02em] text-ds-ink',
          logoHeight[size],
        )}
      >
        {label}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      title={label}
      width={160}
      height={40}
      loading="lazy"
      className={cn('block w-auto rounded-ds-xs', logoHeight[size])}
    />
  )
}

/* ---------- Sport ---------- */

/** Il nome dello sport sulle cinque icone del design. */
function sportKey(sportName: string): string {
  const label = sportDisplay(sportName).label.toLowerCase()
  if (/volley|pallavolo/.test(label)) return 'pallavolo'
  if (/hockey/.test(label)) return 'hockey'
  return label
}

/**
 * Le icone degli sport del design: il pallone a pentagoni pieni per il calcio, basket e tennis
 * pieni con le cuciture in superficie, pallavolo e hockey al tratto; per gli altri una coppa.
 */
export function OmSportIcon({ sport, size = 20 }: { sport: string; size?: number }) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    className: 'flex-none',
  } as const
  switch (sportKey(sport)) {
    case 'calcio': {
      const clip = `om-ball-${size}`
      return (
        <svg {...base}>
          <defs>
            <clipPath id={clip}>
              <circle cx={12} cy={12} r={10} />
            </clipPath>
          </defs>
          <circle
            cx={12}
            cy={12}
            r={10}
            fill="var(--ds-surface-raised)"
            stroke="currentColor"
            strokeWidth={1.6}
          />
          <g clipPath={`url(#${clip})`} fill="currentColor">
            <path d="M12 8.4L15.42 10.89L14.12 14.91L9.88 14.91L8.58 10.89Z" />
            <path d="M13.55 5.79L12.96 2.85L15.97 2.17L20.12 5.19L20.4 8.26L17.43 8.61Z M18.38 11.55L21 10.09L22.57 12.74L20.99 17.62L18.16 18.84L16.9 16.11Z M14.4 17.93L16.6 19.97L14.56 22.29L9.44 22.29L7.4 19.97L9.6 17.93Z M7.1 16.11L5.84 18.84L3.01 17.62L1.43 12.74L3 10.09L5.62 11.55Z M6.57 8.61L3.6 8.26L3.88 5.19L8.03 2.17L11.04 2.85L10.45 5.79Z" />
          </g>
          <path
            d="M12 8.4L12 4.7 M15.42 10.89L18.94 9.74 M14.12 14.91L16.29 17.91 M9.88 14.91L7.71 17.91 M8.58 10.89L5.06 9.74"
            stroke="currentColor"
            strokeWidth={1.3}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )
    }
    case 'basket':
      return (
        <svg {...base}>
          <circle cx={12} cy={12} r={10} fill="currentColor" />
          <path
            d="M2 12h20 M12 2v20 M4.9 4.9c3.9 3.9 3.9 10.3 0 14.2 M19.1 4.9c-3.9 3.9-3.9 10.3 0 14.2"
            stroke="var(--ds-surface-raised)"
            strokeWidth={1.4}
            fill="none"
          />
        </svg>
      )
    case 'tennis':
      return (
        <svg {...base}>
          <circle cx={12} cy={12} r={10} fill="currentColor" />
          <path
            d="M5 4.5A10 10 0 0 1 5 19.5 M19 4.5a10 10 0 0 0 0 15"
            stroke="var(--ds-surface-raised)"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )
    case 'pallavolo':
      return (
        <svg
          {...base}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Z M12 12V2 M12 12l-8.7 5 M12 12l8.7 5 M12 7.5a10 10 0 0 0 6.5 8.8 M8.1 9.8A10 10 0 0 0 3.5 17 M15.9 9.8a10 10 0 0 1 4.6 7.2" />
        </svg>
      )
    case 'hockey':
      return (
        <svg
          {...base}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 6 8 11.5a3 3 0 0 0 2.5 1.3H20a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-5.4 M7 6l-3 2 M17 20v-4 M20.5 20h-7" />
        </svg>
      )
    default:
      return <Trophy width={size} height={size} aria-hidden className="flex-none" />
  }
}

/* ---------- Gamba, rating ---------- */

/**
 * Il BetLeg del design in misura piccola: logo, esito in ink-muted, quota a destra in cifre
 * tabulari. `logo` è il logo già avvolto nel link all'evento, quando c'è.
 */
export function OmBetLeg({
  logo,
  outcome,
  odds,
  oddsTitle,
  lay,
}: {
  logo: React.ReactNode
  outcome: string
  odds: number
  oddsTitle?: string
  /** La bancata sull'exchange: la quota in loss, come le schede Banca del calcolatore. */
  lay?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {logo}
      <span className="max-w-[120px] truncate text-xs leading-4 text-ds-ink-muted" title={outcome}>
        {outcome}
      </span>
      <span
        title={oddsTitle}
        className={cn(
          'min-w-8 text-right text-sm font-semibold tabular-nums',
          lay ? 'text-ds-loss' : 'text-ds-ink',
        )}
      >
        {formatOdds(odds)}
      </span>
    </span>
  )
}

/**
 * Il rating di una combinazione come nel design dell'oddsmatcher: da 100 % in su il badge in
 * profit, sotto la cifra in ink a un decimale.
 */
export function OmRating({ value, large }: { value: number; large?: boolean }) {
  if (value >= 100) {
    return (
      <DsBadge tone="profit" className="text-[13px] font-semibold tabular-nums tracking-normal">
        {formatRating(value)}
      </DsBadge>
    )
  }
  return (
    <span className={cn('whitespace-nowrap text-ds-ink', large ? 'ds-num' : 'ds-num-sm')}>
      {formatRating(value)}
    </span>
  )
}

/* ---------- Stato vuoto, paginazione ---------- */

/** EmptyState del design dentro una card: icona su sunken, titolo, testo e un'azione. */
export function OmEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm">
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted">
          <Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />
        </span>
        <h2 className="ds-heading m-0">{title}</h2>
        <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

const countFormat = new Intl.NumberFormat('it-IT')

/**
 * Pagination del design: «1–50 di 1.234 combinazioni» a sinistra, Indietro/Avanti a destra; in
 * mezzo, se c'è, il controllo delle righe per pagina.
 */
export function OmPagination({
  page,
  pageSize,
  total,
  onChange,
  unit = 'combinazioni',
  children,
}: {
  /** Da zero. */
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  unit?: string
  children?: React.ReactNode
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  return (
    <nav
      aria-label="Pagine dei risultati"
      className="ds-body-sm flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-3 tabular-nums text-ds-ink-muted"
    >
      <span>
        {countFormat.format(start)}–{countFormat.format(end)} di {countFormat.format(total)} {unit}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        {children}
        <button
          type="button"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page <= 0}
          className={cn(
            dsButtonClass('secondary', 'sm'),
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Indietro
        </button>
        <span className="whitespace-nowrap">
          Pagina {page + 1} di {pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
          className={cn(
            dsButtonClass('secondary', 'sm'),
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          Avanti
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </nav>
  )
}
