import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_PRESETS,
  NEW_USER_DEFAULT_SECTIONS,
  USERS_PAGE_SIZE,
  addDaysIso,
  backendErrorMessage,
  expiresOnFor,
  expiryLabel,
  invitePending,
  lastUsersPage,
  romeToday,
  sectionsSummary,
  usersEmptyMessage,
} from './backoffice-users'

describe('sectionsSummary (§14.366)', () => {
  it('names what is missing when little is, what is there when little is', () => {
    const all = ['offers', 'oddsmatcher', 'result_btts', 'calculators', 'tracker', 'guide', 'forum']
    expect(sectionsSummary(all)).toBe('Tutte')
    expect(sectionsSummary(all.filter((s) => s !== 'result_btts'))).toBe(
      'Tutte tranne Risultato + Goal',
    )
    expect(sectionsSummary(['offers', 'oddsmatcher', 'calculators', 'tracker', 'guide'])).toBe(
      'Tutte tranne Risultato + Goal e Forum',
    )
    expect(sectionsSummary(['calculators', 'offers'])).toBe('Solo Offerte e Calcolatori')
    expect(sectionsSummary(['offers', 'tracker', 'forum', 'guide'])).toBe('4 su 7')
  })
  it('nothing, or an older backend without the field: «Nessuna»', () => {
    expect(sectionsSummary([])).toBe('Nessuna')
    expect(sectionsSummary(undefined)).toBe('Nessuna')
  })
  it('ignores keys it does not know', () => {
    expect(sectionsSummary(['boh', 'offers'])).toBe('Solo Offerte')
  })
})

describe('paginazione e ricerca degli utenti (§14.374)', () => {
  it('lastUsersPage: l’ultima pagina con qualcuno, da 0', () => {
    expect(lastUsersPage(0)).toBe(0)
    expect(lastUsersPage(1)).toBe(0)
    expect(lastUsersPage(USERS_PAGE_SIZE)).toBe(0)
    expect(lastUsersPage(USERS_PAGE_SIZE + 1)).toBe(1)
    expect(lastUsersPage(62, 25)).toBe(2)
  })
  it('usersEmptyMessage: la ricerca fra le virgolette, senza ricerca il messaggio di sempre', () => {
    expect(usersEmptyMessage('')).toBe('Nessun utente trovato.')
    expect(usersEmptyMessage('   ')).toBe('Nessun utente trovato.')
    expect(usersEmptyMessage(' marco ')).toBe('Nessun utente corrisponde a «marco».')
  })
})

describe('account dei tester (§14.383)', () => {
  it('le sezioni di partenza sono quelle di un iscritto: tutte tranne Risultato + Goal', () => {
    expect(NEW_USER_DEFAULT_SECTIONS).toEqual([
      'offers',
      'oddsmatcher',
      'calculators',
      'tracker',
      'guide',
      'forum',
    ])
  })
  it('romeToday segue il calendario di Roma, non quello UTC', () => {
    expect(romeToday(new Date('2026-11-23T22:59:00Z'))).toBe('2026-11-23')
    expect(romeToday(new Date('2026-11-23T23:01:00Z'))).toBe('2026-11-24')
    expect(romeToday(new Date('2026-07-10T22:01:00Z'))).toBe('2026-07-11')
  })
  it('expiresOnFor: N giorni da oggi, null senza scadenza', () => {
    const now = new Date('2026-11-23T17:50:00Z')
    expect(expiresOnFor(30, now)).toBe('2026-12-23')
    expect(expiresOnFor(7, now)).toBe('2026-11-30')
    expect(expiresOnFor(null, now)).toBeNull()
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
    expect(EXPIRY_PRESETS.map((p) => p.days)).toContain(DEFAULT_EXPIRY_DAYS)
  })
  it('expiryLabel: niente, la data, scaduto', () => {
    expect(expiryLabel({})).toBe('—')
    expect(expiryLabel({ expires_on: null })).toBe('—')
    expect(expiryLabel({ expires_on: '2026-12-23', is_expired: false })).toBe('23/12/2026')
    expect(expiryLabel({ expires_on: '2026-11-20', is_expired: true })).toBe(
      'Scaduto il 20/11/2026',
    )
  })
  it('invitePending: creato dal Backoffice e senza password', () => {
    expect(invitePending({ invited_at: '2026-11-23T18:00:00Z', has_password: false })).toBe(true)
    expect(invitePending({ invited_at: '2026-11-23T18:00:00Z', has_password: true })).toBe(false)
    expect(invitePending({ invited_at: null, has_password: false })).toBe(false)
    expect(invitePending({})).toBe(false)
  })
  it('backendErrorMessage: message, poi il primo errore di validazione, altrimenti null', () => {
    expect(backendErrorMessage({ response: { data: { message: 'Esiste già' } } })).toBe(
      'Esiste già',
    )
    expect(backendErrorMessage({ response: { data: { errors: ['Email non valida'] } } })).toBe(
      'Email non valida',
    )
    expect(backendErrorMessage(new Error('rete'))).toBeNull()
  })
})
