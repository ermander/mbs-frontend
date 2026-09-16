import { describe, expect, it } from 'vitest'
import {
  BACCARAT_BANCO_ODDS,
  BACCARAT_PLAYER_ODDS,
  computeBaccarat,
  otherSide,
  type BaccaratInput,
} from './baccarat-engine'
import { realRating, roundToChip } from './casino-common'

function input(overrides: Partial<BaccaratInput> = {}): BaccaratInput {
  return {
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    puntaSide: 'player',
    chip: 0.01,
    coverLocked: false,
    coverOverride: null,
    ...overrides,
  }
}

describe('casino-common', () => {
  it('roundToChip: nearest multiple, ties up, fixed to the cent', () => {
    expect(roundToChip(102.5641, 0.01)).toBe(102.56)
    expect(roundToChip(102.5641, 1)).toBe(103)
    expect(roundToChip(102.5641, 5)).toBe(105)
    expect(roundToChip(2.5, 1)).toBe(3)
    expect(roundToChip(2.7778, 0.5)).toBe(3)
    expect(roundToChip(2.7778, 0.2)).toBe(2.8)
    expect(roundToChip(8.3333, 0.1)).toBe(8.3)
    expect(roundToChip(0.3, 0.1)).toBe(0.3)
  })

  it('realRating: 100 + min/stake with real money, the conversion rate with bonus only', () => {
    expect(realRating(100, 100, -5)).toBeCloseTo(95, 9)
    expect(realRating(0, 100, 94.87)).toBeCloseTo(94.87, 9)
    expect(realRating(100, 200, 94.87)).toBeCloseTo(97.435, 9)
    expect(realRating(100, 100, null)).toBeNull()
    expect(realRating(0, 0, 1)).toBeNull()
  })
})

