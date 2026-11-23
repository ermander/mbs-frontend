import { describe, expect, it } from 'vitest'
import type { MatcherResult } from '@/types/matcher'
import type { RecheckBookmaker, RecheckOutcomeRow } from '@/types/odds-recheck'
import {
  changeText,
  findingText,
  priceText,
  quotaText,
  readOutcomeText,
  recheckRequestOf,
  recheckTargetOfRow,
  recheckVerdict,
  rowOutcomeText,
  shownFindings,
  targetBookmakerNames,
} from './recheck'

const leg = (slug: string, name: string, outcomeKey: string, outcomeLabel: string) => ({
  bookmakerId: slug,
  bookmakerSlug: slug,
  bookmakerName: name,
  outcomeKey,
  outcomeLabel,
  odds: 2,
  eventUrl: slug === 'bwin' ? 'https://example.com/evento' : null,
})

function row(overrides: Partial<MatcherResult> = {}): MatcherResult {
  return {
    eventId: 'ev-1',
    canonicalMarketId: 'mk-1',
    marketTypeKey: 'over_under',
    line: 2.5,
    matchType: 'back_lay',
    legs: [
      leg('bwin', 'Bwin (Gioco Digitale)', 'over', 'BACK Over'),
      leg('betfair', 'Betfair Exchange', 'over', 'LAY Over'),
    ],
    rating: 101.23,
    homeName: 'Genoa',
    awayName: 'Como',
    startTime: '2026-11-25T19:45:00.000Z',
    sportName: 'Football',
    competitionName: 'Serie A',
    nationName: 'Italy',
    nationCode: 'IT',
    ...overrides,
  }
}

const price = (odds: number, layOdds: number | null = null, status = 'active') => ({
  odds,
  layOdds,
  status,
  lastSeenAt: '2026-11-23T20:00:00.000Z',
})

function outcome(overrides: Partial<RecheckOutcomeRow> = {}): RecheckOutcomeRow {
  return {
    key: 'over',
    label: 'Over',
    before: price(2.05),
    after: price(2.05),
    change: 'confirmed',
    live: { label: 'Over 2.5', marketName: 'U/O 2.5', odds: 2.05, layOdds: null, status: 'active' },
    referenceMedian: 2,
    ...overrides,
  }
}

function book(overrides: Partial<RecheckBookmaker> = {}): RecheckBookmaker {
  return {
    slug: 'bwin',
    name: 'Bwin (Gioco Digitale)',
    isExchange: false,
    outcome: 'read',
    listed: true,
    listing: {
      homeName: 'Genoa',
      awayName: 'Como',
      startTime: '2026-11-25T19:45:00.000Z',
      competitionName: 'Serie A',
    },
    mapping: {
      homeName: 'Genoa',
      awayName: 'Como',
      inverted: false,
      matchMethod: 'exact_name',
      matchStatus: 'confirmed',
    },
    namesOrder: 'as_catalog',
    kickoffDeltaMinutes: 0,
    referenceBooks: 5,
    outcomes: [outcome()],
    findings: ['price_confirmed'],
    ...overrides,
  }
}

