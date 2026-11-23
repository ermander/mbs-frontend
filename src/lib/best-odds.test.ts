import { describe, expect, it } from 'vitest'

import type { BestOddsBookmaker, BestOddsCatalog, BestOddsMarket } from '@/types/best-odds'
import {
  bestByOutcome,
  bestOddsHref,
  dayLabel,
  defaultMarket,
  eventTitle,
  findCompetition,
  groupEventsByDay,
  groupMarkets,
  marketFullLabel,
  marketLineLabel,
  marketTypeName,
  nationLabel,
  netOdds,
  outcomeHint,
  outcomeName,
  parseBestOddsView,
  periodName,
  rankMarket,
  selectMarket,
  sortedNations,
  variantLabel,
} from './best-odds'

const book = (slug: string, name: string, isExchange = false): BestOddsBookmaker => ({
  slug,
  name,
  isExchange,
  eventUrl: null,
})
const BOOKS = [
  book('bet365', 'Bet365'),
  book('betfair', 'Betfair Exchange', true),
  book('goldbet', 'GoldBet'),
  book('lottomatica', 'Lottomatica'),
  book('sisal', 'Sisal'),
]
const seen = '2026-11-23T20:00:00.000Z'

const market = (over: Partial<BestOddsMarket> & Pick<BestOddsMarket, 'id'>): BestOddsMarket => ({
  marketTypeKey: '1x2',
  line: null,
  handicap: null,
  periodScope: 'full_time',
  teamScope: null,
  outcomes: [
    { key: 'home', label: '1' },
    { key: 'draw', label: 'X' },
    { key: 'away', label: '2' },
  ],
  rows: [],
  ...over,
})

const row = (bookmaker: string, odds: Record<string, number>, lay?: Record<string, number>) => ({
  bookmaker,
  odds,
  ...(lay ? { lay } : {}),
  lastSeenAt: seen,
})

describe('names', () => {
  it('names the market types in Italian, and keeps an unknown one readable', () => {
    expect(marketTypeName('over_under')).toBe('Under/Over')
    expect(marketTypeName('btts')).toBe('Goal/No Goal')
    expect(marketTypeName('result_btts')).toBe('1X2 + Goal/No Goal')
    expect(marketTypeName('halftime_fulltime')).toBe('Parziale/Finale')
    expect(marketTypeName('total_cards')).toBe('Total cards')
  })
  it('a market without a period is the whole match', () => {
    expect(periodName(null)).toBe('Finale')
    expect(periodName('full_time')).toBe('Finale')
    expect(periodName('first_half')).toBe('1° tempo')
    expect(periodName('second_half')).toBe('2° tempo')
    expect(periodName('overtime_only')).toBe('overtime only')
  })
  it('a team market says whose it is, with the name of the team when it is known', () => {
    expect(variantLabel({ periodScope: 'first_half', teamScope: null })).toBe('1° tempo')
    expect(variantLabel({ periodScope: 'full_time', teamScope: 'home' })).toBe('Finale · Casa')
    expect(
      variantLabel(
        { periodScope: null, teamScope: 'away' },
        { homeName: 'Genoa', awayName: 'Como' },
      ),
    ).toBe('Finale · Como')
  })
  it('the line of an Under/Over and the sign of a handicap', () => {
    expect(marketLineLabel({ line: 2.5, handicap: null })).toBe('2.5')
    expect(marketLineLabel({ line: 3, handicap: null })).toBe('3')
    expect(marketLineLabel({ line: null, handicap: 1 })).toBe('+1')
    expect(marketLineLabel({ line: null, handicap: -0.5 })).toBe('−0.5')
    expect(marketLineLabel({ line: null, handicap: 0 })).toBe('0')
    expect(marketLineLabel({ line: null, handicap: null })).toBeNull()
  })
  it('a market said in full: the period only when it is not the whole match', () => {
    expect(marketFullLabel(market({ id: 'a' }))).toBe('1X2')
    expect(marketFullLabel(market({ id: 'b', marketTypeKey: 'over_under', line: 2.5 }))).toBe(
      'Under/Over 2.5',
    )
    expect(
      marketFullLabel(
        market({ id: 'c', marketTypeKey: 'over_under', line: 0.5, periodScope: 'first_half' }),
      ),
    ).toBe('Under/Over 0.5 · 1° tempo')
    expect(
      marketFullLabel(market({ id: 'd', marketTypeKey: 'handicap_european', handicap: -1 })),
    ).toBe('Handicap europeo −1')
    expect(
      marketFullLabel(market({ id: 'e', marketTypeKey: 'halftime_fulltime', periodScope: null })),
    ).toBe('Parziale/Finale')
  })
  it('the outcomes: English labels in Italian, the others as they come', () => {
    expect(outcomeName({ key: 'odd', label: 'Odd' })).toBe('Dispari')
    expect(outcomeName({ key: 'even', label: 'Even' })).toBe('Pari')
    expect(outcomeName({ key: 'other', label: 'Other' })).toBe('Altro')
    expect(outcomeName({ key: 'over', label: 'Over' })).toBe('Over')
    expect(outcomeName({ key: 'home_yes', label: '1 & GG' })).toBe('1 & GG')
  })
  it('1, X and 2 carry the team or the draw, only where they are the teams', () => {
    const names = { homeName: 'Genoa', awayName: 'Como' }
    expect(outcomeHint('1x2', 'home', names)).toBe('Genoa')
    expect(outcomeHint('1x2', 'draw', names)).toBe('Pareggio')
    expect(outcomeHint('handicap_asian', 'away', names)).toBe('Como')
    expect(outcomeHint('over_under', 'over', names)).toBeNull()
    expect(outcomeHint('double_chance', 'home_draw', names)).toBeNull()
    expect(outcomeHint('1x2', 'home', { homeName: null, awayName: null })).toBeNull()
  })
  it('the title of an event', () => {
    expect(eventTitle({ homeName: 'Genoa', awayName: 'Como' })).toBe('Genoa – Como')
    expect(eventTitle({ homeName: null, awayName: 'Como' })).toBe('? – Como')
  })
})

