import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { offerFromCard } from '@/lib/offer-editor'
import { fetchPublishedOffersPage } from '@/lib/offers-api'
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
 * pagina lo dice, invece di mostrare un elenco vuoto che sembrerebbe «nessuna offerta». Solo per
 * chi è entrato (§14.315): dal §14.324 la pagina sta nel gruppo (auth), quindi la guard e la
 * Topnav col menu utente vengono dal layout, non più dal guscio pubblico con «Accedi»; un 401
 * della lettura (access_token scaduto) viene risolto da OffersLoadError rinnovando la sessione.
 */
export default async function OffertePage({ searchParams }: OffertePageProps) {
  const params = await searchParams
  const type = parseOfferType(params.tipo)
  const book = parseOfferBook(params.sito)
  const page = parseOffersPage(params.pagina)
  const result = await fetchPublishedOffersPage(type, book === ALL_BOOKS ? null : book, page)
  if (result.ok && result.data.page !== page) redirect(offersListHref(type, book, result.data.page))

  return (
    <DsPageShell>
      <DsContainer className="flex flex-col gap-8 pt-6 pb-16">
        <h1 className="sr-only">{OFFERS_COPY.title}</h1>
        {result.ok ? (
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
