import { describe, expect, it } from 'vitest'
import { computePuntaBanca, type PuntaBancaInput } from './punta-banca-engine'

function input(overrides: Partial<PuntaBancaInput> = {}): PuntaBancaInput {
  return {
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    quotaPunta: 2,
    quotaBanca: 2,
    commissionePercent: 5,
    imbalancePercent: 0,
    partialLays: [],
    ...overrides,
  }
}

describe('computePuntaBanca — the Oddsmatcher modal cases', () => {
  it('100 @ 2.00 laid @ 2.00 with 5% commission: lay 102.55 (five cents), liability 102.55, min profit −2.58', () => {
    const r = computePuntaBanca(input())
    expect(r.layStake).toBeCloseTo(102.5641, 4)
    expect(r.layStakeRounded).toBe(102.55)
    expect(r.responsabilita).toBeCloseTo(102.55, 9)
    expect(r.exchangeProfitRounded).toBe(97.42)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-2.55, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(-2.58, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.58, 9)
    expect(r.ratingSeVinciPuntata).toBeCloseTo(97.45, 9)
    expect(r.ratingSeVinciBancata).toBeCloseTo(97.42, 9)
    expect(r.rating).toBeCloseTo(97.44, 2)
    expect(r.isRimborso).toBe(false)
    expect(r.showSummary).toBe(true)
  })

  it('without commission the lay equals the back stake and the profit is zero', () => {
    const r = computePuntaBanca(input({ commissionePercent: 0 }))
    expect(r.layStake).toBeCloseTo(100, 9)
    expect(r.responsabilita).toBeCloseTo(100, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(0, 9)
    expect(r.rating).toBeCloseTo(100, 9)
  })

  it('lay @ 2.10 with 5%: lay 97.55, liability 107.31, min profit −7.33', () => {
    const r = computePuntaBanca(input({ quotaBanca: 2.1 }))
    expect(r.layStake).toBeCloseTo(97.561, 3)
    expect(r.layStakeRounded).toBe(97.55)
    expect(r.responsabilita).toBeCloseTo(107.305, 9)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-7.305, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(-7.33, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-7.33, 9)
  })

  it('the lay lands on five cents, never on the odd cent (§14.229)', () => {
    expect(computePuntaBanca(input({ quotaBanca: 2.17 })).layStakeRounded).toBe(94.35)
    expect(
      computePuntaBanca(input({ commissionePercent: 0, quotaBanca: 2.5 })).layStakeRounded,
    ).toBe(80)
    expect(
      computePuntaBanca(input({ commissionePercent: 0, quotaBanca: 2.08 })).layStakeRounded,
    ).toBe(96.15)
  })

  it('rimborso: the lay is sized on the refunded stake and both outcomes pay the same', () => {
    const r = computePuntaBanca(
      input({ puntata: 10, rimborso: 10, quotaPunta: 3, quotaBanca: 3.2, commissionePercent: 4.5 }),
    )
    expect(r.isRimborso).toBe(true)
    expect(r.layStake).toBeCloseTo(6.3391, 4)
    expect(r.layStakeRounded).toBe(6.35)
    expect(r.responsabilita).toBeCloseTo(13.97, 9)
    expect(r.totalSeVinciPuntata).toBeCloseTo(6.03, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(6.06, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(6.03, 9)
  })

  it('bonus: covers stake + bonus, but only the real stake is a cost', () => {
    const r = computePuntaBanca(
      input({ puntata: 10, bonus: 20, quotaPunta: 4, quotaBanca: 4.2, commissionePercent: 4.5 }),
    )
    expect(r.puntataEffettiva).toBe(30)
    expect(r.layStake).toBeCloseTo(28.8809, 4)
    expect(r.layStakeRounded).toBe(28.9)
    expect(r.responsabilita).toBeCloseTo(92.48, 9)
    expect(r.totalSeVinciPuntata).toBeCloseTo(17.52, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(17.6, 9)
    expect(r.ratingSeVinciPuntata).toBeCloseTo(91.73, 2)
  })

  it('imbalance scales the lay stake', () => {
    const r = computePuntaBanca(input({ commissionePercent: 0, imbalancePercent: 10 }))
    expect(r.layStake).toBeCloseTo(110, 9)
    const capped = computePuntaBanca(input({ commissionePercent: 0, imbalancePercent: 50 }))
    expect(capped.layStake).toBeCloseTo(130, 9)
  })

  it('partial lays: 50 already laid @ 2.00, the rest @ 2.20 is 45.45 (the exact 45.4545 on five cents)', () => {
    const r = computePuntaBanca(
      input({ commissionePercent: 0, partialLays: [{ amount: 50, newOdds: 2.2 }] }),
    )
    expect(r.hasValidPartialLays).toBe(true)
    expect(r.partialLayResults[0]?.newLayStake).toBe(45.45)
    expect(r.partialLayResults[0]?.newLiability).toBeCloseTo(54.54, 9)
    expect(r.partialLayTotals?.totalLiability).toBe(104.54)
    expect(r.partialLayTotals?.totalExchangeProfit).toBe(95.45)
    expect(r.effResponsabilita).toBe(104.54)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-4.54, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(-4.55, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-4.55, 9)
  })

  it('the rest of a partial lay is rounded to five cents too, and sized on the exact target', () => {
    // Exact lay 102.5641 @ 2.00 (5%): 60 already laid @ 2.00, the rest @ 2.30.
    const r = computePuntaBanca(input({ partialLays: [{ amount: 60, newOdds: 2.3 }] }))
    // (102.5641 · 1.95 − 60 · 1.95) / 2.25 = 36.889 → 36.90
    expect(r.partialLayResults[0]?.newLayStake).toBe(36.9)
    expect(r.partialLayResults[0]?.newLiability).toBeCloseTo(47.97, 9)
    expect(r.partialLayTotals?.totalLiability).toBe(107.97)
  })

  it('an incomplete partial lay falls back to the single lay', () => {
    const r = computePuntaBanca(
      input({ commissionePercent: 0, partialLays: [{ amount: null, newOdds: 2.2 }] }),
    )
    expect(r.partialLayResults).toEqual([null])
    expect(r.hasValidPartialLays).toBe(false)
    expect(r.partialLayTotals).toBeNull()
    expect(r.effResponsabilita).toBeCloseTo(100, 9)
  })

  it('without a stake nothing is computed and the summary stays hidden', () => {
    const r = computePuntaBanca(input({ puntata: null }))
    expect(r.layStake).toBeNull()
    expect(r.guadagnoMinimo).toBeNull()
    expect(r.showSummary).toBe(false)
    expect(r.rating).toBeCloseTo(97.44, 2)
  })
})
