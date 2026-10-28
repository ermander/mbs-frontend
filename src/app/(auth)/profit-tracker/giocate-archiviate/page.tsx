'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateArchiviateView } from '@/components/profit-tracker/giocate-archiviate/giocate-archiviate-view'

/** Le giocate archiviate dal design OddWise (§14.298); la scheda «Giocate archiviate» di Archivio. */
export default function GiocateArchiviatePage() {
  return (
    <GiocateDsShell>
      <GiocateArchiviateView />
    </GiocateDsShell>
  )
}
