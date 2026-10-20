import { getResponseStatus } from '@/lib/error-utils'

/**
 * §14.257: gli errori del backend nel recupero e nella reimposta password. Le rotte di auth
 * rispondono in tre forme: `message` dal controller, `errors[]` dalla validazione Joi e, sul
 * limitatore (10 tentativi ogni 15 minuti per indirizzo), `error` in inglese con il 429.
 */

export const TOO_MANY_ATTEMPTS =
  "Troppi tentativi da questa connessione. Riprova tra un quarto d'ora."

function responseData(err: unknown): { message?: unknown; errors?: unknown } | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const data = (err as { response?: { data?: unknown } }).response?.data
  return data && typeof data === 'object'
    ? (data as { message?: unknown; errors?: unknown })
    : undefined
}

/** Il testo da mostrare: il 429 in italiano, poi `message`, poi il primo di `errors`, poi `fallback`. */
export function recoveryErrorMessage(err: unknown, fallback: string): string {
  if (getResponseStatus(err) === 429) return TOO_MANY_ATTEMPTS
  const data = responseData(err)
  if (typeof data?.message === 'string' && data.message) return data.message
  if (Array.isArray(data?.errors) && typeof data.errors[0] === 'string') return data.errors[0]
  return fallback
}

/**
 * Il link di reimposta non vale più (scaduto, già usato o mai esistito): il 400 del controller,
 * con `message` («Link non valido o scaduto»). Il 400 della validazione Joi (`errors[]`) è un
 * altro problema, del corpo mandato, e non dice nulla del link.
 */
export function isDeadResetLink(err: unknown): boolean {
  return getResponseStatus(err) === 400 && !Array.isArray(responseData(err)?.errors)
}
