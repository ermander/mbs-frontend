import type { TeamScope } from '@/lib/calculators/markets'

export interface OfflineMultiplaEvent {
  id: string
  type: 'punta-banca' | 'punta-punta'
  eventName: string
  date: string
  sport: string
  competition: string
  /** Value id di MarketOption (es. 'TOTAL_CORNERS:OVER:8.5'), '' se non selezionato */
  market: string
  /** Squadra a cui si riferisce il mercato, solo per i mercati squadra */
  marketScope: TeamScope | ''
  mainOdds: string
  coverOdds: string
  commissionPercent: string
}
