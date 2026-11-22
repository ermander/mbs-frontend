import { SectionGuard } from '@/components/auth/section-guard'

/**
 * §14.366: le pagine delle offerte (elenchi e dettaglio) sono la sezione «Offerte». Chi è
 * entrato senza la sezione vede «Sezione non abilitata»; gli ospiti la versione gratuita.
 */
export default function OffersLayout({ children }: { children: React.ReactNode }) {
  return <SectionGuard section="offers">{children}</SectionGuard>
}
