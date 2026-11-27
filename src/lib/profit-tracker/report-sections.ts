/**
 * Le sezioni del Report (§14.415): il profitto delle giocate di Matched Betting, Surebet, Valuebet
 * e Risultato + Goal (le categorie delle giocate), più le «Altre giocate» (le rapide: casinò,
 * slot, trading…), e gli obiettivi mensili di ogni sezione con quanto manca. Tutto puro, per i
 * test; i dati arrivano da `categorie` del report e da GET /profit-tracker/goals.
 */

import { BET_CATEGORIES } from '@/lib/profit-tracker/categories'
import { monthIndexOf } from '@/lib/profit-tracker/report'
import type {
  BetCategory,
  ProfitGoal,
  ProfitReportCategoryAmount,
  ProfitReportRow,
} from '@/types/profit-tracker'

/** Le sezioni con un obiettivo, nell'ordine delle card. */
export const SECTION_KEYS: BetCategory[] = BET_CATEGORIES.map((c) => c.value)

export const isSectionKey = (categoria: string): categoria is BetCategory =>
  (SECTION_KEYS as string[]).includes(categoria)

export interface SectionAmount {
  totale: number
  giocate: number
}

export interface SectionTotals {
  bySection: Record<BetCategory, SectionAmount>
  /** Le giocate rapide e ogni categoria che non è una sezione. */
  altre: SectionAmount
}

const emptyTotals = (): SectionTotals => ({
  bySection: Object.fromEntries(SECTION_KEYS.map((k) => [k, { totale: 0, giocate: 0 }])) as Record<
    BetCategory,
    SectionAmount
  >,
  altre: { totale: 0, giocate: 0 },
})

/**
 * Le sezioni di un periodo: con `month` null tutto il periodo del report (le voci con
 * `periodStart` null), altrimenti quel mese di `year`.
 */
export function sectionTotals(
  categorie: ProfitReportCategoryAmount[],
  year: number,
  month: number | null,
): SectionTotals {
  const out = emptyTotals()
  for (const c of categorie) {
    if (month == null) {
      if (c.periodStart !== null) continue
    } else {
      if (c.periodStart === null) continue
      const at = monthIndexOf(c.periodStart)
      if (at.year !== year || at.month !== month) continue
    }
    const target = isSectionKey(c.categoria) ? out.bySection[c.categoria] : out.altre
    target.totale += c.totale
    target.giocate += c.giocate
  }
  return out
}

/** Il profitto di ogni sezione nei dodici mesi di `year`. */
export function sectionMonths(
  categorie: ProfitReportCategoryAmount[],
  year: number,
): Record<BetCategory, number[]> {
  const out = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, Array.from({ length: 12 }, () => 0)]),
  ) as Record<BetCategory, number[]>
  for (const c of categorie) {
    if (c.periodStart === null || !isSectionKey(c.categoria)) continue
    const at = monthIndexOf(c.periodStart)
    if (at.year !== year) continue
    out[c.categoria][at.month] += c.totale
  }
  return out
}

/**
 * Le voci per categoria ricavate dalle righe del report, per un backend che non manda ancora
 * `categorie`: lì una giocata con le gambe su più conti conta una volta per conto.
 */
export function categoriesFromRows(rows: ProfitReportRow[]): ProfitReportCategoryAmount[] {
  const map = new Map<string, ProfitReportCategoryAmount>()
  const add = (periodStart: string | null, row: ProfitReportRow) => {
    const key = `${periodStart ?? ''}|${row.categoria}`
    const entry = map.get(key) ?? { periodStart, categoria: row.categoria, totale: 0, giocate: 0 }
    entry.totale += row.totale
    entry.giocate += row.giocate
    map.set(key, entry)
  }
  for (const row of rows) {
    if (row.sezione !== 'giocate') continue
    add(row.periodStart, row)
    add(null, row)
  }
  return Array.from(map.values())
}

/** `AAAA-MM` di un mese (da 0) di un anno, la chiave degli obiettivi. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** L'obiettivo di una sezione in vigore in un mese: l'ultima riga di quel mese o di prima. */
export function goalInForce(
  goals: ProfitGoal[],
  sezione: BetCategory,
  mese: string,
): number | null {
  let found: ProfitGoal | null = null
  for (const g of goals) {
    if (g.sezione !== sezione || g.dalMese > mese) continue
    if (found === null || g.dalMese > found.dalMese) found = g
  }
  return found?.importo ?? null
}

/** Gli obiettivi in vigore in un mese, per sezione (null = nessuno). */
export function goalsOfMonth(
  goals: ProfitGoal[],
  mese: string,
): Record<BetCategory, number | null> {
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, goalInForce(goals, k, mese)])) as Record<
    BetCategory,
    number | null
  >
}

export interface GoalProgress {
  obiettivo: number
  fatto: number
  /** Quanto manca, mai sotto zero. */
  mancano: number
  /** Riempimento della barra, da 0 a 1. */
  quota: number
  raggiunto: boolean
  /** Quanto si è andati oltre l'obiettivo, mai sotto zero. */
  oltre: number
}

export function goalProgress(obiettivo: number, fatto: number): GoalProgress {
  const quota = obiettivo > 0 ? Math.min(1, Math.max(0, fatto / obiettivo)) : 0
  return {
    obiettivo,
    fatto,
    mancano: Math.max(0, obiettivo - fatto),
    quota,
    raggiunto: fatto >= obiettivo,
    oltre: Math.max(0, fatto - obiettivo),
  }
}

/** I giorni che restano nel mese di `now`, oggi compreso (ora del browser). */
export function daysLeftInMonth(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return last - now.getDate() + 1
}

/**
 * In quanti mesi l'obiettivo di una sezione è stato raggiunto, tra i mesi con un obiettivo da
 * gennaio a `lastMonth` compreso (−1 = nessuno).
 */
export function monthsReached(
  goals: ProfitGoal[],
  sezione: BetCategory,
  monthly: number[],
  year: number,
  lastMonth: number,
): { raggiunti: number; conObiettivo: number } {
  let raggiunti = 0
  let conObiettivo = 0
  for (let m = 0; m <= Math.min(11, lastMonth); m++) {
    const goal = goalInForce(goals, sezione, monthKey(year, m))
    if (goal == null) continue
    conObiettivo += 1
    if (monthly[m] >= goal) raggiunti += 1
  }
  return { raggiunti, conObiettivo }
}
