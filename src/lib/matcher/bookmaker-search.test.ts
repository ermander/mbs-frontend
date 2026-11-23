import { describe, expect, it } from 'vitest'
import type { MatcherBookmaker } from '@/types/matcher'
import { bookmakersMatchingSearch } from './bookmaker-search'

const BOOKS: MatcherBookmaker[] = [
  { slug: 'bet365', name: 'Bet365', isExchange: false },
  { slug: 'betflag', name: 'BetFlag', isExchange: false, sameOddsAs: 'goldbet' },
  { slug: 'betsson', name: 'Betsson (StarCasinò)', isExchange: false },
  { slug: 'casinosanremo', name: 'Casinò di Sanremo', isExchange: false, sameOddsAs: 'netbet' },
  { slug: 'goldbet', name: 'GoldBet (Lottomatica · PlanetWin365 · BetFlag)', isExchange: false },
  { slug: 'planetwin365', name: 'PlanetWin365', isExchange: false, sameOddsAs: 'goldbet' },
  { slug: 'sisal', name: 'Sisal (PokerStars · Snai)', isExchange: false },
  { slug: 'snai', name: 'Snai', isExchange: false, sameOddsAs: 'sisal' },
  { slug: 'starcasino', name: 'StarCasinò', isExchange: false, sameOddsAs: 'betsson' },
  { slug: 'starvegas', name: 'StarVegas', isExchange: false, sameOddsAs: 'admiralbet' },
  { slug: 'staryes', name: 'StarYes', isExchange: false, sameOddsAs: 'netbet' },
]
const slugs = (search: string, chosen: string[] = []) =>
  bookmakersMatchingSearch(search, BOOKS, chosen).map((b) => b.slug)

describe('bookmakersMatchingSearch', () => {
  it('finds a twin brand by its name, whatever the case', () => {
    expect(slugs('Snai')).toEqual(['snai'])
    expect(slugs('SNAI ')).toEqual(['snai'])
    expect(slugs('planetwin')).toEqual(['planetwin365'])
  })

  it('ignores accents and spaces', () => {
    expect(slugs('casino di sanremo')).toEqual(['casinosanremo'])
    expect(slugs('starcasino')).toEqual(['starcasino'])
  })

  it('reads the shown name, not the aliases of the feed', () => {
    // «Sisal (PokerStars · Snai)» is Sisal: «Snai» finds the Snai brand only.
    expect(slugs('sisal')).toEqual(['sisal'])
    expect(slugs('gold')).toEqual(['goldbet'])
  })

  it('stays quiet on short texts and team names', () => {
    expect(slugs('bet')).toEqual([])
    expect(slugs('sna')).toEqual([])
    expect(slugs('Inter')).toEqual([])
    expect(slugs('Genoa Como')).toEqual([])
  })

  it('at most three suggestions, exact matches first, the chosen ones left out', () => {
    expect(slugs('star')).toEqual(['starcasino', 'starvegas', 'staryes'])
    expect(slugs('betsson')).toEqual(['betsson'])
    expect(slugs('snai', ['snai'])).toEqual([])
  })
})
