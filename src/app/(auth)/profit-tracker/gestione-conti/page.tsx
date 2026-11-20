'use client'

import { useState } from 'react'

import { GiocateDsShell, GTabs } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { ContiView } from '@/components/profit-tracker/gestione-conti/conti-view'
import { WalletsContent } from '@/app/(auth)/profit-tracker/wallets/page'
import { CollaboratoriContent } from '@/app/(auth)/profit-tracker/collaboratori/page'

type GestioneTab = 'conti' | 'wallets' | 'collaboratori'

const tabs: { value: GestioneTab; label: string }[] = [
  { value: 'conti', label: 'Conti' },
  { value: 'wallets', label: 'Wallets' },
  { value: 'collaboratori', label: 'Collaboratori' },
]

/** La voce «Gestione conti» del Tracker sul design OddWise (§14.350): conti, wallets e collaboratori. */
export default function GestioneContiPage() {
  const [activeTab, setActiveTab] = useState<GestioneTab>('conti')

  return (
    <GiocateDsShell>
      <GTabs label="Gestione conti" items={tabs} value={activeTab} onChange={setActiveTab} />
      {activeTab === 'conti' && <ContiView />}
      {activeTab === 'wallets' && <WalletsContent />}
      {activeTab === 'collaboratori' && <CollaboratoriContent />}
    </GiocateDsShell>
  )
}
