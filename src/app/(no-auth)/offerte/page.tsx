import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OFFERS_COPY, SAMPLE_OFFERS } from '@/lib/offers-content'
import { DsContainer } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'
import { OffersAccess } from '@/components/offers/offers-access'
import { OffersList } from '@/components/offers/offers-list'

export const metadata: Metadata = { title: OFFERS_COPY.title }

/** Elenco delle offerte (§14.259); la scheda aperta viene da ?tipo= (letto da OffersList). */
export default function OffertePage() {
  return (
    <OffersAccess>
      <SiteShell>
        <DsContainer className="flex flex-col gap-8 pb-16 pt-6">
          <h1 className="sr-only">{OFFERS_COPY.title}</h1>
          <Suspense>
            <OffersList offers={SAMPLE_OFFERS} />
          </Suspense>
          <p className="ds-caption pt-6 tracking-[0.02em] text-ds-ink-muted">
            {OFFERS_COPY.responsibleGaming}
          </p>
        </DsContainer>
      </SiteShell>
    </OffersAccess>
  )
}
