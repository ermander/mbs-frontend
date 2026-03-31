'use client'

import { useState } from 'react'

import { Tabs } from '@/components/ui/tabs'
import { GiocateInCorsoContent } from '@/app/(auth)/profit-tracker/giocate-in-corso/page'
import { GiocateRapideContent } from '@/app/(auth)/profit-tracker/giocate-rapide/page'

const tabs = [
  { id: 'in-corso', label: 'In corso' },
  { id: 'rapide', label: 'Rapide' },
]

export default function GiocatePage() {
  const [activeTab, setActiveTab] = useState('in-corso')

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'in-corso' && <GiocateInCorsoContent />}
      {activeTab === 'rapide' && <GiocateRapideContent />}
    </div>
  )
}
