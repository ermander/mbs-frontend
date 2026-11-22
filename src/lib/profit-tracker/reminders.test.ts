import { describe, expect, it } from 'vitest'

import {
  emptyRemindersTitle,
  reminderAccountLabel,
  reminderInputValue,
  toDateTimeLocal,
} from './reminders'

describe('toDateTimeLocal', () => {
  it('scrive anno, mese, giorno, ore e minuti locali', () => {
    expect(toDateTimeLocal(new Date(2026, 10, 23, 9, 5))).toBe('2026-11-23T09:05')
    expect(toDateTimeLocal(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01T00:00')
  })
  it('una data non valida lascia il campo vuoto', () => {
    expect(toDateTimeLocal(new Date('x'))).toBe('')
  })
})

describe('reminderInputValue', () => {
  it('riletto come ora locale torna lo stesso istante (niente ora persa a ogni modifica)', () => {
    const iso = '2026-11-23T10:00:00.000Z'
    const value = reminderInputValue(iso)
    expect(new Date(value).toISOString()).toBe(iso)
  })
  it('vale anche d’estate', () => {
    const iso = '2026-07-15T16:30:00.000Z'
    expect(new Date(reminderInputValue(iso)).toISOString()).toBe(iso)
  })
})

describe('reminderAccountLabel', () => {
  const accounts = [{ id: 'a1', nome: 'Sisal Emanuele' }]
  it('mostra il nome del conto, non il suo id', () => {
    expect(reminderAccountLabel({ accountId: 'a1' }, accounts)).toBe('Sisal Emanuele')
  })
  it('senza conto non mostra nulla', () => {
    expect(reminderAccountLabel({}, accounts)).toBeNull()
  })
  it('mentre l’elenco dei conti arriva mostra un segnaposto', () => {
    expect(reminderAccountLabel({ accountId: 'a1' }, null)).toBe('…')
  })
  it('un conto che non è più nell’elenco lo dice', () => {
    expect(reminderAccountLabel({ accountId: 'zz' }, accounts)).toBe('Conto non trovato')
  })
})

describe('emptyRemindersTitle', () => {
  it('nomina lo stato filtrato', () => {
    expect(emptyRemindersTitle('attivo')).toBe('Nessun promemoria attivo')
    expect(emptyRemindersTitle('tutti')).toBe('Nessun promemoria')
  })
})
