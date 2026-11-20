import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { offerFromCard, offerFromFreeCard } from '@/lib/offer-editor'
import { fetchFreeOffersPage, fetchPublishedOffersPage } from '@/lib/offers-api'
import {
  ALL_BOOKS,
  OFFERS_COPY,
  offersListHref,
  parseOfferBook,
  parseOfferType,
  parseOffersPage,
} from '@/lib/offers-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { DsContainer } from '@/components/landing/ds-primitives'
import { OffersGuestGate } from '@/components/offers/offers-guest-gate'
import { OffersLoadError } from '@/components/offers/offers-load-error'
import { OffersList } from '@/components/offers/offers-list'

export const metadata: Metadata = { title: OFFERS_COPY.title }

interface OffertePageProps {
  searchParams: Promise<{
    tipo?: string | string[]
    sito?: string | string[]
    pagina?: string | string[]
  }>
}

/**
 * Elenco delle offerte (§14.259): le pubblicate dal database (§14.263), lette dal server. Dal
 * §14.345 una pagina alla volta (10 carte): tipo, sito e pagina vengono dall'indirizzo
 * (?tipo=&sito=&pagina=) e il backend restituisce solo le carte della pagina, con le sezioni e i
 * conteggi intorno; una pagina oltre l'ultima riporta all'ultima. Se il backend non risponde la
 * pagina lo dice, invece di mostrare un elenco vuoto che sembrerebbe «nessuna offerta».
 *
 * §14.351: la pagina sta nel gruppo (open), aperta anche a chi arriva dalla landing senza
 * account (OpenAreaLayout: guard e Topnav per chi è entrato, il guscio della landing per gli
 * altri). Se la lettura da iscritto risponde 401 il server legge l'elenco per gli ospiti
 * (GET /offers/free/page: il benvenuto di Snai intero, le altre carte chiuse e senza sito) e lo
 * passa a OffersGuestGate, che lo mostra a chi non è entrato e fa rinnovare la sessione a un
 * iscritto con l'access_token scaduto (OffersLoadError, come dal §14.315). Il sito
 * dell'indirizzo resta per quel rinnovo, ma gli ospiti non lo usano.
 */
export default async function OffertePage({ searchParams }: OffertePageProps) {
  const params = await searchParams
  const type = parseOfferType(params.tipo)
  const book = parseOfferBook(params.sito)
  const page = parseOffersPage(params.pagina)
  const result = await fetchPublishedOffersPage(type, book === ALL_BOOKS ? null : book, page)
  if (result.ok && result.data.page !== page) redirect(offersListHref(type, book, result.data.page))
  const guest = !result.ok && result.status === 401 ? await fetchFreeOffersPage(type, page) : null
  if (guest?.ok && guest.data.page !== page) redirect(offersListHref(type, book, guest.data.page))

  let content: React.ReactNode
  if (result.ok) {
    content = (
      <OffersList
        type={type}
        book={book}
        page={result.data.page}
        total={result.data.total}
        offers={result.data.offers.map(offerFromCard)}
        sections={result.data.sections}
        activeByType={result.data.activeByType}
        books={result.data.books}
      />
    )
  } else if (guest) {
    content = (
      <OffersGuestGate>
        {guest.ok ? (
          <OffersList
            guest
            type={type}
            book={ALL_BOOKS}
            page={guest.data.page}
            total={guest.data.total}
            offers={guest.data.offers.map(offerFromFreeCard)}
            sections={guest.data.sections}
            activeByType={guest.data.activeByType}
            books={[]}
          />
        ) : (
          <OffersLoadError status={guest.status} />
        )}
      </OffersGuestGate>
    )
  } else {
    content = <OffersLoadError status={result.status} />
  }

  return (
    <DsPageShell>
      <DsContainer className="flex flex-col gap-8 pt-6 pb-16">
        <h1 className="sr-only">{OFFERS_COPY.title}</h1>
        {content}
        <p className="ds-caption pt-6 tracking-[0.02em] text-ds-ink-muted">
          {OFFERS_COPY.responsibleGaming}
        </p>
      </DsContainer>
    </DsPageShell>
  )
}
