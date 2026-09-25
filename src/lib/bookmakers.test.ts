import { describe, expect, it } from 'vitest'
import type { MatcherLeg, MatcherMeta } from '@/types/matcher'
import {
  allBookmakerLogoSrcs,
  bookmakerLogoSrc,
  exchangeCommissionOf,
  legIsExchange,
  resolveProfitTrackerBook,
  shortBookmakerName,
  sportDisplay,
} from './bookmakers'

const leg = (overrides: Partial<MatcherLeg>): MatcherLeg => ({
  bookmakerId: 'id',
  bookmakerSlug: 'sisal',
  bookmakerName: 'Sisal',
  outcomeKey: 'over',
  outcomeLabel: 'Over',
  odds: 2,
  ...overrides,
})

const meta = (bookmakers: MatcherMeta['bookmakers'], exchangeCommission?: number): MatcherMeta => ({
  totalResults: 0,
  calculatedAt: null,
  exchangeCommission,
  sports: [],
  bookmakers,
  marketTypes: [],
  nations: [],
})

describe('logos and names', () => {
  it('maps the engine slug to the RobinOdds logo file, null when there is none', () => {
    expect(bookmakerLogoSrc('sisal')).toBe('/loghi_book/24.png')
    expect(bookmakerLogoSrc('BETFAIR')).toBe('/loghi_book/36.png')
    expect(bookmakerLogoSrc('perlaplay')).toBe('/loghi_book/49.png')
    expect(bookmakerLogoSrc('mylotteriesplay')).toBe('/loghi_book/mylotteriesplay.png')
    for (const slug of ['bgame', 'fastbet', 'netbet', 'sunbet', 'winamax'])
      expect(bookmakerLogoSrc(slug)).toBe(`/loghi_book/${slug}.png`)
    expect(bookmakerLogoSrc('xsport')).toBeNull()
  })

  it('lists one logo per brand for the landing carousel, sorted and without duplicates', () => {
    const all = allBookmakerLogoSrcs()
    expect(all).toHaveLength(40)
    expect(new Set(all).size).toBe(all.length)
    expect(all[0]).toBe('/loghi_book/14.png') // 888sport
    expect(all).toContain('/loghi_book/mylotteriesplay.png')
    for (const src of all) expect(src).toMatch(/^\/loghi_book\/[a-z0-9]+\.png$/)
  })

  it('drops the aliases from the display name', () => {
    expect(shortBookmakerName('Sisal (PokerStars · Snai)')).toBe('Sisal')
    expect(shortBookmakerName('Bwin (Gioco Digitale)')).toBe('Bwin')
    expect(shortBookmakerName('888sport')).toBe('888sport')
  })
})

describe('legIsExchange', () => {
  it('trusts the leg flag, then the meta, then the LAY prefix', () => {
    expect(legIsExchange(leg({ isExchange: true, outcomeLabel: 'BACK Over' }))).toBe(true)
    expect(legIsExchange(leg({ isExchange: false, outcomeLabel: 'LAY Over' }))).toBe(false)
    expect(
      legIsExchange(
        leg({ bookmakerSlug: 'betfair' }),
        meta([{ slug: 'betfair', name: 'Betfair', isExchange: true }]),
      ),
    ).toBe(true)
    expect(
      legIsExchange(
        leg({ bookmakerSlug: 'betfair', outcomeLabel: 'LAY Over' }),
        meta([{ slug: 'betfair', name: 'Betfair' }]),
      ),
    ).toBe(true)
    expect(legIsExchange(leg({ outcomeLabel: 'BACK Over' }))).toBe(false)
    expect(legIsExchange(leg({ outcomeLabel: 'LAY Over' }))).toBe(true)
  })
})

describe('exchangeCommissionOf', () => {
  it('reads the meta and falls back to the engine default', () => {
    expect(exchangeCommissionOf(null)).toBe(0.045)
    expect(exchangeCommissionOf(meta([], 0.02))).toBe(0.02)
    expect(exchangeCommissionOf(meta([], 1.5))).toBe(0.045)
    expect(exchangeCommissionOf(meta([]))).toBe(0.045)
  })
})

describe('sportDisplay', () => {
  it('translates the api-sports names and keeps the unknown ones', () => {
    expect(sportDisplay('Football')).toEqual({ label: 'Calcio', icon: '⚽', ptSport: 'calcio' })
    expect(sportDisplay('Basketball')).toEqual({ label: 'Basket', icon: '🏀', ptSport: 'basket' })
    expect(sportDisplay('tennis')).toEqual({ label: 'Tennis', icon: '🎾', ptSport: 'tennis' })
    expect(sportDisplay('Volleyball')).toEqual({ label: 'Volleyball', icon: '', ptSport: 'altro' })
  })
})

describe('resolveProfitTrackerBook', () => {
  const books = [
    { id: 'a', nome: 'Bet365.it', isExchange: false, externalId: null },
    { id: 'b', nome: 'Betfair', isExchange: true, externalId: null },
    { id: 'c', nome: 'Betfair Sportsbook', isExchange: false, externalId: null },
    { id: 'd', nome: 'Sisal.it', isExchange: false, externalId: 'sisal' },
    { id: 'e', nome: 'Pippo', isExchange: false, externalId: 'goldbet' },
  ]

  it('the explicit link (externalId = slug) wins over the name', () => {
    expect(
      resolveProfitTrackerBook(books, { slug: 'sisal', name: 'Sisal (PokerStars · Snai)' })?.id,
    ).toBe('d')
    expect(
      resolveProfitTrackerBook(books, {
        slug: 'goldbet',
        name: 'GoldBet (Lottomatica · PlanetWin365 · BetFlag)',
      })?.id,
    ).toBe('e')
  })

  it('falls back to the name, as the old scanner does ("Bet365" ↔ "Bet365.it")', () => {
    expect(resolveProfitTrackerBook(books, { slug: 'bet365', name: 'Bet365' })?.id).toBe('a')
  })

  it('keeps the exchange and the sportsbook of the same brand apart', () => {
    expect(
      resolveProfitTrackerBook(books, {
        slug: 'betfair',
        name: 'Betfair Exchange',
        isExchange: true,
      })?.id,
    ).toBe('b')
    expect(
      resolveProfitTrackerBook(books, {
        slug: 'betfairsportsbook',
        name: 'Betfair Sportsbook',
        isExchange: false,
      })?.id,
    ).toBe('c')
    expect(resolveProfitTrackerBook(books, { slug: 'betfair', name: 'Betfair Exchange' })?.id).toBe(
      'b',
    )
  })

  it('null when nothing matches', () => {
    expect(resolveProfitTrackerBook(books, { slug: 'winbet', name: 'WinBet' })).toBeNull()
  })
})
