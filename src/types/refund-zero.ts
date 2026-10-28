/**
 * «Rimborso 0-0» (§14.279-§14.280, §14.288): back a score at the refunding
 * bookmaker (bet365), lay the same score and lay the 0-0 on the exchange
 * (Sportmarket): three legs, one profit whatever the result. Mirrors the
 * backend (resources/odds-collection/tools/refund-zero.service.ts).
 */

export interface RefundZeroPrice {
  odds: number
  label: string
  /** ISO: when the source last confirmed this price. */
  lastSeenAt: string
}

/** One score both sides price, with the three-leg position for the row's stake. */
export interface RefundZeroLine {
  outcomeKey: string
  /** «1-0» */
  label: string
  back: RefundZeroPrice
  lay: RefundZeroPrice
  /** Lay stake on the score. */
  layStake: number
  layLiability: number
  /** Lay stake on the 0-0. */
  zeroLayStake: number
  zeroLiability: number
  /** What back + lay lose when the score does not come, before the 0-0 leg. */
  qualifyingLoss: number
  /** The profit, the same in the three cases. */
  profit: number
  profitPct: number
  cases: { scoreWins: number; otherResult: number; zeroZero: number }
}

export interface RefundZeroBookmaker {
  id: string
  slug: string
  name: string
  eventUrl: string | null
}

export interface RefundZeroRow {
  eventId: string
  homeName: string | null
  awayName: string | null
  /** ISO kickoff. */
  startTime: string
  sportName: string
  competitionId: string
  competitionName: string
  nationName: string | null
  nationCode: string | null
  backBookmaker: RefundZeroBookmaker
  layBookmaker: RefundZeroBookmaker
  stake: number
  commission: number
  best: RefundZeroLine
  /** Every score both sides price, best first. */
  lines: RefundZeroLine[]
  zeroZero: { lay: RefundZeroPrice; back: RefundZeroPrice | null }
  /** ISO: the oldest of the three prices of the best line. */
  lastSeenAt: string
  staleAfterSeconds: number
}

export interface RefundZeroCompetition {
  id: string
  name: string
  nationName: string | null
  nationCode: string | null
  sportName: string
  results: number
}

export interface RefundZeroMeta {
  totalResults: number
  stake: number
  commission: number
  backBookmakers: Array<{ slug: string; name: string }>
  layBookmakers: Array<{ slug: string; name: string }>
  competitions: RefundZeroCompetition[]
}

export interface RefundZeroResponse {
  results: RefundZeroRow[]
  total: number
  calculatedAt: string
  meta: RefundZeroMeta
}

export interface RefundZeroFilters {
  search?: string
  /** Comma-separated od_competitions ids. */
  competitions?: string
  stake?: number
  /** 0.02 = 2 % (the backend also reads «2» as 2 %). */
  commission?: number
  /** Profit in money on the best line. */
  min_profit?: number
  /** ISO bounds on the kickoff: the page sends whole local days. */
  start_time_from?: string
  start_time_to?: string
  sort_by?: 'profit' | 'start_time'
  sort_dir?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}