describe('computeBaccarat — punta on Player, cover on Banco', () => {
  it('prices are fixed: Player 2.00, Banco 1.95 (1:1 less 5%)', () => {
    expect(BACCARAT_PLAYER_ODDS).toBe(2)
    expect(BACCARAT_BANCO_ODDS).toBeCloseTo(1.95, 12)
    expect(otherSide('player')).toBe('banco')
    expect(otherSide('banco')).toBe('player')
  })

  it('100 real, cent chips: Banco 102.56, both outcomes lose about 2.57, rating 97.43 on the real result', () => {
    const r = computeBaccarat(input())
    expect(r.puntaSide).toBe('player')
    expect(r.coverSide).toBe('banco')
    expect(r.puntataEffettiva).toBe(100)
    expect(r.legs.map((l) => l.isPunta)).toEqual([true, false])
    expect(r.legs.map((l) => l.stake)).toEqual([100, 102.56])
    expect(r.stakeCoverExact).toBeCloseTo(102.5641, 4)
    expect(r.stakeCoverRounded).toBe(102.56)
    expect(r.outcomes[0].byLeg).toEqual([expect.closeTo(100, 9), expect.closeTo(-102.56, 9)])
    expect(r.outcomes[0].profit).toBeCloseTo(-2.56, 9)
    expect(r.outcomes[1].byLeg).toEqual([expect.closeTo(-100, 9), expect.closeTo(97.432, 9)])
    expect(r.outcomes[1].profit).toBeCloseTo(-2.568, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.568, 9)
    expect(r.rating).toBeCloseTo(97.432, 9)
    expect(r.crPercent).toBeNull()
    expect(r.coverLocked).toBe(false)
    expect(r.showSummary).toBe(true)
  })

  it('5 € chips: Banco 105, −5.00 if Player wins, −0.25 if Banco wins, rating 95.00', () => {
    const r = computeBaccarat(input({ chip: 5 }))
    expect(r.stakeCoverRounded).toBe(105)
    expect(r.stakeCover).toBe(105)
    expect(r.outcomes[0].profit).toBeCloseTo(-5, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(-0.25, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-5, 9)
    expect(r.rating).toBeCloseTo(95, 9)
  })

  it('1 € chips: Banco 103, −3.00 / −2.15, rating 97.00', () => {
    const r = computeBaccarat(input({ chip: 1 }))
    expect(r.stakeCover).toBe(103)
    expect(r.outcomes[0].profit).toBeCloseTo(-3, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(-2.15, 9)
    expect(r.rating).toBeCloseTo(97, 9)
  })

  it('100 real + 100 bonus: Banco 205.13, the bonus converts at 94.87, rating (100 + 94.87) / 200', () => {
    const r = computeBaccarat(input({ bonus: 100 }))
    expect(r.puntataEffettiva).toBe(200)
    expect(r.stakeCover).toBe(205.13)
    expect(r.outcomes[0].profit).toBeCloseTo(94.87, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(94.8735, 9)
    expect(r.rating).toBeCloseTo(97.435, 9)
  })

  it('bonus only: rating = conversion of the bonus, 97.43', () => {
    const r = computeBaccarat(input({ puntata: null, bonus: 100 }))
    expect(r.stakeCover).toBe(102.56)
    expect(r.outcomes[0].profit).toBeCloseTo(97.44, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(97.432, 9)
    expect(r.rating).toBeCloseTo(97.432, 9)
  })

  it('rimborso: cover sized on the refunded stake, CR% shown', () => {
    const r = computeBaccarat(input({ rimborso: 100 }))
    expect(r.isRimborso).toBe(true)
    expect(r.stakeCoverExact).toBeCloseTo(51.2821, 4)
    expect(r.stakeCover).toBe(51.28)
    expect(r.outcomes[0].profit).toBeCloseTo(48.72, 9)
    expect(r.outcomes[1].rimborso).toBe(100)
    expect(r.outcomes[1].profit).toBeCloseTo(48.716, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(48.716, 9)
    expect(r.crPercent).toBeCloseTo(48.716, 9)
  })

  it('a refund at least as large as the punta return leaves nothing to cover', () => {
    const r = computeBaccarat(input({ rimborso: 200 }))
    expect(r.stakeCover).toBeNull()
    expect(r.guadagnoMinimo).toBeNull()
    expect(r.showSummary).toBe(false)
  })

  it('empty or negative amounts give no summary', () => {
    expect(computeBaccarat(input({ puntata: null })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: 0 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: -5, bonus: 10 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ bonus: -1 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ rimborso: -1 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: null })).stakeCover).toBeNull()
  })
})

describe('computeBaccarat — punta on Banco, cover on Player', () => {
  it('100 real on Banco: Player cover 97.50, −2.50 either way, rating 97.50', () => {
    const r = computeBaccarat(input({ puntaSide: 'banco' }))
    expect(r.puntaSide).toBe('banco')
    expect(r.coverSide).toBe('player')
    expect(r.legs.map((l) => l.isPunta)).toEqual([false, true])
    expect(r.legs.map((l) => l.stake)).toEqual([97.5, 100])
    // Player wins: the cover pays 2.00, the Banco stake is lost.
    expect(r.outcomes[0].byLeg).toEqual([expect.closeTo(97.5, 9), expect.closeTo(-100, 9)])
    expect(r.outcomes[0].profit).toBeCloseTo(-2.5, 9)
    expect(r.outcomes[0].rimborso).toBe(0)
    // Banco wins: 100 × 0.95 on the punta, the cover is lost.
    expect(r.outcomes[1].byLeg).toEqual([expect.closeTo(-97.5, 9), expect.closeTo(95, 9)])
    expect(r.outcomes[1].profit).toBeCloseTo(-2.5, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.5, 9)
    expect(r.rating).toBeCloseTo(97.5, 9)
  })

  it('rimborso on Banco: the refund arrives when Player wins', () => {
    const r = computeBaccarat(input({ puntaSide: 'banco', rimborso: 50 }))
    expect(r.stakeCoverExact).toBeCloseTo((195 - 50) / 2, 9)
    expect(r.outcomes[0].rimborso).toBe(50)
    expect(r.outcomes[1].rimborso).toBe(0)
    expect(r.outcomes[0].profit).toBeCloseTo(r.outcomes[1].profit as number, 2)
  })
})

describe('computeBaccarat — locked cover', () => {
  it('the locked amount replaces the computed cover; the rounded one is still reported', () => {
    const r = computeBaccarat(input({ chip: 5, coverLocked: true, coverOverride: 100 }))
    expect(r.coverLocked).toBe(true)
    expect(r.legs[1].locked).toBe(true)
    expect(r.stakeCoverRounded).toBe(105)
    expect(r.stakeCover).toBe(100)
    expect(r.outcomes[0].profit).toBeCloseTo(0, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(-5, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-5, 9)
    expect(r.rating).toBeCloseTo(95, 9)
  })

  it('locked without an amount: no summary until the user types one', () => {
    const r = computeBaccarat(input({ coverLocked: true, coverOverride: null }))
    expect(r.stakeCover).toBeNull()
    expect(r.stakeCoverRounded).toBe(102.56)
    expect(r.showSummary).toBe(false)
    expect(computeBaccarat(input({ coverLocked: true, coverOverride: 0 })).showSummary).toBe(false)
  })
})
