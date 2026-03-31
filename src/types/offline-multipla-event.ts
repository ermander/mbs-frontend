export interface OfflineMultiplaEvent {
  id: string
  type: 'punta-banca' | 'punta-punta'
  eventName: string
  date: string
  sport: string
  competition: string
  market: string
  selection: string
  mainOdds: string
  coverOdds: string
  commissionPercent: string
}
