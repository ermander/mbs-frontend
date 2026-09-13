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
  it('100 @ 2.00 laid @ 2.00 with 5% commission: lay 102.56, liability 102.56, min profit −2.57', () => {
    const r = computePuntaBanca(input())
    expect(r.layStake).toBeCloseTo(102.5641, 4)
    expect(r.layStakeRounded).toBe(102.56)
    expect(r.responsabilita).toBeCloseTo(102.56, 9)
    expect(r.exchangeProfitRounded).toBe(97.43)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-2.56, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(-2.57, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.57, 9)
    expect(r.ratingSeVinciPuntata).toBeCloseTo(97.44, 9)
    expect(r.ratingSeVinciBancata).toBeCloseTo(97.43, 9)
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

  it('lay @ 2.10 with 5%: lay 97.56, liability 107.32, min profit −7.32', () => {
    const r = computePuntaBanca(input({ quotaBanca: 2.1 }))
    expect(r.layStake).toBeCloseTo(97.561, 3)
    expect(r.layStakeRounded).toBe(97.56)
    expect(r.responsabilita).toBeCloseTo(107.316, 3)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-7.316, 3)
    expect(r.totalSeVinciBancata).toBeCloseTo(-7.32, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-7.32, 9)
  })

  it('rimborso: the lay is sized on the refunded stake and both outcomes pay the same', () => {
    const r = computePuntaBanca(
      input({ puntata: 10, rimborso: 10, quotaPunta: 3, quotaBanca: 3.2, commissionePercent: 4.5 }),
    )
    expect(r.isRimborso).toBe(true)
    expect(r.layStake).toBeCloseTo(6.3391, 4)
    expect(r.layStakeRounded).toBe(6.34)
    expect(r.responsabilita).toBeCloseTo(13.948, 3)
    expect(r.totalSeVinciPuntata).toBeCloseTo(6.052, 3)
    expect(r.totalSeVinciBancata).toBeCloseTo(6.05, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(6.05, 9)
  })

  it('bonus: covers stake + bonus, but only the real stake is a cost', () => {
    const r = computePuntaBanca(
      input({ puntata: 10, bonus: 20, quotaPunta: 4, quotaBanca: 4.2, commissionePercent: 4.5 }),
    )
    expect(r.puntataEffettiva).toBe(30)
    expect(r.layStake).toBeCloseTo(28.8809, 4)
    expect(r.responsabilita).toBeCloseTo(92.416, 3)
    expect(r.totalSeVinciPuntata).toBeCloseTo(17.584, 3)
    expect(r.totalSeVinciBancata).toBeCloseTo(17.58, 9)
    expect(r.ratingSeVinciPuntata).toBeCloseTo(91.95, 2)
  })

  it('imbalance scales the lay stake', () => {
    const r = computePuntaBanca(input({ commissionePercent: 0, imbalancePercent: 10 }))
    expect(r.layStake).toBeCloseTo(110, 9)
    const capped = computePuntaBanca(input({ commissionePercent: 0, imbalancePercent: 50 }))
    expect(capped.layStake).toBeCloseTo(130, 9)
  })

  it('partial lays: 50 already laid @ 2.00, the rest @ 2.20', () => {
    const r = computePuntaBanca(
      input({ commissionePercent: 0, partialLays: [{ amount: 50, newOdds: 2.2 }] }),
    )
    expect(r.hasValidPartialLays).toBe(true)
    expect(r.partialLayResults[0]?.newLayStake).toBeCloseTo(45.4545, 4)
    expect(r.partialLayResults[0]?.newLiability).toBeCloseTo(54.5455, 3)
    expect(r.partialLayTotals?.totalLiability).toBe(104.55)
    expect(r.partialLayTotals?.totalExchangeProfit).toBe(95.45)
    expect(r.effResponsabilita).toBe(104.55)
    expect(r.totalSeVinciPuntata).toBeCloseTo(-4.55, 9)
    expect(r.totalSeVinciBancata).toBeCloseTo(-4.55, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-4.55, 9)
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
