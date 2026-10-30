import type { Metadata } from 'next'
import { Suspense } from 'react'

import { offerFromCard } from '@/lib/offer-editor'
import { fetchPublishedOffers } from '@/lib/offers-api'
import { OFFERS_COPY } from '@/lib/offers-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { DsContainer } from '@/components/landing/ds-primitives'
import { OffersLoadError } from '@/components/offers/offers-load-error'
import { OffersList } from '@/components/offers/offers-list'

export const metadata: Metadata = { title: OFFERS_COPY.title }

/**
 * Elenco delle offerte (§14.259): le pubblicate dal database (§14.263), lette dal server; la
 * scheda aperta viene da ?tipo= (letto da OffersList). Se il backend non risponde la pagina lo
 * dice, invece di mostrare un elenco vuoto che sembrerebbe «nessuna offerta». Solo per chi è
 * entrato (§14.315): dal §14.324 la pagina sta nel gruppo (auth), quindi la guard e la Topnav
 * col menu utente vengono dal layout, non più dal guscio pubblico con «Accedi»; un 401 della
 * lettura (access_token scaduto) viene risolto da OffersLoadError rinnovando la sessione.
 */
export default async function OffertePage() {
  const result = await fetchPublishedOffers()
  return (
    <DsPageShell>
      <DsContainer className="flex flex-col gap-8 pb-16 pt-6">
        <h1 className="sr-only">{OFFERS_COPY.title}</h1>
        {result.ok ? (
          <Suspense>
            <OffersList offers={result.data.map(offerFromCard)} />
          </Suspense>
        ) : (
          <OffersLoadError status={result.status} />
        )}
        <p className="ds-caption pt-6 tracking-[0.02em] text-ds-ink-muted">
          {OFFERS_COPY.responsibleGaming}
        </p>
      </DsContainer>
    </DsPageShell>
  )
}
