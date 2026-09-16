import { describe, expect, it } from 'vitest'
import {
  computeRoulette,
  partageApplies,
  puntaOptions,
  returnFactor,
  rouletteLegs,
  solveLinearSystem,
  type RouletteInput,
} from './roulette-engine'

function input(overrides: Partial<RouletteInput> = {}): RouletteInput {
  return {
    mode: 'rosso_nero',
    partage: false,
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    chip: 0.01,
    ...overrides,
  }
}

describe('roulette tables', () => {
  it('Rosso / Nero + 0 pays 2.00, 2.00, 36.00; dozens pay 3.00 ×3 and 36.00', () => {
    expect(rouletteLegs('rosso_nero').map((l) => l.odds)).toEqual([2, 2, 36])
    expect(rouletteLegs('dozzine').map((l) => l.odds)).toEqual([3, 3, 3, 36])
    expect(rouletteLegs('dozzine').map((l) => l.label)).toEqual([
      '1ª dozzina',
      '2ª dozzina',
      '3ª dozzina',
      '0',
    ])
    expect(partageApplies('rosso_nero')).toBe(true)
    expect(partageApplies('dozzine')).toBe(false)
  })

  it('la partage returns half of an even-money bet on zero, nothing on the dozens', () => {
    const [rosso, nero, zero] = rouletteLegs('rosso_nero')
    expect(returnFactor(rosso, rosso, false)).toBe(2)
    expect(returnFactor(rosso, nero, true)).toBe(0)
    expect(returnFactor(rosso, zero, false)).toBe(0)
    expect(returnFactor(rosso, zero, true)).toBe(0.5)
    expect(returnFactor(zero, zero, true)).toBe(36)
    const [d1, , , z] = rouletteLegs('dozzine')
    expect(returnFactor(d1, z, true)).toBe(0)
  })

  it('solveLinearSystem solves a 2×2 and reports a singular matrix', () => {
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    )
    expect(x).not.toBeNull()
    expect(x![0]).toBeCloseTo(1, 9)
    expect(x![1]).toBeCloseTo(3, 9)
    expect(
      solveLinearSystem(
        [
          [1, 2],
          [2, 4],
        ],
        [1, 2],
      ),
    ).toBeNull()
  })
})

