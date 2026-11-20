'use client'

import { usePathname } from 'next/navigation'

import { Container } from '@/components/ui/container'

/**
 * Pagine del tracker già sul design OddWise (§14.281, dettaglio §14.283, archiviate §14.298,
 * dashboard §14.336, il resto del tracker §14.350): a tutta larghezza, la colonna la fanno loro.
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
])
const DS_BET_DETAIL = /^\/profit-tracker\/giocate-(in-corso|archiviate)\/[^/]+$/

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (DS_PAGES.has(pathname) || DS_BET_DETAIL.test(pathname)) return <>{children}</>
  return <Container className="max-w-(--breakpoint-2xl)">{children}</Container>
}
