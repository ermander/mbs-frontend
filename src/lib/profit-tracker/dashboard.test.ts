import { describe, expect, it } from 'vitest'

import type { Account, Wallet } from '@/types/profit-tracker'

import {
  chartScale,
  cumulativeSeries,
  dashMoney,
  dashMoneyRound,
  dashboardBalances,
  dashboardProfit,
  joinNames,
  monthlySeries,
  niceStep,
  scalePosition,
} from './dashboard'

const NOW = new Date(2026, 10, 4, 12) // 4 novembre 2026, ora locale

describe('dashMoney', () => {
  it('raggruppa le migliaia anche a quattro cifre, con lo spazio unificatore', () => {
    expect(dashMoney(2431.9, { sign: false })).toBe('2.431,90 €')
    expect(dashMoney(1512.4)).toBe('+1.512,40 €')
    expect(dashMoney(-3.15)).toBe('−3,15 €')
    expect(dashMoney(0)).toBe('0,00 €')
  })
  it('arrotonda gli importi interi di assi ed etichette', () => {
    expect(dashMoneyRound(6400.61)).toBe('6.401 €')
    expect(dashMoneyRound(-120.4)).toBe('−120 €')
  })
})

describe('monthlySeries', () => {
  it('mette i bucket UTC nel loro mese, zero nei mesi vuoti, null nei futuri', () => {
    const s = monthlySeries(
      [
        { periodStart: '2026-03-01T00:00:00.000Z', total: 1512.4 },
        { periodStart: '2026-10-01T00:00:00.000Z', total: -50 },
        { periodStart: '2025-12-01T00:00:00.000Z', total: 999 },
      ],
      2026,
      NOW,
    )
    expect(s).toEqual([0, 0, 1512.4, 0, 0, 0, 0, 0, 0, -50, 0, null])
  })
  it('un anno passato ha tutti i mesi, uno futuro nessuno', () => {
    expect(monthlySeries([], 2025, NOW).every((v) => v === 0)).toBe(true)
    expect(monthlySeries([], 2027, NOW).every((v) => v === null)).toBe(true)
  })
})

describe('cumulativeSeries', () => {
  it('somma da gennaio e lascia null i mesi futuri', () => {
    expect(cumulativeSeries([10, -4, 6, null])).toEqual([10, 6, 12, null])
  })
})

describe('chartScale', () => {
  it('niceStep sceglie 1, 2, 2,5, 5 × 10^k', () => {
    expect(niceStep(1600)).toBe(2000)
    expect(niceStep(1250)).toBe(2000)
    expect(niceStep(2400)).toBe(2500)
    expect(niceStep(0.3)).toBeCloseTo(0.5)
  })
  it('solo positivi: da zero al primo multiplo che contiene il massimo', () => {
    const s = chartScale([1512.4, 6400.61, 0, null])
    expect(s.bottom).toBe(0)
    expect(s.top).toBe(8000)
    expect(s.ticks).toEqual([0, 2000, 4000, 6000, 8000])
  })
  it('non lascia mezza scala vuota quando il massimo è un multiplo basso', () => {
    // 5000 / 4 = 1250 → passo 2000: tre intervalli fino a 6000, non quattro fino a 8000.
    expect(chartScale([5000]).ticks).toEqual([0, 2000, 4000, 6000])
  })
  it('con una perdita l’asse scende sotto lo zero', () => {
    const s = chartScale([3000, -1200])
    expect(s.bottom).toBeLessThan(0)
    expect(s.ticks).toContain(0)
    expect(s.bottom).toBeLessThanOrEqual(-1200)
    expect(s.top).toBeGreaterThanOrEqual(3000)
    expect(scalePosition(0, s)).toBeGreaterThan(0)
  })
  it('tutto in perdita: lo zero sta in cima', () => {
    const s = chartScale([-300, -50])
    expect(s.top).toBe(0)
    expect(scalePosition(0, s)).toBe(1)
  })
  it('tutto a zero: una scala valida', () => {
    const s = chartScale([0, 0, null])
    expect(s.top).toBeGreaterThan(0)
    expect(s.ticks[0]).toBe(0)
  })
})

