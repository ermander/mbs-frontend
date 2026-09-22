import { describe, expect, it } from 'vitest'
import {
  TOOL_MARKETS,
  TOOL_MARKET_LIST,
  isToolMarketKey,
  resultBttsLegs,
  resultBttsMarketLabel,
  resultBttsRating,
  resultBttsRowAge,
  resultBttsRowKey,
} from './result-btts'
import type { ResultBttsLeg, ResultBttsRow } from '@/types/result-btts'

const leg = (
  marketTypeKey: string,
  outcomeKey: string,
  label: string,
  odds: number,
): ResultBttsLeg => ({
  marketTypeKey,
  outcomeKey,
  label,
  odds,
  lastSeenAt: '2026-09-16T19:58:00.000Z',
})
type Row = Pick<
  ResultBttsRow,
  'legs' | 'zeroZero' | 'bookmakerSlug' | 'lastSeenAt' | 'marketKey' | 'line' | 'canonicalMarketId'
>
const MONZA: Row = {
  canonicalMarketId: 'cm-1',
  bookmakerSlug: 'bet365',
  marketKey: 'result_btts',
  line: null,
  lastSeenAt: '2026-09-16T19:50:00.000Z',
  legs: [
    leg('result_btts', 'home_yes', '1 & GG', 5.5),
    leg('result_btts', 'home_no', '1 & NG', 6),
    leg('result_btts', 'draw_yes', 'X & GG', 4.33),
    leg('result_btts', 'away_yes', '2 & GG', 4.33),
    leg('result_btts', 'away_no', '2 & NG', 4.33),
  ],
  zeroZero: { odds: 11, label: 'X & NG', lastSeenAt: '2026-09-16T19:00:00.000Z' },
}
// Monza v Sassuolo on the golden sample: the 2.5 total with the exact scores it leaves open (§14.174).
const TOTAL: Row = {
  canonicalMarketId: 'cm-t25',
  bookmakerSlug: 'bet365',
  marketKey: 'total_btts',
  line: 2.5,
  lastSeenAt: '2026-09-16T19:50:00.000Z',
  legs: [
    leg('total_btts', 'over_yes', 'Over 2.5 & GG', 2.1),
    leg('total_btts', 'over_no', 'Over 2.5 & NG', 10),
    leg('total_btts', 'under_yes', 'Under 2.5 & GG', 6.5),
    leg('correct_score', '1_0', '1-0', 11),
    leg('correct_score', '0_1', '0-1', 9),
    leg('correct_score', '2_0', '2-0', 17),
    leg('correct_score', '0_2', '0-2', 12),
  ],
  zeroZero: { odds: 11, label: '0-0', lastSeenAt: '2026-09-16T19:58:00.000Z' },
}

describe('risultato + goal: the dutch over everything but the 0-0', () => {
  it('the result market: five legs, «X & NG» is the 0-0', () => {
    expect(resultBttsLegs(MONZA).map((l) => `${l.label}@${l.odds}`)).toEqual([
      '1 & GG@5.5',
      '1 & NG@6',
      'X & GG@4.33',
      '2 & GG@4.33',
      '2 & NG@4.33',
    ])
    expect(resultBttsRating(MONZA)).toBeCloseTo(
      100 / (1 / 5.5 + 1 / 6 + 1 / 4.33 + 1 / 4.33 + 1 / 4.33),
      6,
    )
    expect(resultBttsMarketLabel(MONZA)).toBe('1X2 + GG/NG')
    expect(TOOL_MARKETS.result_btts.zeroZeroLabel).toBe('X & NG')
  })
  it('the total market: the total legs plus the exact scores, the line in the market label', () => {
    expect(resultBttsLegs(TOTAL).map((l) => l.label)).toEqual([
      'Over 2.5 & GG',
      'Over 2.5 & NG',
      'Under 2.5 & GG',
      '1-0',
      '0-1',
      '2-0',
      '0-2',
    ])
    expect(resultBttsRating(TOTAL)).toBeCloseTo(
      100 / (1 / 2.1 + 1 / 10 + 1 / 6.5 + 1 / 11 + 1 / 9 + 1 / 17 + 1 / 12),
      6,
    )
    expect(resultBttsMarketLabel(TOTAL)).toBe('U/O 2.5 + GG/NG + Ris. esatto')
    expect(resultBttsMarketLabel({ marketKey: 'total_btts', line: null })).toBe(
      'U/O + GG/NG + Ris. esatto',
    )
    expect(TOOL_MARKET_LIST.map((m) => m.key)).toEqual(['result_btts', 'total_btts'])
    expect(isToolMarketKey('total_btts')).toBe(true)
    expect(isToolMarketKey('btts_halves')).toBe(false)
  })
  it('a price that is not a price, or a lone leg, is no comparison', () => {
    expect(resultBttsLegs({ legs: [MONZA.legs[0], { ...MONZA.legs[1], odds: 1 }] })).toEqual([])
    expect(resultBttsRating({ legs: [MONZA.legs[0]] })).toBeNull()
  })
  it('row key and age', () => {
    expect(resultBttsRowKey(MONZA)).toBe('cm-1|bet365')
    expect(resultBttsRowKey(TOTAL)).toBe('cm-t25|bet365')
    expect(resultBttsRowAge(MONZA, Date.parse('2026-09-16T20:00:00.000Z'))).toBe(600)
  })
})
