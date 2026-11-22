'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { dsFocusRing } from '@/components/landing/ds-primitives'
import { dashMoney } from '@/lib/profit-tracker/dashboard'
import { cn } from '@/lib/utils'

/**
 * Pezzi comuni delle pagine del tracker sul design OddWise (§14.336, §14.350): testata della
 * pagina, riquadro con l'importo (StatTile), sezione con l'etichetta, stato vuoto, avviso in riga
 * e le classi di tabelle e schede delle liste (Giocate, Archivio), così Report, Gestione conti e
 * Profilo restano uguali alle pagine già rifatte.
 */

/** Il contenitore della tabella sopra i 768px (sotto ci sono le schede). */
export const DS_TABLE_WRAP =
  'hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block'
/** La riga delle intestazioni: etichetta maiuscola in ink-muted su sunken. */
export const DS_THEAD_ROW = 'ds-label bg-ds-surface-sunken text-left text-ds-ink-muted uppercase'
/** Una riga della tabella, con il filetto sopra. */
export const DS_ROW = 'border-t border-ds-line align-top transition-colors'
/** La scheda di una riga sul telefono. */
export const DS_CARD =
  'flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm transition-colors'
/** Il contenitore di base: surface-raised, filetto, raggio 10px e ombra leggera. */
export const DS_PANEL = 'rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm'

/** Titolo della pagina con la riga di spiegazione e le azioni a destra. */
export function DsPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="ds-title m-0">{title}</h1>
        {description && <p className="ds-body m-0 text-pretty text-ds-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Una sezione con l'etichetta maiuscola sopra (Saldi, Profitto 2026). */
export function DsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="ds-label m-0 text-ds-ink-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * La griglia dei riquadri: tanti per riga quanti ne stanno da 300px (mai più larghi della colonna
 * sul telefono). Con la colonna da 1600px (§14.357) i sei saldi della dashboard stanno 4 + 2 fino
 * ai monitor larghi invece di 5 + 1.
 */
export const DS_TILE_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4'

/**
 * StatTile del design OddWise con l'icona nel cerchio brand-soft in alto a destra: etichetta,
 * importo da 32px (neutro per i saldi, con segno e colore per i profitti), nota sotto. Con `text`
 * mostra un testo al posto dell'importo (il miglior mese del Report).
 */
export function DsStatTile({
  label,
  value,
  text,
  note,
  icon: Icon,
  signed,
  isLoading,
}: {
  label: string
  value: number
  text?: string
  note?: ReactNode
  icon: LucideIcon
  signed?: boolean
  isLoading?: boolean
}) {
  const tone =
    text != null || !signed ? '' : value > 0 ? 'text-ds-profit' : value < 0 ? 'text-ds-loss' : ''
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-ds-md border border-ds-line bg-ds-surface-raised py-5 pr-[72px] pl-6 shadow-ds-sm">
      <span className="font-ds-sans text-xs leading-4 font-medium tracking-[0.02em] text-ds-ink-muted">
        {label}
      </span>
      {isLoading ? (
        <span
          aria-hidden
          className="my-0.5 block h-8 w-40 max-w-full animate-pulse rounded-ds-xs bg-ds-surface-sunken"
        />
      ) : (
        <span
          className={cn(
            'font-ds-sans text-[32px] leading-9 font-semibold tracking-[-0.01em] whitespace-nowrap tabular-nums',
            tone,
          )}
        >
          {text ?? dashMoney(value, { sign: !!signed })}
        </span>
      )}
      {note && (
        <span className="mt-0.5 font-ds-sans text-sm leading-5 text-ds-ink-muted">{note}</span>
      )}
      <span
        aria-hidden
        className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
    </div>
  )
}

