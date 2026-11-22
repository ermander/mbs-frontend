import {
  OffersTypePage,
  offersPageMetadata,
  type OffersPageSearchParams,
} from '@/components/offers/offers-page'

export const metadata = offersPageMetadata('ricorrenti')

/** /offerte/ricorrenti (§14.358): l'elenco delle offerte ricorrenti. */
export default function OfferteRicorrentiPage({
  searchParams,
}: {
  searchParams: Promise<OffersPageSearchParams>
}) {
  return <OffersTypePage type="ricorrenti" searchParams={searchParams} />
}
