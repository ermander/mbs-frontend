'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronDown, CircleCheck, CircleX, X } from 'lucide-react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { eventSearchQuery, eventSearchUrl } from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'

/**
 * Primitive del design «OddWise Giocate in corso» (§14.281) sui token ds-*: guscio chiaro della
 * pagina, Modal, TextField e Select con errore, Tabs, avviso in basso con «Annulla», pulsante
 * quadrato delle azioni di riga, nome dell'evento che apre la ricerca Google.
 */

/** Il guscio chiaro a tutta altezza sotto la barra in alto, con la colonna da 1200px del design. */
export function GiocateDsShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope ds-calc-bridge -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light md:-mx-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 pt-8 pb-16 sm:px-6">
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1b2420a6] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            dsSerif.variable,
            dsSans.variable,
            // Centrato con inset e margini automatici, non con translate: senza transform un
            // menu `fixed` dentro il modal (OmDropdown floating) esce dal suo scorrimento.
            'ds-scope fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] flex-col gap-5 overflow-y-auto rounded-ds-lg border border-ds-line bg-ds-surface-raised p-6 font-ds-sans text-base leading-6 text-ds-ink scheme-light shadow-ds-lg',
            'duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
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
    <label htmlFor={htmlFor} className="text-sm leading-5 font-semibold text-ds-ink">
      {children}
      {optional && <span className="ml-1 font-normal text-ds-ink-muted">(facoltativo)</span>}
    </label>
  )
}

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
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
  hint,
  disabled,
  onBlur,
  onEnter,
  inputProps,
  className,
}: {
  id: string
  label?: string
  ariaLabel?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'search' | 'date' | 'datetime-local' | 'password' | 'email'
  size?: keyof typeof controlHeight
  numeric?: boolean
  optional?: boolean
  prefix?: React.ReactNode
  suffix?: string
  error?: string
  /** Testo in ink-muted sotto il campo, al posto dell'errore quando non ce n'è. */
  hint?: string
  disabled?: boolean
  onBlur?: () => void
  /** Invio nel campo (la nota del riepilogo si salva così). */
  onEnter?: () => void
  /** Attributi nativi in più (autoComplete, maxLength, autoFocus…), per i moduli del Profilo. */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'id' | 'type' | 'value' | 'onChange' | 'className'
  >
  className?: string
}) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
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
          {...inputProps}
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          inputMode={numeric ? 'decimal' : undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent px-3 text-ds-ink outline-hidden placeholder:text-ds-ink-faint',
            size === 'sm' ? 'text-sm' : 'text-base',
            numeric && 'text-right font-semibold tabular-nums',
            prefix && 'pl-2',
            disabled && 'cursor-not-allowed text-ds-ink-muted',
          )}
        />
        {suffix && (
          <span className="flex flex-none items-center border-l border-ds-line px-3 text-sm text-ds-ink-muted">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : (
        hint && (
          <p id={hintId} className="m-0 text-sm leading-5 text-ds-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Il campo di testo su più righe del design (Descrizione), con lo stesso contorno del TextField. */
export function GTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  optional,
  rows = 3,
  maxLength,
  disabled,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  rows?: number
  maxLength?: number
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-h-[72px] w-full resize-y rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-3 py-2 text-base leading-6 text-ds-ink outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-ds-ink-faint focus:border-ds-brand focus:shadow-ds-focus',
          disabled && 'cursor-not-allowed text-ds-ink-muted',
        )}
      />
    </div>
  )
}

/** Un valore che non si cambia nella modale (il conto del movimento): etichetta e riquadro sunken. */
export function GReadOnly({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm leading-5 font-semibold text-ds-ink">{label}</span>
      <div className="flex min-h-10 items-center rounded-ds-sm border border-ds-line bg-ds-surface-sunken px-3 py-2 text-base text-ds-ink">
        {children}
      </div>
      {hint && <p className="m-0 text-sm leading-5 text-ds-ink-muted">{hint}</p>}
    </div>
  )
}

/** Tinta del select quando il valore porta uno stato (es. lo stato evento della gamba). */
export type GSelectTone = 'neutral' | 'warning' | 'profit' | 'loss' | 'info'

const selectTone: Record<Exclude<GSelectTone, 'neutral'>, string> = {
  warning: 'border-transparent bg-ds-warning-soft text-ds-warning',
  profit: 'border-transparent bg-ds-profit-soft text-ds-profit',
  loss: 'border-transparent bg-ds-loss-soft text-ds-loss',
  info: 'border-transparent bg-ds-info-soft text-ds-info',
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
  disabled,
  tone = 'neutral',
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
  disabled?: boolean
  tone?: GSelectTone
  className?: string
}) {
  const errorId = `${id}-error`
  const tinted = !error && tone !== 'neutral'
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div
        className={cn(
          controlBox,
          controlHeight[size],
          'relative',
          error ? 'border-ds-loss' : tinted ? selectTone[tone] : 'border-ds-line-strong',
        )}
      >
        <select
          id={id}
          value={value}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-8 pl-3 outline-hidden',
            tinted ? 'font-medium text-inherit' : 'text-ds-ink',
            size === 'sm' ? 'text-sm' : 'text-base',
            disabled && 'cursor-not-allowed text-ds-ink-muted',
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
          className={cn(
            'pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2',
            !tinted && 'text-ds-ink-muted',
          )}
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
              '-mb-px inline-flex items-center gap-2 px-4 py-3 font-semibold whitespace-nowrap transition-colors',
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
      className="fixed bottom-6 left-1/2 z-60 flex w-max max-w-[min(640px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised py-2.5 pr-2.5 pl-4 text-ds-ink shadow-ds-md"
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

/**
 * Il nome dell'evento come link alla ricerca Google in una nuova scheda (§14.346), che porta alla
 * scheda della partita. Eredita colore e peso del testo intorno; il link si vede al passaggio.
 */
export function GEventLink({
  name,
  className,
  children,
}: {
  name: string
  className?: string
  children?: React.ReactNode
}) {
  const href = eventSearchUrl(name)
  if (!href) return <>{children ?? name}</>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Cerca «${eventSearchQuery(name)}» su Google`}
      className={cn(
        'rounded-ds-sm underline decoration-transparent underline-offset-4 transition-colors hover:text-ds-brand hover:decoration-current',
        dsFocusRing,
        className,
      )}
    >
      {children ?? name}
      <span className="sr-only"> (cerca su Google, si apre in una nuova scheda)</span>
    </a>
  )
}
