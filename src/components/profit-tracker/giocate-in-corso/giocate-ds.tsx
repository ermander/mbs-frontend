'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, CircleCheck, CircleX, X } from 'lucide-react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { cn } from '@/lib/utils'

/**
 * Primitive del design «OddWise Giocate in corso» (§14.281) sui token ds-*: guscio chiaro della
 * pagina, Modal, TextField e Select con errore, Tabs, avviso in basso con «Annulla», pulsante
 * quadrato delle azioni di riga.
 */

/** Il guscio chiaro a tutta altezza sotto la barra in alto, con la colonna da 1200px del design. */
export function GiocateDsShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope ds-calc-bridge -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light] md:-mx-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 pb-16 pt-8 sm:px-6">
        {children}
        <p className="ds-caption mt-auto pt-6 text-ds-ink-muted">
          Gioco vietato ai minori di 18 anni. Gioca responsabilmente.
        </p>
      </div>
    </div>
  )
}

/** Il pieno in loss del design per le azioni distruttive («Elimina la giocata»). */
export function dsDangerButtonClass(size: 'sm' | 'md') {
  return cn(
    dsButtonClass('primary', size),
    'border-ds-loss bg-ds-loss text-white hover:border-ds-loss hover:bg-ds-loss hover:brightness-95',
  )
}

/* ---------- Modal ---------- */

/**
 * Il Modal del design: surface-raised, raggio 16px, ombra lg, padding 24px, titolo 20px e
 * descrizione in ink-muted, piede a destra. Finisce in un portal nel body, quindi porta con sé
 * ds-scope e i font. Esc e il clic fuori chiudono come prima.
 */
export function DsModal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  size?: 'md' | 'lg'
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1b2420a6] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            dsSerif.variable,
            dsSans.variable,
            'ds-scope fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-ds-lg border border-ds-line bg-ds-surface-raised p-6 font-ds-sans text-base leading-6 text-ds-ink shadow-ds-lg [color-scheme:light]',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            size === 'lg' ? 'max-w-[720px]' : 'max-w-[480px]',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="ds-heading m-0">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="ds-body m-0 mt-1 text-ds-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Chiudi"
              className={cn(dsButtonClass('ghost', 'sm'), 'w-8 flex-none px-0 text-ds-ink-muted')}
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ---------- Campi ---------- */

const controlHeight = { sm: 'h-8', md: 'h-10' } as const

const controlBox =
  'flex items-stretch rounded-ds-sm border bg-ds-surface-raised transition-[border-color,box-shadow] duration-150 focus-within:border-ds-brand focus-within:shadow-ds-focus'

function FieldLabel({
  htmlFor,
  optional,
  children,
}: {
  htmlFor: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold leading-5 text-ds-ink">
      {children}
      {optional && <span className="ml-1 font-normal text-ds-ink-muted">(facoltativo)</span>}
    </label>
  )
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="m-0 flex items-center gap-1 text-sm leading-5 text-ds-loss">
      <CircleX className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

/**
 * TextField del design: etichetta (con «facoltativo»), prefisso (la lente della ricerca),
 * suffisso separato da un filetto (€), cifre a destra e tabulari con `numeric`, errore in loss.
 */
export function GTextField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  placeholder,
  type = 'text',
  size = 'md',
  numeric,
  optional,
  prefix,
  suffix,
  error,
  className,
}: {
  id: string
  label?: string
  ariaLabel?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'search' | 'date' | 'datetime-local'
  size?: keyof typeof controlHeight
  numeric?: boolean
  optional?: boolean
  prefix?: React.ReactNode
  suffix?: string
  error?: string
  className?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <FieldLabel htmlFor={id} optional={optional}>
          {label}
        </FieldLabel>
      )}
      <div
        className={cn(
          controlBox,
          controlHeight[size],
          error ? 'border-ds-loss' : 'border-ds-line-strong',
        )}
      >
        {prefix && (
          <span className="flex flex-none items-center pl-3 text-ds-ink-muted">{prefix}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          inputMode={numeric ? 'decimal' : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent px-3 text-ds-ink outline-none placeholder:text-ds-ink-faint',
            size === 'sm' ? 'text-sm' : 'text-base',
            numeric && 'text-right font-semibold tabular-nums',
            prefix && 'pl-2',
          )}
        />
        {suffix && (
          <span className="flex flex-none items-center border-l border-ds-line px-3 text-sm text-ds-ink-muted">
            {suffix}
          </span>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}

export interface GOption {
  value: string
  label: string
  disabled?: boolean
}

/** Select nativo del design, con lo stesso contorno del TextField e lo chevron a destra. */
export function GSelect({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  options,
  size = 'md',
  error,
  className,
}: {
  id: string
  label?: string
  ariaLabel?: string
  value: string
  onChange: (value: string) => void
  options: GOption[]
  size?: keyof typeof controlHeight
  error?: string
  className?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div
        className={cn(
          controlBox,
          controlHeight[size],
          'relative',
          error ? 'border-ds-loss' : 'border-ds-line-strong',
        )}
      >
        <select
          id={id}
          value={value}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pl-3 pr-8 text-ds-ink outline-none',
            size === 'sm' ? 'text-sm' : 'text-base',
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-ink-muted"
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}

/* ---------- Tabs ---------- */

/**
 * Le Tabs del design: voci in ink-muted su un filetto, la scelta in brand con la riga sotto.
 * Frecce sinistra/destra per spostarsi, come un tablist.
 */
export function GTabs<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string
  items: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length
    onChange(items[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex flex-wrap gap-1 border-b border-ds-line', className)}
    >
      {items.map((it, i) => {
        const selected = it.value === value
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 font-semibold transition-colors',
              dsFocusRing,
              selected
                ? 'text-ds-brand shadow-[inset_0_-2px_0_var(--ds-brand)]'
                : 'text-ds-ink-muted hover:text-ds-ink',
            )}
          >
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  'inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold tabular-nums',
                  selected
                    ? 'bg-ds-brand-soft text-ds-brand'
                    : 'bg-ds-surface-sunken text-ds-ink-muted',
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Avviso ---------- */

export interface GNoticeData {
  title: string
  text: string
  actions?: { label: string; onClick: () => void }[]
}

/** L'avviso in basso al centro: spunta in brand, titolo, testo in ink-muted, azioni e X. */
export function GNotice({ notice, onDismiss }: { notice: GNoticeData; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[60] flex w-max max-w-[min(640px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised py-2.5 pl-4 pr-2.5 text-ds-ink shadow-ds-md"
    >
      <CircleCheck className="h-5 w-5 flex-none text-ds-brand" aria-hidden />
      <span className="ds-body-sm min-w-0">
        <b className="font-semibold">{notice.title}.</b>{' '}
        <span className="text-ds-ink-muted">{notice.text}</span>
      </span>
      {notice.actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={cn(dsButtonClass('secondary', 'sm'), 'flex-none')}
        >
          {a.label}
        </button>
      ))}
      <button
        type="button"
        aria-label="Chiudi l'avviso"
        onClick={onDismiss}
        className={cn(dsButtonClass('ghost', 'sm'), 'w-8 flex-none px-0 text-ds-ink-muted')}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

/** Il pulsante quadrato da 32px delle azioni di riga (Archivia, Clona, Elimina). */
export function GIconButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        dsButtonClass('ghost', 'sm'),
        'w-8 px-0 disabled:opacity-50',
        danger && 'text-ds-loss hover:bg-ds-loss-soft hover:text-ds-loss',
      )}
    >
      {children}
    </button>
  )
}
