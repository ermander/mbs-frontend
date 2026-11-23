import type { MatchType } from './matcher'

/**
 * «Ricalcola» (ADAPTER_STATUS §14.390): one event read again now from the bookmakers of a
 * combination, on demand. The shapes of POST /odds-collection/recheck.
 */

/** What became of the read of one bookmaker. */
export type RecheckReadOutcome =
  /** Read now and stored. */
  | 'read'
  /** Its competition was read moments ago: not read again, the stored prices are that read. */
  | 'recent'
  /** A scheduled read holds the bookmaker and did not end in time. */
  | 'busy'
  /** The bookmaker is not being read (switched off, reads paused, reader not running). */
  | 'off'
  /** The bookmaker is refusing the reads: calls resume at `retryAt`. */
  | 'circuit_open'
  /** The event is not linked on this bookmaker. */
  | 'not_mapped'
  | 'failed'
  /** The read is taking longer than the request waits; it goes on by itself. */
  | 'timeout'
  | 'unknown'

export type RecheckPriceChange =
  'confirmed' | 'moved' | 'withdrawn' | 'returned' | 'new' | 'unavailable'

export type RecheckNamesOrder = 'as_catalog' | 'reversed' | 'unclear'

export type RecheckFinding =
  | 'not_listed'
  | 'market_not_listed'
  | 'reversed_handled'
  | 'orientation_mismatch'
  | 'sides_look_swapped'
  | 'kickoff_differs'
  | 'price_moved'
  | 'price_withdrawn'
  | 'price_returned'
  | 'price_confirmed'

/** A stored price, before or after the read. */
export interface RecheckPrice {
  odds: number
  /** The lay price, on an exchange. */
  layOdds: number | null
  /** Only 'active' is a playable price. */
  status: string
  lastSeenAt: string
}

export interface RecheckOutcomeRow {
  key: string
  label: string
  before: RecheckPrice | null
  /** null when the bookmaker was not read. */
  after: RecheckPrice | null
  /** null when the bookmaker was not read, or its read did not carry this outcome. */
  change: RecheckPriceChange | null
  /** The outcome as the bookmaker lists it now, in its own words. */
  live: {
    label: string
    marketName: string
    odds: number
    layOdds: number | null
    status: string
  } | null
  /** Median of the other bookmakers on this outcome; null with too few of them. */
  referenceMedian: number | null
}

export interface RecheckBookmaker {
  slug: string
  name: string
  isExchange: boolean
  outcome: RecheckReadOutcome
  /** 'off': paused | disabled | not_running; 'failed': a one-line reason. */
  detail?: string
  retryAt?: string
  readAgeSeconds?: number
  durationMs?: number
  /** Whether the read lists the event; null when the bookmaker was not read. */
  listed: boolean | null
  listing: {
    homeName: string
    awayName: string
    startTime: string
    competitionName: string
  } | null
  mapping: {
    homeName: string | null
    awayName: string | null
    inverted: boolean
    matchMethod: string
    matchStatus: string
  } | null
  namesOrder: RecheckNamesOrder
  /** Bookmaker's kick-off minus ours, in minutes. */
  kickoffDeltaMinutes: number | null
  referenceBooks: number
  outcomes: RecheckOutcomeRow[]
  findings: RecheckFinding[]
}

/** The allowance of on-demand reads of the user. */
export interface RecheckQuota {
  limit: number
  remaining: number
  resetAt: string | null
  windowSeconds: number
}

export interface RecheckRequest {
  eventId: string
  canonicalMarketId: string
  /** Defaults to the legs of `row` on the backend. */
  bookmakers?: string[]
  /** The combination being looked at, to know what became of it. */
  row?: { matchType: MatchType; legs: Array<{ bookmaker: string; outcomeKey: string }> }
}

export interface RecheckResponse {
  eventId: string
  canonicalMarketId: string
  event: {
    homeName: string | null
    awayName: string | null
    startTime: string
    competitionName: string
    sportName: string
  }
  market: {
    marketTypeKey: string
    line: number | null
    handicap: number | null
    periodScope: string | null
    teamScope: string | null
  }
  startedAt: string
  durationMs: number
  bookmakers: RecheckBookmaker[]
  /** The asked combination after the read. */
  row?: { found: boolean; rating: number | null }
  /** False when the combinations could not be recomputed before the answer. */
  matcherApplied: boolean
  quota: RecheckQuota
}
