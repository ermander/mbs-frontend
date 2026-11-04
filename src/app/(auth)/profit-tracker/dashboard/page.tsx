'use client'

import { DashboardView } from '@/components/profit-tracker/dashboard/dashboard-view'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/** La Dashboard del tracker dal design OddWise (§14.336), nel guscio chiaro delle Giocate. */
export default function ProfitTrackerDashboardPage() {
  return (
    <GiocateDsShell>
      <DashboardView />
    </GiocateDsShell>
  )
}
