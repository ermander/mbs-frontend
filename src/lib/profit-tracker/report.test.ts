import { describe, expect, it } from 'vitest'

import {
  EMPTY_MONTH,
  adjacentMonth,
  breakdownPage,
  breakdownShare,
  buildBreakdown,
  buildMonthTable,
  buildStatement,
  monthIndexOf,
  monthlyAverage,
  monthsOfYear,
} from '@/lib/profit-tracker/report'
import type { ProfitReportBucket, ProfitReportRow } from '@/types/profit-tracker'

const row = (over: Partial<ProfitReportRow>): ProfitReportRow => ({
  periodStart: '2026-03-01T00:00:00.000Z',
  sezione: 'giocate',
  categoria: 'bonus',
  categoriaNome: null,
  accountId: 'a1',
  bookId: 'b1',
  holderId: 'h1',
  totale: 0,
  giocate: 1,
  ...over,
})

describe('report', () => {
  it('legge anno e mese del periodo in UTC', () => {
    expect(monthIndexOf('2026-12-01T00:00:00.000Z')).toEqual({ year: 2026, month: 11 })
  })

  it('compone il conto economico: giocate, costi, entrate e spese', () => {
    const st = buildStatement([
      row({ totale: 120, giocate: 3 }),
      row({ totale: -20, giocate: 1 }),
      row({
        sezione: 'costo_attivita',
        categoria: 'abbonamenti',
        categoriaNome: 'Abbonamenti',
        accountId: null,
        totale: -15,
      }),
      row({
        sezione: 'reddito',
        categoria: 'referral',
        categoriaNome: 'Referral',
        accountId: null,
        totale: 30,
      }),
      row({
        sezione: 'spesa_personale',
        categoria: 'cena',
        categoriaNome: 'Cena',
        accountId: null,
        totale: -40,
        giocate: 2,
      }),
    ])
    expect(st.profittoGiocate).toBe(100)
    expect(st.costiAttivita).toBe(15)
    expect(st.nettoAttivita).toBe(85)
    expect(st.altreEntrate).toBe(30)
    expect(st.spesePersonali).toBe(40)
    expect(st.netto).toBe(75)
    expect(st.giocate).toBe(4)
    expect(st.movimenti).toBe(4)
    expect(st.bySection.costo_attivita).toEqual([
      { key: 'abbonamenti', label: 'Abbonamenti', totale: -15 },
    ])
  })

  it('suddivide per chiave dal totale più alto e calcola la quota sulle sole voci positive', () => {
    const rows = buildBreakdown(
      [
        row({ holderId: 'h1', totale: 60 }),
        row({ holderId: 'h2', totale: 20 }),
        row({ holderId: 'h1', totale: 20 }),
        row({ holderId: 'h3', totale: -10 }),
      ],
      (r) => r.holderId,
      (k) => k.toUpperCase(),
      () => 'voci',
    )
    expect(rows.map((r) => [r.key, r.totale, r.count])).toEqual([
      ['h1', 80, 2],
      ['h2', 20, 1],
      ['h3', -10, 1],
    ])
    expect(breakdownShare(rows[0], rows)).toBe(80)
    expect(breakdownShare(rows[2], rows)).toBeNull()
  })

  it("mette i bucket dell'anno nei dodici mesi e ignora gli altri anni", () => {
    const bucket = (periodStart: string, netto: number): ProfitReportBucket => ({
      ...EMPTY_MONTH,
      periodStart,
      netto,
      nettoAttivita: netto,
      profittoGiocate: netto,
      totale: netto,
      giocate: 1,
    })
    const months = monthsOfYear(
      [
        bucket('2026-01-01T00:00:00.000Z', 50),
        bucket('2026-03-01T00:00:00.000Z', -20),
        bucket('2025-12-01T00:00:00.000Z', 999),
      ],
      2026,
    )
    expect(months).toHaveLength(12)
    expect(months.map((m) => m.netto).slice(0, 4)).toEqual([50, 0, -20, 0])
    expect(months[1]).toEqual(EMPTY_MONTH)
  })

  it('costruisce la tabella mese per mese fino al mese indicato, con il cumulato', () => {
    const months = Array.from({ length: 12 }, () => ({ ...EMPTY_MONTH }))
    months[0] = { ...EMPTY_MONTH, netto: 100, giocate: 2 }
    months[2] = { ...EMPTY_MONTH, netto: -30, movimenti: 1 }
    months[5] = { ...EMPTY_MONTH, netto: 999, giocate: 1 }
    const table = buildMonthTable(months, 3)
    expect(table.map((r) => [r.month, r.netto, r.cumulato, r.hasData])).toEqual([
      [0, 100, 100, true],
      [1, 0, 100, false],
      [2, -30, 70, true],
      [3, 0, 70, false],
    ])
    expect(buildMonthTable(months, -1)).toEqual([])
  })

  it('fa la media del netto sui soli mesi con voci', () => {
    const months = Array.from({ length: 12 }, () => ({ ...EMPTY_MONTH }))
    expect(monthlyAverage(months)).toEqual({ media: 0, mesi: 0 })
    months[0] = { ...EMPTY_MONTH, netto: 100, giocate: 1 }
    months[1] = { ...EMPTY_MONTH, netto: -40, movimenti: 2 }
    expect(monthlyAverage(months)).toEqual({ media: 30, mesi: 2 })
  })

  it('passa al mese prima o dopo attraverso gli anni, senza andare oltre i limiti', () => {
    const limits = { minYear: 2022, now: new Date(2026, 10, 23) }
    expect(adjacentMonth(2026, 0, -1, limits)).toEqual({ year: 2025, month: 11 })
    expect(adjacentMonth(2025, 11, 1, limits)).toEqual({ year: 2026, month: 0 })
    expect(adjacentMonth(2026, 9, 1, limits)).toEqual({ year: 2026, month: 10 })
    expect(adjacentMonth(2026, 10, 1, limits)).toBeNull()
    expect(adjacentMonth(2022, 0, -1, limits)).toBeNull()
  })

  it('pagina le suddivisioni e riempie l’ultima pagina perché resti alta come le altre', () => {
    const rows = Array.from({ length: 14 }, (_, i) => i)
    expect(breakdownPage(rows, 0)).toEqual({
      page: 0,
      pages: 3,
      items: [0, 1, 2, 3, 4, 5],
      filler: 0,
    })
    expect(breakdownPage(rows, 2)).toEqual({ page: 2, pages: 3, items: [12, 13], filler: 4 })
    // Con meno voci (un mese scelto, un filtro) la pagina rientra nei limiti.
    expect(breakdownPage(rows.slice(0, 7), 2)).toEqual({
      page: 1,
      pages: 2,
      items: [6],
      filler: 5,
    })
    expect(breakdownPage(rows, -1).page).toBe(0)
    // Una pagina sola: niente righe vuote.
    expect(breakdownPage(rows.slice(0, 4), 0)).toEqual({
      page: 0,
      pages: 1,
      items: [0, 1, 2, 3],
      filler: 0,
    })
    expect(breakdownPage([], 0)).toEqual({ page: 0, pages: 1, items: [], filler: 0 })
  })
})
