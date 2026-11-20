import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { offerFromCard, romeToday } from '@/lib/offer-editor'
import { fetchFreeOffer, fetchPublishedOffer, type ApiRead } from '@/lib/offers-api'
import { OFFERS_COPY } from '@/lib/offers-content'
import type { OfferDetailApi } from '@/types/offers'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { DsContainer } from '@/components/landing/ds-primitives'
import { OfferDetail } from '@/components/offers/offer-detail'
import { OffersGuestGate } from '@/components/offers/offers-guest-gate'
import { OffersLoadError } from '@/components/offers/offers-load-error'
import { OffersSignupNotice } from '@/components/offers/offers-signup'

type Params = { params: Promise<{ id: string }> }

/**
 * §14.351: la lettura per la pagina. Da iscritto prima; se risponde 401 (ospite, o access_token
 * scaduto) quella per gli ospiti, che apre solo le guide del benvenuto di Snai: `guest` dice che
 * il contenuto va dietro OffersGuestGate.
 */
async function readOffer(
  slug: string,
): Promise<{ result: ApiRead<OfferDetailApi>; guest: boolean }> {
  const member = await fetchPublishedOffer(slug)
  if (member.ok || member.status !== 401) return { result: member, guest: false }
  return { result: await fetchFreeOffer(slug), guest: true }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { result, guest } = await readOffer((await params).id)
  if (result.ok) return { title: `${result.data.bookmakerName}: ${result.data.title}` }
  return { title: result.status === 404 && !guest ? 'Offerta non trovata' : OFFERS_COPY.title }
}

/**
 * Dettaglio di un'offerta (§14.260): l'offerta pubblicata e la sua guida dal database (§14.263).
 * 404 (la not-found di questa cartella) se lo slug non c'è o l'offerta è bozza o nascosta; se il
 * backend non risponde, un avviso. La data «Aggiornata il» è il giorno di updatedAt a Roma.
 *
 * §14.351: la pagina sta nel gruppo (open). Chi non è entrato legge per intero solo le guide del
 * benvenuto di Snai (GET /offers/free/guide/:slug); per ogni altro slug il backend risponde 404,
 * che esista o no, e la pagina mostra l'invito a iscriversi (mai la 404, che direbbe quali slug
 * esistono). Tutto questo passa da OffersGuestGate: un iscritto con l'access_token scaduto vede
 * «Carico le offerte…» mentre la sessione si rinnova, poi la pagina intera.
 */
export default async function OffertaPage({ params }: Params) {
  const slug = (await params).id
  const { result, guest } = await readOffer(slug)
  if (!result.ok && result.status === 404 && !guest) notFound()

  const detail = result.ok ? (
    <OfferDetail
      offer={offerFromCard(result.data)}
      guide={result.data.guide}
      updatedOn={romeToday(new Date(result.data.updatedAt))}
    />
  ) : guest && result.status === 404 ? (
    <DsContainer>
      <OffersSignupNotice from={`/offerte/${encodeURIComponent(slug)}`} />
    </DsContainer>
  ) : (
    <DsContainer className="pt-10 pb-24">
      <OffersLoadError status={result.status} />
    </DsContainer>
  )

  return (
    <DsPageShell>
      {guest ? (
        <OffersGuestGate renewalClassName="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-24 sm:px-6">
          {detail}
        </OffersGuestGate>
      ) : (
        detail
      )}
    </DsPageShell>
  )
}