describe('computeRoulette — Rosso / Nero + 0', () => {
  it('100 real, no partage: Nero 100, zero 5.56, every number loses about 5.56', () => {
    const r = computeRoulette(input())
    expect(r.partageEffective).toBe(false)
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 5.56])
    expect(r.legs[2].stakeExact).toBeCloseTo(5.5556, 4)
    expect(r.outcomes[0].profit).toBeCloseTo(-5.56, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(-5.56, 9)
    // Zero: 35 × 5.56 − 100 − 100 (the zero stake is a cost too).
    expect(r.outcomes[2].profit).toBeCloseTo(-5.4, 9)
    expect(r.outcomes[2].byLeg[0]).toBe(-100)
    expect(r.outcomes[2].byLeg[2]).toBeCloseTo(194.6, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-5.56, 9)
    expect(r.totalCovers).toBeCloseTo(105.56, 9)
    // On the real result: (100 − 5.56) / 100.
    expect(r.rating).toBeCloseTo(94.44, 9)
    expect(r.crPercent).toBeNull()
    expect(r.showSummary).toBe(true)
  })

  it('100 real with la partage: the zero cover halves (2.78) and the loss drops to 2.78', () => {
    const r = computeRoulette(input({ partage: true }))
    expect(r.partageEffective).toBe(true)
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 2.78])
    expect(r.outcomes[0].profit).toBeCloseTo(-2.78, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(-2.78, 9)
    // Zero: Rosso and Nero get half back, the zero pays 36 × 2.78.
    expect(r.outcomes[2].byLeg[0]).toBeCloseTo(-50, 9)
    expect(r.outcomes[2].byLeg[1]).toBeCloseTo(-50, 9)
    expect(r.outcomes[2].byLeg[2]).toBeCloseTo(97.3, 9)
    expect(r.outcomes[2].profit).toBeCloseTo(-2.7, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.78, 9)
    expect(r.rating).toBeCloseTo(97.22, 9)
  })

  it('bonus only with la partage: the bonus converts at 97.22 on every number', () => {
    const r = computeRoulette(input({ puntata: null, bonus: 100, partage: true }))
    expect(r.puntataEffettiva).toBe(100)
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 2.78])
    expect(r.outcomes[0].profit).toBeCloseTo(97.22, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(97.22, 9)
    expect(r.outcomes[2].profit).toBeCloseTo(97.3, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(97.22, 9)
  })

  it('rimborso 100 on 100 real, no partage: Nero 50, zero 2.78, CR 47.22%', () => {
    const r = computeRoulette(input({ rimborso: 100 }))
    expect(r.isRimborso).toBe(true)
    expect(r.legs.map((l) => l.stake)).toEqual([100, 50, 2.78])
    expect(r.outcomes[0].profit).toBeCloseTo(47.22, 9)
    expect(r.outcomes[0].rimborso).toBe(0)
    expect(r.outcomes[1].profit).toBeCloseTo(47.22, 9)
    expect(r.outcomes[1].rimborso).toBe(100)
    // Zero: 35 × 2.78 − 100 − 50 + 100.
    expect(r.outcomes[2].profit).toBeCloseTo(47.3, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(47.22, 9)
    expect(r.crPercent).toBeCloseTo(47.22, 9)
    // With a refund the rating is not shown (CR% is), but it still follows the real result.
    expect(r.rating).toBeCloseTo(147.22, 9)
  })

  it('rimborso 100 with la partage: the zero cover shrinks to (S − ¾·R)/36 = 0.69', () => {
    const r = computeRoulette(input({ rimborso: 100, partage: true }))
    expect(r.legs.map((l) => l.stake)).toEqual([100, 50, 0.69])
    expect(r.legs[2].stakeExact).toBeCloseTo(25 / 36, 9)
    expect(r.outcomes[0].profit).toBeCloseTo(49.31, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(49.31, 9)
    expect(r.outcomes[2].profit).toBeCloseTo(49.15, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(49.15, 9)
  })

  it('a refund at least as large as the punta return leaves nothing to cover', () => {
    const r = computeRoulette(input({ rimborso: 200 }))
    expect(r.legs[1].stake).toBeNull()
    expect(r.outcomes[0].profit).toBeNull()
    expect(r.guadagnoMinimo).toBeNull()
    expect(r.showSummary).toBe(false)
  })
})

describe('computeRoulette — Dozzine + 0', () => {
  it('100 real: the two other dozens 100 each, zero 8.33, every number loses about 8.33', () => {
    const r = computeRoulette(input({ mode: 'dozzine' }))
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 100, 8.33])
    expect(r.outcomes.map((o) => o.profit)).toEqual([
      expect.closeTo(-8.33, 9),
      expect.closeTo(-8.33, 9),
      expect.closeTo(-8.33, 9),
      // Zero: 35 × 8.33 − 300; the cover rounded down makes the zero the worst number.
      expect.closeTo(-8.45, 9),
    ])
    expect(r.guadagnoMinimo).toBeCloseTo(-8.45, 9)
    expect(r.totalCovers).toBeCloseTo(208.33, 9)
    expect(r.rating).toBeCloseTo(91.55, 9)
  })

  it('la partage is ignored on the dozens', () => {
    const a = computeRoulette(input({ mode: 'dozzine' }))
    const b = computeRoulette(input({ mode: 'dozzine', partage: true }))
    expect(b.partageEffective).toBe(false)
    expect(b.legs.map((l) => l.stake)).toEqual(a.legs.map((l) => l.stake))
    expect(b.guadagnoMinimo).toBeCloseTo(a.guadagnoMinimo as number, 9)
  })

  it('100 real + 50 bonus with rimborso 30: covers (450 − 30)/3 = 140 and 420/36 = 11.67', () => {
    const r = computeRoulette(input({ mode: 'dozzine', bonus: 50, rimborso: 30 }))
    expect(r.puntataEffettiva).toBe(150)
    expect(r.legs.map((l) => l.stake)).toEqual([150, 140, 140, 11.67])
    // 1ª dozzina: 450 − 100 − 140 − 140 − 11.67 = 58.33
    expect(r.outcomes[0].profit).toBeCloseTo(58.33, 9)
    // 2ª dozzina: 420 − 100 − 140 − 140 − 11.67 + 30 = 58.33
    expect(r.outcomes[1].profit).toBeCloseTo(58.33, 9)
    expect(r.outcomes[3].profit).toBeCloseTo(11.67 * 36 - 100 - 280 - 11.67 + 30, 9)
    expect(r.crPercent).toBeCloseTo(((r.guadagnoMinimo as number) / 30) * 100, 9)
  })
})

