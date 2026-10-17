import { STAKE_STEP } from '@/lib/calculators/stake-step'

/**
 * Which account takes which leg of a dutch played inside one bookmaker
 * («Risultato + Goal», §14.242, rule of §14.243, stake advice of §14.244),
 * so that the bet itself rebalances the accounts and no account has to be
 * refilled by hand (withdraw from one holder, move the money, deposit on
 * another).
 *
 * The bet is played only with a positive rating: whichever leg wins the
 * accounts as a whole gain, and the 0-0 refunds every stake. The
 * assignment cannot change that total, only where the money lands:
 *
 * - the **favourite** (the lowest price, the leg most likely to cash the
 *   payout and the biggest stake, so also the biggest expected gain) goes
 *   on the **poorest account that covers its stake**: when it wins, that
 *   account cashes exactly the covers lost by the others plus the edge;
 * - the **covers** go on the **richest accounts**, the biggest cover on the
 *   richest, one account each while they last: in the most likely outcome
 *   the rich hand their stakes to the poor, and when a cover wins the rich
 *   account grows, which costs nothing as long as nobody runs dry;
 * - the accounts in between hold nothing: they need no rescue and a cover
 *   that loses four times out of five would only drain them.
 *
 * A balance is the one available for new plays, i.e. net of the drafts not
 * yet placed. The **cushion** is what an account should keep after its
 * stakes: an account «covers» a stake when it keeps the cushion, and is
 * used without it only when nothing else covers (flagged). Pure, so the
 * choice is unit-tested; the components render it.
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

export interface AllocationOptions {
  /** What every account should keep after its stakes; 0 by default. */
  cushion?: number
}

export interface AllocationLegView {
  legKey: string
  accountId: string
  /** The favourite: the lowest price, the one that goes on the poorest account. */
  isFavourite: boolean
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
  /** Every account covers the stakes placed on it (the cushion aside). */
  feasible: boolean
  /** Stakes beyond the available balance, by account id (empty when feasible). */
  shortfall: Record<string, number>
  /** Accounts that cover their stakes but are left with less than the cushion. */
  belowCushionAccountIds: string[]
  /** One account per leg. */
  distinct: boolean
  /** Accounts that hold nothing: the ones in between, or those that cover nothing. */
  idleAccountIds: string[]
  /** Per leg, in leg order: the account and its balance if the leg wins or loses. */
  legs: AllocationLegView[]
}

/** 1/q over the legs, normalised to one: the bookmaker's implied probabilities of the legs. */
export function impliedWeights(odds: number[]): number[] {
  const inverse = odds.map((q) => (q > 0 && Number.isFinite(q) ? 1 / q : 0))
  const total = inverse.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return odds.map(() => 1 / Math.max(1, odds.length))
  return inverse.map((w) => w / total)
}

/** The leg with the lowest price, the first on a tie. */
export function favouriteIndex(legs: ReadonlyArray<Pick<AllocationLeg, 'odds'>>): number {
  let best = 0
  for (let i = 1; i < legs.length; i++) if (legs[i].odds < legs[best].odds) best = i
  return best
}

const EPS = 1e-9
const cents = (n: number) => Math.round(n * 100) / 100

/**
 * The recommended account per leg, or null without legs or accounts, or
 * with a price that is not one. Every leg is placed even when nothing
 * covers it: the account that is least short takes it and the shortfall is
 * reported, so the caller can warn instead of guessing.
 */
