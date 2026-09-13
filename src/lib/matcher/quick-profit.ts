import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { grossOdds, round2 } from '@/lib/calculators/engines/odds'
import { computePuntaBanca } from '@/lib/calculators/engines/punta-banca-engine'
import { legIsExchange } from '@/lib/bookmakers'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'

/**
 * The «Guadagno» column of the scanner v2: what a row yields with the stake,
 * bonus and rimborso typed in the shared bar, no imbalance, the stake on the
 * BACK leg of a back/lay row and on the first leg of a dutch. The calculator
 * modal refines it; this is the number that makes the table readable.
 */

export interface SharedAmounts {
  puntata: number | null
  bonus: number
  rimborso: number
}

export interface QuickProfit {
  /** Guaranteed minimum profit, null when the stake is missing or the row cannot be covered. */
  profit: number | null
  /** The cover stakes, for the tooltip: «Bancata 97,32» or «Copertura 90,91 · 58,33». */
  covers: number[]
}

/** The price of a leg as the user sees it: gross on an exchange dutch leg (the store keeps it net). */
export function legDisplayOdds(
  leg: MatcherResult['legs'][number],
  row: MatcherResult,
  meta: MatcherMeta | null | undefined,
  commissionPercent: number,
): number {
  if (row.matchType !== 'back_lay' && legIsExchange(leg, meta)) {
    return round2(grossOdds(leg.odds, commissionPercent))
  }
  return leg.odds
}

export function quickProfit(
  row: MatcherResult,
  shared: SharedAmounts,
  commissionPercent: number,
  meta: MatcherMeta | null | undefined,
): QuickProfit {
  if (shared.puntata == null || shared.puntata <= 0) return { profit: null, covers: [] }

  if (row.matchType === 'back_lay') {
    const [back, lay] = row.legs
    if (!back || !lay) return { profit: null, covers: [] }
    const r = computePuntaBanca({
      puntata: shared.puntata,
      bonus: shared.bonus,
      rimborso: shared.rimborso,
      quotaPunta: back.odds,
      quotaBanca: lay.odds,
      commissionePercent: commissionPercent,
      imbalancePercent: 0,
      partialLays: [],
    })
    return {
      profit: r.guadagnoMinimo,
      covers: r.layStakeRounded != null ? [r.layStakeRounded] : [],
    }
  }

  const r = computeDutch({
    legs: row.legs.map((leg) => {
      const exchange = legIsExchange(leg, meta)
      return {
        grossOdds: exchange ? grossOdds(leg.odds, commissionPercent) : leg.odds,
        commissionPercent: exchange ? commissionPercent : 0,
      }
    }),
    puntaIndex: 0,
    puntata: shared.puntata,
    bonus: shared.bonus,
    rimborso: shared.rimborso,
    imbalancePercent: 0,
  })
  return {
    profit: r.guadagnoMinimo,
    covers: r.legs.filter((l) => !l.isPunta && l.stake != null).map((l) => l.stake as number),
  }
}
