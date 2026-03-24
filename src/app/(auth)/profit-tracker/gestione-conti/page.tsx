'use client'

import { useState } from 'react'

import { Tabs } from '@/components/ui/tabs'
import { ContiContent } from '@/app/(auth)/profit-tracker/conti/page'
import { WalletsContent } from '@/app/(auth)/profit-tracker/wallets/page'
import { IntestatariContent } from '@/app/(auth)/profit-tracker/intestatari/page'

const tabs = [
  { id: 'conti', label: 'Conti' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'intestatari', label: 'Intestatari' },
]

export default function GestioneContiPage() {
  const [activeTab, setActiveTab] = useState('conti')

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'conti' && <ContiContent />}
      {activeTab === 'wallets' && <WalletsContent />}
      {activeTab === 'intestatari' && <IntestatariContent />}
    </div>
  )
}
