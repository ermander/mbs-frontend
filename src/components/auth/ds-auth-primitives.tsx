import * as React from 'react'
import { ArrowRight, CircleX, Info, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { GoogleMark } from '@/components/auth/google-sign-in-button'
import { GOOGLE_AUTH_START_URL } from '@/services/api/auth-client'

/**
 * Primitive dei form di accesso sul design system (§14.252): TextField a 48px con etichetta ed
 * errore, Callout, pulsante <button> con le varianti del design e «Continua con Google»; dal
 * §14.257 anche recupero e reimposta password. Verifica email e ritorno da Google, ancora sulla
 * grammatica «Linear», usano auth-primitives.
 */

/** Etichetta + controllo + errore: gap 4px come l'ow-field del design. */
export function DsField({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('flex min-w-0 flex-col gap-1', className)}>{children}</div>
}

/** Etichetta del campo: 14px/20px peso 600 in ink. */
export const DsLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-semibold leading-5 text-ds-ink', className)}
    {...props}
  />
))
DsLabel.displayName = 'DsLabel'

/**
 * Il TextField del design in misura lg: 48px, bordo line-strong, raggio 6px, testo 17px; a fuoco il
 * bordo passa in brand con il doppio anello; con aria-invalid il bordo è in loss.
 */
export const DsInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-12 w-full min-w-0 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-3 text-[17px] text-ds-ink transition-[border-color,box-shadow] placeholder:text-ds-ink-faint',
      'focus:border-ds-brand focus:shadow-ds-focus focus:outline-none',
      'aria-[invalid=true]:border-ds-loss',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
DsInput.displayName = 'DsInput'

/** Errore di campo: 14px/20px in loss con l'icona circle-x da 16px. */
export function DsFieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1 text-sm leading-5 text-ds-loss">
      <CircleX className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {children}
    </p>
  )
}

/** Suggerimento sotto il campo: 14px/20px in ink-muted, al posto dell'errore quando non ce n'è. */
export function DsFieldHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-sm leading-5 text-ds-ink-muted">
      {children}
    </p>
  )
}

const CALLOUT_TONES = {
  warning: { box: 'bg-ds-warning-soft', accent: 'text-ds-warning', Icon: TriangleAlert },
  note: { box: 'bg-ds-info-soft', accent: 'text-ds-info', Icon: Info },
} as const

/**
 * Callout del design: warning (fondo warning-soft, annuncia un errore) o note (fondo info-soft);
 * icona e titolo nel colore del tono, testo in ink.
 */
export function DsCallout({
  tone = 'warning',
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_TONES
  title: string
  children: React.ReactNode
}) {
  const { box, accent, Icon } = CALLOUT_TONES[tone]
  return (
    <div
      role={tone === 'warning' ? 'alert' : undefined}
      className={cn('flex gap-3 rounded-ds-md p-4', box)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', accent)} strokeWidth={2} aria-hidden />
      <div>
        <p className={cn('ds-subheading mb-1', accent)}>{title}</p>
        <div className="text-ds-ink">{children}</div>
      </div>
    </div>
  )
}

/** Il Button del design come <button>: primary lg con la freccia in coda per l'invio dei form. */
export const DsFormButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    iconEnd?: 'arrow-right'
  }
>(
  (
    {
      className,
      variant = 'primary',
      size = 'lg',
      block,
      iconEnd,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        dsButtonClass(variant, size, block),
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {iconEnd === 'arrow-right' && (
        <ArrowRight className={cn('shrink-0', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
      )}
    </button>
  ),
)
DsFormButton.displayName = 'DsFormButton'

/**
 * «Continua con Google» nel design: 48px su surface-raised con bordo line-strong, marchio G da
 * 20px e testo 16px a 600. Come in google-sign-in-button è un <a> verso /api/auth/google
 * (§14.246), non un pulsante: la rotta risponde con un redirect verso Google.
 */
export function DsGoogleSignInButton({
  label = 'Continua con Google',
  onClick,
}: {
  label?: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}) {
  return (
    <a
      href={GOOGLE_AUTH_START_URL}
      onClick={onClick}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-3 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-5 font-semibold text-ds-ink transition-colors hover:bg-ds-surface-sunken',
        dsFocusRing,
      )}
    >
      <GoogleMark size={20} />
      {label}
    </a>
  )
}

/** Separatore «oppure con email»: due hairline e la didascalia in caption. */
export function DsDivider({ children = 'oppure con email' }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span aria-hidden className="h-px flex-1 bg-ds-line" />
      <span className="ds-caption text-ds-ink-muted">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-ds-line" />
    </div>
  )
}
