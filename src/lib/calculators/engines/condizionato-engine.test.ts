import { describe, expect, it } from 'vitest'
import {
  computeCondizionato,
  coverLeg,
  type CondizionatoInput,
  type CoverSectionInput,
} from './condizionato-engine'

const banca = (...odds: number[]): CoverSectionInput => ({
  mode: 'banca',
  legs: odds.map((o) => ({ odds: o, commissionPercent: 4.5 })),
})
const punta = (...odds: number[]): CoverSectionInput => ({
  mode: 'punta',
  legs: odds.map((o) => ({ odds: o, commissionPercent: null })),
})

/** Offerta d'esempio: 50 € a 2,20, rimborso 30 € se perde e la partita va ai supplementari. */
function input(overrides: Partial<CondizionatoInput> = {}): CondizionatoInput {
  return {
    stake: 50,
    odds: 2.2,
    refund: 30,
    qualifier: banca(2.25),
    condition: banca(3.4),
    ...overrides,
  }
}

const totals = (r: ReturnType<typeof computeCondizionato>) => r!.scenarios.map((s) => s.total)

describe('coverLeg', () => {
  it('in Banca divide il bersaglio per quota − commissione, in Punta per la quota', () => {
    const lay = coverLeg('banca', { odds: 2.25, commissionPercent: 4.5 }, 110)!
    expect(lay.stakeExact).toBeCloseTo(110 / 2.205, 9)
    expect(lay.stake).toBe(49.9)
    expect(lay.liability).toBeCloseTo(62.375, 9)
    expect(lay.win).toBeCloseTo(49.9 * 0.955, 9)
    const back = coverLeg('punta', { odds: 1.9, commissionPercent: 4.5 }, 110)!
    expect(back.commissionPercent).toBe(0)
    expect(back.stakeExact).toBeCloseTo(110 / 1.9, 9)
    expect(back.stake).toBe(57.9)
    expect(back.win).toBeCloseTo(57.9 * 0.9, 9)
    expect(back.lose).toBe(-57.9)
  })

  it('rifiuta quote fino a 1 e commissioni fuori scala', () => {
    expect(coverLeg('banca', { odds: 1, commissionPercent: 4.5 }, 10)).toBeNull()
    expect(coverLeg('punta', { odds: null, commissionPercent: null }, 10)).toBeNull()
    expect(coverLeg('banca', { odds: 2, commissionPercent: 100 }, 10)).toBeNull()
    expect(coverLeg('banca', { odds: 2, commissionPercent: -1 }, 10)).toBeNull()
  })

  it('in Banca una commissione vuota vale zero', () => {
    expect(coverLeg('banca', { odds: 2, commissionPercent: null }, 10)!.stakeExact).toBe(5)
  })
})

