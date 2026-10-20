import { authClient, type AuthResponse } from '@/services/api/auth-client'
import { isDeadResetLink } from '@/lib/password-recovery'

/**
 * §14.258: perché un link di attivazione non ha risposto 200.
 * - `expired`: il 400 del controller con l'email dell'account: link scaduto, account da attivare,
 *   si può chiedere un link nuovo con lo stesso token;
 * - `dead`: il 400 senza email: già usato, sostituito da un link più recente o mai esistito;
 * - `error`: rete, 500, 429 o la validazione: il link può essere ancora buono, si riprova.
 */
export type VerifyFailure =
  | { kind: 'expired'; email: string }
  | { kind: 'dead' }
  | { kind: 'error' }

export function verifyFailureOf(err: unknown): VerifyFailure {
  // Il 400 del controller ha la stessa forma di quello della reimposta password (§14.257).
  if (!isDeadResetLink(err)) return { kind: 'error' }
  const data = (err as { response?: { data?: { email?: unknown } } }).response?.data
  return typeof data?.email === 'string' && data.email
    ? { kind: 'expired', email: data.email }
    : { kind: 'dead' }
}

/**
 * La convalida consuma il token: una seconda POST con lo stesso link risponde 400. La stessa
 * pagina può chiederla due volte (gli effetti doppi dello Strict Mode, un rimontaggio), quindi
 * le richieste per lo stesso token si condividono. Un fallimento si dimentica, così «Riprova»
 * parte davvero; un successo resta, e la pagina riaperta nella stessa sessione lo rimostra.
 */
const verifications = new Map<string, Promise<AuthResponse>>()

export function verifyEmailOnce(token: string): Promise<AuthResponse> {
  let pending = verifications.get(token)
  if (!pending) {
    pending = authClient.verifyEmail(token)
    verifications.set(token, pending)
    pending.catch(() => verifications.delete(token))
  }
  return pending
}
