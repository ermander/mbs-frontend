import { describe, expect, it } from 'vitest'
import {
  MIN_FAVOURITE_STAKE,
  adviseStake,
  favouriteIndex,
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

describe('favouriteIndex', () => {
  it('is the lowest price, the first on a tie', () => {
    expect(favouriteIndex(legs)).toBe(0)
    expect(favouriteIndex([{ odds: 4.33 }, { odds: 5.5 }, { odds: 4.33 }])).toBe(0)
    expect(favouriteIndex([{ odds: 5.5 }, { odds: 4.33 }, { odds: 4.33 }])).toBe(1)
  })
})

describe('recommendAccounts', () => {
  it('favourite on the poorest that covers it, covers on the richest by stake, the middle idle', () => {
    const six: AllocationAccount[] = [
      { id: 'a', available: 80 },
      { id: 'f', available: 100 },
      { id: 'b', available: 120 },
      { id: 'c', available: 150 },
      { id: 'd', available: 300 },
      { id: 'e', available: 500 },
    ]
    const a = recommendAccounts(legs, six)!
    expect(a.feasible).toBe(true)
    expect(a.distinct).toBe(true)
    expect(a.byLeg).toEqual({ fav: 'a', second: 'e', third: 'd', 'long-a': 'c', 'long-b': 'b' })
    // The 100 sits between the poorest and the four richest: it holds nothing.
    expect(a.idleAccountIds).toEqual(['f'])
  })

  it('does not depend on the order of the legs: the favourite is the lowest price', () => {
    const shuffled = [legs[3], legs[1], legs[0], legs[4], legs[2]]
    const five: AllocationAccount[] = [
      { id: 'a', available: 80 },
      { id: 'b', available: 120 },
      { id: 'c', available: 150 },
      { id: 'd', available: 300 },
      { id: 'e', available: 500 },
    ]
    const a = recommendAccounts(shuffled, five)!
    expect(a.byLeg).toEqual({ fav: 'a', second: 'e', third: 'd', 'long-a': 'c', 'long-b': 'b' })
    expect(a.legs.find((l) => l.legKey === 'fav')?.isFavourite).toBe(true)
    expect(a.legs.filter((l) => l.isFavourite)).toHaveLength(1)
  })

  it('skips the poorest when it cannot cover the favourite, and never gives it a cover', () => {
    const tight: AllocationAccount[] = [
      { id: 'empty', available: 5 },
      { id: 'small', available: 30 },
      { id: 'mid', available: 90 },
      { id: 'big', available: 300 },
    ]
    const a = recommendAccounts(legs, tight)!
    expect(a.feasible).toBe(true)
    // 5 and 30 do not cover the 50: the favourite goes to the 90, the poorest that does.
    expect(a.byLeg.fav).toBe('mid')
    // Covers on the richest of the others: big, then small (30 covers the 20), then
    // the 5 covers no long shot, so the long shots fall back on the account with the most left.
    expect(a.byLeg.second).toBe('big')
    expect(a.byLeg.third).toBe('small')
    expect(a.byLeg['long-a']).toBe('big')
    expect(a.byLeg['long-b']).toBe('big')
    expect(a.idleAccountIds).toEqual(['empty'])
    const staked = stakedOn(a.byLeg)
    for (const account of tight)
      expect(staked[account.id] ?? 0).toBeLessThanOrEqual(account.available)
  })

  it('repeats on the richest when the accounts are fewer than the legs', () => {
    const three: AllocationAccount[] = [
      { id: 'poor', available: 60 },
      { id: 'mid', available: 200 },
      { id: 'rich', available: 400 },
    ]
    const a = recommendAccounts(legs, three)!
    expect(a.feasible).toBe(true)
    expect(a.distinct).toBe(false)
    expect(a.byLeg.fav).toBe('poor')
    expect(a.byLeg.second).toBe('rich')
    expect(a.byLeg.third).toBe('mid')
    // Both long shots go back to the account with the most left: the rich one.
    expect(a.byLeg['long-a']).toBe('rich')
    expect(a.byLeg['long-b']).toBe('rich')
    expect(a.idleAccountIds).toEqual([])
  })

  it('uses the favourite account for a cover only as a last resort', () => {
    const two: AllocationAccount[] = [
      { id: 'poor', available: 60 },
      { id: 'rich', available: 400 },
    ]
    const a = recommendAccounts(legs, two)!
    expect(a.feasible).toBe(true)
    expect(a.byLeg.fav).toBe('poor')
    // Every cover fits the rich account, so the poor one keeps its 10 left.
    expect(
      Object.entries(a.byLeg)
        .filter(([k]) => k !== 'fav')
        .every(([, v]) => v === 'rich'),
    ).toBe(true)
  })

  it('reports the shortfall when nothing covers the stakes', () => {
    const broke: AllocationAccount[] = [
      { id: 'a', available: 10 },
      { id: 'b', available: 20 },
    ]
    const a = recommendAccounts(legs, broke)!
    expect(a.feasible).toBe(false)
    // The favourite fits nobody: the richest takes it and is 30 short.
    expect(a.byLeg.fav).toBe('b')
    const total = Object.values(a.shortfall).reduce((s, x) => s + x, 0)
    // 115 staked against 30 available: 85 missing, whatever the split.
    expect(total).toBeCloseTo(85)
  })

  it('describes every leg with the balance of its account if it wins or loses', () => {
    const three: AllocationAccount[] = [
      { id: 'poor', available: 60 },
      { id: 'mid', available: 200 },
      { id: 'rich', available: 400 },
    ]
    const a = recommendAccounts(legs, three)!
    expect(a.legs.map((l) => l.legKey)).toEqual(legs.map((l) => l.key))
    expect(a.legs.reduce((s, l) => s + l.weight, 0)).toBeCloseTo(1)
    // The poor account holds the favourite only: 60 − 50, plus the payout 100 when it wins.
    const fav = a.legs[0]
    expect(fav.ifLoses).toBe(10)
    expect(fav.ifWins).toBe(110)
    // The rich account holds the second and the two long shots: 400 − 45; 100 when the second wins.
    const second = a.legs[1]
    expect(second.accountId).toBe('rich')
    expect(second.ifLoses).toBe(355)
    expect(second.ifWins).toBe(455)
  })

  it('is deterministic whatever the order of the accounts', () => {
    const same: AllocationAccount[] = [
      { id: 'z', available: 100 },
      { id: 'y', available: 100 },
      { id: 'x', available: 100 },
    ]
    const first = recommendAccounts(legs, same)!
    const second = recommendAccounts(legs, same.slice().reverse())!
    expect(first.byLeg).toEqual(second.byLeg)
    // Ties by id: the favourite on the first id, the covers from the last.
    expect(first.byLeg.fav).toBe('x')
    expect(first.byLeg.second).toBe('z')
  })

  it('returns null without legs, without accounts or with a price that is not one', () => {
    expect(recommendAccounts([], [{ id: 'a', available: 1 }])).toBeNull()
    expect(recommendAccounts(legs, [])).toBeNull()
    expect(
      recommendAccounts([{ key: 'x', stake: 10, odds: 0 }], [{ id: 'a', available: 1 }]),
    ).toBeNull()
  })
})

describe('recommendAccounts with a cushion', () => {
  it('counts the cushion as covered: the favourite skips an account that would not keep it', () => {
    const five: AllocationAccount[] = [
      { id: 'a', available: 120 },
      { id: 'b', available: 180 },
      { id: 'c', available: 300 },
      { id: 'd', available: 400 },
      { id: 'e', available: 500 },
    ]
    // 120 covers the 50 but keeps only 70 of a 100 cushion: the favourite goes to the 180.
    const a = recommendAccounts(legs, five, { cushion: 100 })!
    expect(a.byLeg.fav).toBe('b')
    expect(a.belowCushionAccountIds).toEqual([])
    expect(a.feasible).toBe(true)
    // Four covers on the four others, richest first: the 120 is last and takes a long shot,
    // which it keeps the cushion on (120 − 10 ≥ 100).
    expect(a.byLeg['long-b']).toBe('a')
    expect(a.idleAccountIds).toEqual([])
  })

  it('falls back to plain coverage, flagged, when nobody keeps the cushion', () => {
    const two: AllocationAccount[] = [
      { id: 'poor', available: 60 },
      { id: 'rich', available: 130 },
    ]
    const a = recommendAccounts(legs, two, { cushion: 100 })!
    expect(a.feasible).toBe(true)
    // The 60 covers the 50 without the cushion, the 130 would keep only 80: both are flagged.
    expect(a.byLeg.fav).toBe('poor')
    expect(a.belowCushionAccountIds.sort()).toEqual(['poor', 'rich'])
  })
})

describe('adviseStake', () => {
  const prices = legs.map(({ key, odds }) => ({ key, odds }))
  const five: AllocationAccount[] = [
    { id: 'marco', available: 95 },
    { id: 'linda', available: 180 },
    { id: 'davide', available: 260 },
    { id: 'emanuele', available: 420 },
    { id: 'chiraz', available: 640 },
  ]

  it('recommends the poorest playable account played down to the cushion, capped by the maximum', () => {
    const advice = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: five,
      cushion: 100,
      maxStake: 150,
    })!
    // 95 − 100 < 0: Marco is to refill; Linda bears 80, below the 150 cap.
    expect(advice.recommended).toBe(80)
    expect(advice.cappedBy).toBe('account')
    expect(advice.favouriteAccountId).toBe('linda')
    expect(advice.refillAccountIds).toEqual(['marco'])
    expect(advice.ladder).toEqual([
      { accountId: 'linda', upTo: 80 },
      { accountId: 'davide', upTo: 160 },
      { accountId: 'emanuele', upTo: 320 },
      { accountId: 'chiraz', upTo: 540 },
    ])
  })

  it('is capped by the maximum when the poorest bears more', () => {
    const advice = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: five,
      cushion: 20,
      maxStake: 60,
    })!
    // Marco bears 75 with a 20 cushion: the 60 cap binds.
    expect(advice.recommended).toBe(60)
    expect(advice.cappedBy).toBe('max')
    expect(advice.favouriteAccountId).toBe('marco')
    expect(advice.refillAccountIds).toEqual([])
  })

  it('converts to the punta leg when the stake is typed on another leg', () => {
    // The stake typed on the second leg (odds 4) is half the favourite's (odds 2).
    const advice = adviseStake({
      legs: prices,
      puntaIndex: 1,
      accounts: five,
      cushion: 100,
      maxStake: 150,
    })!
    expect(advice.recommended).toBe(40)
    expect(advice.ladder[0]).toEqual({ accountId: 'linda', upTo: 40 })
  })

  it('lowers the stake when the covers would not fit the other accounts with their cushion', () => {
    const tight: AllocationAccount[] = [
      { id: 'poor', available: 300 },
      { id: 'rich', available: 130 },
    ]
    // The poorest is the 130 (Marco-like): it bears 30 with a 100 cushion; the covers (115 for a
    // 50 favourite, so 69 for a 30 one) must fit the 300 keeping 100: they do. Then raise the
    // cushion so they do not.
    const ok = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: tight,
      cushion: 100,
      maxStake: 150,
    })!
    expect(ok.recommended).toBe(30)
    expect(ok.cappedBy).toBe('account')
    const squeezed = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: tight,
      cushion: 100,
      maxStake: 150,
    })
    expect(squeezed).not.toBeNull()
    const covered = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: [
        { id: 'poor', available: 150 },
        { id: 'rich', available: 160 },
      ],
      cushion: 100,
      maxStake: 150,
    })!
    // Poor bears 50 (favourite 50 → covers 65 on the rich, which keeps only 95 < 100): lowered.
    expect(covered.cappedBy).toBe('covers')
    expect(covered.recommended).toBeLessThan(50)
    expect(covered.recommended).toBeGreaterThanOrEqual(MIN_FAVOURITE_STAKE)
  })

  it('gives no stake when nobody bears the minimum, but still lists the refills', () => {
    const broke: AllocationAccount[] = [
      { id: 'a', available: 105 },
      { id: 'b', available: 108 },
    ]
    const advice = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: broke,
      cushion: 100,
      maxStake: 150,
    })!
    expect(advice.recommended).toBeNull()
    expect(advice.cappedBy).toBeNull()
    expect(advice.ladder).toEqual([])
    expect(advice.refillAccountIds).toEqual(['a', 'b'])
  })

  it('rounds the thresholds down to the stake step', () => {
    const odd: AllocationAccount[] = [{ id: 'a', available: 133.33 }]
    const advice = adviseStake({
      legs: prices,
      puntaIndex: 0,
      accounts: odd,
      cushion: 100,
      maxStake: 150,
    })!
    expect(advice.ladder[0].upTo).toBe(33.3)
    // One account for every leg: the whole outlay (2.3 × the stake) must fit the 33.33 left,
    // so the covers cap it at 14.45, on the step grid.
    expect(advice.cappedBy).toBe('covers')
    expect(advice.recommended).toBe(14.45)
  })

  it('returns null without prices or accounts', () => {
    expect(
      adviseStake({ legs: [], puntaIndex: 0, accounts: five, cushion: 0, maxStake: 10 }),
    ).toBeNull()
    expect(
      adviseStake({ legs: prices, puntaIndex: 0, accounts: [], cushion: 0, maxStake: 10 }),
    ).toBeNull()
  })
})
