import type { Metadata } from 'next'
import { Suspense } from 'react'

import { offerFromCard } from '@/lib/offer-editor'
import { fetchPublishedOffers } from '@/lib/offers-api'
import { OFFERS_COPY } from '@/lib/offers-content'
import { DsContainer } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'
import { OffersAccess } from '@/components/offers/offers-access'
import { OffersLoadError } from '@/components/offers/offers-load-error'
import { OffersList } from '@/components/offers/offers-list'

export const metadata: Metadata = { title: OFFERS_COPY.title }

/**
 * Elenco delle offerte (§14.259): le pubblicate dal database (§14.263), lette dal server; la
 * scheda aperta viene da ?tipo= (letto da OffersList). Se il backend non risponde la pagina lo
 * dice, invece di mostrare un elenco vuoto che sembrerebbe «nessuna offerta». Dal §14.315 solo
 * per chi è entrato: OffersAccess rimanda al login, e un 401 della lettura (access_token scaduto)
 * viene risolto da OffersLoadError rinnovando la sessione.
 */
export default async function OffertePage() {
  const result = await fetchPublishedOffers()
  return (
    <OffersAccess>
      <SiteShell>
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
      </SiteShell>
    </OffersAccess>
  )
}
