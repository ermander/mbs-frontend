import { describe, expect, it } from 'vitest'
import type { MatcherResult } from '@/types/matcher'
import { matcherRowKey } from './format'
import {
  localDateHour,
  matcherRowToMultiplaEvent,
  multiplaEligibility,
  multiplaSummary,
} from './multipla'

function row(overrides: Partial<MatcherResult>): MatcherResult {
  return {
    eventId: 'ev-1',
    marketTypeKey: 'over_under',
    line: 2.5,
    matchType: 'back_lay',
    legs: [],
    rating: 100,
    homeName: 'Genoa',
    awayName: 'Como',
    startTime: '2026-09-20T18:45:00.000Z',
    sportName: 'Football',
    competitionName: 'Serie A',
    nationName: 'Italy',
    nationCode: 'IT',
    ...overrides,
  }
}

const leg = (slug: string, outcomeLabel: string, odds: number, isExchange?: boolean) => ({
  bookmakerId: slug,
  bookmakerSlug: slug,
  bookmakerName: slug === 'betfair' ? 'Betfair Exchange' : slug,
  outcomeKey: outcomeLabel.replace(/^(BACK|LAY) /, '').toLowerCase(),
  outcomeLabel,
  odds,
  isExchange,
})

const backLay = row({
  legs: [leg('sisal', 'BACK Over', 2.05, false), leg('betfair', 'LAY Over', 2.02, true)],
})
const dutchBook = row({
  eventId: 'ev-2',
  matchType: 'dutch_2way',
  startTime: '2026-09-21T18:45:00.000Z',
  homeName: 'Lazio',
  awayName: 'Roma',
  legs: [leg('sisal', 'Over', 2.05, false), leg('bwin', 'Under', 1.85, false)],
})
const dutchExchange = row({
  eventId: 'ev-3',
  matchType: 'dutch_2way',
  startTime: '2026-09-22T18:45:00.000Z',
  homeName: 'Arsenal',
  awayName: 'Chelsea',
  legs: [leg('betfair', 'Over', 2.146, true), leg('sisal', 'Under', 1.85, false)],
})
const threeWay = row({
  eventId: 'ev-4',
  matchType: 'dutch_3way',
  legs: [leg('bwin', '1', 2.1), leg('sisal', 'X', 3.4), leg('betsson', '2', 3.6)],
})

describe('matcherRowToMultiplaEvent', () => {
  it('back/lay with the book on the BACK leg: a punta-banca event with the lay as cover', () => {
    const ev = matcherRowToMultiplaEvent(backLay, 'sisal', null, 4.5)
    expect(ev).toMatchObject({
      type: 'punta-banca',
      sport: 'calcio',
      home: 'Genoa',
      away: 'Como',
      market: 'O/U 2.5',
      selection: 'Over',
      mainOdd: '2.05',
      coverOdd: '2.02',
      bookId1: 'sisal',
      bookId2: 'betfair',
      commissionPercent: 4.5,
      coverIsExchange: true,
      startTimeIso: '2026-09-20T18:45:00.000Z',
    })
    expect(matcherRowToMultiplaEvent(backLay, 'betfair', null, 4.5)).toBeNull()
  })

  it('dutch with the book on either leg: a punta-punta event, the other leg as cover', () => {
    const ev = matcherRowToMultiplaEvent(dutchBook, 'sisal', null, 4.5)
    expect(ev).toMatchObject({
      type: 'punta-punta',
      selection: 'Over',
      mainOdd: '2.05',
      coverOdd: '1.85',
      coverOddGross: '1.85',
      bookId2: 'bwin',
      commissionPercent: 0,
      coverSelection: 'Under',
      coverIsExchange: false,
    })
    const fromBwin = matcherRowToMultiplaEvent(dutchBook, 'bwin', null, 4.5)
    expect(fromBwin).toMatchObject({
      selection: 'Under',
      mainOdd: '1.85',
      coverOdd: '2.05',
      bookId1: 'bwin',
      bookId2: 'sisal',
    })
  })

  it('a cover on an exchange keeps the net price for the maths and the gross one for the payload', () => {
    const ev = matcherRowToMultiplaEvent(dutchExchange, 'sisal', null, 4.5)
    expect(ev).toMatchObject({
      type: 'punta-punta',
      selection: 'Under',
      coverOdd: '2.146',
      coverOddGross: '2.20',
      coverIsExchange: true,
      commissionPercent: 4.5,
      bookId2: 'betfair',
    })
  })

  it('three-way rows and rows without the book are out', () => {
    expect(matcherRowToMultiplaEvent(threeWay, 'sisal', null, 4.5)).toBeNull()
    expect(matcherRowToMultiplaEvent(dutchBook, 'betsson', null, 4.5)).toBeNull()
  })
})

