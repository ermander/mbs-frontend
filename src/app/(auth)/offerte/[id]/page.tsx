import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { offerFromCard, romeToday } from '@/lib/offer-editor'
import { fetchPublishedOffer } from '@/lib/offers-api'
import { OFFERS_COPY } from '@/lib/offers-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { DsContainer } from '@/components/landing/ds-primitives'
import { OfferDetail } from '@/components/offers/offer-detail'
import { OffersLoadError } from '@/components/offers/offers-load-error'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const result = await fetchPublishedOffer((await params).id)
  if (result.ok) return { title: `${result.data.bookmakerName}: ${result.data.title}` }
  return { title: result.status === 404 ? 'Offerta non trovata' : OFFERS_COPY.title }
}

/**
 * Dettaglio di un'offerta (§14.260): l'offerta pubblicata e la sua guida dal database (§14.263).
 * 404 (la not-found di questa cartella, dentro la Topnav) se lo slug non c'è o l'offerta è bozza
 * o nascosta; se il backend non risponde, un avviso. La data «Aggiornata il» è il giorno di
 * updatedAt a Roma. Solo per chi è entrato (§14.315): dal §14.324 la pagina sta nel gruppo
 * (auth), con guard e Topnav dal layout; senza sessione il backend risponde 401 per qualunque
 * slug, quindi chi non è entrato non scopre nemmeno quali slug esistono.
 */
export default async function OffertaPage({ params }: Params) {
  const result = await fetchPublishedOffer((await params).id)
  if (!result.ok && result.status === 404) notFound()
  return (
    <DsPageShell>
      {result.ok ? (
        <OfferDetail
          offer={offerFromCard(result.data)}
          guide={result.data.guide}
          updatedOn={romeToday(new Date(result.data.updatedAt))}
        />
      ) : (
        <DsContainer className="pb-24 pt-10">
          <OffersLoadError status={result.status} />
        </DsContainer>
      )}
    </DsPageShell>
  )
}
