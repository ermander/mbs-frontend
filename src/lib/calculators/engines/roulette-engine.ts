import { realRating, roundToChip } from './casino-common'

/**
 * European roulette engine: a full-coverage dutch across accounts. The punta
 * (real stake plus bonus) goes on one bet and the other outcomes are covered
 * on other accounts, so that every number pays the same. Two tables:
 * - Rosso / Nero + 0: two even-money bets (pay 1:1, decimal 2.00) and the
 *   straight-up on zero (pays 35:1, decimal 36.00). With «la partage» an
 *   even-money bet loses only half its stake when zero comes out.
 * - Dozzine + 0: three dozens (pay 2:1, decimal 3.00) and the zero. La
 *   partage never applies to dozens.
 * Same conventions as the sport dutch engines: the bonus is returned with
 * the win, the refund is received when the punta loses. The covers come
 * from the linear system «equal profit on every outcome», solved by Gaussian
 * elimination, so la partage, the refund and the choice of the punta need no
 * separate closed forms; each cover is then rounded to the table's minimum
 * chip, or replaced by the amount the user locked in, before the profits.
 */

export type RouletteMode = 'rosso_nero' | 'dozzine'

/** Rosso, Nero and every other even-money bet pay 1:1. */
export const ROULETTE_EVEN_ODDS = 2
/** A dozen pays 2:1. */
export const ROULETTE_DOZEN_ODDS = 3
/** The straight-up on zero pays 35:1. */
export const ROULETTE_ZERO_ODDS = 36
/** With la partage an even-money bet gets half its stake back on zero. */
export const ROULETTE_PARTAGE_RETURN = 0.5

export const ROULETTE_MODE_LABELS: Record<RouletteMode, string> = {
  rosso_nero: 'Rosso / Nero',
  dozzine: 'Dozzine',
}

export type RouletteLegKey = 'rosso' | 'nero' | 'dozzina1' | 'dozzina2' | 'dozzina3' | 'zero'

export interface RouletteLegSpec {
  key: RouletteLegKey
  /** The selection as saved and shown: «Rosso», «0», «1ª dozzina». */
  label: string
  odds: number
  /** Even-money bet: la partage returns half the stake on zero. */
  evenMoney: boolean
  isZero: boolean
}

const ROSSO_NERO_LEGS: RouletteLegSpec[] = [
  { key: 'rosso', label: 'Rosso', odds: ROULETTE_EVEN_ODDS, evenMoney: true, isZero: false },
  { key: 'nero', label: 'Nero', odds: ROULETTE_EVEN_ODDS, evenMoney: true, isZero: false },
  { key: 'zero', label: '0', odds: ROULETTE_ZERO_ODDS, evenMoney: false, isZero: true },
]

const DOZZINE_LEGS: RouletteLegSpec[] = [
  {
    key: 'dozzina1',
    label: '1ª dozzina',
    odds: ROULETTE_DOZEN_ODDS,
    evenMoney: false,
    isZero: false,
  },
  {
    key: 'dozzina2',
    label: '2ª dozzina',
    odds: ROULETTE_DOZEN_ODDS,
    evenMoney: false,
    isZero: false,
  },
  {
    key: 'dozzina3',
    label: '3ª dozzina',
    odds: ROULETTE_DOZEN_ODDS,
    evenMoney: false,
    isZero: false,
  },
  { key: 'zero', label: '0', odds: ROULETTE_ZERO_ODDS, evenMoney: false, isZero: true },
]

/** The legs of a table, in table order (the zero last). */
export function rouletteLegs(mode: RouletteMode): RouletteLegSpec[] {
  return mode === 'dozzine' ? DOZZINE_LEGS : ROSSO_NERO_LEGS
}

/** The bets the punta can go on: every leg but the zero. */
export function puntaOptions(mode: RouletteMode): RouletteLegSpec[] {
  return rouletteLegs(mode).filter((l) => !l.isZero)
}

