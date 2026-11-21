'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { ContiView } from '@/components/profit-tracker/gestione-conti/conti-view'

/** I conti da soli, fuori dalle schede di Gestione conti (§14.350). */
export default function ContiPage() {
  return (
    <GiocateDsShell>
      <ContiView />
    </GiocateDsShell>
  )
}
