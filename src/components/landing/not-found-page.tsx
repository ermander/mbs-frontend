import { LANDING_ROUTES } from '@/lib/landing-content'
import { DsButton, DsContainer, DsEyebrow } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'

type NotFoundCta = { href: string; label: string }

/**
 * Il contenuto della 404 nella grammatica della landing: occhiello, display, una riga e due CTA.
 * Va montato in un guscio: SiteShell per la 404 pubblica, DsPageShell dentro l'area autenticata
 * (§14.324, la 404 di un'offerta), dove titolo, riga e CTA primaria dicono cosa manca.
 */
export function NotFoundContent({
  title = 'Pagina non trovata',
  description = 'La pagina che cerchi non esiste o è stata spostata.',
  primary = { href: LANDING_ROUTES.home, label: 'Torna alla home' },
}: {
  title?: string
  description?: string
  primary?: NotFoundCta
}) {
  return (
    <DsContainer className="flex flex-col items-start gap-6 py-24 lg:py-32">
      <DsEyebrow>Errore 404</DsEyebrow>
      <h1 className="ds-display">{title}</h1>
      <p className="ds-body-lg max-w-[48ch] text-ds-ink-muted">{description}</p>
      <div className="flex flex-wrap gap-3">
        <DsButton href={primary.href} variant="primary">
          {primary.label}
        </DsButton>
        <DsButton href={LANDING_ROUTES.contatti}>Contatti</DsButton>
      </div>
    </DsContainer>
  )
}

/** 404 pubblica: stessa grammatica della landing, una CTA primaria e una secondaria. */
export function NotFoundPage() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  )
}