describe('the target of a row', () => {
  it('carries the event, the market and the legs with their side', () => {
    const target = recheckTargetOfRow(row())
    expect(target).toMatchObject({
      eventId: 'ev-1',
      canonicalMarketId: 'mk-1',
      eventName: 'Genoa – Como',
      marketName: 'O/U 2.5 · Serie A',
      matchType: 'back_lay',
      rating: 101.23,
    })
    expect(target?.legs).toEqual([
      {
        bookmakerSlug: 'bwin',
        bookmakerName: 'Bwin (Gioco Digitale)',
        outcomeKey: 'over',
        outcomeName: 'Over',
        lay: false,
        eventUrl: 'https://example.com/evento',
      },
      {
        bookmakerSlug: 'betfair',
        bookmakerName: 'Betfair Exchange',
        outcomeKey: 'over',
        outcomeName: 'Over',
        lay: true,
        eventUrl: null,
      },
    ])
  })

  it('a row with no market id (an older backend) cannot be re-read', () => {
    expect(recheckTargetOfRow(row({ canonicalMarketId: null }))).toBeNull()
    expect(recheckTargetOfRow(row({ canonicalMarketId: undefined }))).toBeNull()
  })

  it('the request names the legs of the row, each bookmaker as the row shows it', () => {
    const snai = row({
      matchType: 'dutch_2way',
      legs: [leg('snai', 'Snai', 'over', 'Over'), leg('bwin', 'Bwin', 'under', 'Under')],
    })
    const target = recheckTargetOfRow(snai)!
    expect(recheckRequestOf(target)).toEqual({
      eventId: 'ev-1',
      canonicalMarketId: 'mk-1',
      row: {
        matchType: 'dutch_2way',
        legs: [
          { bookmaker: 'snai', outcomeKey: 'over' },
          { bookmaker: 'bwin', outcomeKey: 'under' },
        ],
      },
    })
    expect(targetBookmakerNames(target)).toBe('Snai e Bwin')
  })

  it('without legs, the request is a list of bookmakers with no repeats', () => {
    expect(
      recheckRequestOf({
        eventId: 'ev-1',
        canonicalMarketId: 'mk-1',
        eventName: 'Genoa – Como',
        marketName: '1X2',
        bookmakers: [
          { slug: 'sisal', name: 'Sisal' },
          { slug: 'bwin', name: 'Bwin' },
          { slug: 'sisal', name: 'Sisal' },
        ],
      }),
    ).toEqual({ eventId: 'ev-1', canonicalMarketId: 'mk-1', bookmakers: ['sisal', 'bwin'] })
  })
})

