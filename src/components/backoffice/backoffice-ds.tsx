'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import type { DsBadgeTone } from '@/components/landing/ds-data'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import {
  DsModal,
  dsDangerButtonClass,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { cn } from '@/lib/utils'

/**
 * Pezzi comuni delle pagine del Backoffice sul design OddWise (§14.365), accanto a quelli del
 * tracker (tracker-ds, giocate-ds): le tabelle dense da amministratore (sul telefono scorrono di
 * lato invece di diventare schede), il riquadro con titolo e nota a destra, il numero con
 * l'etichetta, il pallino di stato, l'interruttore, il codice in monospazio, la paginazione e la
 * conferma prima di eliminare. Prima le pagine erano sul fondo scuro della grafica vecchia.
 */

/** La tabella del Backoffice: card surface-raised con filetto; sotto i 768px scorre di lato. */
export const BO_TABLE_WRAP =
  'overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm'
export const BO_TABLE = 'w-full min-w-full border-collapse text-sm'
/** Intestazione: etichetta maiuscola in ink-muted su sunken, come DS_THEAD_ROW. */
export const BO_THEAD_ROW = 'ds-label bg-ds-surface-sunken text-left text-ds-ink-muted uppercase'
export const BO_TH = 'px-4 py-2.5 font-semibold whitespace-nowrap'
export const BO_TD = 'px-4 py-3 align-middle'
/** Riga con il filetto sopra e il sunken al passaggio. */
export const BO_ROW = 'border-t border-ds-line transition-colors hover:bg-ds-surface-sunken/60'
/** La cella vuota di una tabella (caricamento, nessun risultato). */
export const BO_EMPTY_CELL = 'px-4 py-8 text-center text-sm text-ds-ink-muted'

/** Un link nel testo del Backoffice: brand, sottolineato al passaggio. */
export const boLink = cn(
  'rounded-ds-xs font-semibold text-ds-brand underline-offset-4 transition-colors hover:text-ds-brand-hover hover:underline',
  dsFocusRing,
)

/** Riquadro con il titolo, una nota o le azioni a destra e il contenuto sotto un filetto. */
export function BoPanel({
  title,
  aside,
  actions,
  flush,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode
  aside?: React.ReactNode
  actions?: React.ReactNode
  /** Senza padding nel corpo: per una tabella che riempie il riquadro. */
  flush?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn(DS_PANEL, 'flex min-w-0 flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ds-line px-5 py-3">
        <h2 className="ds-subheading m-0">{title}</h2>
        {(aside || actions) && (
          <div className="flex flex-wrap items-center gap-3">
            {aside && <span className="ds-body-sm text-ds-ink-muted">{aside}</span>}
            {actions}
          </div>
        )}
      </div>
      <div className={cn(flush ? '' : 'px-5 py-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Un numero con l'etichetta sopra e una nota sotto (righe del matcher, budget api-sports). */
export function BoStat({
  label,
  value,
  hint,
  title,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  title?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5" title={title}>
      <span className="font-ds-sans text-xs leading-4 font-medium tracking-[0.02em] text-ds-ink-muted">
        {label}
      </span>
      <span className="text-xl leading-7 font-semibold text-ds-ink tabular-nums">{value}</span>
      {hint && <span className="ds-caption text-ds-ink-muted">{hint}</span>}
    </div>
  )
}

/** BoStat dentro un riquadro: le griglie di numeri in testa alle pagine. */
export function BoStatTile(props: React.ComponentProps<typeof BoStat>) {
  return (
    <div className={cn(DS_PANEL, 'px-5 py-4')}>
      <BoStat {...props} />
    </div>
  )
}

/** La griglia dei riquadri dei numeri: tanti per riga quanti ne stanno da 180px. */
export const BO_TILE_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3'

export type BoTone = 'ok' | 'warn' | 'bad' | 'off'

const dotTone: Record<BoTone, string> = {
  ok: 'bg-ds-profit',
  warn: 'bg-ds-warning',
  bad: 'bg-ds-loss',
  off: 'bg-ds-line-strong/60',
}

/** Il pallino di stato (adapter, cron, scraping globale) nei colori del design. */
export function BoDot({ tone, label }: { tone: BoTone; label?: string }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', dotTone[tone])}
    />
  )
}

/** Codice, slug o id in monospazio su sunken. */
export function BoCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'rounded-ds-xs bg-ds-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ds-ink',
        className,
      )}
    >
      {children}
    </code>
  )
}