describe('multiplaEligibility', () => {
  const key = (r: MatcherResult) => matcherRowKey(r)
  const none = new Set<string>()

  it('needs one book, the book on the punta side, and no three-way', () => {
    expect(multiplaEligibility(backLay, null, [], 2, null, none, key(backLay)).ok).toBe(false)
    expect(multiplaEligibility(backLay, 'betfair', [], 2, null, none, key(backLay)).reason).toMatch(
      /lato della puntata/,
    )
    expect(multiplaEligibility(threeWay, 'sisal', [], 2, null, none, key(threeWay)).reason).toMatch(
      /tre vie/,
    )
    expect(multiplaEligibility(backLay, 'sisal', [], 2, null, none, key(backLay)).ok).toBe(true)
  })

  it('room, same event, chronological order; a ticked row stays eligible', () => {
    const first = matcherRowToMultiplaEvent(backLay, 'sisal', null, 4.5)!
    expect(
      multiplaEligibility(dutchBook, 'sisal', [first], 1, null, none, key(dutchBook)).reason,
    ).toMatch(/già scelto 1/)
    expect(multiplaEligibility(dutchBook, 'sisal', [first], 3, null, none, key(dutchBook)).ok).toBe(
      true,
    )
    const sameEvent = row({
      legs: [leg('sisal', 'BACK Under', 1.9, false), leg('betfair', 'LAY Under', 1.92, true)],
    })
    expect(
      multiplaEligibility(sameEvent, 'sisal', [first], 3, null, none, key(sameEvent)).reason,
    ).toMatch(/già nella multipla/)
    const later = matcherRowToMultiplaEvent(dutchExchange, 'sisal', null, 4.5)!
    expect(
      multiplaEligibility(dutchBook, 'sisal', [later], 3, null, none, key(dutchBook)).reason,
    ).toMatch(/dopo/)
    expect(
      multiplaEligibility(backLay, 'sisal', [later], 3, null, new Set([key(backLay)]), key(backLay))
        .ok,
    ).toBe(true)
  })
})

describe('multiplaSummary', () => {
  it('rating and total price without a stake, profit with it', () => {
    const events = [
      matcherRowToMultiplaEvent(backLay, 'sisal', null, 4.5)!,
      matcherRowToMultiplaEvent(dutchBook, 'sisal', null, 4.5)!,
    ]
    const noStake = multiplaSummary(events, null, 0, 0)
    expect(noStake.quotaTotale).toBeCloseTo(2.05 * 2.05, 9)
    // (2.05·0.955/(2.02−0.045)) · (2.05·0.85/1.85) · 100
    expect(noStake.rating).toBeCloseTo(((2.05 * 0.955) / 1.975) * ((2.05 * 0.85) / 1.85) * 100, 6)
    expect(noStake.guadagno).toBeNull()
    const withStake = multiplaSummary(events, 100, 0, 0)
    expect(withStake.hedges).toHaveLength(2)
    expect(withStake.guadagno).not.toBeNull()
    // The multipla pays 100·4.2025 = 420.25; the hedges cost their liability / stake.
    const totalHedgeCost = withStake.hedges.reduce((s, h) => s + h.hedgeCost, 0)
    expect(withStake.guadagno).toBeCloseTo(420.25 - 100 - totalHedgeCost, 9)
  })
})

describe('localDateHour', () => {
  it('splits the kickoff into the local date and time', () => {
    const { date, hour } = localDateHour('2026-09-20T18:45:00.000Z')
    expect(date).toMatch(/^2026-09-2[01]$/)
    expect(hour).toMatch(/^\d{2}:\d{2}$/)
  })
})
