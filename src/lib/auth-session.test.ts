import { describe, expect, it } from 'vitest'
import {
  BOOTSTRAP_RETRY_MAX_MS,
  bootstrapRetryDelayMs,
  isUnauthenticatedError,
} from './auth-session'

describe('isUnauthenticatedError', () => {
  it('true only for a backend 401', () => {
    expect(isUnauthenticatedError({ response: { status: 401 } })).toBe(true)
  })
  it('false for a network error, a 502 from the rewrite during a deploy, a 5xx, or junk', () => {
    expect(isUnauthenticatedError({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(false)
    expect(isUnauthenticatedError({ response: { status: 502 } })).toBe(false)
    expect(isUnauthenticatedError({ response: { status: 503 } })).toBe(false)
    expect(isUnauthenticatedError({ response: { status: 500 } })).toBe(false)
    expect(isUnauthenticatedError({ response: { status: 403 } })).toBe(false)
    expect(isUnauthenticatedError({ response: {} })).toBe(false)
    expect(isUnauthenticatedError(new Error('boom'))).toBe(false)
    expect(isUnauthenticatedError(null)).toBe(false)
    expect(isUnauthenticatedError(undefined)).toBe(false)
    expect(isUnauthenticatedError('401')).toBe(false)
  })
})

describe('bootstrapRetryDelayMs', () => {
  it('doubles from 2 s and caps at 30 s', () => {
    expect(bootstrapRetryDelayMs(1)).toBe(2000)
    expect(bootstrapRetryDelayMs(2)).toBe(4000)
    expect(bootstrapRetryDelayMs(3)).toBe(8000)
    expect(bootstrapRetryDelayMs(4)).toBe(16000)
    expect(bootstrapRetryDelayMs(5)).toBe(BOOTSTRAP_RETRY_MAX_MS)
    expect(bootstrapRetryDelayMs(50)).toBe(BOOTSTRAP_RETRY_MAX_MS)
  })
  it('no wait for a nonsensical attempt', () => {
    expect(bootstrapRetryDelayMs(0)).toBe(0)
    expect(bootstrapRetryDelayMs(-3)).toBe(0)
    expect(bootstrapRetryDelayMs(Number.NaN)).toBe(0)
  })
})
