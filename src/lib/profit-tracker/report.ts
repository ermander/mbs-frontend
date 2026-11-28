/**
 * Conti del Report del tracker (§14.111, sul design OddWise dal §14.350): conto economico del
 * periodo e suddivisioni per categoria, identità e conto, dalle righe del report già filtrate per
 * mese. Tutto puro, per i test; prima stavano nella pagina.
 */

import { getCategoryLabel } from '@/lib/profit-tracker/categories'
import type {
  ProfitReportBucket,
  ProfitReportRow,
  ProfitReportSezione,
} from '@/types/profit-tracker'

/**
 * Anno e mese di un periodStart ISO del backend: il backend raggruppa per mese di Roma
 * (§14.416) e manda l'inizio del mese come mezzanotte UTC di quella data.
 */
export function monthIndexOf(periodStart: string): { year: number; month: number } {
  const d = new Date(periodStart)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

const ROME_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Rome',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** Scarto di Roma da UTC in un istante, in millisecondi (+1 h d'inverno, +2 h d'estate). */
function romeOffsetMs(instantMs: number): number {
  const parts = ROME_PARTS.formatToParts(new Date(instantMs))
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(
    num('year'),
    num('month') - 1,
    num('day'),
    num('hour') % 24,
    num('minute'),
    num('second'),
  )
  return wall - Math.floor(instantMs / 1000) * 1000
}

/**
 * L'istante della mezzanotte di Roma il primo giorno di un mese (da 0; 12 è gennaio dell'anno
 * dopo). I mesi del Report sono quelli italiani (§14.416), come quelli degli obiettivi: una giocata
 * chiusa alle 00:30 del 1° dicembre è di dicembre. Il cambio d'ora non cade mai il primo del mese,
 * quindi lo scarto letto alla mezzanotte UTC vale anche per quella di Roma.
 */
export function romeMonthStart(year: number, month: number): Date {
  const utcMidnight = Date.UTC(year, month, 1)
  return new Date(utcMidnight - romeOffsetMs(utcMidnight))
}

/** I filtri di data del Report per `count` mesi da `month` (da 0), da mezzanotte a mezzanotte di Roma. */
export function romeMonthsRange(
  year: number,
  month: number,
  count = 1,
): { fromDate: string; toDate: string } {
  return {
    fromDate: romeMonthStart(year, month).toISOString(),
    toDate: new Date(romeMonthStart(year, month + count).getTime() - 1).toISOString(),
  }
}

/** Le voci del conto economico di un mese, dai bucket mensili del report. */
export interface MonthAmounts {
  netto: number
  profittoGiocate: number
  altreEntrate: number
  costiAttivita: number
  spesePersonali: number
  giocate: number
  movimenti: number
}

export const EMPTY_MONTH: MonthAmounts = {
  netto: 0,
  profittoGiocate: 0,
  altreEntrate: 0,
  costiAttivita: 0,
  spesePersonali: 0,
  giocate: 0,
  movimenti: 0,
}

/** I dodici mesi di `year` dai bucket del report (i mesi senza bucket restano a zero). */
export function monthsOfYear(buckets: ProfitReportBucket[], year: number): MonthAmounts[] {
  const out = Array.from({ length: 12 }, () => ({ ...EMPTY_MONTH }))
  for (const b of buckets) {
    const { year: y, month } = monthIndexOf(b.periodStart)
    if (y !== year) continue
    out[month] = {
      netto: b.netto,
      profittoGiocate: b.profittoGiocate,
      altreEntrate: b.altreEntrate,
      costiAttivita: b.costiAttivita,
      spesePersonali: b.spesePersonali,
      giocate: b.giocate,
      movimenti: b.movimenti,
    }
  }
  return out
}

/** Un mese con almeno una giocata o un movimento. */
export const monthHasData = (m: MonthAmounts) => m.giocate > 0 || m.movimenti > 0

export interface MonthTableRow extends MonthAmounts {
  month: number
  /** Il netto da gennaio fino a questo mese compreso. */
  cumulato: number
  hasData: boolean
}

/**
 * La tabella «Mese per mese»: i mesi da gennaio a `lastMonth` compreso (l'ultimo già iniziato
 * nell'anno in corso, dicembre negli anni passati), con il netto cumulato.
 */
export function buildMonthTable(months: MonthAmounts[], lastMonth: number): MonthTableRow[] {
  let run = 0
  return months.slice(0, Math.max(0, lastMonth + 1)).map((m, month) => {
    run += m.netto
    return { ...m, month, cumulato: run, hasData: monthHasData(m) }
  })
}

/** §14.111: il netto medio dei mesi con voci (0 senza mesi con voci). */
export function monthlyAverage(months: MonthAmounts[]): { media: number; mesi: number } {
  const withData = months.filter(monthHasData)
  if (withData.length === 0) return { media: 0, mesi: 0 }
  return {
    media: withData.reduce((sum, m) => sum + m.netto, 0) / withData.length,
    mesi: withData.length,
  }
}

/**
 * Il mese prima e il mese dopo di (year, month), con le frecce del Report: null fuori dagli anni
 * del filtro (da `minYear`) o dopo il mese in corso.
 */
export function adjacentMonth(
  year: number,
  month: number,
  step: -1 | 1,
  limits: { minYear: number; now: Date },
): { year: number; month: number } | null {
  const index = year * 12 + month + step
  const next = { year: Math.floor(index / 12), month: index % 12 }
  if (next.year < limits.minYear) return null
  const nowIndex = limits.now.getFullYear() * 12 + limits.now.getMonth()
  if (index > nowIndex) return null
  return next
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

/** Quante voci per pagina mostra ogni suddivisione (§14.389). */
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
