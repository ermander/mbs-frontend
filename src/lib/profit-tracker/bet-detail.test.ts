import { describe, expect, it } from 'vitest'

import { multiplaLayStakes } from '@/lib/calculators/multipla'
import {
  betSummary,
  isMultiplaLegs,
  legFormErrors,
  legFormPatch,
  legRisk,
  legToForm,
  multiplaRecalcPatches,
  sortLegs,
} from './bet-detail'
import type { BetLeg } from '@/types/profit-tracker'

const leg = (o: Partial<BetLeg>): BetLeg => ({
  id: 'l',
  betId: 'b',
  eventoData: '2026-11-01T14:00:00.000Z',
  sport: 'calcio',
  eventoNome: 'Milan - Lazio',
  competizione: 'Serie A',
  mercato: '1X2',
  selezione: '1',
  metodo: 'punta',
  tipoBonus: 'none',
  accountId: 'a1',
  stake: 100,
  quota: 2.1,
  rischio: 100,
  movimento: 0,
  statoEvento: 'bozza',
  ...o,
})

const multipla = () => [
  leg({
    id: 'p',
    competizione: 'Multipla',
    mercato: 'Multipla',
    selezione: undefined,
    stake: 10,
    quota: 7.84,
    posizione: 0,
  }),
  leg({
    id: 'h1',
    metodo: 'banca',
    eventoNome: 'Milan - Lazio',
    quota: 2.02,
    quotaRiferimento: 2,
    commissionePercentuale: 4.5,
    stake: 3,
    rischio: 3,
    posizione: 1,
  }),
  leg({
    id: 'h2',
    metodo: 'banca',
    eventoNome: 'Atalanta - Fiorentina',
    eventoData: '2026-11-01T17:00:00.000Z',
    quota: 1.9,
    quotaRiferimento: 1.96,
    commissionePercentuale: 4.5,
    stake: 5,
    rischio: 5,
    posizione: 2,
  }),
  leg({
    id: 'h3',
    metodo: 'banca',
    eventoNome: 'Torino - Genoa',
    eventoData: '2026-11-01T19:45:00.000Z',
    quota: 2.05,
    quotaRiferimento: 2,
    commissionePercentuale: 4.5,
    stake: 7,
    rischio: 7,
    posizione: 3,
  }),
]

describe('sortLegs e isMultiplaLegs', () => {
  it('posizione, poi punta prima della banca', () => {
    const out = sortLegs([
      leg({ id: 'b', metodo: 'banca' }),
      leg({ id: 'a' }),
      leg({ id: 'z', posizione: 0, metodo: 'banca' }),
    ])
    expect(out.map((l) => l.id)).toEqual(['z', 'a', 'b'])
  })
  it('multipla solo col marcatore sulla punta', () => {
    expect(isMultiplaLegs(multipla())).toBe(true)
    expect(isMultiplaLegs([leg({}), leg({ id: 'b', metodo: 'banca' })])).toBe(false)
  })
})

describe('riepilogo', () => {
  it('rischio senza la punta principale, guadagno dai movimenti', () => {
    const legs = [
      leg({ id: 'p', rischio: 100 }),
      leg({ id: 'b', metodo: 'banca', rischio: 115, statoEvento: 'vinto', movimento: 95.5 }),
    ]
    expect(betSummary(legs)).toEqual({
      totalRischio: 115,
      totalMovimento: 95.5,
      anyClosed: true,
      allClosed: false,
      hasLegsInCorso: false,
    })
  })
  it('la punta senza rischio rischia la puntata', () => {
    expect(legRisk(leg({ rischio: 0, stake: 40 }))).toBe(40)
    expect(legRisk(leg({ metodo: 'banca', rischio: 12, stake: 40 }))).toBe(12)
  })
})

describe('modale Modifica gamba', () => {
  it('senza modifiche la patch è vuota', () => {
    const l = leg({ bonusValore: undefined })
    expect(legFormPatch(l, legToForm(l))).toEqual({})
  })
  it('puntata della punta → anche il rischio; mercato e selezione con gli spazi tolti', () => {
    const l = leg({})
    const f = { ...legToForm(l), stake: '120,5', mercato: ' Over/Under 2,5 ', selezione: 'Over ' }
    expect(legFormPatch(l, f)).toEqual({
      stake: 120.5,
      rischio: 120.5,
      mercato: 'Over/Under 2,5',
      selezione: 'Over',
    })
  })
  it('tipo bonus da bonus a nessuno azzera il bonus', () => {
    const l = leg({ tipoBonus: 'bonus', bonusValore: 10 })
    expect(legFormPatch(l, { ...legToForm(l), tipoBonus: 'none' })).toEqual({
      tipoBonus: 'none',
      bonusValore: 0,
    })
  })
  it('il metodo e la commissione della punta non entrano', () => {
    const l = leg({})
    expect(legFormPatch(l, { ...legToForm(l), commissione: '5' })).toEqual({})
  })
  it('errori: quota, commissione della banca, evento', () => {
    const l = leg({ metodo: 'banca', commissionePercentuale: 4.5 })
    const e = legFormErrors(
      l,
      { ...legToForm(l), quota: '1', commissione: '120', eventoNome: ' ' },
      false,
    )
    expect(Object.keys(e).sort()).toEqual(['commissione', 'eventoNome', 'quota'])
  })
})

describe('ricalcolo delle coperture della multipla', () => {
  const events = (legs: BetLeg[]) =>
    legs.slice(1).map((l) => ({
      type: 'punta-banca' as const,
      coverOdds: l.quota,
      commissionPercent: l.commissionePercentuale ?? 3,
    }))

  it('quota punta di una copertura → quota totale della punta e coperture nuove', () => {
    const legs = multipla()
    const out = multiplaRecalcPatches(legs, 'h2', { quotaRiferimento: 2.5 })
    expect(out[0]).toEqual({ legId: 'p', patch: { quota: 10 } })
    const expected = multiplaLayStakes(10, 2 * 2.5 * 2, events(legs))
    expect(out.slice(1)).toEqual(
      ['h1', 'h2', 'h3'].map((id, i) => ({
        legId: id,
        patch: { stake: expected[i]!.hedgeStake, rischio: expected[i]!.hedgeCost },
      })),
    )
  })
  it('puntata della punta → coperture sul nuovo importo, quota totale dalle quote punta', () => {
    const legs = multipla()
    const out = multiplaRecalcPatches(legs, 'p', { stake: 20, rischio: 20 })
    const expected = multiplaLayStakes(20, 2 * 1.96 * 2, events(legs))
    expect(out.map((o) => o.patch.stake)).toEqual(expected.map((r) => r.hedgeStake))
  })
  it('le coperture liquidate restano come sono', () => {
    const legs = multipla().map((l) =>
      l.id === 'h1' ? { ...l, statoEvento: 'vinto' as const } : l,
    )
    const out = multiplaRecalcPatches(legs, 'p', { quota: 9 })
    expect(out.map((o) => o.legId)).toEqual(['h2', 'h3'])
  })
  it('niente ricalcolo per la data, il conto o una singola', () => {
    expect(multiplaRecalcPatches(multipla(), 'h1', { eventoNome: 'X' })).toEqual([])
    expect(multiplaRecalcPatches(multipla(), 'p', { accountId: 'a2' })).toEqual([])
    const single = [leg({ id: 'p' }), leg({ id: 'b', metodo: 'banca', quotaRiferimento: 2 })]
    expect(multiplaRecalcPatches(single, 'b', { quota: 2.2 })).toEqual([])
  })
})
