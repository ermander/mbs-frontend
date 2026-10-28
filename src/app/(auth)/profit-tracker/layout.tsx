'use client'

import { usePathname } from 'next/navigation'

import { Container } from '@/components/ui/container'

/**
 * Pagine del tracker già sul design OddWise (§14.281, dettaglio §14.283): a tutta larghezza,
 * la colonna la fanno loro.
 */
const DS_PAGES = new Set([
  '/profit-tracker/giocate',
  '/profit-tracker/giocate-in-corso',
  '/profit-tracker/giocate-rapide',
])
const DS_BET_DETAIL = /^\/profit-tracker\/giocate-in-corso\/[^/]+$/

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (DS_PAGES.has(pathname) || DS_BET_DETAIL.test(pathname)) return <>{children}</>
  return <Container className="max-w-screen-2xl">{children}</Container>
}
