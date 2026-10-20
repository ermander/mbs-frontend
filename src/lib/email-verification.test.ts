import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClient } from '@/services/api/auth-client'

import { verifyEmailOnce, verifyFailureOf } from './email-verification'

/** Un errore come lo lancia axios: status e corpo della risposta. */
const httpError = (status: number, data: unknown) => ({ response: { status, data } })

describe('verifyFailureOf (§14.258)', () => {
  it("link scaduto: il 400 del controller con l'email dell'account", () => {
    expect(
      verifyFailureOf(
        httpError(400, { status: 400, message: 'Link non valido o scaduto', email: 'a@b.it' }),
      ),
    ).toEqual({ kind: 'expired', email: 'a@b.it' })
  })

  it('link già usato, sostituito o inesistente: il 400 senza email', () => {
    expect(
      verifyFailureOf(httpError(400, { status: 400, message: 'Link non valido o scaduto' })),
    ).toEqual({ kind: 'dead' })
    expect(verifyFailureOf(httpError(400, { message: 'x', email: '' }))).toEqual({ kind: 'dead' })
  })

  it('rete, 500, 429 e validazione non dicono nulla del link: si riprova', () => {
    expect(verifyFailureOf(new Error('Network Error'))).toEqual({ kind: 'error' })
    expect(verifyFailureOf(httpError(500, { message: 'Errore' }))).toEqual({ kind: 'error' })
    expect(verifyFailureOf(httpError(429, { error: 'Too many' }))).toEqual({ kind: 'error' })
    expect(verifyFailureOf(httpError(400, { errors: ['"token" is required'] }))).toEqual({
      kind: 'error',
    })
  })
})

describe('verifyEmailOnce (§14.258)', () => {
  const user = {
    id: 'u1',
    email: 'a@b.it',
    name: '',
    username: 'a',
    role: 'USER_ROLE' as const,
    settings: {},
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('due richieste per lo stesso link fanno una sola POST, che consuma il token una volta', async () => {
    const verify = vi.spyOn(authClient, 'verifyEmail').mockResolvedValue({ user })
    const [a, b] = await Promise.all([verifyEmailOnce('tok-1'), verifyEmailOnce('tok-1')])
    expect(a.user.email).toBe('a@b.it')
    expect(b).toBe(a)
    expect(verify).toHaveBeenCalledTimes(1)
    await verifyEmailOnce('tok-2')
    expect(verify).toHaveBeenCalledTimes(2)
  })

  it('dopo un fallimento la richiesta successiva riparte davvero (Riprova)', async () => {
    const verify = vi
      .spyOn(authClient, 'verifyEmail')
      .mockRejectedValueOnce(httpError(500, { message: 'Errore' }))
      .mockResolvedValueOnce({ user })
    await expect(verifyEmailOnce('tok-3')).rejects.toBeTruthy()
    await expect(verifyEmailOnce('tok-3')).resolves.toEqual({ user })
    expect(verify).toHaveBeenCalledTimes(2)
  })
})
