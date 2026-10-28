'use client'

import { useState } from 'react'

import { GiocateDsShell, GTabs } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateInCorsoView } from '@/components/profit-tracker/giocate-in-corso/giocate-in-corso-view'
import { GiocateRapideContent } from '@/app/(auth)/profit-tracker/giocate-rapide/page'

type GiocateTab = 'in-corso' | 'rapide'

const tabs: { value: GiocateTab; label: string }[] = [
  { value: 'in-corso', label: 'In corso' },
  { value: 'rapide', label: 'Rapide' },
]

/**
 * La voce «Giocate» del Tracker: le giocate in corso dal design (§14.281) e le rapide di prima,
 * rese chiare dal ponte ds-calc-bridge del guscio.
 */
export default function GiocatePage() {
  const [activeTab, setActiveTab] = useState<GiocateTab>('in-corso')

  return (
    <GiocateDsShell>
      <GTabs label="Giocate" items={tabs} value={activeTab} onChange={setActiveTab} />
      {activeTab === 'in-corso' && <GiocateInCorsoView />}
      {activeTab === 'rapide' && <GiocateRapideContent />}
    </GiocateDsShell>
  )
}
