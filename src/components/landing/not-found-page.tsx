import { LANDING_ROUTES } from '@/lib/landing-content'
import { DsButton, DsContainer, DsEyebrow } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'

/** 404 pubblica: stessa grammatica della landing, una CTA primaria e una secondaria. */
export function NotFoundPage() {
  return (
    <SiteShell>
      <DsContainer className="flex flex-col items-start gap-6 py-24 lg:py-32">
        <DsEyebrow>Errore 404</DsEyebrow>
        <h1 className="ds-display">Pagina non trovata</h1>
        <p className="ds-body-lg max-w-[48ch] text-ds-ink-muted">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="flex flex-wrap gap-3">
          <DsButton href={LANDING_ROUTES.home} variant="primary">
            Torna alla home
          </DsButton>
          <DsButton href={LANDING_ROUTES.contatti}>Contatti</DsButton>
        </div>
      </DsContainer>
    </SiteShell>
  )
}