/** EmptyState del design dentro una card: icona su sunken, titolo, testo e un'azione. */
export function DsEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className={DS_PANEL}>
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted">
          {icon}
        </span>
        <h2 className="ds-heading m-0">{title}</h2>
        {description && (
          <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

const alertTone = {
  loss: 'bg-ds-loss-soft text-ds-loss',
  info: 'bg-ds-info-soft text-ds-info',
  warning: 'bg-ds-warning-soft text-ds-warning',
  neutral: 'bg-ds-surface-sunken text-ds-ink-muted',
} as const

/** Un avviso in riga: errore di caricamento in loss, una nota in info. */
export function DsAlert({
  tone = 'loss',
  children,
  className,
}: {
  tone?: keyof typeof alertTone
  children: ReactNode
  className?: string
}) {
  return (
    <p
      role={tone === 'loss' ? 'alert' : undefined}
      className={cn('ds-body-sm m-0 rounded-ds-sm px-3 py-2', alertTone[tone], className)}
    >
      {children}
    </p>
  )
}

const amountSize = {
  sm: 'text-sm font-medium leading-5',
  md: 'text-base leading-6',
  lg: 'text-xl leading-7',
} as const

/**
 * Importo del tracker: come DsMoney (segno e colore del risultato) ma con le migliaia raggruppate
 * anche a quattro cifre («1.800,00 €»), come i riquadri della Dashboard. Con `neutral` è un saldo:
 * senza più e senza colore (il meno resta).
 */
export function DsAmount({
  value,
  size = 'md',
  neutral,
  className,
}: {
  value: number
  size?: keyof typeof amountSize
  neutral?: boolean
  className?: string
}) {
  const tone = neutral ? '' : value > 0 ? 'text-ds-profit' : value < 0 ? 'text-ds-loss' : ''
  return (
    <span
      className={cn(
        'font-semibold whitespace-nowrap tabular-nums',
        amountSize[size],
        tone,
        className,
      )}
    >
      {dashMoney(value, { sign: !neutral })}
    </span>
  )
}

/** «1 giocata», «3 giocate»: il nome giusto per il numero. */
export function countLabel(n: number, one: string, many: string): string {
  return `${n.toLocaleString('it-IT')} ${n === 1 ? one : many}`
}

const toggleTone = {
  profit: 'bg-ds-profit-soft text-ds-profit',
  warning: 'bg-ds-warning-soft text-ds-warning',
  neutral: 'bg-ds-surface-sunken text-ds-ink-muted',
} as const

/**
 * Un badge che si cambia con un clic (Abilitato/Non abilitato, Bloccato/Libero nelle liste di
 * conti e wallet): stessa forma del DsBadge, contorno al passaggio, `title` con l'azione.
 */
export function DsBadgeToggle({
  tone,
  label,
  actionLabel,
  icon,
  onClick,
  disabled,
}: {
  tone: keyof typeof toggleTone
  label: string
  /** «Disabilita il conto»: nome accessibile e titolo del pulsante. */
  actionLabel: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={actionLabel}
      aria-label={`${label}: ${actionLabel.toLowerCase()}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-[22px] cursor-pointer items-center gap-1 rounded-full px-2 text-xs leading-4 font-medium tracking-[0.02em] whitespace-nowrap ring-ds-line-strong transition-shadow hover:ring-1 focus-visible:shadow-ds-focus focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60',
        toggleTone[tone],
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/** L'interruttore a due o più voci del design (Mensile/Cumulato): la scelta in brand-soft. */
export function DsSegmented<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-ds-sm border border-ds-line bg-ds-surface p-[3px]"
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-pressed={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'h-7 cursor-pointer rounded-ds-xs border-0 px-3 font-ds-sans text-sm leading-5 font-semibold whitespace-nowrap transition-colors duration-150',
            dsFocusRing,
            value === it.value
              ? 'bg-ds-brand-soft text-ds-brand'
              : 'bg-transparent text-ds-ink-muted hover:text-ds-ink',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Il saldo in testa a Conti, Wallets e Collaboratori: icona nel cerchio brand-soft, etichetta,
 * importo neutro e, se c'è, una nota sotto (i prelievi in attesa dei wallet).
 */
export function DsBalancePanel({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: number
  note?: ReactNode
  icon: LucideIcon
}) {
  return (
    <div
      role="status"
      className={cn(DS_PANEL, 'flex w-full items-center gap-4 px-5 py-4 sm:w-fit')}
    >
      <span
        aria-hidden
        className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-ds-sans text-xs leading-4 font-medium tracking-[0.02em] text-ds-ink-muted">
          {label}
        </span>
        <DsAmount value={value} neutral size="lg" />
        {note && <span className="ds-caption text-ds-ink-muted">{note}</span>}
      </span>
    </div>
  )
}
