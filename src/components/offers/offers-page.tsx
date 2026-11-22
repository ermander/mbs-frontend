import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { offerFromCard, offerFromFreeCard } from '@/lib/offer-editor'
import { fetchFreeOffersPage, fetchPublishedOffersPage } from '@/lib/offers-api'
import {
  ALL_BOOKS,
  OFFERS_COPY,
  offerTypeInfo,
  offersListHref,
  parseOfferBook,
  parseOffersPage,
  type OfferType,
} from '@/lib/offers-content'
import { DsPageShell } from '@/components/landing/ds-page-shell'
import { DsContainer } from '@/components/landing/ds-primitives'
import { OffersGuestGate } from '@/components/offers/offers-guest-gate'
import { OffersLoadError } from '@/components/offers/offers-load-error'
import { OffersList } from '@/components/offers/offers-list'

/** I parametri dell'indirizzo di una pagina dell'elenco: sito e pagina (§14.345). */
export interface OffersPageSearchParams {
  sito?: string | string[]
  pagina?: string | string[]
}

/** Il titolo della scheda del browser per la pagina di un tipo: «Offerte di benvenuto». */
export function offersPageMetadata(type: OfferType): Metadata {
  return { title: offerTypeInfo(type).title }
}

/**
 * La pagina dell'elenco di un tipo di offerta (§14.358): /offerte/benvenuto, /offerte/ricorrenti
 * e /offerte/esclusive la montano col loro tipo. Fino al §14.357 era l'unica pagina /offerte, col
 * tipo scelto da una select (?tipo=); oggi il tipo lo dà il percorso, la pagina ha il suo titolo
 * con a destra il filtro per sito, e /offerte rimanda qui.
 *
 * Elenco delle offerte (§14.259): le pubblicate dal database (§14.263), lette dal server. Dal
 * §14.345 una pagina alla volta (10 carte): sito e pagina vengono dall'indirizzo (?sito=&pagina=)
 * e il backend restituisce solo le carte della pagina, con le sezioni e i conteggi intorno; una
 * pagina oltre l'ultima riporta all'ultima. Se il backend non risponde la pagina lo dice, invece
 * di mostrare un elenco vuoto che sembrerebbe «nessuna offerta».
 *
 * §14.351: la pagina sta nel gruppo (open), aperta anche a chi arriva dalla landing senza
 * account (OpenAreaLayout: guard e Topnav per chi è entrato, il guscio della landing per gli
 * altri). Se la lettura da iscritto risponde 401 il server legge l'elenco per gli ospiti
 * (GET /offers/free/page: il benvenuto di Snai intero, le altre carte chiuse e senza sito) e lo
 * passa a OffersGuestGate, che lo mostra a chi non è entrato e fa rinnovare la sessione a un
 * iscritto con l'access_token scaduto (OffersLoadError, come dal §14.315). Il sito
 * dell'indirizzo resta per quel rinnovo, ma gli ospiti non lo usano.
 */
export async function OffersTypePage({
  type,
  searchParams,
}: {
  type: OfferType
  searchParams: Promise<OffersPageSearchParams>
}) {
  const params = await searchParams
  const book = parseOfferBook(params.sito)
  const page = parseOffersPage(params.pagina)
  const result = await fetchPublishedOffersPage(type, book === ALL_BOOKS ? null : book, page)
  if (result.ok && result.data.page !== page) redirect(offersListHref(type, book, result.data.page))
  const guest = !result.ok && result.status === 401 ? await fetchFreeOffersPage(type, page) : null
  if (guest?.ok && guest.data.page !== page) redirect(offersListHref(type, book, guest.data.page))

  const info = offerTypeInfo(type)
  // Il titolo della pagina sta a sinistra sulla riga del filtro per sito, che è dentro OffersList
  // (§14.358): quando l'elenco non c'è (errore, rinnovo della sessione) la pagina lo mostra da sola.
  const header = <h1 className="ds-title m-0 min-w-0">{info.title}</h1>

  let content: React.ReactNode
  if (result.ok) {
    content = (
      <OffersList
        header={header}
        type={type}
        book={book}
        page={result.data.page}
        total={result.data.total}
        offers={result.data.offers.map(offerFromCard)}
        sections={result.data.sections}
        books={result.data.books}
      />
    )
  } else if (guest?.ok) {
    content = (
      <OffersGuestGate>
        <OffersList
          guest
          header={header}
          type={type}
          book={ALL_BOOKS}
          page={guest.data.page}
          total={guest.data.total}
          offers={guest.data.offers.map(offerFromFreeCard)}
          sections={guest.data.sections}
          books={[]}
        />
      </OffersGuestGate>
    )
  } else {
    content = (
      <>
        {header}
        {guest ? (
          <OffersGuestGate>
            <OffersLoadError status={guest.status} />
          </OffersGuestGate>
        ) : (
          <OffersLoadError status={result.status} />
        )}
      </>
    )
  }

  return (
    <DsPageShell>
      <DsContainer className="flex flex-col gap-8 pt-6 pb-16">
        {content}
        <p className="ds-caption pt-6 tracking-[0.02em] text-ds-ink-muted">
          {OFFERS_COPY.responsibleGaming}
        </p>
      </DsContainer>
    </DsPageShell>
  )
}
