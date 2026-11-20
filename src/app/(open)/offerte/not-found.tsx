import { LANDING_ROUTES } from '@/lib/landing-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { NotFoundContent } from '@/components/landing/not-found-page'

/**
 * La 404 di un'offerta che non c'è, è bozza o è nascosta (notFound() in [id]/page.tsx): resta
 * nel layout della pagina, con la Topnav e il menu utente, invece della 404 pubblica con
 * «Accedi» (§14.324). Dal §14.346 il layout è quello di (open), e la 404 arriva solo a chi è
 * entrato: a un ospite il backend risponde 404 per qualunque slug che non sia il benvenuto di
 * Snai, e la pagina gli mostra l'invito a iscriversi.
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