describe('what the read of a bookmaker says', () => {
  it('read now, with nothing to add', () => {
    expect(readOutcomeText(book())).toEqual({ label: 'Letto ora', tone: 'profit', detail: null })
  })

  it('read moments ago: said with the age, and that it is not read again', () => {
    const text = readOutcomeText(book({ outcome: 'recent', readAgeSeconds: 12 }))
    expect(text.label).toBe('Letto 12 s fa')
    expect(text.detail).toMatch(/non viene riletto/)
  })

  it('every reason for not reading has its own words', () => {
    expect(readOutcomeText(book({ outcome: 'busy' })).label).toBe('Occupato')
    expect(readOutcomeText(book({ outcome: 'busy' })).detail).toMatch(/non è stato riletto/)
    expect(readOutcomeText(book({ outcome: 'off', detail: 'paused' })).detail).toMatch(/in pausa/)
    expect(readOutcomeText(book({ outcome: 'off', detail: 'disabled' })).detail).toMatch(
      /spenta dal backoffice/,
    )
    expect(readOutcomeText(book({ outcome: 'not_mapped' })).label).toBe('Evento non collegato')
    expect(readOutcomeText(book({ outcome: 'timeout' })).detail).toMatch(/va avanti da sola/)
    expect(readOutcomeText(book({ outcome: 'failed', detail: 'HTTP 403' })).detail).toBe(
      'La lettura non è riuscita: HTTP 403',
    )
    expect(readOutcomeText(book({ outcome: 'unknown' })).label).toBe('Bookmaker sconosciuto')
  })

  it('prices: two decimals, the lay price next to the back one, a dash when not playable', () => {
    expect(priceText(price(2.05))).toBe('2,05')
    expect(priceText(price(2.02, 2.04))).toBe('2,02 · banca 2,04')
    expect(priceText(price(2.05, null, 'suspended'))).toBe('—')
    expect(priceText(null)).toBe('—')
  })

  it('the state of an outcome; one the read did not carry is «non riletta»', () => {
    expect(changeText('moved', true)).toEqual({ label: 'Mossa', tone: 'warning' })
    expect(changeText('withdrawn', true)).toEqual({ label: 'Tolta', tone: 'loss' })
    expect(changeText(null, true)).toEqual({ label: 'Non riletta', tone: 'neutral' })
    expect(changeText(null, false)).toBeNull()
  })

  it('the findings name the order the bookmaker lists the teams in', () => {
    const reversed = book({
      namesOrder: 'reversed',
      listing: {
        homeName: 'Como',
        awayName: 'Genoa',
        startTime: '2026-11-25T19:45:00.000Z',
        competitionName: 'Serie A',
      },
    })
    expect(findingText('reversed_handled', reversed)).toMatchObject({ tone: 'info' })
    expect(findingText('reversed_handled', reversed).text).toMatch(/\(Como – Genoa\)/)
    expect(findingText('orientation_mismatch', reversed).text).toMatch(
      /ordine inverso \(Como – Genoa\), ma il collegamento/,
    )
    const flagged = book({ mapping: { ...book().mapping!, inverted: true } })
    expect(findingText('orientation_mismatch', flagged).text).toMatch(/nel nostro stesso ordine/)
    expect(findingText('sides_look_swapped', book()).text).toMatch(/gli altri 5/)
  })

  it('an event gone: suspended when the read is complete, left to expire otherwise', () => {
    const complete = book({ outcomes: [outcome({ change: 'withdrawn', live: null })] })
    expect(findingText('not_listed', complete).text).toMatch(/sono state sospese/)
    const partial = book({ outcomes: [outcome({ change: null, live: null })] })
    expect(findingText('not_listed', partial).text).toMatch(/non sono state confermate/)
  })

  it('the prices suspended with an event gone are not said twice', () => {
    expect(shownFindings(book({ findings: ['not_listed', 'price_withdrawn'] }))).toEqual([
      'not_listed',
    ])
    expect(shownFindings(book({ findings: ['price_withdrawn', 'price_moved'] }))).toEqual([
      'price_withdrawn',
      'price_moved',
    ])
  })

  it('a kick-off that differs, in minutes or hours, before or after', () => {
    expect(findingText('kickoff_differs', book({ kickoffDeltaMinutes: 105 })).text).toMatch(
      /105 minuti dopo/,
    )
    expect(findingText('kickoff_differs', book({ kickoffDeltaMinutes: -1440 })).text).toMatch(
      /24 ore prima/,
    )
  })
})

describe('the verdict', () => {
  const bwin = book()
  const betfair = book({ slug: 'betfair', name: 'Betfair Exchange', isExchange: true })

  it('everything confirmed: the difference on the site is the bookmaker’s own price', () => {
    const verdict = recheckVerdict({ bookmakers: [bwin, betfair] })
    expect(verdict.title).toBe('Quote confermate')
    expect(verdict.tone).toBe('profit')
    expect(verdict.text).toMatch(/da loggato/)
  })

  it('a moved price names its bookmaker', () => {
    const verdict = recheckVerdict({
      bookmakers: [book({ findings: ['price_moved'] }), betfair],
    })
    expect(verdict).toMatchObject({ title: 'Quota mossa', tone: 'warning' })
    expect(verdict.text).toMatch(/^Su Bwin /)
  })

  it('swapped sides come before anything else', () => {
    const verdict = recheckVerdict({
      bookmakers: [
        book({ findings: ['price_moved'] }),
        book({
          slug: 'goldbet',
          name: 'GoldBet (Lottomatica)',
          findings: ['sides_look_swapped', 'price_confirmed'],
        }),
      ],
    })
    expect(verdict).toMatchObject({ title: 'Probabile inversione dei segni', tone: 'loss' })
    expect(verdict.text).toMatch(/^Su GoldBet /)
  })

  it('an event or a price gone', () => {
    const verdict = recheckVerdict({
      bookmakers: [book({ listed: false, findings: ['not_listed', 'price_withdrawn'] }), betfair],
    })
    expect(verdict).toMatchObject({ title: 'Quota non più disponibile', tone: 'loss' })
  })

  it('all read moments ago: already fresh, with the same note on the logged-in price', () => {
    const recent = book({ outcome: 'recent', findings: [] })
    const verdict = recheckVerdict({ bookmakers: [recent] })
    expect(verdict).toMatchObject({ title: 'Quote già fresche', tone: 'info' })
    expect(verdict.text).toMatch(/da loggato/)
    expect(recheckVerdict({ bookmakers: [bwin, recent] }).title).toBe('Quote confermate')
  })

  it('nothing read, or only part of the row', () => {
    const busy = book({ outcome: 'busy', findings: [] })
    expect(recheckVerdict({ bookmakers: [busy] }).title).toBe('Nessuna lettura nuova')
    expect(recheckVerdict({ bookmakers: [bwin, busy] }).title).toBe('Lettura parziale')
  })

  it('never names a bookmaker other than the ones of the answer', () => {
    const snai = book({ slug: 'snai', name: 'Snai', findings: ['price_moved'] })
    const text = JSON.stringify([
      recheckVerdict({ bookmakers: [snai] }),
      readOutcomeText(snai),
      findingText('price_moved', snai),
    ])
    expect(text).toMatch(/Snai/)
    expect(text.toLowerCase()).not.toMatch(/sisal/)
  })
})

