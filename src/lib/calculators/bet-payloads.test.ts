import { describe, expect, it } from 'vitest'
import {
  buildDutchBet,
  buildMultiplaBet,
  buildPuntaBancaBet,
  multiplaSport,
  tipoBonusFor,
  type BetEventInfo,
} from './bet-payloads'

const event: BetEventInfo = {
  eventoDataIso: '2026-09-20T18:45:00.000Z',
  eventoNome: 'Genoa vs Como',
  competizione: 'Serie A',
  sport: 'calcio',
  mercato: 'O/U 2.5',
}

describe('tipoBonusFor', () => {
  it('rimborso wins over bonus, none otherwise', () => {
    expect(tipoBonusFor(0, 0)).toBe('none')
    expect(tipoBonusFor(20, 0)).toBe('bonus')
    expect(tipoBonusFor(20, 10)).toBe('rimborso')
  })
})

describe('buildPuntaBancaBet', () => {
  const base = {
    event,
    selezione: 'Over',
    accountIdPunta: 'acc-punta',
    accountIdBanca: 'acc-banca',
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    quotaPunta: 2,
    quotaBanca: 2.1,
    commissionePercent: 4.5,
    layStake: 97.32,
    responsabilita: 107.05,
    partialLays: [],
    partialLayResults: [],
  }

  it('one punta leg and one banca leg, the bet on the punta account, flagged as scanner', () => {
    const { betPayload, legsPayload } = buildPuntaBancaBet(base)
    expect(betPayload).toMatchObject({
      source: 'oddsmatcher',
      sport: 'calcio',
      eventoNome: 'Genoa vs Como',
      modalitaSaldo: 'reale',
      accountId: 'acc-punta',
    })
    expect(legsPayload).toHaveLength(2)
    expect(legsPayload[0]).toMatchObject({
      metodo: 'punta',
      tipoBonus: 'none',
      accountId: 'acc-punta',
      stake: 100,
      quota: 2,
      rischio: 0,
      commissionePercentuale: 0,
      statoEvento: 'bozza',
      posizione: 0,
      selezione: 'Over',
      mercato: 'O/U 2.5',
      competizione: 'Serie A',
    })
    expect(legsPayload[1]).toMatchObject({
      metodo: 'banca',
      tipoBonus: 'none',
      accountId: 'acc-banca',
      stake: 97.32,
      quota: 2.1,
      rischio: 107.05,
      quotaRiferimento: 2,
      commissionePercentuale: 4.5,
      posizione: 1,
    })
  })

  it('bonus and rimborso travel on the punta leg only; the stake is stake + bonus', () => {
    const { legsPayload } = buildPuntaBancaBet({ ...base, bonus: 20, rimborso: 10 })
    expect(legsPayload[0]).toMatchObject({
      tipoBonus: 'rimborso',
      stake: 120,
      bonusValore: 20,
      rimborsoValore: 10,
    })
    expect(legsPayload[1].bonusValore).toBeUndefined()
    expect(legsPayload[1].rimborsoValore).toBeUndefined()
  })

  it('partial lays: one banca leg per amount already laid, plus the computed rest', () => {
    const { legsPayload } = buildPuntaBancaBet({
      ...base,
      partialLays: [{ amount: 50, newOdds: 2.2 }],
      partialLayResults: [{ newLayStake: 45.45, newLiability: 54.55 }],
    })
    expect(legsPayload).toHaveLength(3)
    expect(legsPayload[1]).toMatchObject({ stake: 50, quota: 2.1, posizione: 1 })
    expect(legsPayload[1].rischio).toBeCloseTo(55, 9)
    expect(legsPayload[2]).toMatchObject({ stake: 45.45, quota: 2.2, rischio: 54.55, posizione: 2 })
  })

  it('an incomplete partial lay falls back to the single lay', () => {
    const { legsPayload } = buildPuntaBancaBet({
      ...base,
      partialLays: [{ amount: 50, newOdds: null }],
      partialLayResults: [null],
    })
    expect(legsPayload).toHaveLength(2)
    expect(legsPayload[1]).toMatchObject({ stake: 97.32, quota: 2.1 })
  })
})

