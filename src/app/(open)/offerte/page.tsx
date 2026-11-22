import { redirect } from 'next/navigation'

import {
  offersListHref,
  parseOfferBook,
  parseOfferType,
  parseOffersPage,
} from '@/lib/offers-content'

interface OffertePageProps {
  searchParams: Promise<{
    tipo?: string | string[]
    sito?: string | string[]
    pagina?: string | string[]
  }>
}

/**
 * /offerte (§14.358): dal ClickUp «Dividere sezioni offerte» benvenuto, ricorrenti ed esclusive
 * sono tre pagine (/offerte/<tipo>, components/offers/offers-page.tsx), scelte dalla tendina
 * «Offerte» della barra. Questo indirizzo resta per i link della barra della landing, del piè di
 * pagina e per quelli salvati: rimanda alla pagina del tipo, il benvenuto se ?tipo= manca, e
 * porta con sé sito e pagina dei vecchi /offerte?tipo=&sito=&pagina= (§14.345).
 */
export default async function OffertePage({ searchParams }: OffertePageProps) {
  const params = await searchParams
  redirect(
    offersListHref(
      parseOfferType(params.tipo),
      parseOfferBook(params.sito),
      parseOffersPage(params.pagina),
    ),
  )
}