describe('catalog', () => {
  it('the nation in Italian: by code, by hand for the home nations, the catalog name last', () => {
    expect(nationLabel('Italy', 'IT')).toBe('Italia')
    expect(nationLabel('Germany', 'de')).toBe('Germania')
    expect(nationLabel('England', 'GB-ENG')).toBe('Inghilterra')
    expect(nationLabel('Northern-Ireland', 'GB-NIR')).toBe('Irlanda del Nord')
    expect(nationLabel('World', null)).toBe('Internazionale')
    expect(nationLabel('South-Korea', null)).toBe('South Korea')
    expect(nationLabel(null, null)).toBe('Altre competizioni')
  })
  const nation = (name: string | null, code: string | null) => ({
    name,
    code,
    events: 1,
    competitions: [],
  })
  it('Italy first, the international cups second, the others by their Italian name', () => {
    const sorted = sortedNations([
      nation('Spain', 'ES'),
      nation('World', null),
      nation('England', 'GB-ENG'),
      nation('Germany', 'DE'),
      nation('Italy', 'IT'),
    ])
    expect(sorted.map((n) => nationLabel(n.name, n.code))).toEqual([
      'Italia',
      'Internazionale',
      'Germania',
      'Inghilterra',
      'Spagna',
    ])
  })
  it('finds where a competition sits, or nothing', () => {
    const catalog: BestOddsCatalog = {
      totalEvents: 3,
      calculatedAt: seen,
      sports: [
        {
          name: 'Football',
          events: 3,
          nations: [
            {
              name: 'Italy',
              code: 'IT',
              events: 3,
              competitions: [
                { id: 'c-a', name: 'Serie A', events: 2, nextStart: seen },
                { id: 'c-b', name: 'Serie B', events: 1, nextStart: seen },
              ],
            },
          ],
        },
      ],
    }
    const place = findCompetition(catalog, 'c-b')
    expect(place?.sport.name).toBe('Football')
    expect(place?.nation.code).toBe('IT')
    expect(place?.competition.name).toBe('Serie B')
    expect(findCompetition(catalog, 'c-x')).toBeNull()
    expect(findCompetition(null, 'c-a')).toBeNull()
    expect(findCompetition(catalog, null)).toBeNull()
  })
})

describe('days', () => {
  const now = Date.parse('2026-11-23T20:30:00.000Z') // 21:30 in Rome
  it('today, tomorrow, then the day in full, on the calendar of the time zone', () => {
    expect(dayLabel('2026-11-23T22:00:00.000Z', now, 'Europe/Rome')).toBe('Oggi')
    // 23:30 UTC is already the 24th in Rome.
    expect(dayLabel('2026-11-23T23:30:00.000Z', now, 'Europe/Rome')).toBe('Domani')
    expect(dayLabel('2026-11-25T19:45:00.000Z', now, 'Europe/Rome')).toBe('mercoledì 25 novembre')
  })
  it('groups a list by day, keeping its order', () => {
    const days = groupEventsByDay(
      [
        { id: 'a', startTime: '2026-11-23T21:00:00.000Z' },
        { id: 'b', startTime: '2026-11-24T17:45:00.000Z' },
        { id: 'c', startTime: '2026-11-24T20:00:00.000Z' },
        { id: 'd', startTime: '2026-11-27T19:45:00.000Z' },
      ],
      now,
      'Europe/Rome',
    )
    expect(days.map((d) => [d.label, d.events.map((e) => e.id).join('')])).toEqual([
      ['Oggi', 'a'],
      ['Domani', 'bc'],
      ['venerdì 27 novembre', 'd'],
    ])
    expect(groupEventsByDay([], now)).toEqual([])
  })
})

