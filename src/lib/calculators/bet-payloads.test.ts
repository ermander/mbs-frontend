import { describe, expect, it } from 'vitest'
import {
  buildBaccaratBet,
  buildDutchBet,
  buildRouletteBet,
  rouletteMercato,
  buildMultiplaBet,
  buildPuntaBancaBet,
  modalitaSaldoFor,
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

  it('bonus and rimborso travel on the punta leg only; the stake stays the real stake', () => {
    const { legsPayload } = buildPuntaBancaBet({ ...base, bonus: 20, rimborso: 10 })
    expect(legsPayload[0]).toMatchObject({
      tipoBonus: 'rimborso',
      stake: 100,
      bonusValore: 20,
      rimborsoValore: 10,
    })
    expect(legsPayload[1].bonusValore).toBeUndefined()
    expect(legsPayload[1].rimborsoValore).toBeUndefined()
  })

  it('a bonus-only punta is saved with stake 0 and the bonus in bonusValore', () => {
    const { legsPayload } = buildPuntaBancaBet({ ...base, puntata: 0, bonus: 50 })
    expect(legsPayload[0]).toMatchObject({ tipoBonus: 'bonus', stake: 0, bonusValore: 50 })
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
    // The engine's punta leg carries puntata + bonus (120); the payload keeps the real stake.
    expect(legsPayload[0]).toMatchObject({
      selezione: 'X',
      metodo: 'punta',
      tipoBonus: 'bonus',
      bonusValore: 20,
      stake: 100,
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

describe('buildBaccaratBet', () => {
  const base = {
    eventoDataIso: '2026-09-16T20:00:00.000Z',
    categoria: 'matched_betting' as const,
    puntaSide: 'player' as const,
    accountIdPlayer: 'acc-player',
    accountIdBanco: 'acc-banco',
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    stakeCover: 102.56,
    quotaPlayer: 2,
    quotaBanco: 1.95,
  }

  it('Player leg then Banco leg, both back, on the Baccarat event of the Player account', () => {
    const { betPayload, legsPayload } = buildBaccaratBet(base)
    expect(betPayload).toMatchObject({
      sport: 'altro',
      eventoNome: 'Baccarat',
      modalitaSaldo: 'reale',
      accountId: 'acc-player',
      categoria: 'matched_betting',
    })
    expect(betPayload.source).toBeUndefined()
    expect(legsPayload).toHaveLength(2)
    expect(legsPayload[0]).toMatchObject({
      metodo: 'punta',
      selezione: 'Player',
      tipoBonus: 'none',
      accountId: 'acc-player',
      stake: 100,
      quota: 2,
      rischio: 0,
      commissionePercentuale: 0,
      competizione: 'Casinò',
      mercato: 'BACCARAT',
      statoEvento: 'bozza',
      posizione: 0,
    })
    expect(legsPayload[0].bonusValore).toBeUndefined()
    expect(legsPayload[0].rimborsoValore).toBeUndefined()
    expect(legsPayload[1]).toMatchObject({
      metodo: 'punta',
      selezione: 'Banco',
      tipoBonus: 'none',
      accountId: 'acc-banco',
      stake: 102.56,
      quota: 1.95,
      quotaRiferimento: 2,
      commissionePercentuale: 0,
      posizione: 1,
    })
  })

  it('punta on Banco: the Banco leg comes first on the Banco account, Player is the cover', () => {
    const { betPayload, legsPayload } = buildBaccaratBet({
      ...base,
      puntaSide: 'banco',
      stakeCover: 97.5,
    })
    expect(betPayload.accountId).toBe('acc-banco')
    expect(legsPayload[0]).toMatchObject({
      selezione: 'Banco',
      accountId: 'acc-banco',
      stake: 100,
      quota: 1.95,
      posizione: 0,
    })
    expect(legsPayload[1]).toMatchObject({
      selezione: 'Player',
      accountId: 'acc-player',
      stake: 97.5,
      quota: 2,
      quotaRiferimento: 1.95,
      posizione: 1,
    })
  })

  it('bonus: the real stake stays in stake and the bonus in bonusValore (0 stake for a bonus-only play)', () => {
    const { betPayload, legsPayload } = buildBaccaratBet({
      ...base,
      puntata: 0,
      bonus: 100,
      stakeCover: 102.56,
    })
    expect(betPayload.modalitaSaldo).toBe('bonus')
    expect(legsPayload[0]).toMatchObject({ tipoBonus: 'bonus', stake: 0, bonusValore: 100 })
    expect(legsPayload[1].bonusValore).toBeUndefined()
  })

  it('rimborso wins over bonus on the punta leg only', () => {
    const { betPayload, legsPayload } = buildBaccaratBet({
      ...base,
      bonus: 20,
      rimborso: 100,
      stakeCover: 71.79,
    })
    expect(betPayload.modalitaSaldo).toBe('rimborso')
    expect(legsPayload[0]).toMatchObject({
      tipoBonus: 'rimborso',
      stake: 100,
      bonusValore: 20,
      rimborsoValore: 100,
    })
    expect(legsPayload[1]).toMatchObject({ tipoBonus: 'none', stake: 71.79 })
    expect(legsPayload[1].rimborsoValore).toBeUndefined()
  })
})

describe('modalitaSaldoFor', () => {
  it('rimborso, then bonus, then reale', () => {
    expect(modalitaSaldoFor(0, 0)).toBe('reale')
    expect(modalitaSaldoFor(10, 0)).toBe('bonus')
    expect(modalitaSaldoFor(10, 5)).toBe('rimborso')
  })
})

describe('buildRouletteBet', () => {
  const base = {
    eventoDataIso: '2026-09-16T21:00:00.000Z',
    categoria: 'matched_betting' as const,
    mode: 'rosso_nero' as const,
    partage: true,
    puntata: 100,
    bonus: 0,
    rimborso: 0,
    puntaIndex: 0,
    legs: [
      { selezione: 'Rosso', quota: 2, stake: 100, accountId: 'acc-rosso' },
      { selezione: 'Nero', quota: 2, stake: 100, accountId: 'acc-nero' },
      { selezione: '0', quota: 36, stake: 2.78, accountId: 'acc-zero' },
    ],
  }

  it('three back legs on the Roulette event of the punta account, la partage in the market', () => {
    const { betPayload, legsPayload } = buildRouletteBet(base)
    expect(betPayload).toMatchObject({
      sport: 'altro',
      eventoNome: 'Roulette europea',
      modalitaSaldo: 'reale',
      accountId: 'acc-rosso',
    })
    expect(legsPayload).toHaveLength(3)
    expect(legsPayload[0]).toMatchObject({
      selezione: 'Rosso',
      metodo: 'punta',
      tipoBonus: 'none',
      accountId: 'acc-rosso',
      stake: 100,
      quota: 2,
      competizione: 'Casinò',
      mercato: 'ROULETTE ROSSO/NERO (la partage)',
      commissionePercentuale: 0,
      statoEvento: 'bozza',
      posizione: 0,
    })
    expect(legsPayload[1]).toMatchObject({
      selezione: 'Nero',
      tipoBonus: 'none',
      accountId: 'acc-nero',
      stake: 100,
      quota: 2,
      quotaRiferimento: 2,
      posizione: 1,
    })
    expect(legsPayload[2]).toMatchObject({
      selezione: '0',
      accountId: 'acc-zero',
      stake: 2.78,
      quota: 36,
      quotaRiferimento: 2,
      posizione: 2,
    })
  })

  it('punta on Nero: Nero is saved first, Rosso and the zero follow in table order', () => {
    const { betPayload, legsPayload } = buildRouletteBet({ ...base, puntaIndex: 1 })
    expect(betPayload.accountId).toBe('acc-nero')
    expect(legsPayload.map((l) => l.selezione)).toEqual(['Nero', 'Rosso', '0'])
    expect(legsPayload.map((l) => l.posizione)).toEqual([0, 1, 2])
    expect(legsPayload[0]).toMatchObject({ stake: 100, quota: 2, accountId: 'acc-nero' })
    expect(legsPayload[1]).toMatchObject({ stake: 100, quota: 2, quotaRiferimento: 2 })
  })

  it('bonus and rimborso stay on the punta leg; the punta stake is the real stake only', () => {
    const { betPayload, legsPayload } = buildRouletteBet({
      ...base,
      partage: false,
      bonus: 50,
      rimborso: 20,
      legs: [{ ...base.legs[0], stake: 150 }, base.legs[1], base.legs[2]],
    })
    expect(betPayload.modalitaSaldo).toBe('rimborso')
    expect(legsPayload[0]).toMatchObject({
      tipoBonus: 'rimborso',
      stake: 100,
      bonusValore: 50,
      rimborsoValore: 20,
      mercato: 'ROULETTE ROSSO/NERO',
    })
    expect(legsPayload[1].bonusValore).toBeUndefined()
    expect(legsPayload[2].rimborsoValore).toBeUndefined()
  })

  it('dozens: four legs, the zero last, the market never mentions la partage', () => {
    const { legsPayload } = buildRouletteBet({
      ...base,
      mode: 'dozzine',
      partage: true,
      puntaIndex: 2,
      legs: [
        { selezione: '1ª dozzina', quota: 3, stake: 100, accountId: 'acc-1' },
        { selezione: '2ª dozzina', quota: 3, stake: 100, accountId: 'acc-2' },
        { selezione: '3ª dozzina', quota: 3, stake: 100, accountId: 'acc-3' },
        { selezione: '0', quota: 36, stake: 8.33, accountId: 'acc-0' },
      ],
    })
    expect(legsPayload).toHaveLength(4)
    expect(legsPayload.map((l) => l.selezione)).toEqual([
      '3ª dozzina',
      '1ª dozzina',
      '2ª dozzina',
      '0',
    ])
    expect(legsPayload.map((l) => l.posizione)).toEqual([0, 1, 2, 3])
    expect(legsPayload[3]).toMatchObject({ stake: 8.33, quota: 36, quotaRiferimento: 3 })
    expect(legsPayload.every((l) => l.mercato === 'ROULETTE DOZZINE')).toBe(true)
  })

  it('rouletteMercato', () => {
    expect(rouletteMercato('rosso_nero', false)).toBe('ROULETTE ROSSO/NERO')
    expect(rouletteMercato('rosso_nero', true)).toBe('ROULETTE ROSSO/NERO (la partage)')
    expect(rouletteMercato('dozzine', true)).toBe('ROULETTE DOZZINE')
  })
})
