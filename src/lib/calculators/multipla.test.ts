import { describe, expect, it } from 'vitest'
import { multiplaLayStakes, type MultiplaHedgeEvent } from './multipla'
import { roundStake } from './stake-step'

const pb = (coverOdds: number, commissionPercent = 5): MultiplaHedgeEvent => ({
  type: 'punta-banca',
  coverOdds,
  commissionPercent,
})
const pp = (coverOdds: number): MultiplaHedgeEvent => ({
  type: 'punta-punta',
  coverOdds,
  commissionPercent: 0,
})

/** Rounded to the cent, as the user reads it. */
const cents = (n: number) => Math.round(n * 100) / 100

describe('multiplaLayStakes — hedges on five cents (§14.229)', () => {
  it('a single punta-punta hedge: (S·Q − R) / q, on five cents', () => {
    expect(multiplaLayStakes(10, 3, [pp(1.5)])[0].hedgeStake).toBe(20)
    // 30 / 1.7 = 17.647 → 17.65, cost = the stake
    const [h] = multiplaLayStakes(10, 3, [pp(1.7)])
    expect(h.hedgeStake).toBe(17.65)
    expect(h.hedgeCost).toBe(17.65)
    // with the rimborso: (30 − 10) / 1.7 = 11.765 → 11.75
    expect(multiplaLayStakes(10, 3, [pp(1.7)], 10)[0].hedgeStake).toBe(11.75)
  })

  it('two punta-banca hedges: both on five cents, costs from the rounded stakes', () => {
    const [h1, h2] = multiplaLayStakes(100, 4, [pb(2.1), pb(2.1)])
    // last: 400 / (2.1 − 0.05) = 195.122 → 195.10; first: 195.10 · 0.95 / 2.05 = 90.412 → 90.40
    expect(h2.hedgeStake).toBe(195.1)
    expect(h1.hedgeStake).toBe(90.4)
    expect(cents(h2.hedgeCost)).toBe(cents(195.1 * 1.1))
    expect(cents(h1.hedgeCost)).toBe(cents(90.4 * 1.1))
    for (const h of [h1, h2]) expect(Math.round(h.hedgeStake * 100) % 5).toBe(0)
  })

  it('the earlier hedge is sized on the ROUNDED next hedge, the chain the user places', () => {
    // last: 50 · 2.25 / 2.05 = 54.878 → 54.90; from the exact 54.878 the first would be
    // 54.878 / 1.85 = 29.66 → 29.65, from the rounded 54.90 it is 29.68 → 29.70.
    const [h1, h2] = multiplaLayStakes(50, 2.25, [pb(1.85, 0), pb(2.05, 0)])
    expect(h2.hedgeStake).toBe(54.9)
    expect(h1.hedgeStake).toBe(roundStake((54.9 * 1) / 1.85))
    expect(h1.hedgeStake).toBe(29.7)
  })

  it('mixed chain: every outcome pays within the rounding of the stakes', () => {
    const S = 100
    const events = [pp(1.9), pb(2.3, 4.5), pp(2.6)]
    const Q = 2 * 2.1 * 1.7
    const hedges = multiplaLayStakes(S, Q, events)
    const stakes = hedges.map((h) => h.hedgeStake)
    for (const s of stakes) expect(Math.round(s * 100) % 5).toBe(0)
    // all main legs win: S·Q − S − every hedge cost
    const allWin = S * Q - S - hedges.reduce((sum, h) => sum + h.hedgeCost, 0)
    // event i loses: −S − costs of the hedges before it + the payout of its hedge
    const payouts = hedges.map((h, i) => {
      const before = hedges.slice(0, i).reduce((sum, x) => sum + x.hedgeCost, 0)
      return -S - before + h.hedgeStake * h.payoutFactor
    })
    for (const p of payouts) expect(Math.abs(p - allWin)).toBeLessThan(0.1)
  })

  it('nothing to size without a stake or a price', () => {
    for (const h of multiplaLayStakes(0, 4, [pb(2.1), pp(2)])) expect(h.hedgeStake).toBe(0)
    expect(multiplaLayStakes(100, 4, [])).toEqual([])
  })
})
