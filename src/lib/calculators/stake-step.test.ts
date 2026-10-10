import { describe, expect, it } from 'vitest'
import { STAKE_STEP, roundStake } from './stake-step'

describe('roundStake', () => {
  it('lands every stake on five cents, the nearest multiple', () => {
    expect(STAKE_STEP).toBe(0.05)
    expect(roundStake(90.909)).toBe(90.9)
    expect(roundStake(102.5641)).toBe(102.55)
    expect(roundStake(13.3333)).toBe(13.35)
    expect(roundStake(61.7647)).toBe(61.75)
    expect(roundStake(58.3333)).toBe(58.35)
    expect(roundStake(92.1659)).toBe(92.15)
    expect(roundStake(0.02)).toBe(0)
    expect(roundStake(0.03)).toBe(0.05)
  })

  it('leaves a multiple of five cents alone and rounds a tie up', () => {
    expect(roundStake(100)).toBe(100)
    expect(roundStake(93.2)).toBe(93.2)
    expect(roundStake(0.05)).toBe(0.05)
    expect(roundStake(1.125)).toBe(1.15)
    expect(roundStake(2.675)).toBe(2.7)
  })

  it('never leaves floating-point dust and passes non-finite values through', () => {
    for (const n of [0.1, 0.35, 1.1, 4.35, 19.95, 1234.65, 9999.95]) {
      expect(roundStake(n)).toBe(n)
      expect(String(roundStake(n)).length).toBeLessThanOrEqual(8)
    }
    expect(roundStake(Number.NaN)).toBeNaN()
    expect(roundStake(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })
})
