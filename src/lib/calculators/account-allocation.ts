/**
 * Which account takes which leg of a dutch played inside one bookmaker
 * («Risultato + Goal», §14.242), so that the bet itself rebalances the
 * accounts and fewer withdrawals and transfers are needed afterwards.
 *
 * The rule is a ladder. Every leg pays the same amount when it wins (that is
 * the dutch), so the legs differ only in how likely they are to cash it: the
 * lowest price most often, the long shots rarely. The payout should land
 * where the money is needed, so the lowest price goes on the poorest account
 * that covers its stake, the next price on the next poorest, and the long
 * shots end up on the richest accounts, where they mostly just lose their
 * small stake and drain them a little. Formally the assignment minimises
 * Σ pᵢ · Bₖ(ᵢ), the expected available balance of the account that cashes
 * the payout, with pᵢ = (1/qᵢ) normalised over the legs; the rearrangement
 * inequality makes the ladder optimal, and the search handles the two
 * constraints the ladder alone cannot: an account must cover the stakes
 * placed on it (its available balance, i.e. the balance net of the drafts
 * not yet placed), and the legs go on as many different accounts as
 * possible (one each when the accounts are enough), which is how the user
 * plays.
 *
 * An expected-spread score was tried first and rejected: in expectation
 * every leg loses the same share of its stake (the bookmaker's margin), so
 * any score that only looks at averages puts every stake on the richest
 * account and never lets the poorest one take the coin flip that can
 * refill it without a deposit.
 *
 * Pure, so the choice is unit-tested; the components only render it.
 */

export interface AllocationLeg {
  key: string
  /** Real money placed on the leg. */
  stake: number
  /** The bookmaker's price on the leg. */
  odds: number
}

export interface AllocationAccount {
  id: string
  /** Balance available for new plays: the balance net of the open drafts. */
  available: number
}

export interface AllocationLegView {
  legKey: string
  accountId: string
  /** Implied probability of the leg, normalised over the legs. */
  weight: number
  /** Balance of the account after every stake placed on it, if this leg loses. */
  ifLoses: number
  /** The same plus the payout, if this leg wins. */
  ifWins: number
}

export interface Allocation {
  /** Account id per leg key. */
  byLeg: Record<string, string>
  /** Every account covers the stakes placed on it. */
  feasible: boolean
  /** Stakes beyond the available balance, by account id (empty when feasible). */
  shortfall: Record<string, number>
  /** One account per leg. */
  distinct: boolean
  /** Σ pᵢ · Bₖ(ᵢ): the expected balance of the account that cashes the payout. */
  score: number
  /** Per leg, in leg order: the account and its balance if the leg wins or loses. */
  legs: AllocationLegView[]
  /** How the assignment was found. */
  method: 'exhaustive' | 'local-search'
}

/** Candidates an exhaustive search is allowed to score; above it a local search runs. */
export const ALLOCATION_EXHAUSTIVE_LIMIT = 150_000

/** 1/q over the legs, normalised to one: the bookmaker's implied probabilities of the legs. */
export function impliedWeights(odds: number[]): number[] {
  const inverse = odds.map((q) => (q > 0 && Number.isFinite(q) ? 1 / q : 0))
  const total = inverse.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return odds.map(() => 1 / Math.max(1, odds.length))
  return inverse.map((w) => w / total)
}

/** Count of ordered selections of `picks` out of `n` (distinct) or `n ** picks` (repeats), capped. */
function candidateCount(n: number, picks: number, distinct: boolean, cap: number): number {
  let count = 1
  for (let i = 0; i < picks; i++) {
    count *= distinct ? n - i : n
    if (count > cap) return cap + 1
    if (count <= 0) return 0
  }
  return count
}

interface Scored {
  assign: number[]
  shortfall: number
  /** How many different accounts the assignment uses. */
  spread: number
  score: number
}

/**
 * (shortfall, −spread, score) lexicographic: a cover that fits always beats
 * one that does not, then the assignment on more different accounts (every
 * leg on its own holder is how the user plays), then the ladder score.
 */
function better(a: Scored, b: Scored | null): boolean {
  if (b == null) return true
  if (a.shortfall !== b.shortfall) return a.shortfall < b.shortfall
  if (a.spread !== b.spread) return a.spread > b.spread
  return a.score < b.score - 1e-9
}

class Scorer {
  private readonly staked: number[]
  readonly weights: number[]

  constructor(
    private readonly legs: AllocationLeg[],
    private readonly accounts: AllocationAccount[],
  ) {
    this.staked = new Array(accounts.length).fill(0)
    this.weights = impliedWeights(legs.map((leg) => leg.odds))
  }

  /** Scores an assignment (account index per leg), reusing its buffer. */
  score(assign: number[]): Scored {
    this.staked.fill(0)
    let score = 0
    for (let i = 0; i < assign.length; i++) {
      this.staked[assign[i]] += this.legs[i].stake
      score += this.weights[i] * this.accounts[assign[i]].available
    }
    let shortfall = 0
    let spread = 0
    for (let k = 0; k < this.accounts.length; k++) {
      if (this.staked[k] > 0) spread += 1
      const missing = this.staked[k] - this.accounts[k].available
      if (missing > 1e-9) shortfall += missing
    }
    return { assign: assign.slice(), shortfall: Math.round(shortfall * 100) / 100, spread, score }
  }
}

