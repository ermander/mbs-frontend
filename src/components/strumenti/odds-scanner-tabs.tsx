'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { OddsmatcherTable } from '@/components/strumenti/oddsmatcher-table'
import { DutcherTable } from '@/components/strumenti/dutcher-table'
import { SharedFilterBar } from '@/components/strumenti/shared-filter-bar'
import { OddsmatcherMultiplaSaveModal } from '@/components/strumenti/oddsmatcher-multipla-save-modal'
import type { SharedFilters } from '@/types/shared-filters'
import type { MultiplaEvent } from '@/types/multipla-event'
import { multiplaEventKey } from '@/types/multipla-event'

const SCANNER_TABS = [
  { id: 'oddsmatcher', label: 'Oddsmatcher' },
  { id: 'dutcher', label: 'Dutcher' },
] as const

export function OddsScannerTabs() {
  const [activeTab, setActiveTab] = useState<string>('oddsmatcher')

  // ── Shared filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [sharedStake, setSharedStake] = useState('')
  const [sharedBonus, setSharedBonus] = useState('')
  const [sharedRimborso, setSharedRimborso] = useState('')
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [minOdds, setMinOdds] = useState('')
  const [maxOdds, setMaxOdds] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minLiquidity, setMinLiquidity] = useState('')
  const [minRating, setMinRating] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [multiplaOpen, setMultiplaOpen] = useState(false)

  // ── Multipla shared params ──
  const [multiplaNumEventi, setMultiplaNumEventi] = useState(2)
  const [multiplaQuotaMinEvento, setMultiplaQuotaMinEvento] = useState('')
  const [multiplaQuotaMaxEvento, setMultiplaQuotaMaxEvento] = useState('')
  const [multiplaQuotaMinTotale, setMultiplaQuotaMinTotale] = useState('1.00')
  const [multiplaDataInizio, setMultiplaDataInizio] = useState('')
  const [multiplaDataFine, setMultiplaDataFine] = useState('')
  const [multiplaSelectedEvents, setMultiplaSelectedEvents] = useState<MultiplaEvent[]>([])
  const [multiplaSportIds, setMultiplaSportIds] = useState<string[]>([])

  const toggleMultiplaEvent = (event: MultiplaEvent) => {
    const key = multiplaEventKey(event)
    setMultiplaSelectedEvents((prev) => {
      const exists = prev.some((e) => multiplaEventKey(e) === key)
      if (exists) return prev.filter((e) => multiplaEventKey(e) !== key)
      if (prev.length < multiplaNumEventi) return [...prev, event]
      return prev
    })
  }

  const eliminaMultipla = () => {
    setMultiplaSelectedEvents([])
  }

  // Sports/markets available from each table (communicated via callback)
  const [oddsSports, setOddsSports] = useState<string[]>([])
  const [oddsMarkets, setOddsMarkets] = useState<string[]>([])
  const [dutcherSports, setDutcherSports] = useState<string[]>([])
  const [dutcherMarkets, setDutcherMarkets] = useState<string[]>([])

  // Merged sports/markets from both tabs
  const allSports = [...new Set([...oddsSports, ...dutcherSports])].sort()
  const allMarkets = [...new Set([...oddsMarkets, ...dutcherMarkets])].sort()

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedSportIds([])
    setSelectedMarkets([])
    setMinLiquidity('')
    setMinRating('')
    setMinOdds('')
    setMaxOdds('')
    setStartDate('')
    setEndDate('')
    setMultiplaNumEventi(2)
    setMultiplaQuotaMinEvento('')
    setMultiplaQuotaMaxEvento('')
    setMultiplaQuotaMinTotale('1.00')
    setMultiplaDataInizio('')
    setMultiplaDataFine('')
  }

  // ── Multipla save modal ──
  const [multiplaSaveModalOpen, setMultiplaSaveModalOpen] = useState(false)

  const resetMultiplaFilters = () => {
    setMultiplaNumEventi(2)
    setMultiplaQuotaMinEvento('')
    setMultiplaQuotaMaxEvento('')
    setMultiplaQuotaMinTotale('1.00')
    setMultiplaDataInizio('')
    setMultiplaDataFine('')
    setMultiplaSportIds([])
  }

  const shared: SharedFilters = {
    searchQuery,
    setSearchQuery,
    sharedStake,
    setSharedStake,
    sharedBonus,
    setSharedBonus,
    sharedRimborso,
    setSharedRimborso,
    selectedSportIds,
    setSelectedSportIds,
    selectedMarkets,
    setSelectedMarkets,
    minOdds,
    setMinOdds,
    maxOdds,
    setMaxOdds,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    minLiquidity,
    setMinLiquidity,
    minRating,
    setMinRating,
    filtersOpen,
    setFiltersOpen,
    multiplaOpen,
    setMultiplaOpen,
    multiplaNumEventi,
    setMultiplaNumEventi,
    multiplaQuotaMinEvento,
    setMultiplaQuotaMinEvento,
    multiplaQuotaMaxEvento,
    setMultiplaQuotaMaxEvento,
    multiplaQuotaMinTotale,
    setMultiplaQuotaMinTotale,
    multiplaDataInizio,
    setMultiplaDataInizio,
    multiplaDataFine,
    setMultiplaDataFine,
    multiplaSelectedEvents,
    setMultiplaSelectedEvents,
    multiplaSportIds,
    setMultiplaSportIds,
    multiplaBookId: multiplaSelectedEvents.length > 0 ? multiplaSelectedEvents[0].bookId1 : null,
    toggleMultiplaEvent,
    eliminaMultipla,
    resetFilters,
    resetMultiplaFilters,
  }

  return (
    <div className="space-y-4">
      <Tabs tabs={[...SCANNER_TABS]} activeTab={activeTab} onTabChange={setActiveTab} />
      <SharedFilterBar
        filters={shared}
        sports={allSports}
        markets={allMarkets}
        onMultiplaSave={() => setMultiplaSaveModalOpen(true)}
      />
      <div className={activeTab === 'oddsmatcher' ? undefined : 'hidden'}>
        <OddsmatcherTable
          filters={shared}
          onMetadata={(s, m) => {
            setOddsSports(s)
            setOddsMarkets(m)
          }}
        />
      </div>
      <div className={activeTab === 'dutcher' ? undefined : 'hidden'}>
        <DutcherTable
          filters={shared}
          onMetadata={(s, m) => {
            setDutcherSports(s)
            setDutcherMarkets(m)
          }}
        />
      </div>
      <OddsmatcherMultiplaSaveModal
        open={multiplaSaveModalOpen}
        onOpenChange={setMultiplaSaveModalOpen}
        selectedEvents={multiplaSelectedEvents}
        bookOddsId={multiplaSelectedEvents.length > 0 ? multiplaSelectedEvents[0].bookId1 : ''}
        exchangeOddsId={multiplaSelectedEvents.length > 0 ? multiplaSelectedEvents[0].bookId2 : ''}
        sharedStake={sharedStake}
        sharedBonus={sharedBonus}
        sharedRimborso={sharedRimborso}
      />
    </div>
  )
}
