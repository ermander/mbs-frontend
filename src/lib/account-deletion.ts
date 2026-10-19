import type { AuthUser } from '@/services/api/auth-client'

/**
 * §14.251: cancellazione dell'account dal profilo (art. 17 GDPR). Il backend vuole la password
 * attuale da chi ne ha una e la parola di conferma da chi accede solo con Google (`hasPassword`
 * false, §14.249); `hasPassword` assente (backend più vecchio) = ha una password.
 */
export const ACCOUNT_DELETE_CONFIRM_WORD = 'ELIMINA'

export type AccountDeletionPayload = { password: string } | { confirm: string }

/** Chi deve ridigitare la password (true) e chi scrive la parola di conferma (false). */
export function deletionUsesPassword(
  user: Pick<AuthUser, 'hasPassword'> | null | undefined,
): boolean {
  return user?.hasPassword !== false
}

/**
 * Il corpo da mandare a DELETE /auth/me, o null finché il form non basta: password vuota per chi
 * ne ha una, parola diversa da ACCOUNT_DELETE_CONFIRM_WORD (spazi ai bordi tolti, maiuscole
 * obbligatorie) per chi non ne ha.
 */
export function accountDeletionPayload(
  user: Pick<AuthUser, 'hasPassword'> | null | undefined,
  input: { password: string; confirm: string },
): AccountDeletionPayload | null {
  if (deletionUsesPassword(user)) {
    return input.password.length > 0 ? { password: input.password } : null
  }
  return input.confirm.trim() === ACCOUNT_DELETE_CONFIRM_WORD
    ? { confirm: ACCOUNT_DELETE_CONFIRM_WORD }
    : null
}
