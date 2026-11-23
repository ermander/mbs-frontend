import { SECTIONS, type SectionKey } from '@/lib/tools'

/**
 * §14.366: in una riga le sezioni abilitate di un utente, per la tabella Utenti del Backoffice:
 * «Tutte», «Nessuna», «Tutte tranne Risultato + Goal», «Solo Offerte e Calcolatori», «4 su 7».
 */
export function sectionsSummary(enabled: readonly string[] | undefined): string {
  const list = enabled ?? []
  const on = SECTIONS.filter((s) => list.includes(s.key))
  const off = SECTIONS.filter((s) => !list.includes(s.key))
  if (off.length === 0) return 'Tutte'
  if (on.length === 0) return 'Nessuna'
  if (off.length <= 2) return `Tutte tranne ${off.map((s) => s.label).join(' e ')}`
  if (on.length <= 2) return `Solo ${on.map((s) => s.label).join(' e ')}`
  return `${on.length} su ${SECTIONS.length}`
}

/** §14.374: gli utenti di una pagina della tabella Utenti del Backoffice. */
export const USERS_PAGE_SIZE = 25

/** §14.374: l'ultima pagina (da 0) che contiene qualcuno; 0 se non c'è nessuno. */
export function lastUsersPage(total: number, pageSize = USERS_PAGE_SIZE): number {
  return Math.max(0, Math.ceil(total / pageSize) - 1)
}

/** §14.374: la riga della tabella vuota, con la ricerca se c'è. */
export function usersEmptyMessage(search: string): string {
  const q = search.trim()
  return q ? `Nessun utente corrisponde a «${q}».` : 'Nessun utente trovato.'
}

/* ---------- §14.383: account dei tester, con scadenza e invito ---------- */

/** Le sezioni che un account nuovo riceve se non si sceglie altro: come un'iscrizione (tutte tranne Risultato + Goal). */
export const NEW_USER_DEFAULT_SECTIONS: readonly SectionKey[] = SECTIONS.map((s) => s.key).filter(
  (key) => key !== 'result_btts',
)

/** Le durate proposte in «Nuovo utente» e in «Scadenza», in giorni; `null` = senza scadenza. */
export const EXPIRY_PRESETS: readonly { days: number | null; label: string }[] = [
  { days: 7, label: '7 giorni' },
  { days: 14, label: '14 giorni' },
  { days: 30, label: '30 giorni' },
  { days: 90, label: '90 giorni' },
  { days: null, label: 'Senza scadenza' },
]

/** La durata scelta all'apertura di «Nuovo utente». */
export const DEFAULT_EXPIRY_DAYS = 30

const ROME_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Oggi a Roma, `AAAA-MM-GG`: il backend conta i giorni sul calendario di Roma. */
export function romeToday(now: Date = new Date()): string {
  return ROME_DATE.format(now)
}

/** `AAAA-MM-GG` più `days` giorni di calendario. */
export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** L'ultimo giorno di una durata da oggi: 30 giorni da oggi 23/11 → 23/12 compreso. */
export function expiresOnFor(days: number | null, now: Date = new Date()): string | null {
  return days === null ? null : addDaysIso(romeToday(now), days)
}

/** `23/12/2026` da `2026-12-23`. */
export function italianDay(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

/** I campi di un utente che dicono la sua scadenza (assenti sui backend di prima del §14.383). */
export interface ExpiryFields {
  expires_on?: string | null
  is_expired?: boolean
}

/** La cella «Scadenza»: «—» senza, «23/12/2026», «Scaduto il 23/12/2026». */
export function expiryLabel(user: ExpiryFields): string {
  if (!user.expires_on) return '—'
  return user.is_expired ? `Scaduto il ${italianDay(user.expires_on)}` : italianDay(user.expires_on)
}

/** I campi dell'invito: creato dal Backoffice (`invited_at`) e senza password ancora scelta. */
export interface InviteFields {
  invited_at?: string | null
  has_password?: boolean
}

/** Invitato dal Backoffice e la password non è ancora stata scelta: si può rimandare l'invito. */
export function invitePending(user: InviteFields): boolean {
  return Boolean(user.invited_at) && user.has_password === false
}

/** Il messaggio d'errore di una risposta del backend: `message`, o il primo di `errors` (validazione Joi). */
export function backendErrorMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: { message?: unknown; errors?: unknown } } })?.response
    ?.data
  if (typeof data?.message === 'string' && data.message) return data.message
  if (Array.isArray(data?.errors) && typeof data.errors[0] === 'string') return data.errors[0]
  return null
}
