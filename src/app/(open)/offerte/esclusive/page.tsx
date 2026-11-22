import {
  OffersTypePage,
  offersPageMetadata,
  type OffersPageSearchParams,
} from '@/components/offers/offers-page'

export const metadata = offersPageMetadata('esclusive')

/** /offerte/esclusive (§14.358): l'elenco delle offerte esclusive. */
export default function OfferteEsclusivePage({
  searchParams,
}: {
  searchParams: Promise<OffersPageSearchParams>
}) {
  return <OffersTypePage type="esclusive" searchParams={searchParams} />
}
