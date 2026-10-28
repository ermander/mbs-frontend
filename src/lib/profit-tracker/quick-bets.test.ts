import { describe, expect, it } from 'vitest'

import { parseMovimento, quickMethodLabel, registeredLabel } from './quick-bets'
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

describe('quickMethodLabel', () => {
  it('usa il nome del catalogo e ripiega sul valore', () => {
    expect(quickMethodLabel('casino_live')).toBe('Casino Live')
    expect(quickMethodLabel('nuovo_gioco')).toBe('nuovo gioco')
  })
})