describe('joinNames', () => {
  it('elenca fino a tre nomi, poi «e altri N»', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['Skrill'])).toBe('Skrill')
    expect(joinNames(['Skrill', 'Neteller', 'PayPal'])).toBe('Skrill, Neteller e PayPal')
    expect(joinNames(['A', 'B', 'C', 'D', 'E'])).toBe('A, B e altri 3')
  })
})

const account = (p: Partial<Account>): Account => ({
  id: 'a',
  holderId: 'h',
  bookId: 'b',
  nome: 'Conto',
  saldoAttuale: 0,
  stato: 'abilitato',
  bloccato: false,
  createdAt: '2026-01-01',
  ...p,
})
const wallet = (p: Partial<Wallet>): Wallet => ({
  id: 'w',
  holderId: 'h',
  paymentMethodId: 'pm',
  nome: 'Skrill',
  saldoAttuale: 0,
  inAttesa: 0,
  stato: 'abilitato',
  bloccato: false,
  createdAt: '2026-01-01',
  ...p,
})

describe('dashboardBalances', () => {
  it('il totale comprende prelievi in attesa e puntate in corso', () => {
    const b = dashboardBalances(
      [account({ saldoAttuale: 100 }), account({ saldoAttuale: 50, bloccato: true })],
      [wallet({ saldoAttuale: 30, inAttesa: 20 })],
      7,
    )
    expect(b.saldoBookmakers).toBe(150)
    expect(b.prelieviInAttesa).toBe(20)
    expect(b.saldoTotale).toBe(207)
    expect(b.saldoBloccato).toBe(50)
    expect(b.bloccatoNote).toBe('Conti 50,00 € · Wallet 0,00 €')
  })
  it('le note contano i conti attivi e nominano i metodi dei wallet attivi, senza doppioni', () => {
    const b = dashboardBalances(
      [account({}), account({ stato: 'disabilitato' }), account({})],
      [
        wallet({ nome: 'Skrill' }),
        wallet({ nome: 'Skrill' }),
        wallet({ nome: 'PayPal' }),
        wallet({ nome: 'Neteller', stato: 'disabilitato' }),
      ],
      0,
    )
    expect(b.bookNote).toBe('Su 2 conti attivi')
    expect(b.walletNote).toBe('Skrill e PayPal')
    expect(b.bloccatoNote).toBe('Nessun importo bloccato')
  })
  it('singolare e casi vuoti', () => {
    expect(dashboardBalances([account({})], [], 0).bookNote).toBe('Su 1 conto attivo')
    const empty = dashboardBalances([], [], 0)
    expect(empty.bookNote).toBe('Nessun conto attivo')
    expect(empty.walletNote).toBe('Nessun wallet attivo')
  })
})

describe('dashboardProfit', () => {
  it('mese attuale, media sui mesi iniziati e note', () => {
    const series = monthlySeries(
      [
        { periodStart: '2026-03-01T00:00:00Z', total: 1100 },
        { periodStart: '2026-11-01T00:00:00Z', total: 0 },
      ],
      2026,
      NOW,
    )
    const p = dashboardProfit(series, 1100, 2026, NOW)
    expect(p.meseAttuale).toBe(0)
    expect(p.mediaMensile).toBe(100)
    expect(p.totaleAnno).toBe(1100)
    expect(p.meseNote).toBe('al 4 novembre')
    expect(p.mediaNote).toBe('su 11 mesi del 2026')
    expect(p.annoNote).toBe('Da gennaio 2026')
    expect(p.isEmpty).toBe(false)
  })
  it('vuoto se nessun mese ha un profitto diverso da zero; una perdita non è vuoto', () => {
    expect(dashboardProfit(monthlySeries([], 2026, NOW), 0, 2026, NOW).isEmpty).toBe(true)
    const loss = monthlySeries([{ periodStart: '2026-02-01T00:00:00Z', total: -5 }], 2026, NOW)
    expect(dashboardProfit(loss, -5, 2026, NOW).isEmpty).toBe(false)
  })
})
