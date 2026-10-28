'use client'

import { useState } from 'react'

import { GiocateDsShell, GTabs } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { GiocateArchiviateView } from '@/components/profit-tracker/giocate-archiviate/giocate-archiviate-view'
import { StoricoMovimentiContent } from '@/app/(auth)/profit-tracker/storico-movimenti/page'

type ArchivioTab = 'archiviate' | 'storico'

const tabs: { value: ArchivioTab; label: string }[] = [
  { value: 'archiviate', label: 'Giocate archiviate' },
  { value: 'storico', label: 'Storico movimenti' },
]

/**
 * La voce «Archivio» del Tracker: le giocate archiviate dal design OddWise (§14.298) e lo storico
 * dei movimenti, che resta quello di prima dentro il guscio chiaro.
 */
export default function ArchivioPage() {
  const [activeTab, setActiveTab] = useState<ArchivioTab>('archiviate')

  return (
    <GiocateDsShell>
      <GTabs label="Archivio" items={tabs} value={activeTab} onChange={setActiveTab} />
      {activeTab === 'archiviate' && <GiocateArchiviateView />}
      {activeTab === 'storico' && <StoricoMovimentiContent />}
    </GiocateDsShell>
  )
}
