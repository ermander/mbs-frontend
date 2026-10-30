import { describe, expect, it } from 'vitest'
import {
  LOGIN_PATH,
  NEXT_STORAGE_KEY,
  POST_AUTH_REDIRECT,
  isSameOriginPath,
  loginHref,
  postAuthDestination,
  rememberPostAuthDestination,
  takePostAuthDestination,
} from './auth-redirects'

/** Tutto ciò che un ?next= ostile potrebbe portare: nessuno di questi deve uscire dal sito. */
const OUTSIDE = [
  'https://evil.example',
  'http://evil.example/offerte',
  'HTTPS://evil.example',
  '//evil.example',
  '//evil.example/offerte/snai-30',
  '/\\evil.example',
  '\\\\evil.example',
  'javascript:alert(1)',
  'data:text/html,hi',
  'evil.example',
  'offerte/snai-30',
  '',
  ' /offerte',
  '/offerte\n',
  '/offerte\r\nSet-Cookie: a=b',
  '/offerte\u0000',
]

describe('isSameOriginPath', () => {
  it('true only for a path with a single leading slash and no control characters', () => {
    expect(isSameOriginPath('/')).toBe(true)
    expect(isSameOriginPath('/offerte/snai-30')).toBe(true)
    expect(isSameOriginPath('/offerte?book=snai&page=2#termini')).toBe(true)
    expect(isSameOriginPath('/%2F%2Fevil.example')).toBe(true)
    for (const value of OUTSIDE) expect(isSameOriginPath(value), value).toBe(false)
    expect(isSameOriginPath(null)).toBe(false)
    expect(isSameOriginPath(undefined)).toBe(false)
    expect(isSameOriginPath(42)).toBe(false)
    expect(isSameOriginPath(['/offerte'])).toBe(false)
  })
})

describe('postAuthDestination', () => {
  it('keeps a relative path of this origin, query included', () => {
    expect(postAuthDestination('/offerte/snai-30')).toBe('/offerte/snai-30')
    expect(postAuthDestination('/offerte?book=snai&page=2')).toBe('/offerte?book=snai&page=2')
    expect(postAuthDestination('/')).toBe('/')
    expect(postAuthDestination(POST_AUTH_REDIRECT)).toBe(POST_AUTH_REDIRECT)
  })
  it('falls back to the dashboard for anything that could leave the origin, or nothing', () => {
    for (const value of OUTSIDE) expect(postAuthDestination(value), value).toBe(POST_AUTH_REDIRECT)
    expect(postAuthDestination(null)).toBe(POST_AUTH_REDIRECT)
    expect(postAuthDestination(undefined)).toBe(POST_AUTH_REDIRECT)
  })
  it('never sends back to /login itself', () => {
    expect(postAuthDestination('/login')).toBe(POST_AUTH_REDIRECT)
    expect(postAuthDestination('/login/')).toBe(POST_AUTH_REDIRECT)
    expect(postAuthDestination('/login?next=/offerte')).toBe(POST_AUTH_REDIRECT)
    expect(postAuthDestination('/login#form')).toBe(POST_AUTH_REDIRECT)
    // Un percorso che comincia come /login ma non lo è resta valido.
    expect(postAuthDestination('/login-help')).toBe('/login-help')
    expect(postAuthDestination('/logins')).toBe('/logins')
  })
})

describe('loginHref', () => {
  it('remembers the page in ?next= with readable slashes', () => {
    expect(loginHref('/offerte/snai-30')).toBe('/login?next=/offerte/snai-30')
    expect(loginHref('/')).toBe('/login?next=/')
  })
  it('encodes the query of the remembered page so it does not mix with the login query', () => {
    expect(loginHref('/offerte?book=snai&page=2')).toBe(
      '/login?next=/offerte%3Fbook%3Dsnai%26page%3D2',
    )
  })
  it('round-trips through URLSearchParams, hash included', () => {
    for (const from of ['/offerte/snai-30', '/offerte?book=snai&page=2#termini', '/a b/c%20d']) {
      const next = new URL(loginHref(from), 'http://localhost').searchParams.get('next')
      expect(postAuthDestination(next)).toBe(from)
    }
  })
  it('plain /login when there is nothing worth remembering', () => {
    expect(loginHref(null)).toBe(LOGIN_PATH)
    expect(loginHref(undefined)).toBe(LOGIN_PATH)
    expect(loginHref('')).toBe(LOGIN_PATH)
    expect(loginHref(POST_AUTH_REDIRECT)).toBe(LOGIN_PATH)
    expect(loginHref('https://evil.example')).toBe(LOGIN_PATH)
    expect(loginHref('//evil.example')).toBe(LOGIN_PATH)
    expect(loginHref('/login?next=/offerte')).toBe(LOGIN_PATH)
  })
})

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

describe('remember/takePostAuthDestination (handoff around the Google round trip)', () => {
  it('stores a destination worth remembering and hands it back once', () => {
    const storage = fakeStorage()
    rememberPostAuthDestination(storage, '/offerte/snai-30')
    expect(storage.map.get(NEXT_STORAGE_KEY)).toBe('/offerte/snai-30')
    expect(takePostAuthDestination(storage)).toBe('/offerte/snai-30')
    expect(storage.map.has(NEXT_STORAGE_KEY)).toBe(false)
    expect(takePostAuthDestination(storage)).toBe(POST_AUTH_REDIRECT)
  })
  it('clears a leftover instead of storing the default destination', () => {
    const storage = fakeStorage({ [NEXT_STORAGE_KEY]: '/offerte/vecchia' })
    rememberPostAuthDestination(storage, POST_AUTH_REDIRECT)
    expect(storage.map.has(NEXT_STORAGE_KEY)).toBe(false)
    rememberPostAuthDestination(storage, 'https://evil.example')
    expect(storage.map.has(NEXT_STORAGE_KEY)).toBe(false)
    rememberPostAuthDestination(storage, null)
    expect(storage.map.has(NEXT_STORAGE_KEY)).toBe(false)
  })
  it('validates what it reads back: a tampered value never leaves the origin', () => {
    for (const value of OUTSIDE) {
      const storage = fakeStorage({ [NEXT_STORAGE_KEY]: value })
      expect(takePostAuthDestination(storage), value).toBe(POST_AUTH_REDIRECT)
      expect(storage.map.has(NEXT_STORAGE_KEY)).toBe(false)
    }
  })
  it('a missing or throwing storage never blocks the login', () => {
    expect(() => rememberPostAuthDestination(null, '/offerte')).not.toThrow()
    expect(() => rememberPostAuthDestination(undefined, '/offerte')).not.toThrow()
    expect(() => rememberPostAuthDestination(throwingStorage, '/offerte')).not.toThrow()
    expect(takePostAuthDestination(null)).toBe(POST_AUTH_REDIRECT)
    expect(takePostAuthDestination(undefined)).toBe(POST_AUTH_REDIRECT)
    expect(takePostAuthDestination(throwingStorage)).toBe(POST_AUTH_REDIRECT)
  })
})