describe('the combination after the read', () => {
  const read = { bookmakers: [book()], matcherApplied: true }

  // formatRating puts a no-break space before the percent sign.
  const plain = (text: string | null) => text?.replace(/\u00a0/g, ' ')

  it('rating before and after', () => {
    expect(
      plain(rowOutcomeText({ rating: 101.23 }, { ...read, row: { found: true, rating: 96.14 } })),
    ).toBe('Rating della combinazione: 101,2 % → 96,1 %.')
    expect(
      plain(rowOutcomeText({ rating: 101.23 }, { ...read, row: { found: true, rating: 101.2 } })),
    ).toBe('Rating della combinazione: 101,2 %, invariato.')
  })

  it('gone from the results', () => {
    expect(
      rowOutcomeText({ rating: 101.23 }, { ...read, row: { found: false, rating: null } }),
    ).toMatch(/non è più fra i risultati/)
  })

  it('nothing to say with no row asked, with nothing read, and a wait while recomputing', () => {
    expect(rowOutcomeText({ rating: 101 }, read)).toBeNull()
    expect(
      rowOutcomeText(
        { rating: 101 },
        {
          bookmakers: [book({ outcome: 'busy' })],
          matcherApplied: true,
          row: { found: true, rating: 101 },
        },
      ),
    ).toBeNull()
    expect(
      rowOutcomeText(
        { rating: 101 },
        { ...read, matcherApplied: false, row: { found: true, rating: 101 } },
      ),
    ).toMatch(/si stanno ricalcolando/)
  })
})

describe('the allowance', () => {
  it('what is left in the hour', () => {
    expect(quotaText({ limit: 60, remaining: 57, resetAt: null, windowSeconds: 3600 })).toBe(
      'Ti restano 57 ricalcoli su 60 in quest’ora.',
    )
    expect(quotaText({ limit: 5, remaining: 1, resetAt: null, windowSeconds: 1800 })).toBe(
      'Ti resta 1 ricalcolo su 5 ogni 30 minuti.',
    )
  })

  it('none left: when the next one comes back', () => {
    const text = quotaText({
      limit: 3,
      remaining: 0,
      resetAt: '2026-11-23T21:30:00.000Z',
      windowSeconds: 3600,
    })
    expect(text).toMatch(
      /^Ti restano 0 ricalcoli su 3 in quest’ora\. Il prossimo dalle \d{2}:\d{2}/,
    )
  })

  it('a user with no allowance', () => {
    expect(quotaText({ limit: 0, remaining: 0, resetAt: null, windowSeconds: 3600 })).toMatch(
      /non è abilitato/,
    )
  })
})
