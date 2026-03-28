import type { Dispatch, SetStateAction } from 'react'
import type { MultiplaEvent } from '@/types/multipla-event'

export interface SharedFilters {
  searchQuery: string
  setSearchQuery: (v: string) => void
  sharedStake: string
  setSharedStake: (v: string) => void
  sharedBonus: string
  setSharedBonus: (v: string) => void
  sharedRimborso: string
  setSharedRimborso: (v: string) => void
  selectedSportIds: string[]
  setSelectedSportIds: Dispatch<SetStateAction<string[]>>
  selectedMarkets: string[]
  setSelectedMarkets: Dispatch<SetStateAction<string[]>>
  minOdds: string
  setMinOdds: (v: string) => void
  maxOdds: string
  setMaxOdds: (v: string) => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  minLiquidity: string
  setMinLiquidity: (v: string) => void
  minRating: string
  setMinRating: (v: string) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  multiplaOpen: boolean
  setMultiplaOpen: (v: boolean) => void
  multiplaNumEventi: number
  setMultiplaNumEventi: (v: number) => void
  multiplaQuotaMinEvento: string
  setMultiplaQuotaMinEvento: (v: string) => void
  multiplaQuotaMaxEvento: string
  setMultiplaQuotaMaxEvento: (v: string) => void
  multiplaQuotaMinTotale: string
  setMultiplaQuotaMinTotale: (v: string) => void
  multiplaDataInizio: string
  setMultiplaDataInizio: (v: string) => void
  multiplaDataFine: string
  setMultiplaDataFine: (v: string) => void
  multiplaSelectedEvents: MultiplaEvent[]
  setMultiplaSelectedEvents: Dispatch<SetStateAction<MultiplaEvent[]>>
  multiplaSportIds: string[]
  setMultiplaSportIds: Dispatch<SetStateAction<string[]>>
  multiplaBookId: string | null
  toggleMultiplaEvent: (event: MultiplaEvent) => void
  eliminaMultipla: () => void
  resetFilters: () => void
  resetMultiplaFilters: () => void
}