describe('markets of an event', () => {
  const markets = [
    market({ id: 'm-1x2', rows: [row('bet365', { home: 2 }), row('sisal', { home: 2.1 })] }),
    market({ id: 'm-1x2-h1', periodScope: 'first_half', rows: [row('bet365', { home: 2.8 })] }),
    market({
      id: 'm-ou-15',
      marketTypeKey: 'over_under',
      line: 1.5,
      rows: [row('bet365', { over: 1.3 }), row('goldbet', { over: 1.32 })],
    }),
    market({
      id: 'm-ou-25',
      marketTypeKey: 'over_under',
      line: 2.5,
      rows: [row('bet365', { over: 1.9 }), row('sisal', { over: 1.95 })],
    }),
    market({
      id: 'm-ou-35',
      marketTypeKey: 'over_under',
      line: 3.5,
      rows: [row('bet365', { over: 3.2 })],
    }),
  ]
  it('type → period → line, in the order they came, with the sites of each type', () => {
    const groups = groupMarkets(markets)
    expect(groups.map((g) => [g.key, g.name, g.sites])).toEqual([
      ['1x2', '1X2', 2],
      ['over_under', 'Under/Over', 3],
    ])
    expect(groups[0].variants.map((v) => [v.periodScope, v.markets.length])).toEqual([
      ['full_time', 1],
      ['first_half', 1],
    ])
    expect(groups[1].variants).toHaveLength(1)
    expect(groups[1].variants[0].markets.map((m) => m.line)).toEqual([1.5, 2.5, 3.5])
    expect(groupMarkets([])).toEqual([])
  })
  it('a variant opens on the line most sites price; among equals the 2.5', () => {
    const ou = groupMarkets(markets)[1].variants[0].markets
    expect(defaultMarket(ou)?.id).toBe('m-ou-25')
    const busier = ou.map((m) =>
      m.id === 'm-ou-35'
        ? { ...m, rows: [...m.rows, row('sisal', { over: 3 }), row('x', { over: 3 })] }
        : m,
    )
    expect(defaultMarket(busier)?.id).toBe('m-ou-35')
    expect(defaultMarket([])).toBeNull()
  })
  it('among handicaps priced by as many sites, the one nearest to zero', () => {
    const handicaps = [-2, -1, 1].map((handicap) =>
      market({
        id: `h${handicap}`,
        marketTypeKey: 'handicap_european',
        handicap,
        rows: [row('bet365', { home: 2 })],
      }),
    )
    expect(defaultMarket(handicaps)?.id).toBe('h-1')
  })
  it('selects the market of the address, or the one the event opens on', () => {
    const groups = groupMarkets(markets)
    expect(selectMarket(groups, 'm-ou-35')?.market.id).toBe('m-ou-35')
    expect(selectMarket(groups, 'm-ou-35')?.group.key).toBe('over_under')
    expect(selectMarket(groups, null)?.market.id).toBe('m-1x2')
    expect(selectMarket(groups, 'gone')?.market.id).toBe('m-1x2')
    expect(selectMarket([], null)).toBeNull()
  })
})

