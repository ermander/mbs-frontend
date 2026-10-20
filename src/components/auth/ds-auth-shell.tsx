import Link from 'next/link'
import { BookOpen, Check, ListChecks, MessagesSquare } from 'lucide-react'

import { BRAND, LANDING_ROUTES, PRICING } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { DsContainer, DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'
import { LandingFooterLink } from '@/components/landing/landing-footer-link'

/** Le tre cose che chi accede ritrova: dal pannello di sinistra del design (Claude Design). */
const RETURN_POINTS = [
  {
    icon: ListChecks,
    title: 'Tracker',
    text: 'Le offerte in corso, i profitti del mese, cosa resta da fare.',
  },
  {
    icon: BookOpen,
    title: 'Guide salvate',
    text: 'Con il passo a cui eri arrivato già segnato.',
  },
  {
    icon: MessagesSquare,
    title: 'Forum',
    text: 'Le risposte alle tue domande e i thread che segui.',
  },
] as const

const DISCLAIMER =
  'OddWise non è un sito di scommesse e non raccoglie scommesse. Il gioco è vietato ai minori di 18 anni e può causare dipendenza patologica.'

/** Pannello di sinistra del login (§14.252): «Riprendi da dove eri rimasto.» e i tre punti di ripresa. */
export function DsLoginAside() {
  return (
    <div>
      <h2 className="ds-display text-ds-brand">Riprendi da dove eri rimasto.</h2>
      <ul className="mt-8 flex flex-col gap-5">
        {RETURN_POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
            <div>
              <div className="ds-subheading">{title}</div>
              <p className="ds-body-sm mt-0.5 text-ds-ink-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Pannello di sinistra della registrazione (§14.253): titolo display, una riga su cosa dà
 * l'account e le quattro voci del piano, le stesse della sezione prezzi della landing.
 */
export function DsRegisterAside() {
  return (
    <div>
      <h2 className="ds-display text-ds-brand [text-wrap:pretty]">
        Il primo bonus lo incassi in mezz&apos;ora.
      </h2>
      <p className="ds-body-lg mt-4 max-w-[52ch] text-ds-ink-muted [text-wrap:pretty]">
        Con l&apos;account salvi le guide, segui le offerte nel tracker e scrivi nel forum. Oggi è
        tutto gratuito, senza carta.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        {PRICING.plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Guscio delle pagine di accesso dal design di Claude Design (§14.252, §14.253): da lg due
 * colonne uguali, a sinistra il pannello in brand-soft con il marchio, il contenuto di `aside`
 * (login o registrazione) e l'avvertenza sul gioco; a destra il contenuto, centrato in
 * verticale. Sotto lg resta solo la colonna del contenuto, con il marchio in testa. Stessi
 * token ds-* e font Source del guscio pubblico (SiteShell), caricati qui e non sull'<html>.
 */
export function DsAuthShell({
  aside = <DsLoginAside />,
  children,
}: {
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope grid min-h-screen bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light] lg:grid-cols-2',
      )}
    >
      <aside className="hidden border-r border-ds-line bg-ds-brand-soft px-16 py-12 lg:flex lg:flex-col lg:justify-between lg:gap-12">
        <Link
          href={LANDING_ROUTES.home}
          aria-label={BRAND.name}
          className={cn('self-start rounded-ds-sm', dsFocusRing)}
        >
          <DsWordmark />
        </Link>
        {aside}
        <p className="ds-caption max-w-[60ch] text-ds-ink-muted [text-wrap:pretty]">{DISCLAIMER}</p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-24 lg:py-16">
        <Link
          href={LANDING_ROUTES.home}
          aria-label={BRAND.name}
          className={cn('mb-10 self-start rounded-ds-sm lg:hidden', dsFocusRing)}
        >
          <DsWordmark size="sm" />
        </Link>
        {children}
      </main>
    </div>
  )
}

/** Le voci del piè di pagina del recupero password: le stesse tre del design. */
const CENTERED_FOOTER_LINKS = [
  { href: LANDING_ROUTES.privacy, label: 'Privacy' },
  { href: LANDING_ROUTES.termini, label: 'Termini' },
  { href: LANDING_ROUTES.contatti, label: 'Contatti' },
] as const

/**
 * Guscio del recupero e della reimposta password dal design di Claude Design (§14.257): barra
 * alta 64px in surface-raised con il marchio a sinistra e `headerAside` a destra, una colonna di
 * 440px al centro della pagina, piè di pagina di una riga con l'avvertenza in caption e Privacy,
 * Termini, Contatti. Stessi token ds-* e font Source di DsAuthShell.
 */
export function DsCenteredAuthShell({
  headerAside,
  children,
}: {
  headerAside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope flex min-h-screen flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light]',
      )}
    >
      <header className="border-b border-ds-line bg-ds-surface-raised">
        <DsContainer className="flex h-16 items-center justify-between gap-4">
          <Link
            href={LANDING_ROUTES.home}
            aria-label={BRAND.name}
            className={cn('shrink-0 rounded-ds-sm', dsFocusRing)}
          >
            <DsWordmark size="sm" />
          </Link>
          {headerAside && (
            <span className="ds-body-sm text-right text-ds-ink-muted">{headerAside}</span>
          )}
        </DsContainer>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      <footer className="border-t border-ds-line bg-ds-surface-raised">
        <DsContainer className="flex flex-wrap items-center justify-between gap-6 py-6">
          <p className="ds-caption max-w-[68ch] text-ds-ink-muted [text-wrap:pretty]">
            {DISCLAIMER}
          </p>
          <nav aria-label="Piè di pagina" className="ds-body-sm flex gap-6 text-ds-ink-muted">
            {CENTERED_FOOTER_LINKS.map((link) => (
              <LandingFooterLink key={link.href} href={link.href}>
                {link.label}
              </LandingFooterLink>
            ))}
          </nav>
        </DsContainer>
      </footer>
    </div>
  )
}

/** «Ti è tornata in mente? Accedi» nella barra del recupero password (§14.257), come nel design. */
export function DsBackToLogin() {
  return (
    <>
      Ti è tornata in mente?{' '}
      <Link
        href={LANDING_ROUTES.login}
        className={cn(
          'rounded-sm text-ds-brand underline underline-offset-2 hover:text-ds-brand-hover',
          dsFocusRing,
        )}
      >
        Accedi
      </Link>
    </>
  )
}
