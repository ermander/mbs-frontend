import { describe, expect, it } from 'vitest'
import { stakeBFromStakeA, stakeBFromStakeARimborso } from '@/lib/calculators/punta-punta'
import { stakeBCFromStakeA } from '@/lib/calculators/tri-punta'
import { computeDutch, type DutchInput } from './dutch-engine'

const book = (grossOdds: number | null) => ({ grossOdds, commissionPercent: 0 })
const exchange = (grossOdds: number | null) => ({ grossOdds, commissionPercent: 4.5 })

function input(overrides: Partial<DutchInput> = {}): DutchInput {
  return {
    legs: [book(2), book(2.2)],
    puntaIndex: 0,
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    imbalancePercent: 0,
    ...overrides,
  }
}

describe('computeDutch — two legs', () => {
  it('100 on 2.00 against 2.20: cover 90.91, both profits ≈ 9.09, rating 104.76', () => {
    const r = computeDutch(input())
    expect(r.legs[1].stakeExact).toBeCloseTo(stakeBFromStakeA(100, 2, 2.2) as number, 9)
    expect(r.legs[1].stake).toBe(90.91)
    expect(r.legs[0].stake).toBe(100)
    expect(r.totalOutlay).toBeCloseTo(190.91, 9)
    expect(r.legs[0].profit).toBeCloseTo(9.09, 9)
    expect(r.legs[1].profit).toBeCloseTo(9.092, 3)
    expect(r.guadagnoMinimo).toBeCloseTo(9.09, 9)
    expect(r.rating).toBeCloseTo(104.76, 2)
    expect(r.showSummary).toBe(true)
  })

  it('a cover on an exchange is priced net of its commission', () => {
    const r = computeDutch(input({ legs: [book(2), exchange(2.2)] }))
    expect(r.legs[1].netOdds).toBeCloseTo(2.146, 9)
    expect(r.legs[1].stake).toBe(93.2)
    expect(r.legs[0].profit).toBeCloseTo(6.8, 9)
    expect(r.legs[1].profit).toBeCloseTo(6.81, 1)
    expect(r.rating).toBeCloseTo(103.52, 2)
  })

  it('rimborso: the cover follows stakeBFromStakeARimborso and both outcomes pay the same', () => {
    const r = computeDutch(input({ legs: [book(3), book(1.5)], puntata: 10, rimborso: 10 }))
    expect(r.legs[1].stakeExact).toBeCloseTo(stakeBFromStakeARimborso(10, 3, 1.5, 10) as number, 9)
    expect(r.legs[1].stake).toBe(13.33)
    expect(r.legs[0].profit).toBeCloseTo(6.67, 9)
    expect(r.legs[1].profit).toBeCloseTo(6.665, 3)
  })

  it('the stake can go on the second leg', () => {
    const r = computeDutch(input({ puntaIndex: 1 }))
    expect(r.legs[1].isPunta).toBe(true)
    expect(r.legs[1].stake).toBe(100)
    expect(r.legs[0].stake).toBe(110)
    expect(r.legs[0].profit).toBeCloseTo(10, 9)
    expect(r.legs[1].profit).toBeCloseTo(10, 9)
  })

  it('imbalance scales the covers, capped at ±30', () => {
    expect(computeDutch(input({ imbalancePercent: 10 })).legs[1].stake).toBe(100)
    expect(computeDutch(input({ imbalancePercent: 60 })).imbalanceFactor).toBe(1.3)
  })

  it('bonus: covers stake + bonus, the real stake is the only cost of the punta leg', () => {
    const r = computeDutch(input({ bonus: 50 }))
    expect(r.puntataEffettiva).toBe(150)
    expect(r.legs[1].stake).toBe(136.36)
    expect(r.totalOutlay).toBeCloseTo(236.36, 9)
    expect(r.legs[0].profit).toBeCloseTo(63.64, 9)
    expect(r.legs[1].profit).toBeCloseTo(63.632, 3)
  })

  it('nothing to compute without a stake, a price or a positive numerator; the rating survives', () => {
    expect(computeDutch(input({ puntata: null })).showSummary).toBe(false)
    expect(computeDutch(input({ puntata: null })).rating).toBeCloseTo(104.76, 2)
    const noPrice = computeDutch(input({ legs: [book(2), book(null)] }))
    expect(noPrice.showSummary).toBe(false)
    expect(noPrice.rating).toBeNull()
    expect(noPrice.legs[1].stake).toBeNull()
    expect(computeDutch(input({ puntata: 10, rimborso: 25 })).showSummary).toBe(false)
  })
})

describe('computeDutch — three legs', () => {
  it('matches stakeBCFromStakeA and pays the same (negative, the market is under 100)', () => {
    const r = computeDutch(input({ legs: [book(2.1), book(3.4), book(3.6)] }))
    const lib = stakeBCFromStakeA(100, 2.1, 3.4, 3.6) as { stakeB: number; stakeC: number }
    expect(r.legs[1].stakeExact).toBeCloseTo(lib.stakeB, 9)
    expect(r.legs[2].stakeExact).toBeCloseTo(lib.stakeC, 9)
    expect(r.legs[1].stake).toBe(61.76)
    expect(r.legs[2].stake).toBe(58.33)
    expect(r.totalOutlay).toBeCloseTo(220.09, 9)
    expect(r.legs[0].profit).toBeCloseTo(-10.09, 9)
    expect(r.legs[1].profit).toBeCloseTo(-10.106, 3)
    expect(r.legs[2].profit).toBeCloseTo(-10.102, 3)
    expect(r.guadagnoMinimo).toBeCloseTo(-10.106, 3)
    expect(r.rating).toBeCloseTo(95.41, 2)
  })

  it('the punta leg can be the draw', () => {
    const r = computeDutch(input({ legs: [book(2.1), book(3.4), book(3.6)], puntaIndex: 1 }))
    expect(r.legs[1].isPunta).toBe(true)
    expect(r.legs[0].stake).toBe(161.9)
    expect(r.legs[2].stake).toBe(94.44)
  })
})