describe('who pays the most', () => {
  it('an exchange pays its price less the commission on the winnings', () => {
    expect(netOdds(2, false, 0.045)).toBe(2)
    expect(netOdds(2, true, 0.045)).toBeCloseTo(1.955, 6)
    expect(netOdds(3.5, true, 0.05)).toBeCloseTo(3.375, 6)
  })
  const m = market({
    id: 'm',
    rows: [
      row('bet365', { home: 2.5, draw: 3.3, away: 2.9 }),
      row('betfair', { home: 2.62, draw: 3.4 }, { home: 2.66 }),
      row('goldbet', { home: 2.55, draw: 3.25, away: 2.85 }),
      row('lottomatica', { home: 2.55, draw: 3.25, away: 2.85 }),
      row('sisal', { draw: 3.3, away: 3 }),
    ],
  })
  it('ranks by what the price pays: the exchange by its net, equals share the place', () => {
    const ranked = rankMarket(m, 'home', BOOKS, 0.045)
    expect(ranked.map((r) => [r.bookmaker.slug, r.rank, r.best])).toEqual([
      // 2.62 gross = 2.5471 net: under the 2.55 of the two bookmakers.
      ['goldbet', 1, true],
      ['lottomatica', 1, true],
      ['betfair', 3, false],
      ['bet365', 4, false],
      ['sisal', null, false],
    ])
    expect(ranked[2].odds).toBe(2.62)
    expect(ranked[2].net).toBeCloseTo(2.5471, 4)
    expect(ranked[2].lay).toBe(2.66)
    expect(ranked[2].gap).toBeCloseTo(0.0029, 4)
    expect(ranked[0].gap).toBe(0)
    expect(ranked[3].gap).toBeCloseTo(0.05, 6)
  })
  it('a site that prices the market but not the outcome closes the list, without a place', () => {
    const last = rankMarket(m, 'home', BOOKS, 0.045)[4]
    expect(last.bookmaker.slug).toBe('sisal')
    expect(last.odds).toBeNull()
    expect(last.net).toBeNull()
    expect(last.gap).toBeNull()
    expect(last.row.odds.away).toBe(3)
  })
  it('with no commission the exchange leads on its price', () => {
    expect(rankMarket(m, 'home', BOOKS, 0)[0].bookmaker.slug).toBe('betfair')
  })
  it('a site missing from the list of the event still shows, under its slug', () => {
    const ranked = rankMarket(market({ id: 'x', rows: [row('nuovo', { home: 2 })] }), 'home', [], 0)
    expect(ranked[0].bookmaker).toEqual({
      slug: 'nuovo',
      name: 'nuovo',
      isExchange: false,
      eventUrl: null,
    })
  })
  it('the best price of each outcome, who has it and how many sites price it', () => {
    const best = bestByOutcome(m, BOOKS, 0.045)
    expect(best.home?.net).toBe(2.55)
    expect(best.home?.bookmakers.map((b) => b.slug)).toEqual(['goldbet', 'lottomatica'])
    expect(best.home?.sites).toBe(4)
    // On the draw the exchange shows 3.40 but pays 1 + 2.4 × 0.955 = 3.292: under the 3.30 of two bookmakers.
    expect(best.draw?.bookmakers.map((b) => b.slug)).toEqual(['bet365', 'sisal'])
    expect(best.draw?.sites).toBe(5)
    expect(best.away?.net).toBe(3)
    expect(best.away?.bookmakers.map((b) => b.slug)).toEqual(['sisal'])
  })
  it('an outcome nobody prices has no best', () => {
    const empty = market({ id: 'e', rows: [row('bet365', { home: 2 })] })
    expect(bestByOutcome(empty, BOOKS, 0.045).draw).toBeUndefined()
  })
})

describe('the address of the page', () => {
  const params = (query: string) => new URLSearchParams(query)
  it('reads sport, competition, event, the list of next events and the page', () => {
    expect(parseBestOddsView(params(''))).toEqual({
      sport: null,
      competitionId: null,
      eventId: null,
      upcoming: false,
      page: 0,
    })
    expect(parseBestOddsView(params('sport=Football&campionato=c1&evento=e1&pagina=3'))).toEqual({
      sport: 'Football',
      competitionId: 'c1',
      eventId: 'e1',
      upcoming: false,
      page: 2,
    })
    expect(parseBestOddsView(params('vista=prossimi&pagina=abc')).upcoming).toBe(true)
    expect(parseBestOddsView(params('pagina=0')).page).toBe(0)
    expect(parseBestOddsView(params('campionato=%20')).competitionId).toBeNull()
  })
  it('writes only what is not at its default, and reads back what it wrote', () => {
    expect(bestOddsHref({})).toBe('/best-odds')
    expect(bestOddsHref({ sport: 'Football', upcoming: true })).toBe(
      '/best-odds?sport=Football&vista=prossimi',
    )
    expect(bestOddsHref({ competitionId: 'c1', page: 1 })).toBe('/best-odds?campionato=c1&pagina=2')
    // A competition is a list of its own: «prossimi» says nothing more.
    expect(bestOddsHref({ competitionId: 'c1', upcoming: true })).toBe('/best-odds?campionato=c1')
    const view = {
      sport: 'Football',
      competitionId: 'c1',
      eventId: 'e 1',
      upcoming: false,
      page: 2,
    }
    const href = bestOddsHref(view)
    expect(parseBestOddsView(params(href.split('?')[1]))).toEqual(view)
  })
})
