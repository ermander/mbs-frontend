import { describe, expect, it } from 'vitest'

import { TOO_MANY_ATTEMPTS, isDeadResetLink, recoveryErrorMessage } from './password-recovery'

/** Un errore come lo lancia axios: status e corpo della risposta. */
const httpError = (status: number, data: unknown) => ({ response: { status, data } })

describe('recoveryErrorMessage (§14.257)', () => {
  it('traduce il 429 del limitatore, che risponde in inglese', () => {
    const err = httpError(429, {
      error: 'Too many authentication attempts, please try again later.',
    })
    expect(recoveryErrorMessage(err, 'riserva')).toBe(TOO_MANY_ATTEMPTS)
  })

  it('preferisce il message del controller, poi il primo errore della validazione', () => {
    expect(
      recoveryErrorMessage(
        httpError(500, { message: 'Errore durante il recupero password' }),
        'riserva',
      ),
    ).toBe('Errore durante il recupero password')
    expect(
      recoveryErrorMessage(
        httpError(400, { errors: ['"email" must be a valid email'] }),
        'riserva',
      ),
    ).toBe('"email" must be a valid email')
  })

  it('usa la riserva senza risposta (rete giù) o con un corpo vuoto', () => {
    expect(recoveryErrorMessage(new Error('Network Error'), 'riserva')).toBe('riserva')
    expect(recoveryErrorMessage(httpError(502, ''), 'riserva')).toBe('riserva')
  })
})

describe('isDeadResetLink (§14.257)', () => {
  it('riconosce il 400 «Link non valido o scaduto» del controller', () => {
    expect(isDeadResetLink(httpError(400, { message: 'Link non valido o scaduto' }))).toBe(true)
  })

  it('non confonde la validazione, il limitatore, i backend senza la rotta o la rete', () => {
    expect(
      isDeadResetLink(httpError(400, { errors: ['La password deve avere almeno 12 caratteri'] })),
    ).toBe(false)
    expect(isDeadResetLink(httpError(429, { error: 'Too many' }))).toBe(false)
    expect(isDeadResetLink(httpError(404, { message: 'Not found' }))).toBe(false)
    expect(isDeadResetLink(new Error('Network Error'))).toBe(false)
  })
})
