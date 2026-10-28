'use client'

import { useState } from 'react'

import { GiocateDsShell, GTabs } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateInCorsoView } from '@/components/profit-tracker/giocate-in-corso/giocate-in-corso-view'
import { GiocateRapideView } from '@/components/profit-tracker/giocate-rapide/giocate-rapide-view'

type GiocateTab = 'in-corso' | 'rapide'

const tabs: { value: GiocateTab; label: string }[] = [
  { value: 'in-corso', label: 'In corso' },
  { value: 'rapide', label: 'Rapide' },
]

/**
 * La voce «Giocate» del Tracker: le giocate in corso (§14.281) e le rapide, tutte e due dal design
 * OddWise.
 */
export default function GiocatePage() {
  const [activeTab, setActiveTab] = useState<GiocateTab>('in-corso')

  return (
    <GiocateDsShell>
      <GTabs label="Giocate" items={tabs} value={activeTab} onChange={setActiveTab} />
      {activeTab === 'in-corso' && <GiocateInCorsoView />}
      {activeTab === 'rapide' && <GiocateRapideView />}
    </GiocateDsShell>
  )
}
