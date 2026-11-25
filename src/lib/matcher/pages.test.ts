import { describe, expect, it } from 'vitest'
import type { MatcherMeta } from '@/types/matcher'
import { MATCHER_PAGES, scopedMeta } from './pages'
import { RADAR_NAV_ITEMS } from '@/lib/nav-config'

const BASE: MatcherMeta = {
  totalResults: 10,
  calculatedAt: null,
  sports: ['Basketball', 'Football'],
  bookmakers: [],
  marketTypes: ['1x2', 'btts', 'over_under'],
  nations: ['England', 'Italy', 'USA'],
  competitions: [
    {
      id: 'c-seriea',
      name: 'Serie A',
      nationName: 'Italy',
      nationCode: 'IT',
      sportName: 'Football',
      results: 6,
      resultsByType: { back_lay: 3, dutch_2way: 2, dutch_3way: 1 },
    },
    {
      id: 'c-pl',
      name: 'Premier League',
      nationName: 'England',
      nationCode: 'GB',
      sportName: 'Football',
      results: 2,
      resultsByType: { back_lay: 2 },
    },
    {
      id: 'c-nba',
      name: 'NBA',
      nationName: 'USA',
      nationCode: 'US',
      sportName: 'Basketball',
      results: 2,
      resultsByType: { dutch_2way: 2 },
    },
  ],
  byMatchType: {
    back_lay: { totalResults: 5, marketTypes: ['1x2', 'over_under'] },
    dutch_2way: { totalResults: 4, marketTypes: ['btts', 'over_under'] },
    dutch_3way: { totalResults: 1, marketTypes: ['1x2'] },
  },
}

describe('MATCHER_PAGES', () => {
  it('one page per kind of combination, each at its own address', () => {
    expect(MATCHER_PAGES.oddsmatcher.matchType).toBe('back_lay')
    expect(MATCHER_PAGES.dutcher.matchType).toBe('dutch_2way')
    expect(MATCHER_PAGES.trimatcher.matchType).toBe('dutch_3way')
    const hrefs = Object.values(MATCHER_PAGES).map((p) => p.href)
    expect(new Set(hrefs).size).toBe(3)
    expect(MATCHER_PAGES.oddsmatcher.href).toBe('/odds-scanner')
  })
  it('the Multipla only where its rows can enter one, the exchange menu only on the Oddsmatcher', () => {
    expect(MATCHER_PAGES.trimatcher.multipla).toBe(false)
    expect(MATCHER_PAGES.oddsmatcher.multipla && MATCHER_PAGES.dutcher.multipla).toBe(true)
    expect(Object.values(MATCHER_PAGES).filter((p) => p.coverIsExchange)).toEqual([
      MATCHER_PAGES.oddsmatcher,
    ])
  })
  it('the «Radar» menu lists the three pages and then Best Odds', () => {
    expect(RADAR_NAV_ITEMS.map((i) => [i.label, i.href])).toEqual([
      ['Oddsmatcher', MATCHER_PAGES.oddsmatcher.href],
      ['Dutcher', MATCHER_PAGES.dutcher.href],
      ['Trimatcher', MATCHER_PAGES.trimatcher.href],
      ['Best Odds', '/best-odds'],
    ])
  })
})

describe('scopedMeta', () => {
  it('the Trimatcher: only the competitions with 3-way rows, their count, their sport and nation, 1X2', () => {
    const m = scopedMeta(BASE, 'dutch_3way')
    expect(m.competitions).toEqual([{ ...BASE.competitions![0], results: 1 }])
    expect(m.sports).toEqual(['Football'])
    expect(m.nations).toEqual(['Italy'])
    expect(m.marketTypes).toEqual(['1x2'])
    expect(m.totalResults).toBe(1)
  })
  it('the Dutcher: Serie A and NBA with their 2-way rows, both sports, the 2-way markets in the order of the full list', () => {
    const m = scopedMeta(BASE, 'dutch_2way')
    expect(m.competitions?.map((c) => [c.id, c.results])).toEqual([
      ['c-seriea', 2],
      ['c-nba', 2],
    ])
    expect(m.sports).toEqual(['Basketball', 'Football'])
    expect(m.nations).toEqual(['Italy', 'USA'])
    expect(m.marketTypes).toEqual(['btts', 'over_under'])
  })
  it('the Oddsmatcher keeps the bookmakers and the rest of the meta untouched', () => {
    const withBooks: MatcherMeta = {
      ...BASE,
      bookmakers: [{ slug: 'betfair', name: 'Betfair', isExchange: true }],
      exchangeCommission: 0.045,
    }
    const m = scopedMeta(withBooks, 'back_lay')
    expect(m.bookmakers).toBe(withBooks.bookmakers)
    expect(m.exchangeCommission).toBe(0.045)
    expect(m.competitions?.map((c) => c.id)).toEqual(['c-seriea', 'c-pl'])
    expect(m.nations).toEqual(['England', 'Italy'])
  })
  it('a meta without the split (older backend, free meta) is used as it is', () => {
    const old: MatcherMeta = {
      ...BASE,
      byMatchType: undefined,
      competitions: BASE.competitions!.map((c) => ({ ...c, resultsByType: undefined })),
    }
    expect(scopedMeta(old, 'dutch_3way')).toBe(old)
    const free: MatcherMeta = { ...BASE, byMatchType: undefined, competitions: [] }
    expect(scopedMeta(free, 'back_lay')).toBe(free)
  })
  it('a kind with no row at all: empty lists, not the lists of the other kinds', () => {
    const noTri: MatcherMeta = {
      ...BASE,
      competitions: BASE.competitions!.map((c) => ({
        ...c,
        resultsByType: { ...c.resultsByType, dutch_3way: undefined },
      })),
      byMatchType: { ...BASE.byMatchType, dutch_3way: { totalResults: 0, marketTypes: [] } },
    }
    const m = scopedMeta(noTri, 'dutch_3way')
    expect(m.competitions).toEqual([])
    expect(m.sports).toEqual([])
    expect(m.marketTypes).toEqual([])
    expect(m.totalResults).toBe(0)
  })
})
