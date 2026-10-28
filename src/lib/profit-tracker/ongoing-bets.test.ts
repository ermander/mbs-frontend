import { describe, expect, it } from 'vitest'

import {
  EMPTY_ONGOING_FILTERS,
  NO_TAG,
  betCaption,
  bookLogoSlug,
  displayName,
  eventWhen,
  filterOngoingBets,
  legSummary,
  multiplaEvents,
} from './ongoing-bets'
import type { BetLeg, OngoingBet } from '@/types/profit-tracker'

const bet = (o: Partial<OngoingBet>): OngoingBet => ({
  id: '1',
  eventoData: '2026-10-28T19:45:00',
  sport: 'calcio',
  eventoNome: 'Inter - Arsenal',
  modalitaSaldo: 'reale',
  accountId: 'a1',
  statoEvento: 'in_corso',
  createdAt: '2026-10-26T21:12:00',
  ...o,
})

const leg = (o: Partial<BetLeg>): BetLeg => ({
  id: 'l',
  betId: '1',
  eventoData: '2026-10-28T19:45:00',
  sport: 'calcio',
  eventoNome: 'Inter - Arsenal',
  competizione: 'Champions League',
  mercato: '1X2',
  metodo: 'punta',
  tipoBonus: 'none',
  accountId: 'a1',
  stake: 10,
  quota: 2,
  rischio: 10,
  movimento: 0,
  statoEvento: 'bozza',
  ...o,
})

describe('eventWhen', () => {
  const now = new Date(2026, 9, 27, 19, 10)
  it('dice iniziata, oggi, domani o il giorno della settimana', () => {
    expect(eventWhen(new Date(2026, 9, 27, 18, 30).toISOString(), now)).toEqual({
      text: 'Iniziata alle 18:30',
      started: true,
    })
    expect(eventWhen(new Date(2026, 9, 25, 15, 0).toISOString(), now).text).toBe(
      'Iniziata il 25/10',
    )
    expect(eventWhen(new Date(2026, 9, 27, 23, 0).toISOString(), now).text).toBe('Oggi alle 23:00')
    expect(eventWhen(new Date(2026, 9, 28, 20, 45).toISOString(), now).text).toBe(
      'Domani alle 20:45',
    )
    expect(eventWhen(new Date(2026, 9, 29, 18, 0).toISOString(), now).text).toBe('gio 29/10 18:00')
  })
})

describe('legSummary', () => {
  it('prende la gamba di posizione più bassa e gli eventi senza doppioni', () => {
    const s = legSummary([
      leg({ eventoNome: 'Torino - Genoa', posizione: 2, quota: 3 }),
      leg({
        eventoNome: 'MULTIPLA Milan - Lazio',
        competizione: 'Multipla',
        posizione: 0,
        quota: 7.84,
      }),
      leg({ eventoNome: 'Milan - Lazio', posizione: 1 }),
      leg({ eventoNome: 'Milan - Lazio', posizione: 3 }),
    ])
    expect(s.competizione).toBe('Multipla')
    expect(s.quota).toBe(7.84)
    expect(s.eventi).toEqual(['MULTIPLA Milan - Lazio', 'Milan - Lazio', 'Torino - Genoa'])
  })
  it('senza gambe restituisce campi vuoti', () => {
    expect(legSummary([])).toEqual({
      competizione: null,
      mercato: null,
      selezione: null,
      quota: null,
      eventi: [],
    })
  })
})

