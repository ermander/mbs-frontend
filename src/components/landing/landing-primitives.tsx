import Link from 'next/link'

import { BRAND } from '@/lib/landing-content'
import { cn } from '@/lib/utils'

/** Colonna della landing: 1200px nel mockup a 1440, 20px di margine sul telefono. */
export function LandingContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-8 xl:px-0', className)}>
      {children}
    </div>
  )
}

/** Eyebrow di sezione: mono 12px maiuscolo in grigio, mai in accento. */
export function Eyebrow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'font-ow-mono text-xs font-normal uppercase tracking-[0.02em] text-ow-text-3',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  size = 'lg',
  className,
}: {
  eyebrow: string
  title: string
  text?: string
  /** lg = 40px (sezioni), md = 32px (piani surebet). */
  size?: 'lg' | 'md'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className ?? 'max-w-[760px]')}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {/* Il leading va DOPO le classi text-[...]: per tailwind-merge una misura di testo
          sovrascrive il line-height (come text-lg), e messo prima verrebbe scartato. */}
      <h2
        className={cn(
          size === 'lg'
            ? 'text-[28px] sm:text-[32px] lg:text-[40px]'
            : 'text-2xl sm:text-[28px] lg:text-[32px]',
          'font-medium leading-[1.1] tracking-[-0.022em] text-ow-text',
        )}
      >
        {title}
      </h2>
      {text && <p className="text-[15px] leading-[1.6] text-ow-text-3 lg:text-base">{text}</p>}
    </div>
  )
}

export type LandingButtonVariant = 'accent' | 'neutral' | 'white' | 'ghost'

export const landingButtonVariant: Record<LandingButtonVariant, string> = {
  /** CTA primaria: l'unico pulsante cromatico della vista. */
  accent: 'bg-ow-accent text-ow-on-accent hover:opacity-90',
  /** Pillola neutra della nav: chiara sul dark, scura nel tema light. */
  neutral: 'bg-ow-neutral text-ow-on-neutral hover:opacity-90',
  /** Alias di neutral, tenuto per compatibilità con i chiamanti. */
  white: 'bg-ow-neutral text-ow-on-neutral hover:opacity-90',
  /** Secondario: trasparente con bordo hairline. */
  ghost: 'border border-ow-line-strong bg-transparent text-ow-text hover:bg-white/[0.04]',
}

export const landingFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ow-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ow-bg'

/** Pulsante della landing: 36px, 14px medium, raggio 6px. L'altezza la può forzare il chiamante. */
export function LandingButton({
  href,
  variant,
  className,
  children,
}: {
  href: string
  variant: LandingButtonVariant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-9 items-center justify-center whitespace-nowrap rounded-ow-btn px-4 text-sm font-medium tracking-[-0.011em] transition-[opacity,background-color]',
        landingFocusRing,
        landingButtonVariant[variant],
        className,
      )}
    >
      {children}
    </Link>
  )
}

/** Link nel testo: grigio chiaro sottolineato con l'hairline, bianco al passaggio. Mai in accento. */
export function TextLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const cls = cn(
    'rounded-sm text-ow-text-2 underline decoration-ow-line-strong underline-offset-4 transition-colors hover:text-ow-text hover:decoration-ow-text-3',
    landingFocusRing,
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

/** Marchio OddWise: anello e punto monocromi, nome in Bricolage Grotesque 800 (l'unico extrabold). */
export function Wordmark({ size = 'nav' }: { size?: 'nav' | 'footer' }) {
  const mark = size === 'nav' ? 'h-6 w-6' : 'h-5 w-5'
  const text = size === 'nav' ? 'text-[20px]' : 'text-lg'
  return (
    <>
      <svg
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
        className={cn('shrink-0 text-ow-text', mark)}
      >
        <circle cx="17" cy="17" r="14" stroke="currentColor" strokeWidth="4" />
        <circle cx="17" cy="17" r="5" fill="currentColor" />
      </svg>
      <span className={cn('font-ow-display font-extrabold tracking-[-0.03em] text-ow-text', text)}>
        {BRAND.name}
      </span>
    </>
  )
}