export function recommendAccounts(
  legs: AllocationLeg[],
  accounts: AllocationAccount[],
  options: AllocationOptions = {},
): Allocation | null {
  if (legs.length === 0 || accounts.length === 0) return null
  if (legs.some((leg) => !(leg.stake >= 0) || !(leg.odds > 0))) return null
  const cushion = Math.max(0, options.cushion ?? 0)

  // Poorest first; ties by id, so the choice never depends on the input order.
  const poorestFirst = accounts
    .slice()
    .sort((a, b) => a.available - b.available || a.id.localeCompare(b.id))
  const richestFirst = poorestFirst.slice().reverse()
  const staked = new Map<string, number>(accounts.map((a) => [a.id, 0]))
  const remaining = (account: AllocationAccount) =>
    account.available - (staked.get(account.id) ?? 0)
  const keepsCushion = (account: AllocationAccount, stake: number) =>
    remaining(account) - cushion >= stake - EPS
  const covers = (account: AllocationAccount, stake: number) => remaining(account) >= stake - EPS
  /** The first that keeps the cushion, else the first that covers, else the least short. */
  const pick = (candidates: AllocationAccount[], stake: number): AllocationAccount =>
    candidates.find((account) => keepsCushion(account, stake)) ??
    candidates.find((account) => covers(account, stake)) ??
    candidates.slice().sort((a, b) => remaining(b) - remaining(a) || a.id.localeCompare(b.id))[0]
  const byLeg: Record<string, string> = {}
  const place = (legKey: string, account: AllocationAccount, stake: number) => {
    byLeg[legKey] = account.id
    staked.set(account.id, (staked.get(account.id) ?? 0) + stake)
  }

  // 1. The favourite on the poorest account that covers it; the richest when none does.
  const fav = favouriteIndex(legs)
  const favLeg = legs[fav]
  const favAccount =
    poorestFirst.find((account) => keepsCushion(account, favLeg.stake)) ??
    poorestFirst.find((account) => covers(account, favLeg.stake)) ??
    richestFirst[0]
  place(favLeg.key, favAccount, favLeg.stake)

  // 2. The covers, biggest stake first, on the richest accounts: one each while
  //    they last, then the account with the most left; the favourite's account
  //    only as a last resort, and the least short one when nothing covers.
  const coverOrder = legs
    .map((leg, index) => ({ leg, index }))
    .filter(({ index }) => index !== fav)
    .sort((a, b) => b.leg.stake - a.leg.stake || a.index - b.index)
  const others = richestFirst.filter((account) => account.id !== favAccount.id)
  const used = new Set<string>()
  for (const { leg } of coverOrder) {
    const fresh = others.filter((account) => !used.has(account.id))
    const reused = others
      .filter((account) => used.has(account.id))
      .sort((a, b) => remaining(b) - remaining(a) || a.id.localeCompare(b.id))
    const chosen = pick([...fresh, ...reused, favAccount], leg.stake)
    place(leg.key, chosen, leg.stake)
    used.add(chosen.id)
  }

  const shortfall: Record<string, number> = {}
  const belowCushionAccountIds: string[] = []
  for (const account of poorestFirst) {
    const left = remaining(account)
    if (left < -EPS) shortfall[account.id] = cents(-left)
    else if ((staked.get(account.id) ?? 0) > 0 && left < cushion - EPS)
      belowCushionAccountIds.push(account.id)
  }
  const weights = impliedWeights(legs.map((leg) => leg.odds))
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const views: AllocationLegView[] = legs.map((leg, i) => {
    const account = byId.get(byLeg[leg.key]) as AllocationAccount
    const ifLoses = remaining(account)
    return {
      legKey: leg.key,
      accountId: account.id,
      isFavourite: i === fav,
      weight: weights[i],
      ifLoses: cents(ifLoses),
      ifWins: cents(ifLoses + leg.stake * leg.odds),
    }
  })
  return {
    byLeg,
    feasible: Object.keys(shortfall).length === 0,
    shortfall,
    belowCushionAccountIds,
    distinct: new Set(Object.values(byLeg)).size === legs.length,
    idleAccountIds: poorestFirst
      .filter((account) => (staked.get(account.id) ?? 0) === 0)
      .map((account) => account.id),
    legs: views,
  }
}

// ---------------------------------------------------------------------
// Stake advice (§14.244): how much to type in «Puntata €» given the
// balances. With a positive rating the profit is guaranteed and grows with
// the stake, so there is no optimum to find: the advice is the biggest stake
// the accounts bear under the rule, capped by the user's maximum.
// ---------------------------------------------------------------------

/** Below this the favourite is not worth playing: the account is «to refill». */
export const MIN_FAVOURITE_STAKE = 10

export interface StakeAdviceInput {
  /** The legs with their prices; the stakes are ignored (they follow the advice). */
  legs: ReadonlyArray<Pick<AllocationLeg, 'key' | 'odds'>>
  /** The leg whose stake the user types («Puntata €»). */
  puntaIndex: number
  accounts: AllocationAccount[]
  /** What every account should keep after its stakes. */
  cushion: number
  /** The user's cap on the stake typed. */
  maxStake: number
}