/** La partage only exists on even-money bets: it changes nothing on the dozens table. */
export function partageApplies(mode: RouletteMode): boolean {
  return mode === 'rosso_nero'
}

/**
 * What one unit staked on `leg` returns when `outcome` comes out: the price
 * when the leg wins, half with la partage on zero for an even-money bet,
 * nothing otherwise.
 */
export function returnFactor(
  leg: RouletteLegSpec,
  outcome: RouletteLegSpec,
  partage: boolean,
): number {
  if (leg.key === outcome.key) return leg.odds
  if (partage && outcome.isZero && leg.evenMoney) return ROULETTE_PARTAGE_RETURN
  return 0
}

/** Gaussian elimination with partial pivoting; null when singular. */
export function solveLinearSystem(a: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col] / m[col][col]
      if (f === 0) continue
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c]
    }
  }
  const x = m.map((row, i) => row[n] / row[i])
  return x.every((v) => Number.isFinite(v)) ? x : null
}

export interface RouletteInput {
  mode: RouletteMode
  /** Requested by the user; effective only on the Rosso / Nero table. */
  partage: boolean
  /** Real stake on the punta; null when the field is empty. */
  puntata: number | null
  /** Bonus stake on the punta, returned with the win. */
  bonus: number
  /** Refund received on the punta account when the punta loses. */
  rimborso: number
  /** The bet the punta goes on; the first leg of the table when missing or the zero. */
  puntaKey?: RouletteLegKey
  /** Minimum chip of the table: every cover is rounded to a multiple of it. */
  chip: number
  /** Covers the user locked: the amount played instead of the computed one (null while empty). */
  coverOverrides?: Partial<Record<RouletteLegKey, number | null>>
}

export interface RouletteLegResult {
  spec: RouletteLegSpec
  isPunta: boolean
  /** Punta: real stake plus bonus. Covers: the amount to play (rounded to the chip, or the locked one). */
  stake: number | null
  /** The cover before rounding (the punta stake as is). */
  stakeExact: number | null
  /** The cover rounded to the chip, even when a locked amount replaces it. */
  stakeRounded: number | null
  locked: boolean
}

export interface RouletteOutcomeResult {
  spec: RouletteLegSpec
  /** Net movement of every account (leg order) when this outcome comes out. */
  byLeg: (number | null)[]
  /** The refund cashed on this outcome (punta lost). */
  rimborso: number
  /** Sum of the movements plus the refund. */
  profit: number | null
}

export interface RouletteResult {
  mode: RouletteMode
  partageEffective: boolean
  puntaIndex: number
  puntaSpec: RouletteLegSpec
  puntataEffettiva: number
  isRimborso: boolean
  /** Table order, the zero last, whichever leg is the punta. */
  legs: RouletteLegResult[]
  /** One per leg, same order: the outcome «that bet wins». */
  outcomes: RouletteOutcomeResult[]
  /** Sum of the covers as played. */
  totalCovers: number | null
  guadagnoMinimo: number | null
  /** On the real result: (real stake + minimum profit) / (real + bonus) · 100. */
  rating: number | null
  /** guadagnoMinimo / rimborso · 100, only in rimborso mode. */
  crPercent: number | null
  showSummary: boolean
}

/**
 * Exact covers (leg order, punta excluded) for a punta of `puntataEffettiva`
 * on `specs[puntaIndex]` with refund `rimborso`: the x_j that make every
 * outcome pay the same. Null when the system has no positive solution (a
 * refund too large for the punta return).
 */
