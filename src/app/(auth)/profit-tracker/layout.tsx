'use client'

import { usePathname } from 'next/navigation'

import { Container } from '@/components/ui/container'

/** Pagine del tracker già sul design OddWise (§14.281): a tutta larghezza, la colonna la fanno loro. */
const DS_PAGES = new Set(['/profit-tracker/giocate', '/profit-tracker/giocate-in-corso'])

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (DS_PAGES.has(pathname)) return <>{children}</>
  return <Container className="max-w-screen-2xl">{children}</Container>
}
