'use client'

import { useState } from 'react'

import { Tabs } from '@/components/ui/tabs'
import { GiocateArchiviateContent } from '@/app/(auth)/profit-tracker/giocate-archiviate/page'
import { StoricoMovimentiContent } from '@/app/(auth)/profit-tracker/storico-movimenti/page'

const tabs = [
  { id: 'archiviate', label: 'Giocate archiviate' },
  { id: 'storico', label: 'Storico movimenti' },
]

export default function ArchivioPage() {
  const [activeTab, setActiveTab] = useState('archiviate')

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'archiviate' && <GiocateArchiviateContent />}
      {activeTab === 'storico' && <StoricoMovimentiContent />}
    </div>
  )
}
