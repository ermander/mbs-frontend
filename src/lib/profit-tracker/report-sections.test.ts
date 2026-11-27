import { describe, expect, it } from 'vitest'

import {
  SECTION_KEYS,
  categoriesFromRows,
  daysLeftInMonth,
  goalInForce,
  goalProgress,
  goalsOfMonth,
  monthKey,
  monthsReached,
  sectionMonths,
  sectionTotals,
} from '@/lib/profit-tracker/report-sections'
import type {
  ProfitGoal,
  ProfitReportCategoryAmount,
  ProfitReportRow,
} from '@/types/profit-tracker'

const cat = (
  periodStart: string | null,
  categoria: string,
  totale: number,
  giocate = 1,
): ProfitReportCategoryAmount => ({ periodStart, categoria, totale, giocate })

const CATEGORIE: ProfitReportCategoryAmount[] = [
  cat(null, 'matched_betting', 700, 5),
  cat(null, 'risultato_goal', 120, 3),
  cat(null, 'roulette', -15, 2),
  cat(null, 'slot_machine', 40, 1),
  cat('2026-10-01T00:00:00.000Z', 'matched_betting', 400, 3),
  cat('2026-11-01T00:00:00.000Z', 'matched_betting', 300, 2),
  cat('2026-11-01T00:00:00.000Z', 'risultato_goal', 120, 3),
  cat('2026-11-01T00:00:00.000Z', 'roulette', -15, 2),
  cat('2026-10-01T00:00:00.000Z', 'slot_machine', 40, 1),
  cat('2025-11-01T00:00:00.000Z', 'surebet', 99, 1),
]

describe('sectionTotals', () => {
  it('sums the whole period from the entries without a month', () => {
    const t = sectionTotals(CATEGORIE, 2026, null)
    expect(t.bySection.matched_betting).toEqual({ totale: 700, giocate: 5 })
    expect(t.bySection.risultato_goal).toEqual({ totale: 120, giocate: 3 })
    expect(t.bySection.surebet).toEqual({ totale: 0, giocate: 0 })
    expect(t.altre).toEqual({ totale: 25, giocate: 3 })
  })

  it('takes one month of the year', () => {
    const t = sectionTotals(CATEGORIE, 2026, 10)
    expect(t.bySection.matched_betting).toEqual({ totale: 300, giocate: 2 })
    expect(t.bySection.risultato_goal).toEqual({ totale: 120, giocate: 3 })
    expect(t.altre).toEqual({ totale: -15, giocate: 2 })
    expect(sectionTotals(CATEGORIE, 2025, 10).bySection.surebet.totale).toBe(99)
  })
})

describe('sectionMonths', () => {
  it('spreads each section over the twelve months of the year', () => {
    const m = sectionMonths(CATEGORIE, 2026)
    expect(m.matched_betting[9]).toBe(400)
    expect(m.matched_betting[10]).toBe(300)
    expect(m.surebet.every((v) => v === 0)).toBe(true)
    expect(Object.keys(m)).toEqual(SECTION_KEYS)
  })
})

describe('categoriesFromRows', () => {
  it('rebuilds the entries from the report rows (one bet per account)', () => {
    const row = (periodStart: string, categoria: string, totale: number): ProfitReportRow => ({
      periodStart,
      sezione: 'giocate',
      categoria,
      categoriaNome: null,
      accountId: 'a',
      bookId: 'b',
      holderId: 'h',
      totale,
      giocate: 1,
    })
    const out = categoriesFromRows([
      row('2026-11-01T00:00:00.000Z', 'risultato_goal', 50),
      row('2026-11-01T00:00:00.000Z', 'risultato_goal', -20),
      { ...row('2026-11-01T00:00:00.000Z', 'commissioni', -5), sezione: 'costo_attivita' },
    ])
    expect(sectionTotals(out, 2026, 10).bySection.risultato_goal).toEqual({
      totale: 30,
      giocate: 2,
    })
    expect(sectionTotals(out, 2026, null).bySection.risultato_goal).toEqual({
      totale: 30,
      giocate: 2,
    })
    expect(out.some((c) => c.categoria === 'commissioni')).toBe(false)
  })
})

describe('goals', () => {
  const goals: ProfitGoal[] = [
    { sezione: 'matched_betting', dalMese: '2026-09', importo: 500 },
    { sezione: 'matched_betting', dalMese: '2026-11', importo: 600 },
    { sezione: 'surebet', dalMese: '2026-10', importo: 100 },
    { sezione: 'surebet', dalMese: '2026-11', importo: null },
  ]

  it('monthKey pads the month', () => {
    expect(monthKey(2026, 0)).toBe('2026-01')
    expect(monthKey(2026, 10)).toBe('2026-11')
  })

  it('goalInForce: the last row from that month or before', () => {
    expect(goalInForce(goals, 'matched_betting', '2026-08')).toBeNull()
    expect(goalInForce(goals, 'matched_betting', '2026-10')).toBe(500)
    expect(goalInForce(goals, 'matched_betting', '2026-12')).toBe(600)
    expect(goalInForce(goals, 'surebet', '2026-10')).toBe(100)
    expect(goalInForce(goals, 'surebet', '2026-11')).toBeNull()
  })

  it('goalsOfMonth: one entry per section', () => {
    expect(goalsOfMonth(goals, '2026-10')).toEqual({
      matched_betting: 500,
      surebet: 100,
      valuebet: null,
      risultato_goal: null,
    })
  })

  it('goalProgress: what is left, the bar and what went beyond', () => {
    expect(goalProgress(500, 320)).toEqual({
      obiettivo: 500,
      fatto: 320,
      mancano: 180,
      quota: 0.64,
      raggiunto: false,
      oltre: 0,
    })
    expect(goalProgress(500, 542)).toMatchObject({
      mancano: 0,
      quota: 1,
      raggiunto: true,
      oltre: 42,
    })
    expect(goalProgress(500, -50)).toMatchObject({ mancano: 550, quota: 0, raggiunto: false })
  })

  it('monthsReached: only the months with a goal, up to the last closed one', () => {
    const monthly = Array.from({ length: 12 }, () => 0)
    monthly[8] = 520 // September: 500 → reached
    monthly[9] = 480 // October: 500 → not reached
    monthly[10] = 700 // November: 600 → reached, but still open
    expect(monthsReached(goals, 'matched_betting', monthly, 2026, 9)).toEqual({
      raggiunti: 1,
      conObiettivo: 2,
    })
    expect(monthsReached(goals, 'matched_betting', monthly, 2026, 11)).toEqual({
      raggiunti: 2,
      conObiettivo: 4,
    })
    expect(monthsReached(goals, 'valuebet', monthly, 2026, 11)).toEqual({
      raggiunti: 0,
      conObiettivo: 0,
    })
    expect(monthsReached(goals, 'matched_betting', monthly, 2026, -1).conObiettivo).toBe(0)
  })

  it('daysLeftInMonth counts today', () => {
    expect(daysLeftInMonth(new Date(2026, 10, 27, 19, 0))).toBe(4)
    expect(daysLeftInMonth(new Date(2026, 10, 30, 9, 0))).toBe(1)
    expect(daysLeftInMonth(new Date(2026, 1, 1, 9, 0))).toBe(28)
  })
})