describe('buildDutchBet', () => {
  it('three back legs, the punta leg first, covers in leg order, commission on the exchange leg', () => {
    const { betPayload, legsPayload } = buildDutchBet({
      event,
      categoria: 'surebet',
      puntaIndex: 1,
      puntata: 100,
      bonus: 20,
      rimborso: 0,
      legs: [
        {
          selezione: '1',
          quotaGross: 2.1,
          commissionePercent: 0,
          accountId: 'acc-a',
          stake: 161.9,
        },
        { selezione: 'X', quotaGross: 3.4, commissionePercent: 0, accountId: 'acc-x', stake: 120 },
        {
          selezione: '2',
          quotaGross: 3.9,
          commissionePercent: 4.5,
          accountId: 'acc-b',
          stake: 94.44,
        },
      ],
    })
    expect(betPayload).toMatchObject({
      source: 'oddsmatcher',
      categoria: 'surebet',
      accountId: 'acc-x',
    })
    expect(legsPayload).toHaveLength(3)
    expect(legsPayload[0]).toMatchObject({
      selezione: 'X',
      metodo: 'punta',
      tipoBonus: 'bonus',
      bonusValore: 20,
      stake: 120,
      quota: 3.4,
      accountId: 'acc-x',
      posizione: 0,
      commissionePercentuale: 0,
    })
    expect(legsPayload[1]).toMatchObject({
      selezione: '1',
      tipoBonus: 'none',
      stake: 161.9,
      accountId: 'acc-a',
      posizione: 1,
    })
    expect(legsPayload[2]).toMatchObject({
      selezione: '2',
      quota: 3.9,
      commissionePercentuale: 4.5,
      accountId: 'acc-b',
      posizione: 2,
    })
    expect(
      legsPayload.every(
        (l) => l.metodo === 'punta' && l.rischio === 0 && l.statoEvento === 'bozza',
      ),
    ).toBe(true)
  })
})

describe('buildMultiplaBet', () => {
  const pb = {
    type: 'punta-banca' as const,
    sport: 'calcio',
    home: 'Genoa',
    away: 'Como',
    date: '2026-09-20',
    hour: '20:45',
    competition: 'Serie A',
    market: 'O/U 2.5',
    selection: 'Over',
    mainOdd: '2.05',
    coverOdd: '2.02',
    bookId1: 'sisal',
    bookId2: 'betfair',
    commissionPercent: 4.5,
    startTimeIso: '2026-09-20T18:45:00.000Z',
    coverIsExchange: true,
  }
  const pp = {
    type: 'punta-punta' as const,
    sport: 'calcio',
    home: 'Lazio',
    away: 'Roma',
    date: '2026-09-21',
    hour: '20:45',
    competition: 'Serie A',
    market: 'O/U 2.5',
    selection: 'Over',
    mainOdd: '2.05',
    coverOdd: '2.146',
    coverOddGross: '2.20',
    coverSelection: 'Under',
    bookId1: 'sisal',
    bookId2: 'betfair',
    commissionPercent: 4.5,
    startTimeIso: '2026-09-21T18:45:00.000Z',
    coverIsExchange: true,
  }

  it('one punta leg on the multipla price, one hedge per event in kickoff order, the cover account by bookmaker', () => {
    const { betPayload, legsPayload } = buildMultiplaBet({
      events: [pp, pb],
      accountIdPunta: 'acc-sisal',
      coverAccountIds: { betfair: 'acc-betfair' },
      stake: 100,
      bonus: 0,
      rimborso: 0,
      categoria: 'matched_betting',
    })
    expect(betPayload).toMatchObject({
      source: 'oddsmatcher',
      sport: 'calcio',
      eventoNome: 'MULTIPLA Genoa - Como',
      accountId: 'acc-sisal',
      eventoData: '2026-09-20T18:45:00.000Z',
    })
    expect(legsPayload).toHaveLength(3)
    expect(legsPayload[0]).toMatchObject({
      competizione: 'Multipla',
      mercato: 'Multipla',
      metodo: 'punta',
      stake: 100,
      quota: 4.2,
      rischio: 100,
      posizione: 0,
    })
    expect(legsPayload[1]).toMatchObject({
      eventoNome: 'Genoa - Como',
      metodo: 'banca',
      selezione: 'Over',
      quota: 2.02,
      quotaRiferimento: 2.05,
      commissionePercentuale: 4.5,
      accountId: 'acc-betfair',
      posizione: 1,
    })
    expect(legsPayload[2]).toMatchObject({
      eventoNome: 'Lazio - Roma',
      metodo: 'punta',
      selezione: 'Under',
      quota: 2.2,
      commissionePercentuale: 4.5,
      accountId: 'acc-betfair',
      posizione: 2,
    })
    expect(legsPayload[1].stake).toBeGreaterThan(0)
    expect(legsPayload[2].stake).toBeGreaterThan(0)
  })

  it('maps the old sport ids and keeps the Profit Tracker names', () => {
    expect(multiplaSport('1')).toBe('tennis')
    expect(multiplaSport('2')).toBe('basket')
    expect(multiplaSport('0')).toBe('calcio')
    expect(multiplaSport('basket')).toBe('basket')
  })
})
