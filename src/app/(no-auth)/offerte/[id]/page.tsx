import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { guideFor } from '@/lib/offer-guides'
import { SAMPLE_OFFERS, offerById } from '@/lib/offers-content'
import { SiteShell } from '@/components/landing/site-shell'
import { OfferDetail } from '@/components/offers/offer-detail'
import { OffersAccess } from '@/components/offers/offers-access'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const offer = offerById(SAMPLE_OFFERS, (await params).id)
  return { title: offer ? `${offer.bookName}: ${offer.title}` : 'Offerta non trovata' }
}

/** Dettaglio di un'offerta (§14.260): la guida se c'è, altrimenti la testata; 404 per un id sconosciuto. */
export default async function OffertaPage({ params }: Params) {
  const offer = offerById(SAMPLE_OFFERS, (await params).id)
  if (!offer) notFound()
  const sample = guideFor(offer.id)
  return (
    <OffersAccess>
      <SiteShell>
        <OfferDetail offer={offer} guide={sample?.guide ?? null} updatedOn={sample?.updatedOn} />
      </SiteShell>
    </OffersAccess>
  )
}
