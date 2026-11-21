'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { ReportView } from '@/components/profit-tracker/report/report-view'

/** Il Report del tracker sul design OddWise (§14.350), nel guscio chiaro delle Giocate. */
export default function ReportPage() {
  return (
    <GiocateDsShell>
      <ReportView />
    </GiocateDsShell>
  )
}
