import { describe, expect, it } from 'vitest'
import {
  ALLOCATION_EXHAUSTIVE_LIMIT,
  impliedWeights,
  recommendAccounts,
  type AllocationAccount,
  type AllocationLeg,
} from './account-allocation'

/** A «Risultato + Goal» dutch: equal payout 100 whichever leg wins. */
const legs: AllocationLeg[] = [
  { key: 'fav', stake: 50, odds: 2 },
  { key: 'second', stake: 25, odds: 4 },
  { key: 'third', stake: 20, odds: 5 },
  { key: 'long-a', stake: 10, odds: 10 },
  { key: 'long-b', stake: 10, odds: 10 },
]

const accounts: AllocationAccount[] = [
  { id: 'poor', available: 60 },
  { id: 'mid', available: 200 },
  { id: 'rich', available: 400 },
]

const stakedOn = (byLeg: Record<string, string>): Record<string, number> => {
  const staked: Record<string, number> = {}
  for (const leg of legs) staked[byLeg[leg.key]] = (staked[byLeg[leg.key]] ?? 0) + leg.stake
  return staked
}

describe('impliedWeights', () => {
  it('normalises 1/q over the legs', () => {
    const w = impliedWeights([2, 4, 4])
    expect(w.map((x) => Math.round(x * 1000) / 1000)).toEqual([0.5, 0.25, 0.25])
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1)
  })

  it('falls back to equal weights without usable prices', () => {
    expect(impliedWeights([0, -1])).toEqual([0.5, 0.5])
  })
})