describe('computeRoulette — invalid amounts', () => {
  it('empty or negative amounts give no summary', () => {
    expect(computeRoulette(input({ puntata: null })).showSummary).toBe(false)
    expect(computeRoulette(input({ puntata: 0 })).showSummary).toBe(false)
    expect(computeRoulette(input({ puntata: -5, bonus: 10 })).showSummary).toBe(false)
    expect(computeRoulette(input({ bonus: -1 })).showSummary).toBe(false)
    expect(computeRoulette(input({ rimborso: -1 })).showSummary).toBe(false)
    expect(computeRoulette(input({ puntata: null })).legs[1].stake).toBeNull()
  })
})

describe('computeRoulette — chips, punta side, locked covers', () => {
  it('1 € chips with la partage: the zero cover becomes 3, every colour loses 3, zero wins 5', () => {
    const r = computeRoulette(input({ partage: true, chip: 1 }))
    expect(r.legs.map((l) => l.stakeRounded)).toEqual([100, 100, 3])
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 3])
    expect(r.legs[2].stakeExact).toBeCloseTo(2.7778, 4)
    expect(r.outcomes.map((o) => o.profit)).toEqual([
      expect.closeTo(-3, 9),
      expect.closeTo(-3, 9),
      expect.closeTo(5, 9),
    ])
    expect(r.guadagnoMinimo).toBeCloseTo(-3, 9)
    expect(r.rating).toBeCloseTo(97, 9)
  })

  it('5 € chips on the dozens: zero cover 10, −10 on every dozen, +50 on zero, rating 90', () => {
    const r = computeRoulette(input({ mode: 'dozzine', chip: 5 }))
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 100, 10])
    expect(r.outcomes.map((o) => o.profit)).toEqual([
      expect.closeTo(-10, 9),
      expect.closeTo(-10, 9),
      expect.closeTo(-10, 9),
      expect.closeTo(50, 9),
    ])
    expect(r.rating).toBeCloseTo(90, 9)
  })

  it('punta on Nero: Rosso becomes the cover, the refund arrives on Rosso and on zero', () => {
    const r = computeRoulette(input({ puntaKey: 'nero', rimborso: 100 }))
    expect(r.puntaIndex).toBe(1)
    expect(r.puntaSpec.key).toBe('nero')
    expect(r.legs.map((l) => l.isPunta)).toEqual([false, true, false])
    expect(r.legs.map((l) => l.stake)).toEqual([50, 100, 2.78])
    expect(r.outcomes.map((o) => o.rimborso)).toEqual([100, 0, 100])
    expect(r.outcomes[0].profit).toBeCloseTo(47.22, 9)
    expect(r.outcomes[1].profit).toBeCloseTo(47.22, 9)
  })

  it('punta on the 2ª dozzina: the other two dozens and the zero are the covers', () => {
    const r = computeRoulette(input({ mode: 'dozzine', puntaKey: 'dozzina2' }))
    expect(r.puntaIndex).toBe(1)
    expect(r.legs.map((l) => l.stake)).toEqual([100, 100, 100, 8.33])
    expect(r.outcomes[1].byLeg).toEqual([
      expect.closeTo(-100, 9),
      expect.closeTo(200, 9),
      expect.closeTo(-100, 9),
      expect.closeTo(-8.33, 9),
    ])
    expect(puntaOptions('dozzine').map((l) => l.key)).toEqual(['dozzina1', 'dozzina2', 'dozzina3'])
    expect(puntaOptions('rosso_nero').map((l) => l.key)).toEqual(['rosso', 'nero'])
  })

  it('the zero (or a key of another table) cannot be the punta: back to the first leg', () => {
    expect(computeRoulette(input({ puntaKey: 'zero' })).puntaIndex).toBe(0)
    expect(computeRoulette(input({ puntaKey: 'dozzina2' })).puntaIndex).toBe(0)
  })

  it('a locked cover replaces the computed one; the other covers keep their values', () => {
    const r = computeRoulette(input({ partage: true, coverOverrides: { zero: 3 } }))
    expect(r.legs[2].locked).toBe(true)
    expect(r.legs[2].stakeRounded).toBe(2.78)
    expect(r.legs[2].stake).toBe(3)
    expect(r.legs[1].locked).toBe(false)
    expect(r.legs[1].stake).toBe(100)
    expect(r.outcomes[0].profit).toBeCloseTo(-3, 9)
    expect(r.outcomes[2].profit).toBeCloseTo(5, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-3, 9)
  })

  it('a locked cover without an amount blocks the summary', () => {
    const r = computeRoulette(input({ coverOverrides: { nero: null } }))
    expect(r.legs[1].locked).toBe(true)
    expect(r.legs[1].stake).toBeNull()
    expect(r.legs[1].stakeRounded).toBe(100)
    expect(r.showSummary).toBe(false)
  })
})
