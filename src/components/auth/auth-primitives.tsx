import * as React from 'react'
import Link from 'next/link'

import { BRAND, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import {
  LandingContainer,
  TextLink,
  Wordmark,
  landingButtonVariant,
  landingFocusRing,
  type LandingButtonVariant,
} from '@/components/landing/landing-primitives'

/**
 * Guscio delle pagine di accesso (login, registrazione, recupero e reimposta password,
 * verifica email): barra da 64px con il marchio, colonna da 400px al centro. Con `split`
 * la pagina si divide in due da lg: a sinistra un pannello (superficie con hairline), per
 * ora vuoto, che può ospitare `aside`; a destra il form. Stessa grammatica della landing:
 * superfici neutre, bordi hairline, un solo accento.
 */
export function AuthShell({
  split = false,
  aside,
  children,
}: {
  split?: boolean
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ow-bg font-sans tracking-[-0.011em] text-ow-text antialiased">
      <header className="border-b border-ow-line">
        <LandingContainer className="flex h-16 items-center justify-between">
          <Link
            href={LANDING_ROUTES.home}
            aria-label={BRAND.name}
            className={cn('flex items-center gap-2 rounded-ow-btn', landingFocusRing)}
          >
            <Wordmark />
          </Link>
          <Link
            href={LANDING_ROUTES.home}
            className={cn(
              'rounded-ow-btn px-3 py-1.5 text-[13px] text-ow-text-3 transition-colors hover:text-ow-text',
              landingFocusRing,
            )}
          >
            Torna al sito
          </Link>
        </LandingContainer>
      </header>

      <div className={cn('flex flex-1', split && 'lg:grid lg:grid-cols-2')}>
        {split && (
          <aside className="hidden border-r border-ow-line bg-ow-surface lg:flex lg:items-center lg:justify-center lg:p-12">
            {aside}
          </aside>
        )}
        <main className="flex flex-1 justify-center px-5 py-12 sm:px-8 sm:py-16 lg:items-center">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

/** Input di testo: 40px, raggio 6, bordo hairline che si accende a fuoco; rosso solo se non valido. */
export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-ow-btn border border-ow-line-strong bg-white/[0.02] px-3 text-sm text-ow-text transition-colors placeholder:text-ow-text-3',
      'focus-visible:border-ow-text-3 focus-visible:outline-none',
      'aria-[invalid=true]:border-ow-danger',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
AuthInput.displayName = 'AuthInput'

export const AuthLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-[13px] font-medium leading-none text-ow-text-2', className)}
    {...props}
  />
))
AuthLabel.displayName = 'AuthLabel'

export const AuthCheckbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-ow-line-strong bg-transparent accent-ow-accent',
      landingFocusRing,
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
AuthCheckbox.displayName = 'AuthCheckbox'

/** Pulsante dei form (<button>): stesse varianti e misure di LandingButton, 40px per i form. */
export const AuthButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: LandingButtonVariant }
>(({ className, variant = 'accent', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-ow-btn px-4 text-sm font-medium tracking-[-0.011em] transition-[opacity,background-color]',
      landingFocusRing,
      landingButtonVariant[variant],
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
AuthButton.displayName = 'AuthButton'

/** Link nel testo delle pagine di accesso: lo stesso TextLink della landing. */
export const AuthLink = TextLink

/** Area di testo: stesse regole dell'input, altezza minima 120px. */
export const AuthTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[120px] w-full resize-y rounded-ow-btn border border-ow-line-strong bg-white/[0.02] px-3 py-2.5 text-sm leading-[1.5] text-ow-text transition-colors placeholder:text-ow-text-3',
      'focus-visible:border-ow-text-3 focus-visible:outline-none',
      'aria-[invalid=true]:border-ow-danger',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
AuthTextarea.displayName = 'AuthTextarea'

/** Esito di un invio: riquadro hairline con un punto di stato (verde o rosso) e testo 13px. */
export function AuthMessage({
  tone,
  children,
}: {
  tone: 'success' | 'error'
  children: React.ReactNode
}) {
  const error = tone === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-ow-btn border border-ow-line-strong px-3 py-2.5 text-[13px] leading-[1.5]',
        error ? 'text-ow-danger' : 'text-ow-text-2',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full',
          error ? 'bg-ow-danger' : 'bg-ow-success',
        )}
      />
      <span>{children}</span>
    </div>
  )
}

/** Errore di campo sotto l'input. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[13px] leading-[1.4] text-ow-danger">
      {children}
    </p>
  )
}

/** Gruppo etichetta + input + errore. */
export function AuthField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}
