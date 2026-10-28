'use client'

import { notFound, useParams } from 'next/navigation'

import { GiocataView } from '@/components/profit-tracker/giocata/giocata-view'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/** Dettaglio della giocata dal design «OddWise Giocata» (§14.283), tema chiaro ds-*. */
export default function BetDetailPage() {
  const params = useParams<{ betId: string }>()
  const betId = Array.isArray(params.betId) ? params.betId[0] : params.betId
  if (!betId) notFound()
  return (
    <GiocateDsShell>
      {/* La chiave rimonta la vista a ogni giocata: stato di caricamento e bozze ripartono. */}
      <GiocataView key={betId} betId={betId} />
    </GiocateDsShell>
  )
}
