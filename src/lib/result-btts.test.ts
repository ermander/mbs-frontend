import { describe, expect, it } from 'vitest'
import {
  RESULT_BTTS_COMPARED,
  RESULT_BTTS_EXCLUDED,
  resultBttsLegs,
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
const MONZA: Pick<ResultBttsRow, 'prices' | 'eventId' | 'bookmakerSlug' | 'lastSeenAt'> = {
  eventId: 'ev-1',
  bookmakerSlug: 'bet365',
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

describe('result & both teams to score', () => {
  it('compares five outcomes, never «X & NG»', () => {
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
  })
  it('rates the five as the store rates a dutch: 100 / Σ 1/q', () => {
    const expected = 100 / (1 / 5.5 + 1 / 6 + 1 / 4.33 + 1 / 4.33 + 1 / 4.33)
    expect(resultBttsRating(MONZA)).toBeCloseTo(expected, 6)
    expect(resultBttsRating({ prices: { ...MONZA.prices, away_no: undefined } })).toBeNull()
    expect(resultBttsLegs({ prices: { ...MONZA.prices, home_yes: price(1, '1 & GG') } })).toEqual(
      [],
    )
  })
  it('row key and age', () => {
    expect(resultBttsRowKey(MONZA)).toBe('ev-1|bet365')
    expect(resultBttsRowAge(MONZA, Date.parse('2026-09-16T20:00:00.000Z'))).toBe(600)
  })
})
