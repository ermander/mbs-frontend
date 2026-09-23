import { describe, expect, it } from 'vitest'
import {
  RESULT_BTTS_MARKET_LABEL,
  RESULT_BTTS_ZERO_ZERO_LABEL,
  localDayBounds,
  resultBttsLegs,
  resultBttsRating,
  resultBttsRowAge,
  resultBttsRowKey,
} from './result-btts'
import type { ResultBttsLeg, ResultBttsOutcomeKey, ResultBttsRow } from '@/types/result-btts'

const leg = (outcomeKey: ResultBttsOutcomeKey, label: string, odds: number): ResultBttsLeg => ({
  outcomeKey,
  label,
  odds,
  lastSeenAt: '2026-09-16T19:58:00.000Z',
})
const MONZA: Pick<ResultBttsRow, 'legs' | 'zeroZero' | 'eventId' | 'bookmakerSlug' | 'lastSeenAt'> =
  {
    eventId: 'ev-1',
    bookmakerSlug: 'bet365',
    lastSeenAt: '2026-09-16T19:50:00.000Z',
    legs: [
      leg('home_yes', '1 & GG', 5.5),
      leg('home_no', '1 & NG', 6),
      leg('draw_yes', 'X & GG', 4.33),
      leg('away_yes', '2 & GG', 4.33),
      leg('away_no', '2 & NG', 4.33),
    ],
    zeroZero: { odds: 11, label: 'X & NG', lastSeenAt: '2026-09-16T19:00:00.000Z' },
  }

describe('risultato + goal: the dutch over the five legs but «X & NG»', () => {
  it('legs, rating and labels', () => {
    expect(RESULT_BTTS_MARKET_LABEL).toBe('1X2 + GG/NG')
    expect(RESULT_BTTS_ZERO_ZERO_LABEL).toBe('X & NG')
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
    expect(resultBttsLegs({ legs: [MONZA.legs[0], { ...MONZA.legs[1], odds: 1 }] })).toEqual([])
    expect(resultBttsRating({ legs: [MONZA.legs[0]] })).toBeNull()
  })
  it('row key and age', () => {
    expect(resultBttsRowKey(MONZA)).toBe('ev-1|bet365')
    expect(resultBttsRowAge(MONZA, Date.parse('2026-09-16T20:00:00.000Z'))).toBe(600)
  })
  it('a date of the filter is a whole local day, whatever the kickoff hour (§14.177)', () => {
    const bounds = localDayBounds('2026-09-25')
    expect(bounds).not.toBeNull()
    const from = new Date(bounds!.from)
    const to = new Date(bounds!.to)
    expect([
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
      from.getHours(),
      from.getMinutes(),
    ]).toEqual([2026, 8, 25, 0, 0])
    expect([
      to.getDate(),
      to.getHours(),
      to.getMinutes(),
      to.getSeconds(),
      to.getMilliseconds(),
    ]).toEqual([25, 23, 59, 59, 999])
    expect(to.getTime() - from.getTime()).toBe(24 * 3600 * 1000 - 1)
    expect(localDayBounds('')).toBeNull()
    expect(localDayBounds('2026-09-25T18:45')).toBeNull()
    expect(localDayBounds('2026-02-30')).toBeNull()
  })
})