describe('computeCondizionato', () => {
  it('esempio con due bancate: tre scenari, bancate 49,90 e 8,95, circa 6,17 € in ogni caso', () => {
    const r = computeCondizionato(input())!
    expect(r.qualifierCovers.map((l) => l.stake)).toEqual([49.9])
    expect(r.conditionCovers.map((l) => l.stake)).toEqual([8.95])
    expect(r.conditionCovers[0].liability).toBeCloseTo(21.48, 9)
    expect(r.scenarios.map((s) => s.id)).toEqual(['qw-cn', 'ql-cy', 'ql-cn'])
    expect(r.scenarios.map((s) => s.refund)).toEqual([0, 30, 0])
    for (const t of totals(r)) expect(t).toBeCloseTo(6.18, 1)
    expect(r.minProfit).toBeCloseTo(6.172, 3)
    expect(r.outlay).toBeCloseTo(50 + 62.375 + 21.48, 9)
    expect(r.crPercent).toBeCloseTo((r.minProfit / 30) * 100, 9)
  })

  it('le colonne di ogni scenario sommano al totale', () => {
    const r = computeCondizionato(input({ qualifier: punta(3.5, 4), condition: punta(2.5, 3) }))!
    for (const s of r.scenarios) {
      const sum =
        s.qualifierProfit +
        s.qualifierCovers.reduce((a, b) => a + b, 0) +
        s.conditionCovers.reduce((a, b) => a + b, 0) +
        s.refund
      expect(sum).toBeCloseTo(s.total, 9)
    }
  })

  it('le stesse coperture in Punta: contropuntate a S·Q/quota e R/quota', () => {
    const r = computeCondizionato(input({ qualifier: punta(1.9), condition: punta(1.4) }))!
    expect(r.qualifierCovers[0].stake).toBe(57.9)
    expect(r.conditionCovers[0].stake).toBe(21.45)
    expect(r.scenarios).toHaveLength(3)
    const [a, b, c] = totals(r)
    expect(a).toBeCloseTo(60 - 57.9 + 21.45 * 0.4, 9)
    expect(b).toBeCloseTo(-50 + 30 + 57.9 * 0.9 - 21.45, 9)
    expect(c).toBeCloseTo(-50 + 57.9 * 0.9 + 21.45 * 0.4, 9)
    for (const t of totals(r)) expect(t).toBeCloseTo(10.66, 1)
  })

  it('qualificante coperta da due punte (X e 2): cinque scenari, uno per punta e condizione', () => {
    const r = computeCondizionato(input({ qualifier: punta(3.5, 4), condition: punta(1.4) }))!
    expect(r.qualifierCovers.map((l) => l.stake)).toEqual([31.45, 27.5])
    expect(r.scenarios.map((s) => s.id)).toEqual(['qw-cn', 'ql0-cy', 'ql0-cn', 'ql1-cy', 'ql1-cn'])
    const losing = r.scenarios.filter((s) => !s.qualifier.wins)
    expect(losing.map((s) => s.qualifier.leg)).toEqual([0, 0, 1, 1])
    // Quando vince la punta 1 la punta 2 perde, e viceversa.
    expect(losing[0].qualifierCovers[0]).toBeCloseTo(31.45 * 2.5, 9)
    expect(losing[0].qualifierCovers[1]).toBe(-27.5)
    for (const t of totals(r)) expect(t).toBeCloseTo(9.6, 0)
  })

  it('condizione coperta da due punte: quando vince la qualificante vince una delle due', () => {
    const r = computeCondizionato(input({ condition: punta(2.5, 3) }))!
    expect(r.conditionCovers.map((l) => l.stake)).toEqual([12, 10])
    expect(r.scenarios.map((s) => s.id)).toEqual(['qw-cn0', 'qw-cn1', 'ql-cy', 'ql-cn0', 'ql-cn1'])
    const yes = r.scenarios.find((s) => s.id === 'ql-cy')!
    expect(yes.conditionCovers).toEqual([-12, -10])
    expect(yes.refund).toBe(30)
    const no = r.scenarios.find((s) => s.id === 'ql-cn1')!
    expect(no.conditionCovers).toEqual([-12, 20])
    // Ogni gamba vale il rimborso fra «condizione no» e «sì»: tutti gli scenari pari.
    const spread = r.maxProfit - r.minProfit
    expect(spread).toBeLessThan(0.1)
  })

  it('due bancate per evento: perde solo la bancata dell’esito uscito', () => {
    const r = computeCondizionato(input({ qualifier: banca(3, 4), condition: banca(8, 9) }))!
    // 2 esiti di vittoria × condizione no, + qualificante persa × (2 esiti della condizione + no).
    expect(r.scenarios.map((s) => s.id)).toEqual(['qw0-cn', 'qw1-cn', 'ql-cy0', 'ql-cy1', 'ql-cn'])
    const viaFirst = r.scenarios[0]
    expect(viaFirst.qualifierCovers[0]).toBeCloseTo(-r.qualifierCovers[0].liability, 9)
    expect(viaFirst.qualifierCovers[1]).toBeCloseTo(r.qualifierCovers[1].win, 9)
    // Ogni bancata esatta rende il bersaglio della sua parte; restano solo i 5 centesimi.
    for (const leg of r.qualifierCovers) {
      expect(leg.stakeExact * (leg.odds - 0.045)).toBeCloseTo(110, 9)
    }
    for (const leg of r.conditionCovers) {
      expect(leg.stakeExact * (leg.odds - 0.045)).toBeCloseTo(30, 9)
    }
    expect(r.maxProfit - r.minProfit).toBeLessThan(0.3)
  })

  it('due coperture per parte: otto scenari', () => {
    const r = computeCondizionato(input({ qualifier: punta(3.5, 4), condition: punta(2.5, 3) }))!
    expect(r.scenarios).toHaveLength(8)
  })

  it('senza arrotondamento gli scenari sono identici: la formula pareggia', () => {
    // Bersagli scelti perché le puntate esatte cadano sui 5 centesimi.
    const r = computeCondizionato({
      stake: 50,
      odds: 2,
      refund: 20,
      qualifier: punta(2.5),
      condition: punta(4),
    })!
    expect(r.qualifierCovers[0].stake).toBe(40)
    expect(r.conditionCovers[0].stake).toBe(5)
    for (const t of totals(r)) expect(t).toBeCloseTo(25, 9)
  })

  it('input incompleti o non validi: nessun risultato', () => {
    expect(computeCondizionato(input({ stake: null }))).toBeNull()
    expect(computeCondizionato(input({ stake: 0 }))).toBeNull()
    expect(computeCondizionato(input({ odds: 1 }))).toBeNull()
    expect(computeCondizionato(input({ refund: null }))).toBeNull()
    expect(computeCondizionato(input({ refund: 0 }))).toBeNull()
    expect(computeCondizionato(input({ qualifier: banca() }))).toBeNull()
    expect(computeCondizionato(input({ condition: punta(2, 3, 4) }))).toBeNull()
    expect(computeCondizionato(input({ condition: banca(0.5) }))).toBeNull()
  })
})
