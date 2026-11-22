'use client'

import { DashboardHub } from '@/components/dashboard/dashboard-hub'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/** MOCKUP: la Dashboard come pagina delle scorciatoie, sul design OddWise. */
export default function DashboardPage() {
  return (
    <GiocateDsShell>
      <DashboardHub />
    </GiocateDsShell>
  )
}
