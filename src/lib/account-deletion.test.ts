import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_DELETE_CONFIRM_WORD,
  accountDeletionPayload,
  deletionUsesPassword,
} from './account-deletion'

describe('deletionUsesPassword', () => {
  it('a password user, or an older backend without hasPassword, types the password', () => {
    expect(deletionUsesPassword({ hasPassword: true })).toBe(true)
    expect(deletionUsesPassword({})).toBe(true)
    expect(deletionUsesPassword(null)).toBe(true)
    expect(deletionUsesPassword(undefined)).toBe(true)
  })
  it('a Google-only account types the confirmation word', () => {
    expect(deletionUsesPassword({ hasPassword: false })).toBe(false)
  })
})

describe('accountDeletionPayload', () => {
  it('password user: the password alone, null while it is empty, the word is ignored', () => {
    const user = { hasPassword: true }
    expect(
      accountDeletionPayload(user, { password: '', confirm: ACCOUNT_DELETE_CONFIRM_WORD }),
    ).toBeNull()
    expect(accountDeletionPayload(user, { password: 'Segreta1!', confirm: '' })).toEqual({
      password: 'Segreta1!',
    })
    expect(accountDeletionPayload(user, { password: 'Segreta1!', confirm: 'x' })).toEqual({
      password: 'Segreta1!',
    })
  })
  it('Google-only user: the exact word, trimmed, uppercase; the password is ignored', () => {
    const user = { hasPassword: false }
    expect(accountDeletionPayload(user, { password: 'Segreta1!', confirm: '' })).toBeNull()
    expect(accountDeletionPayload(user, { password: '', confirm: 'elimina' })).toBeNull()
    expect(accountDeletionPayload(user, { password: '', confirm: 'ELIMIN' })).toBeNull()
    expect(
      accountDeletionPayload(user, { password: '', confirm: ` ${ACCOUNT_DELETE_CONFIRM_WORD} ` }),
    ).toEqual({
      confirm: ACCOUNT_DELETE_CONFIRM_WORD,
    })
  })
})
