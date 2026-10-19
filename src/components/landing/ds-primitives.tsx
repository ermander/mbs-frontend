import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Primitive del design system OddWise (Claude Design, §14.248) per le pagine pubbliche: colonna,
 * pulsante, card, marchio, eyebrow e link nel testo, sui token ds-* di globals.css. Le pagine di
 * accesso e la barra dell'area autenticata usano ancora landing-primitives (grammatica «Linear»).
 */

/** Anello di fuoco del design: due anelli (superficie e brand) al posto dell'outline. */
export const dsFocusRing = 'focus-visible:outline-none focus-visible:shadow-ds-focus'

/** Colonna della pagina: 1200px con 24px di margine interno (20px sul telefono). */
export function DsContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-6', className)}>{children}</div>
  )
}

export type DsButtonVariant = 'primary' | 'secondary' | 'ghost'
export type DsButtonSize = 'sm' | 'md' | 'lg'

const buttonVariant: Record<DsButtonVariant, string> = {
  /** Il pieno in brand: al massimo una volta per vista. */
  primary:
    'border-ds-brand bg-ds-brand text-ds-on-brand hover:border-ds-brand-hover hover:bg-ds-brand-hover',
  secondary:
    'border-ds-line-strong bg-ds-surface-raised text-ds-ink shadow-ds-sm hover:bg-ds-surface-sunken',
  ghost:
    'border-transparent bg-transparent text-ds-brand hover:bg-ds-brand-soft hover:text-ds-brand-hover',
}

const buttonSize: Record<DsButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-[17px]',
}

/** Le classi del Button del design, per chi deve renderlo come <button> (i form di accesso, §14.252). */
export function dsButtonClass(variant: DsButtonVariant, size: DsButtonSize, block?: boolean) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ds-sm border font-semibold leading-none transition-colors',
    block && 'flex w-full',
    buttonVariant[variant],
    buttonSize[size],
    dsFocusRing,
  )
}

/** Pulsante del design, qui sempre un link: 40px, peso 600, raggio 6px, freccia opzionale in coda. */
export function DsButton({
  href,
  variant = 'secondary',
  size = 'md',
  block,
  iconEnd,
  className,
  children,
}: {
  href: string
  variant?: DsButtonVariant
  size?: DsButtonSize
  block?: boolean
  iconEnd?: 'arrow-right'
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={cn(dsButtonClass(variant, size, block), className)}>
      {children}
      {iconEnd === 'arrow-right' && (
        <ArrowRight className={cn('shrink-0', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
      )}
    </Link>
  )
}

/** Il contenitore di base: surface-raised, bordo line, raggio 10px (16px da lg), ombra leggera. */
export function DsCard({
  title,
  size,
  flush,
  className,
  children,
}: {
  title?: string
  size?: 'lg'
  /** Senza padding: per una tabella che riempie la card. */
  flush?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'border border-ds-line bg-ds-surface-raised shadow-ds-sm',
        size === 'lg' ? 'rounded-ds-lg p-6' : 'rounded-ds-md p-5',
        flush && 'p-0',
        className,
      )}
    >
      {title && <h3 className="ds-heading mb-2">{title}</h3>}
      {children}
    </div>
  )
}

/** Marchio in testo: «Odd» in ink, «Wise» in brand, Source Serif 4 a 600 (classi ds-wordmark in globals.css). */
export function DsWordmark({
  size = 'md',
  tagline,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  tagline?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'ds-wordmark',
        size === 'sm' && 'ds-wordmark-sm',
        size === 'lg' && 'ds-wordmark-lg',
        className,
      )}
    >
      <span className="text-ds-ink">Odd</span>
      <span className="text-ds-brand">Wise</span>
      {tagline && <span className="ds-caption mt-1 block text-ds-ink-muted">{tagline}</span>}
    </span>
  )
}

/** Etichetta di sezione: label 13px maiuscola in ink-muted. */
export function DsEyebrow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <span className={cn('ds-label uppercase text-ds-ink-muted', className)}>{children}</span>
}

/** Link nel testo: brand sottolineato, brand-hover al passaggio. */
export function DsTextLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const cls = cn(
    'rounded-sm text-ds-brand underline underline-offset-2 transition-colors hover:text-ds-brand-hover',
    dsFocusRing,
    className,
  )
  if (href.startsWith('mailto:') || href.startsWith('http')) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  )
}
