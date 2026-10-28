'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateRapideView } from '@/components/profit-tracker/giocate-rapide/giocate-rapide-view'

/** Giocate rapide dal design «OddWise Giocate rapide», tema chiaro ds-*. */
export default function GiocateRapidePage() {
  return (
    <GiocateDsShell>
      <GiocateRapideView />
    </GiocateDsShell>
  )
}
