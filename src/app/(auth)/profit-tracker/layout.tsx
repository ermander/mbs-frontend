'use client'

import { usePathname } from 'next/navigation'

import { SectionGuard } from '@/components/auth/section-guard'
import { Container } from '@/components/ui/container'

/**
 * Pagine del tracker già sul design OddWise (§14.281, dettaglio §14.283, archiviate §14.298,
 * dashboard §14.336, il resto del tracker §14.350, Impostazioni e Promemoria §14.361): a tutta
 * larghezza, la colonna la fanno loro.
 */
const DS_PAGES = new Set([
  '/profit-tracker/dashboard',
  '/profit-tracker/report',
  '/profit-tracker/giocate',
  '/profit-tracker/giocate-in-corso',
  '/profit-tracker/giocate-rapide',
  '/profit-tracker/giocate-archiviate',
  '/profit-tracker/archivio',
  '/profit-tracker/gestione-conti',
  '/profit-tracker/conti',
  '/profit-tracker/wallets',
  '/profit-tracker/collaboratori',
  '/profit-tracker/book-personali',
  '/profit-tracker/promemoria',
])
const DS_BET_DETAIL = /^\/profit-tracker\/giocate-(in-corso|archiviate)\/[^/]+$/

/** §14.366: il Tracker è una sezione; senza, «Sezione non abilitata» su ogni sua pagina. */
export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ds = DS_PAGES.has(pathname) || DS_BET_DETAIL.test(pathname)
  return (
    <SectionGuard section="tracker">
      {ds ? children : <Container>{children}</Container>}
    </SectionGuard>
  )
}
