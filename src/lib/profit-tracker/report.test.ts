import { describe, expect, it } from 'vitest'

import {
  breakdownShare,
  buildBreakdown,
  buildStatement,
  monthIndexOf,
} from '@/lib/profit-tracker/report'
import type { ProfitReportRow } from '@/types/profit-tracker'

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
})
