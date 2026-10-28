'use client'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateInCorsoView } from '@/components/profit-tracker/giocate-in-corso/giocate-in-corso-view'

/** Giocate in corso dal design «OddWise Giocate in corso» (§14.281), tema chiaro ds-*. */
export default function GiocateInCorsoPage() {
  return (
    <GiocateDsShell>
      <GiocateInCorsoView />
    </GiocateDsShell>
  )
}
