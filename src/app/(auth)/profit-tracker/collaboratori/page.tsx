'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { CollaboratoriView } from '@/components/profit-tracker/gestione-conti/collaboratori-view'

/** I collaboratori da soli, fuori dalle schede di Gestione conti (§14.350). */
export default function CollaboratoriPage() {
  return (
    <GiocateDsShell>
      <CollaboratoriView />
    </GiocateDsShell>
  )
}
