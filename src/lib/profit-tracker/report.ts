/**
 * Conti del Report del tracker (§14.111, sul design OddWise dal §14.350): conto economico del
 * periodo e suddivisioni per categoria, identità e conto, dalle righe del report già filtrate per
 * mese. Tutto puro, per i test; prima stavano nella pagina.
 */

import { getCategoryLabel } from '@/lib/profit-tracker/categories'
import type { ProfitReportRow, ProfitReportSezione } from '@/types/profit-tracker'

/** Anno e mese (UTC) di un periodStart ISO del backend. */
export function monthIndexOf(periodStart: string): { year: number; month: number } {
  const d = new Date(periodStart)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

/** Etichetta di una riga: dal catalogo per i movimenti, statica per le giocate. */
export function rowCategoryLabel(
  row: Pick<ProfitReportRow, 'categoria' | 'categoriaNome'>,
): string {
  return row.categoriaNome ?? getCategoryLabel(row.categoria)
}

export interface CategoryAmount {
  key: string
  label: string
  totale: number
}

export type MovementSection = Exclude<ProfitReportSezione, 'giocate'>

export interface Statement {
  profittoGiocate: number
  altreEntrate: number
  costiAttivita: number
  spesePersonali: number
  nettoAttivita: number
  netto: number
  giocate: number
  movimenti: number
  bySection: Record<MovementSection, CategoryAmount[]>
}

/** §14.111: il conto economico del periodo dalle righe del report. */
export function buildStatement(rows: ProfitReportRow[]): Statement {
  const sums: Record<ProfitReportSezione, number> = {
    giocate: 0,
    reddito: 0,
    costo_attivita: 0,
    spesa_personale: 0,
  }
  const counts = { giocate: 0, movimenti: 0 }
  const byCat: Record<MovementSection, Map<string, CategoryAmount>> = {
    reddito: new Map(),
    costo_attivita: new Map(),
    spesa_personale: new Map(),
  }
  for (const row of rows) {
    sums[row.sezione] += row.totale
    if (row.sezione === 'giocate') {
      counts.giocate += row.giocate
    } else {
      counts.movimenti += row.giocate
      const map = byCat[row.sezione]
      const entry = map.get(row.categoria) ?? {
        key: row.categoria,
        label: rowCategoryLabel(row),
        totale: 0,
      }
      entry.totale += row.totale
      map.set(row.categoria, entry)
    }
  }
  const costiAttivita = -sums.costo_attivita
  const spesePersonali = -sums.spesa_personale
  const nettoAttivita = sums.giocate - costiAttivita
  const sortDesc = (map: Map<string, CategoryAmount>) =>
    Array.from(map.values()).sort((a, b) => Math.abs(b.totale) - Math.abs(a.totale))
  return {
    profittoGiocate: sums.giocate,
    altreEntrate: sums.reddito,
    costiAttivita,
    spesePersonali,
    nettoAttivita,
    netto: nettoAttivita + sums.reddito - spesePersonali,
    giocate: counts.giocate,
    movimenti: counts.movimenti,
    bySection: {
      reddito: sortDesc(byCat.reddito),
      costo_attivita: sortDesc(byCat.costo_attivita),
      spesa_personale: sortDesc(byCat.spesa_personale),
    },
  }
}

export interface BreakdownRow {
  key: string
  label: string
  totale: number
  count: number
  unit: 'giocate' | 'movimenti' | 'voci'
  note?: string
}

/** Somma le righe per chiave, dal totale più alto al più basso. */
export function buildBreakdown(
  rows: ProfitReportRow[],
  keyOf: (row: ProfitReportRow) => string,
  labelOf: (key: string, row: ProfitReportRow) => string,
  unitOf: (row: ProfitReportRow) => BreakdownRow['unit'],
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>()
  for (const row of rows) {
    const key = keyOf(row)
    const entry = map.get(key) ?? {
      key,
      label: labelOf(key, row),
      totale: 0,
      count: 0,
      unit: unitOf(row),
    }
    entry.totale += row.totale
    entry.count += row.giocate
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.totale - a.totale)
}

/**
 * La quota di una voce sulle sole voci positive: con costi e spese in elenco il netto farebbe
 * superare il 100 % alle entrate. Null per le voci negative o senza voci positive.
 */
export function breakdownShare(row: BreakdownRow, rows: BreakdownRow[]): number | null {
  const totalPositive = rows.filter((r) => r.totale > 0).reduce((sum, r) => sum + r.totale, 0)
  if (totalPositive === 0 || row.totale < 0) return null
  return (row.totale / totalPositive) * 100
}

/** Quante voci per pagina mostra ogni suddivisione (§14.386). */
export const BREAKDOWN_PAGE_SIZE = 6

/**
 * Una pagina di una suddivisione: la pagina chiesta (da 0) riportata dentro i limiti, le sue voci,
 * il numero di pagine e quante righe vuote servono all'ultima per restare alta come le altre.
 */
export function breakdownPage<T>(
  rows: T[],
  page: number,
  pageSize: number = BREAKDOWN_PAGE_SIZE,
): { page: number; pages: number; items: T[]; filler: number } {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(0, Math.floor(page)), pages - 1)
  const items = rows.slice(current * pageSize, (current + 1) * pageSize)
  const filler = pages > 1 ? pageSize - items.length : 0
  return { page: current, pages, items, filler }
}
