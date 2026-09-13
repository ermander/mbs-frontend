import { describe, expect, it } from 'vitest'
import type { MatcherResult } from '@/types/matcher'
import { legDisplayOdds, quickProfit } from './quick-profit'

function row(overrides: Partial<MatcherResult>): MatcherResult {
  return {
    eventId: 'ev',
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
  bookmakerName: slug,
  outcomeKey: outcomeLabel.replace(/^(BACK|LAY) /, '').toLowerCase(),
  outcomeLabel,
  odds,
  isExchange,
})

describe('quickProfit', () => {
  it('nothing without a stake', () => {
    const r = row({ legs: [leg('sisal', 'BACK Over', 2), leg('betfair', 'LAY Over', 2, true)] })
    expect(quickProfit(r, { puntata: null, bonus: 0, rimborso: 0 }, 4.5, null)).toEqual({
      profit: null,
      covers: [],
    })
  })

  it('back/lay: the Punta-Banca minimum profit and the lay stake', () => {
    const r = row({ legs: [leg('sisal', 'BACK Over', 2), leg('betfair', 'LAY Over', 2, true)] })
    const q = quickProfit(r, { puntata: 100, bonus: 0, rimborso: 0 }, 5, null)
    expect(q.covers).toEqual([102.56])
    expect(q.profit).toBeCloseTo(-2.57, 9)
  })

  it('dutch: the stake goes on the first leg, an exchange leg is re-priced from its net value', () => {
    const r = row({
      matchType: 'dutch_2way',
      legs: [leg('sisal', 'Over', 2), leg('betfair', 'Under', 2.146, true)],
    })
    const q = quickProfit(r, { puntata: 100, bonus: 0, rimborso: 0 }, 4.5, null)
    expect(q.covers).toEqual([93.2])
    expect(q.profit).toBeCloseTo(6.8, 9)
  })

  it('dutch 3-way: two covers', () => {
    const r = row({
      matchType: 'dutch_3way',
      legs: [leg('bwin', '1', 2.1), leg('sisal', 'X', 3.4), leg('betsson', '2', 3.6)],
    })
    const q = quickProfit(r, { puntata: 100, bonus: 0, rimborso: 0 }, 4.5, null)
    expect(q.covers).toEqual([61.76, 58.33])
    expect(q.profit).toBeCloseTo(-10.106, 3)
  })
})

describe('legDisplayOdds', () => {
  it('shows the gross price on an exchange dutch leg and the stored price elsewhere', () => {
    const dutch = row({ matchType: 'dutch_2way', legs: [] })
    expect(legDisplayOdds(leg('betfair', 'Under', 3.77, true), dutch, null, 4.5)).toBe(3.9)
    expect(legDisplayOdds(leg('sisal', 'Over', 1.3), dutch, null, 4.5)).toBe(1.3)
    const backLay = row({ matchType: 'back_lay', legs: [] })
    expect(legDisplayOdds(leg('betfair', 'LAY Over', 1.38, true), backLay, null, 4.5)).toBe(1.38)
  })
})
