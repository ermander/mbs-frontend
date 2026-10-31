/**
 * Destinazione condivisa per tutti i flussi post-autenticazione:
 * - login OK
 * - reset password OK (quando il backend ritorna l'utente)
 * - verifica email OK
 * - GuestGuard (utente già loggato che visita /login o /registrazione)
 */
export const POST_AUTH_REDIRECT = '/profit-tracker/dashboard'

/** La pagina del login, dove DashboardAuthGuard manda chi non è entrato. */
export const LOGIN_PATH = '/login'

/**
 * §14.326: il parametro con cui /login ricorda la pagina da cui la guard ha mandato via
 * l'utente (`/login?next=/offerte/snai-30`), per riportarcelo dopo l'accesso.
 */
export const NEXT_PARAM = 'next'

/**
 * La chiave di sessionStorage con cui «Continua con Google» mette da parte la stessa
 * destinazione: il giro passa dal backend e da Google e torna su /accesso-google senza
 * parametri nostri (lo `state` lo genera e lo controlla il backend), ma resta nella stessa
 * scheda, dove sessionStorage sopravvive.
 */
export const NEXT_STORAGE_KEY = 'mbs-auth-next'

/**
 * True per un percorso che il browser risolve su questa origine: una sola `/` iniziale (né
 * `//host` né `/\host`, che i browser leggono come un altro host; uno schema come `https:` o
 * `javascript:` non comincia con `/`), senza caratteri di controllo.
 */
export function isSameOriginPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value[0] !== '/') return false
  if (value[1] === '/' || value[1] === '\\') return false
  if (/[\u0000-\u001f\u007f]/.test(value)) return false
  return true
}

/** /login stesso (con o senza query, hash o barra finale): tornarci dopo il login è un giro a vuoto. */
function isLoginPath(path: string): boolean {
  return /^\/login\/?(?:[?#]|$)/.test(path)
}

/**
 * Dove andare dopo il login: `next` (già decodificato, come lo rende `searchParams.get`) se è un
 * percorso relativo di questa origine e non è /login, altrimenti POST_AUTH_REDIRECT. Un valore
 * assoluto (`https://evil.example`), protocol-relative (`//evil.example`) o con uno schema non
 * porta mai fuori dal sito.
 */
export function postAuthDestination(next: string | null | undefined): string {
  if (!isSameOriginPath(next) || isLoginPath(next)) return POST_AUTH_REDIRECT
  return next
}

/**
 * encodeURIComponent con le `/` lasciate leggibili (`/login?next=/offerte/snai-30`): `?`, `&`,
 * `=` e `#` del percorso restano codificati, così la query del login non si confonde con quella
 * della pagina ricordata.
 */
function encodeNextParam(path: string): string {
  return encodeURIComponent(path).replace(/%2F/gi, '/')
}

/**
 * Il link a /login che ricorda `from` (pathname + search della pagina corrente) in `?next=`.
 * Solo `/login` quando `from` non è un percorso valido o è già la destinazione di default: la
 * dashboard non ha bisogno di essere ricordata.
 */
export function loginHref(from: string | null | undefined): string {
  const destination = postAuthDestination(from)
  if (destination === POST_AUTH_REDIRECT) return LOGIN_PATH
  return `${LOGIN_PATH}?${NEXT_PARAM}=${encodeNextParam(destination)}`
}

/** Il pezzo di Storage che serve qui, così i test passano una mappa e il browser sessionStorage. */
export type NextStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * Prima di partire per Google: salva `destination` se non è quella di default, altrimenti
 * cancella un eventuale residuo di un giro precedente. Uno storage assente o che lancia
 * (modalità privata, quota) non ferma l'accesso: si andrà alla dashboard.
 */
export function rememberPostAuthDestination(
  storage: NextStorage | null | undefined,
  destination: string | null | undefined,
): void {
  if (!storage) return
  try {
    const safe = postAuthDestination(destination)
    if (safe === POST_AUTH_REDIRECT) storage.removeItem(NEXT_STORAGE_KEY)
    else storage.setItem(NEXT_STORAGE_KEY, safe)
  } catch {
    // niente storage: la dashboard
  }
}

/**
 * Al ritorno da Google (/accesso-google): legge e cancella la destinazione messa da parte,
 * validata di nuovo come il parametro (nessuno deve poter scrivere lì un URL esterno).
 */
export function takePostAuthDestination(storage: NextStorage | null | undefined): string {
  if (!storage) return POST_AUTH_REDIRECT
  try {
    const saved = storage.getItem(NEXT_STORAGE_KEY)
    storage.removeItem(NEXT_STORAGE_KEY)
    return postAuthDestination(saved)
  } catch {
    return POST_AUTH_REDIRECT
  }
}