function solveCovers(
  specs: RouletteLegSpec[],
  partage: boolean,
  puntaIndex: number,
  puntataEffettiva: number,
  rimborso: number,
): number[] | null {
  const punta = specs[puntaIndex]
  const covers = specs.filter((_, i) => i !== puntaIndex)
  // Equal profit between outcome k (k ≠ punta) and the punta outcome:
  //   Σ_j x_j · (rf(j,k) − rf(j,p)) = S · (rf(p,p) − rf(p,k)) − Rf
  const a: number[][] = []
  const b: number[] = []
  specs.forEach((outcome, k) => {
    if (k === puntaIndex) return
    a.push(
      covers.map((leg) => returnFactor(leg, outcome, partage) - returnFactor(leg, punta, partage)),
    )
    b.push(
      puntataEffettiva *
        (returnFactor(punta, punta, partage) - returnFactor(punta, outcome, partage)) -
        rimborso,
    )
  })
  const x = solveLinearSystem(a, b)
  if (x == null || x.some((v) => !(v > 0))) return null
  return x
}

export function computeRoulette(input: RouletteInput): RouletteResult {
  const specs = rouletteLegs(input.mode)
  const partage = input.partage && partageApplies(input.mode)
  const requested = specs.findIndex((s) => s.key === input.puntaKey && !s.isZero)
  const puntaIndex = requested >= 0 ? requested : 0
  const puntaSpec = specs[puntaIndex]
  const puntata = input.puntata ?? 0
  const { bonus, rimborso } = input
  const overrides = input.coverOverrides ?? {}
  const puntataEffettiva = puntata + bonus
  const isRimborso = rimborso > 0
  const validAmounts = puntata >= 0 && bonus >= 0 && rimborso >= 0 && puntataEffettiva > 0

  const exact = validAmounts
    ? solveCovers(specs, partage, puntaIndex, puntataEffettiva, rimborso)
    : null

  let coverPos = 0
  const legs: RouletteLegResult[] = specs.map((spec, i) => {
    if (i === puntaIndex) {
      const s = validAmounts ? puntataEffettiva : null
      return { spec, isPunta: true, stake: s, stakeExact: s, stakeRounded: s, locked: false }
    }
    const v = exact ? exact[coverPos] : null
    coverPos += 1
    const rounded = v != null ? roundToChip(v, input.chip) : null
    const locked = spec.key in overrides
    const override = overrides[spec.key]
    const stake = locked ? (override != null && override > 0 ? override : null) : rounded
    return { spec, isPunta: false, stake, stakeExact: v, stakeRounded: rounded, locked }
  })

  const ready = exact != null && legs.every((l) => l.stake != null)
  const stakes = legs.map((l) => l.stake ?? 0)
  const outcomes: RouletteOutcomeResult[] = specs.map((outcome, k) => {
    if (!ready) return { spec: outcome, byLeg: legs.map(() => null), rimborso: 0, profit: null }
    const byLeg = specs.map((leg, i) => {
      const cost = i === puntaIndex ? puntata : stakes[i]
      return stakes[i] * returnFactor(leg, outcome, partage) - cost
    })
    const refund = k === puntaIndex ? 0 : rimborso
    const profit = byLeg.reduce((s, v) => s + v, 0) + refund
    return { spec: outcome, byLeg, rimborso: refund, profit }
  })

  const totalCovers = ready
    ? legs.reduce((s, l, i) => (i === puntaIndex ? s : s + (l.stake ?? 0)), 0)
    : null
  const profits = outcomes.map((o) => o.profit).filter((p): p is number => p != null)
  const guadagnoMinimo = ready && profits.length === specs.length ? Math.min(...profits) : null
  const rating = realRating(puntata, puntataEffettiva, guadagnoMinimo)
  const crPercent = isRimborso && guadagnoMinimo != null ? (guadagnoMinimo / rimborso) * 100 : null

  return {
    mode: input.mode,
    partageEffective: partage,
    puntaIndex,
    puntaSpec,
    puntataEffettiva,
    isRimborso,
    legs,
    outcomes,
    totalCovers,
    guadagnoMinimo,
    rating,
    crPercent,
    showSummary: validAmounts && ready && guadagnoMinimo != null,
  }
}