export interface StakeLadderStep {
  accountId: string
  /** The favourite stays on this account for a typed stake up to this amount (a multiple of the step). */
  upTo: number
}

export interface StakeAdvice {
  /** The stake to type, or null when no account bears the minimum. */
  recommended: number | null
  /** What bounds the recommended stake. */
  cappedBy: 'max' | 'account' | 'covers' | null
  /** The account that would hold the favourite at the recommended stake. */
  favouriteAccountId: string | null
  /** Thresholds from the poorest playable account up: which account holds the favourite for which stake. */
  ladder: StakeLadderStep[]
  /** Accounts that cannot hold even the minimum favourite with the cushion. */
  refillAccountIds: string[]
}

/** The biggest multiple of the step not above the amount, never negative. */
function floorToStep(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(Math.floor(amount / STAKE_STEP + 1e-9) * STAKE_STEP * 100) / 100
}

/** The stakes of the dutch for a typed stake on the punta leg: equal payout on every leg. */
export function dutchStakesFor(
  legs: ReadonlyArray<Pick<AllocationLeg, 'key' | 'odds'>>,
  puntaIndex: number,
  puntata: number,
): AllocationLeg[] {
  const payout = puntata * legs[puntaIndex].odds
  return legs.map((leg, i) => ({
    key: leg.key,
    odds: leg.odds,
    stake: i === puntaIndex ? puntata : cents(payout / leg.odds),
  }))
}

/**
 * The stake advice for the current prices and balances. The ladder lists,
 * poorest first, how far the typed stake can go before the favourite moves
 * to the next account (balance − cushion, in the punta's units); the
 * recommended stake is the first step capped by the maximum, lowered when
 * the covers would not fit the other accounts with their cushion.
 */
export function adviseStake(input: StakeAdviceInput): StakeAdvice | null {
  const { legs, puntaIndex, accounts } = input
  if (legs.length === 0 || accounts.length === 0) return null
  if (legs.some((leg) => !(leg.odds > 0)) || !legs[puntaIndex]) return null
  const cushion = Math.max(0, input.cushion)
  const maxStake = Math.max(0, input.maxStake)
  const fav = favouriteIndex(legs)
  // A favourite stake of s means a typed stake of s · q_fav / q_punta.
  const toPunta = legs[fav].odds / legs[puntaIndex].odds

  const sorted = accounts
    .slice()
    .sort((a, b) => a.available - b.available || a.id.localeCompare(b.id))
  const ladder: StakeLadderStep[] = []
  const refillAccountIds: string[] = []
  for (const account of sorted) {
    const upTo = floorToStep((account.available - cushion) * toPunta)
    if (upTo >= MIN_FAVOURITE_STAKE) ladder.push({ accountId: account.id, upTo })
    else refillAccountIds.push(account.id)
  }
  const empty: StakeAdvice = {
    recommended: null,
    cappedBy: null,
    favouriteAccountId: null,
    ladder,
    refillAccountIds,
  }
  if (ladder.length === 0 || maxStake < MIN_FAVOURITE_STAKE) return empty

  const first = ladder[0]
  let bound = Math.min(maxStake, first.upTo)
  let cappedBy: StakeAdvice['cappedBy'] = maxStake <= first.upTo ? 'max' : 'account'
  const fits = (puntata: number) => {
    const allocation = recommendAccounts(dutchStakesFor(legs, puntaIndex, puntata), accounts, {
      cushion,
    })
    return (
      allocation != null && allocation.feasible && allocation.belowCushionAccountIds.length === 0
    )
  }
  bound = floorToStep(bound)
  if (!fits(bound)) {
    // The covers do not fit with their cushion: the biggest stake on the step grid that does.
    let lo = 0
    let hi = Math.round(bound / STAKE_STEP)
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (fits(cents(mid * STAKE_STEP))) lo = mid
      else hi = mid - 1
    }
    bound = cents(lo * STAKE_STEP)
    cappedBy = 'covers'
    if (bound < MIN_FAVOURITE_STAKE) return empty
  }
  const allocation = recommendAccounts(dutchStakesFor(legs, puntaIndex, bound), accounts, {
    cushion,
  })
  return {
    recommended: bound,
    cappedBy,
    favouriteAccountId: allocation?.byLeg[legs[fav].key] ?? null,
    ladder,
    refillAccountIds,
  }
}
