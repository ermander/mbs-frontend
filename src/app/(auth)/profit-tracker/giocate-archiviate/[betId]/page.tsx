'use client'

import { notFound, useParams } from 'next/navigation'

import { GiocataView } from '@/components/profit-tracker/giocata/giocata-view'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/**
 * Dettaglio della giocata archiviata sul design OddWise (§14.350): la vista della giocata in corso
 * (§14.283) in sola lettura, nel guscio chiaro.
 */
export default function ArchivedBetDetailPage() {
  const params = useParams<{ betId: string }>()
  const betId = Array.isArray(params.betId) ? params.betId[0] : params.betId
  if (!betId) notFound()
  return (
    <GiocateDsShell>
      <GiocataView key={betId} betId={betId} archivedView />
    </GiocateDsShell>
  )
}
