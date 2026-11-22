import {
  OffersTypePage,
  offersPageMetadata,
  type OffersPageSearchParams,
} from '@/components/offers/offers-page'

export const metadata = offersPageMetadata('benvenuto')

/** /offerte/benvenuto (§14.358): l'elenco delle offerte di benvenuto. */
export default function OfferteBenvenutoPage({
  searchParams,
}: {
  searchParams: Promise<OffersPageSearchParams>
}) {
  return <OffersTypePage type="benvenuto" searchParams={searchParams} />
}
