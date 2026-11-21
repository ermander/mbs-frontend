'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { WalletsView } from '@/components/profit-tracker/gestione-conti/wallets-view'

/** I wallet da soli, fuori dalle schede di Gestione conti (§14.350). */
export default function WalletsPage() {
  return (
    <GiocateDsShell>
      <WalletsView />
    </GiocateDsShell>
  )
}
