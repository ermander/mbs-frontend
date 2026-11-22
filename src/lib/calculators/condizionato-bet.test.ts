import { describe, expect, it } from 'vitest'
import {
  buildCondizionatoBet,
  condizionatoNota,
  type CondizionatoBetArgs,
} from './condizionato-bet'
import { coverLeg } from './engines/condizionato-engine'

const lay = (odds: number, target: number) =>
  coverLeg('banca', { odds, commissionPercent: 4.5 }, target)!
const back = (odds: number, target: number) =>
  coverLeg('punta', { odds, commissionPercent: null }, target)!

function args(overrides: Partial<CondizionatoBetArgs> = {}): CondizionatoBetArgs {
  return {
    eventoDataIso: '2026-11-22T19:45:00.000Z',
    eventoNome: 'Squadra A - Squadra B',
    competizione: 'Coppa',
    sport: 'calcio',
    categoria: 'matched_betting',
    qualifier: { mercato: '⚽ 1X2 1', accountId: 'acc-a', stake: 50, odds: 2.2, refund: 30 },
    qualifierCovers: [{ mercato: '⚽ 1X2 1', accountId: 'acc-ex', leg: lay(2.25, 110) }],
    conditionCovers: [{ mercato: '⚽ 1X2 X', accountId: 'acc-ex', leg: lay(3.4, 30) }],
    condizione: 'tempi supplementari',
    ...overrides,
  }
}

describe('condizionatoNota', () => {
  it('dice il rimborso e, se scritta, la condizione', () => {
    expect(condizionatoNota(30, 'tempi supplementari')).toBe(
      'Rimborso condizionato di 30,00 €: tempi supplementari',
    )
    expect(condizionatoNota(30, '  ')).toBe('Rimborso condizionato di 30,00 €')
    expect(condizionatoNota(30)).toBe('Rimborso condizionato di 30,00 €')
  })
})

describe('buildCondizionatoBet', () => {
  it('la giocata sul conto della qualificante, in bozza, con la condizione nella nota', () => {
    const { betPayload } = buildCondizionatoBet(args())
    expect(betPayload).toEqual({
      eventoData: '2026-11-22T19:45:00.000Z',
      categoria: 'matched_betting',
      sport: 'calcio',
      eventoNome: 'Squadra A - Squadra B',
      modalitaSaldo: 'reale',
      accountId: 'acc-a',
      tag: undefined,
      nota: 'Rimborso condizionato di 30,00 €: tempi supplementari',
    })
  })

  it('la qualificante porta il rimborso, le bancate responsabilità e commissione', () => {
    const { legsPayload } = buildCondizionatoBet(args())
    expect(legsPayload).toHaveLength(3)
    const [q, qc, cc] = legsPayload
    expect(q).toMatchObject({
      selezione: 'Qualificante',
      mercato: '⚽ 1X2 1',
      metodo: 'punta',
      tipoBonus: 'rimborso',
      accountId: 'acc-a',
      stake: 50,
      quota: 2.2,
      rischio: 0,
      rimborsoValore: 30,
      statoEvento: 'bozza',
      posizione: 0,
    })
    expect(q.bonusValore).toBeUndefined()
    expect(qc).toMatchObject({
      selezione: 'Copertura qualificante',
      metodo: 'banca',
      tipoBonus: 'none',
      accountId: 'acc-ex',
      stake: 49.9,
      quota: 2.25,
      quotaRiferimento: 2.2,
      commissionePercentuale: 4.5,
      posizione: 1,
    })
    expect(qc.rischio).toBeCloseTo(62.375, 9)
    expect(qc.rimborsoValore).toBeUndefined()
    expect(cc).toMatchObject({
      selezione: 'Copertura condizione',
      mercato: '⚽ 1X2 X',
      metodo: 'banca',
      stake: 8.95,
      quota: 3.4,
      commissionePercentuale: 4.5,
      posizione: 2,
    })
    expect(cc.quotaRiferimento).toBeUndefined()
    expect(cc.rischio).toBeCloseTo(21.48, 9)
  })

  it('le punte: niente rischio né commissione, nomi numerati quando sono due', () => {
    const { legsPayload } = buildCondizionatoBet(
      args({
        qualifierCovers: [
          { mercato: '⚽ 1X2 X', accountId: 'acc-b', leg: back(3.5, 110) },
          { mercato: '⚽ 1X2 2', accountId: 'acc-c', leg: back(4, 110) },
        ],
        conditionCovers: [
          { mercato: 'ALTRO', accountId: 'acc-d', leg: back(2.5, 30) },
          { mercato: 'ALTRO', accountId: 'acc-e', leg: back(3, 30) },
        ],
      }),
    )
    expect(legsPayload.map((l) => l.selezione)).toEqual([
      'Qualificante',
      'Copertura qualificante 1',
      'Copertura qualificante 2',
      'Copertura condizione 1',
      'Copertura condizione 2',
    ])
    expect(legsPayload.map((l) => l.posizione)).toEqual([0, 1, 2, 3, 4])
    expect(legsPayload.map((l) => l.accountId)).toEqual([
      'acc-a',
      'acc-b',
      'acc-c',
      'acc-d',
      'acc-e',
    ])
    for (const leg of legsPayload.slice(1)) {
      expect(leg).toMatchObject({ metodo: 'punta', rischio: 0, commissionePercentuale: 0 })
      expect(leg.quotaRiferimento).toBeUndefined()
    }
    expect(legsPayload.slice(1).map((l) => l.stake)).toEqual([31.45, 27.5, 12, 10])
  })
})