describe('nome, eventi e didascalia', () => {
  const multi = bet({
    eventoNome: 'MULTIPLA Milan - Lazio',
    riepilogoGambe: {
      competizione: 'Multipla',
      mercato: 'Multipla',
      selezione: null,
      quota: 7.84,
      eventi: [
        'MULTIPLA Milan - Lazio',
        'Milan - Lazio',
        'Atalanta - Fiorentina',
        'Torino - Genoa',
      ],
    },
  })
  it('toglie «MULTIPLA» dal nome e dagli eventi', () => {
    expect(displayName(multi)).toBe('Milan - Lazio')
    expect(multiplaEvents(multi)).toEqual([
      'Milan - Lazio',
      'Atalanta - Fiorentina',
      'Torino - Genoa',
    ])
  })
  it('multipla senza riepilogo: un evento, il suo nome', () => {
    expect(multiplaEvents(bet({ eventoNome: 'MULTIPLA Roma - Bologna' }))).toEqual([
      'Roma - Bologna',
    ])
  })
  it('didascalia della multipla e della singola', () => {
    expect(betCaption(multi)).toBe('Calcio · 3 eventi · quota 7,84')
    expect(
      betCaption(
        bet({
          riepilogoGambe: {
            competizione: 'Champions League',
            mercato: '1X2',
            selezione: '1',
            quota: 2.15,
            eventi: ['Inter - Arsenal'],
          },
        }),
      ),
    ).toBe('Calcio · Champions League · 1X2 1 · quota 2,15')
  })
  it('la competizione «N/D» della giocata a mano non compare', () => {
    expect(
      betCaption(
        bet({
          sport: 'tennis',
          riepilogoGambe: {
            competizione: 'N/D',
            mercato: 'Vincente',
            selezione: null,
            quota: 1.72,
            eventi: [],
          },
        }),
      ),
    ).toBe('Tennis · Vincente · quota 1,72')
  })
  it('senza riepilogo resta lo sport', () => {
    expect(betCaption(bet({ sport: 'basket' }))).toBe('Basket')
  })
})

describe('bookLogoSlug', () => {
  it('usa externalId, poi il nome; vuoto se non c’è un logo', () => {
    expect(bookLogoSlug({ nome: 'Il mio book', externalId: 'snai' })).toBe('snai')
    expect(bookLogoSlug({ nome: 'Bet365' })).toBe('bet365')
    expect(bookLogoSlug({ nome: 'Book inventato' })).toBe('')
  })
})

describe('filterOngoingBets', () => {
  const bets = [
    bet({
      id: 'a',
      eventoData: '2026-10-29T18:00:00',
      createdAt: '2026-10-26T12:00:00',
      sport: 'tennis',
      tag: 'Benvenuto',
    }),
    bet({
      id: 'b',
      eventoData: '2026-10-27T23:00:00',
      createdAt: '2026-10-27T18:51:00',
      accountId: 'a2',
    }),
    bet({
      id: 'c',
      eventoData: '2026-11-01T15:00:00',
      createdAt: '2026-10-24T19:20:00',
      eventoNome: 'MULTIPLA Milan - Lazio',
    }),
    bet({ id: 'z', archiviata: true }),
  ]
  const label = (id: string) => (id === 'a2' ? 'Snai · Marco' : 'Bet365 · Fatima')
  const ids = (list: OngoingBet[]) => list.map((b) => b.id)

  it('toglie le archiviate e ordina per evento o per creazione', () => {
    expect(ids(filterOngoingBets(bets, '', EMPTY_ONGOING_FILTERS, 'evento', label))).toEqual([
      'b',
      'a',
      'c',
    ])
    const byCreated = bets.map((b) =>
      b.id === 'c' ? { ...b, createdAt: '2026-10-28T09:00:00' } : b,
    )
    expect(
      ids(filterOngoingBets(byCreated, '', EMPTY_ONGOING_FILTERS, 'creazione', label)),
    ).toEqual(['c', 'b', 'a'])
  })
  it('cerca nel nome e nel conto', () => {
    expect(ids(filterOngoingBets(bets, 'marco', EMPTY_ONGOING_FILTERS, 'evento', label))).toEqual([
      'b',
    ])
    expect(ids(filterOngoingBets(bets, 'lazio', EMPTY_ONGOING_FILTERS, 'evento', label))).toEqual([
      'c',
    ])
  })
  it('filtra per sport, tipo, tag (anche «Nessun tag») e giorni', () => {
    const f = EMPTY_ONGOING_FILTERS
    expect(ids(filterOngoingBets(bets, '', { ...f, sport: 'tennis' }, 'evento', label))).toEqual([
      'a',
    ])
    expect(ids(filterOngoingBets(bets, '', { ...f, tipo: 'multipla' }, 'evento', label))).toEqual([
      'c',
    ])
    expect(ids(filterOngoingBets(bets, '', { ...f, tag: 'Benvenuto' }, 'evento', label))).toEqual([
      'a',
    ])
    expect(ids(filterOngoingBets(bets, '', { ...f, tag: NO_TAG }, 'evento', label))).toEqual([
      'b',
      'c',
    ])
    expect(
      ids(
        filterOngoingBets(bets, '', { ...f, dal: '2026-10-28', al: '2026-10-31' }, 'evento', label),
      ),
    ).toEqual(['a'])
  })
})
