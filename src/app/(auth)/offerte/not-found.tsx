import { LANDING_ROUTES } from '@/lib/landing-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { NotFoundContent } from '@/components/landing/not-found-page'

/**
 * La 404 di un'offerta che non c'è, è bozza o è nascosta (notFound() in [id]/page.tsx): resta
 * nel layout di (auth), con la Topnav e il menu utente, invece della 404 pubblica con «Accedi»
 * (§14.324).
 */
export default function OffertaNotFound() {
  return (
    <DsPageShell>
      <NotFoundContent
        title="Offerta non trovata"
        description="L’offerta che cerchi non esiste o non è più pubblicata."
        primary={{ href: LANDING_ROUTES.offerte, label: 'Torna alle offerte' }}
      />
    </DsPageShell>
  )
}
