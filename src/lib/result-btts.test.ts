import { describe, expect, it } from 'vitest'
import {
  RESULT_BTTS_COMPARED,
  RESULT_BTTS_EXCLUDED,
  TOOL_MARKETS,
  TOOL_MARKET_LIST,
  comparedKeys,
  excludedHint,
  isToolMarketKey,
  outcomeLabel,
  resultBttsLegs,
  resultBttsMarketLabel,
  resultBttsRating,
  resultBttsRowAge,
  resultBttsRowKey,
} from './result-btts'
import type { ResultBttsRow } from '@/types/result-btts'

const price = (odds: number, label: string) => ({
  odds,
  label,
  lastSeenAt: '2026-09-16T19:58:00.000Z',
})
type Row = Pick<
  ResultBttsRow,
  | 'prices'
  | 'eventId'
  | 'bookmakerSlug'
  | 'lastSeenAt'
  | 'marketKey'
  | 'line'
  | 'excludedOutcome'
  | 'canonicalMarketId'
>
const MONZA: Row = {
  eventId: 'ev-1',
  canonicalMarketId: 'cm-1',
  bookmakerSlug: 'bet365',
  marketKey: 'result_btts',
  line: null,
  excludedOutcome: 'draw_no',
  lastSeenAt: '2026-09-16T19:50:00.000Z',
  prices: {
    home_yes: price(5.5, '1 & GG'),
    home_no: price(6, '1 & NG'),
    draw_yes: price(4.33, 'X & GG'),
    draw_no: price(11, 'X & NG'),
    away_yes: price(4.33, '2 & GG'),
    away_no: price(4.33, '2 & NG'),
  },
}
// Lens v Sporting on the live feed (prefix 1145, line 2.5, 2026-09-23).
const LENS: Row = {
  eventId: 'ev-2',
  canonicalMarketId: 'cm-t25',
  bookmakerSlug: 'bet365',
  marketKey: 'total_btts',
  line: 2.5,
  excludedOutcome: 'over_no',
  lastSeenAt: '2026-09-16T19:50:00.000Z',
  prices: {
    over_yes: price(1.8, 'Over & GG'),
    over_no: price(9.5, 'Over & NG'),
    under_yes: price(7.5, 'Under & GG'),
    under_no: price(3.1, 'Under & NG'),
  },
}

describe('result & both teams to score', () => {
  it('compares five outcomes, never «X & NG», with the default exclusion', () => {
    expect(RESULT_BTTS_EXCLUDED).toBe('draw_no')
    expect(RESULT_BTTS_COMPARED).toEqual(['home_yes', 'home_no', 'draw_yes', 'away_yes', 'away_no'])
    const legs = resultBttsLegs(MONZA)
    expect(legs.map((l) => `${l.label}@${l.odds}`)).toEqual([
      '1 & GG@5.5',
      '1 & NG@6',
      'X & GG@4.33',
      '2 & GG@4.33',
      '2 & NG@4.33',
    ])
    expect(resultBttsMarketLabel(MONZA)).toBe('1X2 + GG/NG')
    expect(excludedHint('result_btts', 'draw_no')).toBe('(0-0)')
    expect(excludedHint('result_btts', 'home_no')).toBe('')
  })
  it('rates the compared legs as the store rates a dutch: 100 / Σ 1/q', () => {
    const expected = 100 / (1 / 5.5 + 1 / 6 + 1 / 4.33 + 1 / 4.33 + 1 / 4.33)
    expect(resultBttsRating(MONZA)).toBeCloseTo(expected, 6)
    expect(
      resultBttsRating({ ...MONZA, prices: { ...MONZA.prices, away_no: undefined } }),
    ).toBeNull()
    expect(
      resultBttsLegs({ ...MONZA, prices: { ...MONZA.prices, home_yes: price(1, '1 & GG') } }),
    ).toEqual([])
  })
  it('the exclusion travels with the row: another outcome, or none (§14.173)', () => {
    const withoutHome = resultBttsLegs({ ...MONZA, excludedOutcome: 'home_yes' })
    expect(withoutHome.map((l) => l.key)).toEqual([
      'home_no',
      'draw_yes',
      'draw_no',
      'away_yes',
      'away_no',
    ])
    const all = resultBttsLegs({ ...MONZA, excludedOutcome: null })
    expect(all).toHaveLength(6)
    expect(resultBttsRating({ ...MONZA, excludedOutcome: null })).toBeCloseTo(
      100 / (1 / 5.5 + 1 / 6 + 1 / 4.33 + 1 / 11 + 1 / 4.33 + 1 / 4.33),
      6,
    )
    expect(comparedKeys('total_btts', null)).toEqual([
      'over_yes',
      'over_no',
      'under_yes',
      'under_no',
    ])
  })
  it('total goals + GG/NG: three legs by default, the line in the market label', () => {
    expect(TOOL_MARKETS.total_btts.defaultExcluded).toBe('over_no')
    const legs = resultBttsLegs(LENS)
    expect(legs.map((l) => `${l.label}@${l.odds}`)).toEqual([
      'Over & GG@1.8',
      'Under & GG@7.5',
      'Under & NG@3.1',
    ])
    expect(resultBttsRating(LENS)).toBeCloseTo(100 / (1 / 1.8 + 1 / 7.5 + 1 / 3.1), 6)
    expect(resultBttsMarketLabel(LENS)).toBe('U/O 2.5 + GG/NG')
    expect(resultBttsMarketLabel({ marketKey: 'total_btts', line: null })).toBe('U/O + GG/NG')
    expect(resultBttsMarketLabel({ marketKey: 'btts_halves', line: null })).toBe('GG/NG 1T + 2T')
    expect(outcomeLabel('btts_halves', 'no_yes')).toBe('1T NG & 2T GG')
    expect(TOOL_MARKETS.btts_halves.defaultExcluded).toBe('yes_yes')
    expect(TOOL_MARKET_LIST.map((m) => m.key)).toEqual(['result_btts', 'total_btts', 'btts_halves'])
    expect(isToolMarketKey('total_btts')).toBe(true)
    expect(isToolMarketKey('btts')).toBe(false)
  })
  it('row key and age', () => {
    expect(resultBttsRowKey(MONZA)).toBe('cm-1|bet365')
    expect(resultBttsRowKey(LENS)).toBe('cm-t25|bet365')
    expect(resultBttsRowAge(MONZA, Date.parse('2026-09-16T20:00:00.000Z'))).toBe(600)
  })
})