/** Slug o id senza riquadro, in ink-muted. */
export function BoMono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs text-ds-ink-muted', className)}>{children}</span>
}

/**
 * L'interruttore del design: binario in brand quando è acceso, in line-strong quando è spento, in
 * warning per «acceso ma sospeso» (scraper acceso con lo scraping globale in pausa).
 */
export function BoSwitch({
  checked,
  onChange,
  label,
  title,
  disabled,
  tone = 'brand',
  size = 'md',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Nome accessibile: cosa accende o spegne. */
  label: string
  title?: string
  disabled?: boolean
  tone?: 'brand' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}) {
  const dims = {
    sm: { track: 'h-4 w-7', knob: 'h-3 w-3', on: 'translate-x-3.5', off: 'translate-x-0.5' },
    md: { track: 'h-6 w-11', knob: 'h-4 w-4', on: 'translate-x-6', off: 'translate-x-1' },
    lg: { track: 'h-7 w-14', knob: 'h-5 w-5', on: 'translate-x-8', off: 'translate-x-1' },
  }[size]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        dsFocusRing,
        dims.track,
        checked ? (tone === 'warning' ? 'bg-ds-warning' : 'bg-ds-brand') : 'bg-ds-line-strong/50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-ds-sm transition-transform',
          dims.knob,
          checked ? dims.on : dims.off,
        )}
      />
    </button>
  )
}

/** Una voce da accendere o spegnere in una fila (gli sport di uno scraper): brand-soft se scelta. */
export function BoChip({
  pressed,
  onClick,
  disabled,
  children,
}: {
  pressed: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center rounded-full border px-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60',
        dsFocusRing,
        pressed
          ? 'border-transparent bg-ds-brand-soft text-ds-brand'
          : 'border-ds-line bg-ds-surface-raised text-ds-ink-muted hover:text-ds-ink',
      )}
    >
      {children}
    </button>
  )
}

/** «Pagina 2 di 5» con Precedente e Successiva. */
export function BoPagination({
  label,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel = 'Precedente',
  nextLabel = 'Successiva',
}: {
  label?: React.ReactNode
  onPrev: () => void
  onNext: () => void
  prevDisabled: boolean
  nextDisabled: boolean
  prevLabel?: string
  nextLabel?: string
}) {
  return (
    <nav
      aria-label="Pagine"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-ds-ink-muted"
    >
      <span className="tabular-nums">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {prevLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  )
}

/** «← Tutte le offerte» sopra il titolo di una pagina di dettaglio. */
export function BoBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'ds-body-sm inline-flex w-fit items-center gap-1 rounded-ds-xs text-ds-ink-muted transition-colors hover:text-ds-ink',
        dsFocusRing,
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  )
}

/** Testo di caricamento o di lista vuota fuori da una tabella. */
export function BoMuted({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn('ds-body-sm m-0 text-ds-ink-muted', className)}>{children}</p>
}

/**
 * La conferma prima di un'azione che non si annulla (Elimina): al posto del confirm() del browser,
 * il Modal del design con il pulsante pieno in loss. Il backend può rispondere di no (un metodo di
 * pagamento in uso): l'errore torna nella pagina, la modale si chiude.
 */
export function BoConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Elimina',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <DsModal
      open={open}
      onOpenChange={(next) => !next && !busy && onCancel()}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={dsButtonClass('secondary', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(dsDangerButtonClass('md'), 'disabled:opacity-60')}
          >
            {busy ? 'Un momento…' : confirmLabel}
          </button>
        </>
      }
    />
  )
}

/** Il tono del badge per lo stato di un abbinamento evento/bookmaker (matchings, palinsesto, scraper). */
export function matchStatusTone(status: string | null | undefined): DsBadgeTone {
  switch (status) {
    case 'auto_confirmed':
    case 'manual_confirmed':
      return 'profit'
    case 'high_confidence':
      return 'info'
    case 'review_needed':
      return 'warning'
    case 'rejected':
      return 'loss'
    default:
      return 'neutral'
  }
}

/** «auto_confirmed» → «auto confirmed»: i codici del backend, leggibili. */
export function codeLabel(code: string): string {
  return code.replace(/_/g, ' ')
}