describe('recommendAccounts', () => {
  it('puts the lowest price on the poorest account that covers it, the long shots on the richest', () => {
    const a = recommendAccounts(legs, accounts)!
    expect(a).not.toBeNull()
    expect(a.feasible).toBe(true)
    expect(a.shortfall).toEqual({})
    // Three accounts for five legs: repeats are unavoidable, every account is used.
    expect(a.distinct).toBe(false)
    expect(new Set(Object.values(a.byLeg)).size).toBe(3)
    expect(a.method).toBe('exhaustive')
    // The poorest takes the favourite and the long shot that still fits (60 = 50 + 10):
    // the most probable payout where the money is needed; the next prices on the
    // next poorest; the richest holds a long shot only.
    expect(a.byLeg.fav).toBe('poor')
    expect(a.byLeg['long-a']).toBe('poor')
    expect(a.byLeg.second).toBe('mid')
    expect(a.byLeg.third).toBe('mid')
    expect(a.byLeg['long-b']).toBe('rich')
  })

  it('never recommends more than an account can cover', () => {
    const tight: AllocationAccount[] = [
      { id: 'empty', available: 5 },
      { id: 'small', available: 30 },
      { id: 'big', available: 300 },
    ]
    const a = recommendAccounts(legs, tight)!
    expect(a.feasible).toBe(true)
    const staked = stakedOn(a.byLeg)
    for (const account of tight)
      expect(staked[account.id] ?? 0).toBeLessThanOrEqual(account.available)
    // The favourite's 50 fits neither the 5 nor the 30: it goes to the big one;
    // the 30 takes the most probability it can cover (third + a long shot, 30),
    // the 5 covers nothing and stays out.
    expect(a.byLeg.fav).toBe('big')
    expect(a.byLeg.second).toBe('big')
    expect(a.byLeg.third).toBe('small')
    expect(a.byLeg['long-a']).toBe('small')
    expect(a.byLeg['long-b']).toBe('big')
    expect(Object.values(a.byLeg)).not.toContain('empty')
  })

  it('prefers one account per leg when the accounts are enough: a ladder from the poorest', () => {
    const five: AllocationAccount[] = [
      { id: 'a', available: 80 },
      { id: 'b', available: 120 },
      { id: 'c', available: 150 },
      { id: 'd', available: 300 },
      { id: 'e', available: 500 },
    ]
    const a = recommendAccounts(legs, five)!
    expect(a.feasible).toBe(true)
    expect(a.distinct).toBe(true)
    expect(a.byLeg).toEqual({ fav: 'a', second: 'b', third: 'c', 'long-a': 'd', 'long-b': 'e' })
  })

  it('allows repeats when no distinct assignment covers the stakes', () => {
    const five: AllocationAccount[] = [
      { id: 'a', available: 3 },
      { id: 'b', available: 4 },
      { id: 'c', available: 5 },
      { id: 'd', available: 6 },
      { id: 'e', available: 500 },
    ]
    const a = recommendAccounts(legs, five)!
    expect(a.feasible).toBe(true)
    expect(a.distinct).toBe(false)
    expect(Object.values(a.byLeg).every((id) => id === 'e')).toBe(true)
  })

  it('reports the shortfall when nothing covers the stakes', () => {
    const broke: AllocationAccount[] = [
      { id: 'a', available: 10 },
      { id: 'b', available: 20 },
    ]
    const a = recommendAccounts(legs, broke)!
    expect(a.feasible).toBe(false)
    const total = Object.values(a.shortfall).reduce((s, x) => s + x, 0)
    // 115 staked against 30 available: at least 85 missing, whatever the split.
    expect(total).toBeCloseTo(85)
  })

  it('describes every leg with the balance of its account if it wins or loses', () => {
    const a = recommendAccounts(legs, accounts)!
    expect(a.legs.map((l) => l.legKey)).toEqual(legs.map((l) => l.key))
    expect(a.legs.reduce((s, l) => s + l.weight, 0)).toBeCloseTo(1)
    // The poor account holds the favourite and a long shot: 60 − 60, plus 100 when one wins.
    const fav = a.legs[0]
    expect(fav.accountId).toBe('poor')
    expect(fav.ifLoses).toBe(0)
    expect(fav.ifWins).toBe(100)
    // The rich account holds one long shot: 400 − 10, plus 100 when it wins.
    const longB = a.legs[4]
    expect(longB.accountId).toBe('rich')
    expect(longB.ifLoses).toBe(390)
    expect(longB.ifWins).toBe(490)
    // The score is Σ pᵢ · Bₖ(ᵢ) on the balances before the bet.
    const expected = a.legs.reduce(
      (s, l) => s + l.weight * accounts.find((acc) => acc.id === l.accountId)!.available,
      0,
    )
    expect(a.score).toBeCloseTo(expected)
  })

  it('is deterministic and ties go to the poorer account', () => {
    const same: AllocationAccount[] = [
      { id: 'z', available: 100 },
      { id: 'y', available: 100 },
    ]
    const first = recommendAccounts(legs, same)!
    const second = recommendAccounts(legs, same.slice().reverse())!
    expect(first.byLeg).toEqual(second.byLeg)
  })

  it('returns null without legs, without accounts or with a price that is not one', () => {
    expect(recommendAccounts([], accounts)).toBeNull()
    expect(recommendAccounts(legs, [])).toBeNull()
    expect(recommendAccounts([{ key: 'x', stake: 10, odds: 0 }], accounts)).toBeNull()
  })

  it('falls back to the local search above the exhaustive limit and finds the same ladder', () => {
    const many: AllocationAccount[] = Array.from({ length: 16 }, (_, i) => ({
      id: `acc-${String(i).padStart(2, '0')}`,
      available: 40 + i * 30,
    }))
    // 16·15·14·13·12 = 524 160 distinct candidates: above the limit.
    expect(16 * 15 * 14 * 13 * 12).toBeGreaterThan(ALLOCATION_EXHAUSTIVE_LIMIT)
    const a = recommendAccounts(legs, many)!
    expect(a.method).toBe('local-search')
    expect(a.feasible).toBe(true)
    expect(a.distinct).toBe(true)
    // 40 does not cover the 50: the favourite goes to the 70, then the ladder from the 40 up.
    expect(a.byLeg).toEqual({
      fav: 'acc-01',
      second: 'acc-00',
      third: 'acc-02',
      'long-a': 'acc-03',
      'long-b': 'acc-04',
    })
  })
})
