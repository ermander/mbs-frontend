import { describe, expect, it } from 'vitest'
import { partialCoverReturn } from './partial-cover'

describe('partialCoverReturn', () => {
  it('pays each piece at the odds it was placed at', () => {
    // 50 € a 2,50 già giocati, il resto 40,40 € alla nuova quota 2,60 (il caso del §14.269).
    expect(partialCoverReturn(2.5, [{ amount: 50, newOdds: 2.6 }], 40.4)).toBeCloseTo(230.04, 6)
  })

  it('chains the odds across several steps', () => {
    // 30 € a 2,50, poi 20 € a 2,60, il resto 35 € a 2,70.
    const steps = [
      { amount: 30, newOdds: 2.6 },
      { amount: 20, newOdds: 2.7 },
    ]
    expect(partialCoverReturn(2.5, steps, 35)).toBeCloseTo(30 * 2.5 + 20 * 2.6 + 35 * 2.7, 6)
  })

  it('returns null when a step is incomplete or there are no steps', () => {
    expect(partialCoverReturn(2.5, [{ amount: null, newOdds: 2.6 }], 40)).toBeNull()
    expect(partialCoverReturn(2.5, [{ amount: 50, newOdds: null }], 40)).toBeNull()
    expect(partialCoverReturn(2.5, [], 40)).toBeNull()
    expect(partialCoverReturn(null, [{ amount: 50, newOdds: 2.6 }], 40)).toBeNull()
    expect(partialCoverReturn(2.5, [{ amount: 50, newOdds: 2.6 }], null)).toBeNull()
  })
})
