import { describe, expect, it } from 'vitest'

import {
  EMPTY_QUICK_FILTERS,
  NO_TAG,
  filterQuickBets,
  parseMovimento,
  quickMethodLabel,
  registeredLabel,
} from './quick-bets'
import type { QuickBet } from '@/types/profit-tracker'

const qb = (o: Partial<QuickBet>): QuickBet => ({
  id: 'q',
  dataRegistrazione: '2026-10-27T00:00:00',
  accountId: 'a1',
  quickMethod: 'casino_live',
  movimento: 10,
  createdAt: '2026-10-27T22:10:00',
  ...o,
})

const names: Record<string, string> = { a1: 'Sisal · Marco Rinaldi', a2: 'Snai · Giulia Ferri' }
const label = (id: string) => names[id] ?? ''

describe('parseMovimento', () => {
  it('legge i numeri all’italiana col segno', () => {
    expect(parseMovimento('25')).toBe(25)
    expect(parseMovimento('−15')).toBe(-15)
    expect(parseMovimento('-8,34')).toBe(-8.34)
    expect(parseMovimento('+427,05')).toBe(427.05)
    expect(parseMovimento('1.250,50')).toBe(1250.5)
    expect(parseMovimento('8.34')).toBe(8.34)
    expect(parseMovimento(' 12 ')).toBe(12)
  })
  it('rifiuta il vuoto e il testo', () => {
    expect(parseMovimento('')).toBeNull()
    expect(parseMovimento('-')).toBeNull()
    expect(parseMovimento('abc')).toBeNull()
    expect(parseMovimento('1,2,3')).toBeNull()
  })
})

describe('registeredLabel', () => {
  it('mostra l’ora di inserimento quando è lo stesso giorno', () => {
    expect(registeredLabel(qb({}))).toEqual({ date: '27/10/2026', caption: 'alle 22:10' })
  })
  it('dice quando la giocata è stata inserita un altro giorno', () => {
    expect(registeredLabel(qb({ createdAt: '2026-10-29T09:05:00' }))).toEqual({
      date: '27/10/2026',
      caption: 'inserita il 29/10 alle 09:05',
    })
  })
  it('senza createdAt resta solo la data', () => {
    expect(registeredLabel(qb({ createdAt: undefined })).caption).toBe('')
  })
})

describe('filterQuickBets', () => {
  const rows = [
    qb({ id: '1', movimento: 400, quickMethod: 'quick_games' }),
    qb({
      id: '2',
      accountId: 'a2',
      movimento: -500,
      tag: 'Ricorrente Snai',
      nota: 'Cashback del lunedì',
      createdAt: '2026-10-27T21:40:00',
    }),
    qb({
      id: '3',
      dataRegistrazione: '2026-10-25T00:00:00',
      movimento: 54.15,
      createdAt: '2026-10-25T20:00:00',
    }),
    qb({
      id: '4',
      dataRegistrazione: '2026-10-25T00:00:00',
      movimento: 400,
      createdAt: '2026-10-25T19:00:00',
    }),
  ]
  const ids = (list: QuickBet[]) => list.map((b) => b.id)

  it('per data mette prima il più recente, giorno e poi ora di inserimento', () => {
    expect(ids(filterQuickBets(rows, '', EMPTY_QUICK_FILTERS, 'data', label))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
  })
  it('per movimento ordina l’importo e a pari importo il più recente', () => {
    expect(ids(filterQuickBets(rows, '', EMPTY_QUICK_FILTERS, 'alto', label))).toEqual([
      '1',
      '4',
      '3',
      '2',
    ])
    expect(ids(filterQuickBets(rows, '', EMPTY_QUICK_FILTERS, 'basso', label))).toEqual([
      '2',
      '3',
      '1',
      '4',
    ])
  })
  it('cerca tutte le parole su conto, metodo, nota e tag', () => {
    expect(
      ids(filterQuickBets(rows, 'giulia cashback', EMPTY_QUICK_FILTERS, 'data', label)),
    ).toEqual(['2'])
    expect(ids(filterQuickBets(rows, 'quick', EMPTY_QUICK_FILTERS, 'data', label))).toEqual(['1'])
    expect(ids(filterQuickBets(rows, 'ricorrente', EMPTY_QUICK_FILTERS, 'data', label))).toEqual([
      '2',
    ])
  })
  it('filtra conto, metodo, tag (anche «nessun tag») e giorni compresi', () => {
    const f = (o: Partial<typeof EMPTY_QUICK_FILTERS>) =>
      ids(filterQuickBets(rows, '', { ...EMPTY_QUICK_FILTERS, ...o }, 'data', label))
    expect(f({ accountId: 'a2' })).toEqual(['2'])
    expect(f({ metodo: 'quick_games' })).toEqual(['1'])
    expect(f({ tag: 'Ricorrente Snai' })).toEqual(['2'])
    expect(f({ tag: NO_TAG })).toEqual(['1', '3', '4'])
    expect(f({ dal: '2026-10-26' })).toEqual(['1', '2'])
    expect(f({ al: '2026-10-25' })).toEqual(['3', '4'])
    expect(f({ dal: '2026-10-25', al: '2026-10-25' })).toEqual(['3', '4'])
  })
  it('non tocca l’elenco di partenza', () => {
    const copy = ids(rows)
    filterQuickBets(rows, '', EMPTY_QUICK_FILTERS, 'basso', label)
    expect(ids(rows)).toEqual(copy)
  })
})

describe('quickMethodLabel', () => {
  it('usa il nome del catalogo e ripiega sul valore', () => {
    expect(quickMethodLabel('casino_live')).toBe('Casino Live')
    expect(quickMethodLabel('nuovo_gioco')).toBe('nuovo gioco')
  })
})