/** Every assignment in order, one account per leg when `distinct`; the best by (shortfall, score). */
function exhaustive(
  scorer: Scorer,
  legCount: number,
  accountCount: number,
  distinct: boolean,
): Scored | null {
  let best: Scored | null = null
  const assign: number[] = new Array(legCount).fill(0)
  const used: boolean[] = new Array(accountCount).fill(false)
  const walk = (leg: number) => {
    if (leg === legCount) {
      const scored = scorer.score(assign)
      if (better(scored, best)) best = scored
      return
    }
    for (let k = 0; k < accountCount; k++) {
      if (distinct && used[k]) continue
      assign[leg] = k
      used[k] = true
      walk(leg + 1)
      used[k] = false
    }
  }
  walk(0)
  return best
}

/**
 * The ladder as a greedy start (most likely leg first, on the poorest
 * account that still covers it), then single moves and pairwise swaps until
 * nothing improves. Deterministic.
 */
function localSearch(
  scorer: Scorer,
  legs: AllocationLeg[],
  accounts: AllocationAccount[],
  distinct: boolean,
): Scored | null {
  const n = accounts.length
  if (n === 0) return null
  const order = legs
    .map((leg, index) => ({ index, weight: scorer.weights[index] }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.index)
  const assign: number[] = new Array(legs.length).fill(-1)
  const staked: number[] = new Array(n).fill(0)
  const used = new Set<number>()
  for (const legIndex of order) {
    const stake = legs[legIndex].stake
    let chosen = -1
    for (let k = 0; k < n; k++) {
      if (distinct && used.has(k)) continue
      if (staked[k] + stake <= accounts[k].available + 1e-9) {
        chosen = k
        break
      }
    }
    if (chosen < 0) {
      // Nothing covers it: the richest free account, the shortfall is reported.
      for (let k = n - 1; k >= 0; k--) {
        if (distinct && used.has(k)) continue
        chosen = k
        break
      }
    }
    if (chosen < 0) return null
    assign[legIndex] = chosen
    staked[chosen] += stake
    used.add(chosen)
  }
  let best = scorer.score(assign)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < assign.length; i++) {
      for (let k = 0; k < n; k++) {
        if (k === best.assign[i]) continue
        if (distinct && best.assign.includes(k)) continue
        const trial = best.assign.slice()
        trial[i] = k
        const scored = scorer.score(trial)
        if (better(scored, best)) {
          best = scored
          improved = true
        }
      }
    }
    for (let i = 0; i < assign.length; i++) {
      for (let j = i + 1; j < assign.length; j++) {
        if (best.assign[i] === best.assign[j]) continue
        const trial = best.assign.slice()
        trial[i] = best.assign[j]
        trial[j] = best.assign[i]
        const scored = scorer.score(trial)
        if (better(scored, best)) {
          best = scored
          improved = true
        }
      }
    }
  }
  return best
}

function search(
  scorer: Scorer,
  legs: AllocationLeg[],
  accounts: AllocationAccount[],
  distinct: boolean,
): { best: Scored; method: Allocation['method'] } | null {
  const count = candidateCount(accounts.length, legs.length, distinct, ALLOCATION_EXHAUSTIVE_LIMIT)
  if (count === 0) return null
  if (count <= ALLOCATION_EXHAUSTIVE_LIMIT) {
    const best = exhaustive(scorer, legs.length, accounts.length, distinct)
    return best ? { best, method: 'exhaustive' } : null
  }
  const best = localSearch(scorer, legs, accounts, distinct)
  return best ? { best, method: 'local-search' } : null
}

/**
 * The recommended account per leg, or null without legs or accounts. One
 * account per leg is tried first when the accounts are enough; when no such
 * assignment covers every stake, repeats are allowed (on as many accounts as
 * possible), and if nothing covers the stakes the least short assignment is
 * returned with `feasible: false`.
 */
export function recommendAccounts(
  legs: AllocationLeg[],
  accounts: AllocationAccount[],
): Allocation | null {
  if (legs.length === 0 || accounts.length === 0) return null
  if (legs.some((leg) => !(leg.stake >= 0) || !(leg.odds > 0))) return null
  // Poorest first: the search order, so ties go to the poorer account.
  const sorted = accounts
    .slice()
    .sort((a, b) => a.available - b.available || a.id.localeCompare(b.id))
  const scorer = new Scorer(legs, sorted)

  let chosen: { best: Scored; method: Allocation['method'] } | null = null
  if (sorted.length >= legs.length) chosen = search(scorer, legs, sorted, true)
  if (chosen == null || chosen.best.shortfall > 0) {
    const found = search(scorer, legs, sorted, false)
    if (found && (chosen == null || better(found.best, chosen.best))) chosen = found
  }
  if (chosen == null) return null

  const { best } = chosen
  const byLeg: Record<string, string> = {}
  const staked = new Map<string, number>()
  legs.forEach((leg, i) => {
    const id = sorted[best.assign[i]].id
    byLeg[leg.key] = id
    staked.set(id, (staked.get(id) ?? 0) + leg.stake)
  })
  const shortfall: Record<string, number> = {}
  for (const account of sorted) {
    const missing = (staked.get(account.id) ?? 0) - account.available
    if (missing > 1e-9) shortfall[account.id] = Math.round(missing * 100) / 100
  }
  const cents = (n: number) => Math.round(n * 100) / 100
  const views: AllocationLegView[] = legs.map((leg, i) => {
    const account = sorted[best.assign[i]]
    const ifLoses = account.available - (staked.get(account.id) ?? 0)
    return {
      legKey: leg.key,
      accountId: account.id,
      weight: scorer.weights[i],
      ifLoses: cents(ifLoses),
      ifWins: cents(ifLoses + leg.stake * leg.odds),
    }
  })
  return {
    byLeg,
    feasible: best.shortfall === 0,
    shortfall,
    distinct: new Set(Object.values(byLeg)).size === legs.length,
    score: best.score,
    legs: views,
    method: chosen.method,
  }
}
