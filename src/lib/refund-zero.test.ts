import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REFUND_ZERO_COMMISSION_PCT,
  DEFAULT_REFUND_ZERO_STAKE,
  formatEuro,
  formatSignedEuro,
  formatSignedPct,
  parseCommissionPct,
  parseStake,
  profitTone,
  refundZeroOtherLines,
  refundZeroRowAge,
  refundZeroRowKey,
} from './refund-zero'
import type { RefundZeroLine } from '@/types/refund-zero'

const line = (outcomeKey: string, profit: number): RefundZeroLine => ({
  outcomeKey,
  label: outcomeKey.replace('_', '-'),
  back: { odds: 6.5, label: '1-0', lastSeenAt: '2026-10-28T11:58:00.000Z' },
  lay: { odds: 6.6, label: '1-0', lastSeenAt: '2026-10-28T11:58:00.000Z' },
  layStake: 98.8,
  layLiability: 553.3,
  zeroLayStake: 9.54,
  zeroLiability: 90.6,
  qualifyingLoss: 3.18,
  profit,
  profitPct: profit,
  cases: { scoreWins: profit, otherResult: profit, zeroZero: profit },
})

describe('refund-zero helpers', () => {
  it('row key and age', () => {
    expect(
      refundZeroRowKey({
        eventId: 'ev',
        backBookmaker: { id: 'a', slug: 'bet365', name: 'Bet365', eventUrl: null },
        layBookmaker: { id: 'b', slug: 'sportmarket', name: 'Sportmarket', eventUrl: null },
      }),
    ).toBe('ev|bet365|sportmarket')
    expect(
      refundZeroRowAge(
        { lastSeenAt: '2026-10-28T11:58:00.000Z' },
        Date.parse('2026-10-28T12:00:00.000Z'),
      ),
    ).toBe(120)
  })

  it('money and percent, Italian, signed', () => {
    expect(formatEuro(98.64).replace(/ /g, ' ')).toBe('98,64 €')
    expect(formatSignedEuro(2.19).replace(/ /g, ' ')).toBe('+2,19 €')
    expect(formatSignedEuro(-5.8).replace(/ /g, ' ')).toBe('−5,80 €')
    expect(formatSignedEuro(0).replace(/ /g, ' ')).toBe('0,00 €')
    expect(formatSignedPct(2.19)).toBe('+2,19 %')
    expect(formatSignedPct(-0.5)).toBe('−0,50 %')
    expect(profitTone(0.01)).toBe('positive')
    expect(profitTone(-0.01)).toBe('negative')
    expect(profitTone(0)).toBe('neutral')
  })

  it('stake and commission as typed, defaults on nonsense', () => {
    expect(parseStake('150')).toBe(150)
    expect(parseStake('12,5')).toBe(12.5)
    expect(parseStake('')).toBe(DEFAULT_REFUND_ZERO_STAKE)
    expect(parseStake('-3')).toBe(DEFAULT_REFUND_ZERO_STAKE)
    expect(parseCommissionPct('4,5')).toBe(4.5)
    expect(parseCommissionPct('0')).toBe(0)
    expect(parseCommissionPct('45')).toBe(DEFAULT_REFUND_ZERO_COMMISSION_PCT)
    expect(parseCommissionPct('abc')).toBe(DEFAULT_REFUND_ZERO_COMMISSION_PCT)
  })

  it('the other lines leave the best out', () => {
    const best = line('1_0', 2.19)
    const others = refundZeroOtherLines({
      best,
      lines: [best, line('1_1', 1.1), line('2_1', -0.4)],
    })
    expect(others.map((l) => l.label)).toEqual(['1-1', '2-1'])
  })
})
