import { apiClient } from './client'
import type { UserRole } from './auth-client'
import type { SectionKey } from '@/lib/tools'

export interface BackofficeUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  is_email_verified: boolean
  created_at: string
  /**
   * Sezioni abilitate dal backoffice (§14.366; fino ad allora solo gli strumenti, §14.122):
   * chiavi di `SECTIONS` in lib/tools. Assente sui backend più vecchi.
   */
  enabled_tools?: string[]
  /** §14.366: ATTIVO (true) o NON ATTIVO (false); assente sui backend più vecchi, dove erano tutti attivi. */
  is_active?: boolean
  /**
   * §14.383: l'istante in cui l'account smette di funzionare (la mezzanotte di Roma dopo
   * l'ultimo giorno), `null` senza scadenza. Assente sui backend più vecchi.
   */
  expires_at?: string | null
  /** §14.383: l'ultimo giorno in cui l'account funziona, `AAAA-MM-GG` (Roma); `null` senza scadenza. */
  expires_on?: string | null
  /** §14.383: l'ultimo giorno è passato: l'account non entra finché non si sposta la scadenza. */
  is_expired?: boolean
  /** §14.383: quando l'account è stato creato (o reinvitato) dal Backoffice; `null` per chi si è iscritto. */
  invited_at?: string | null
  /** §14.383: ha una password; `false` per un tester che non l'ha ancora scelta (o un account solo Google). */
  has_password?: boolean
}

/** La risposta di «Nuovo utente» e di «Reinvia invito» (§14.383). */
export interface BackofficeInviteResult {
  user: BackofficeUser
  /** La mail di invito è partita; `false` se SMTP non è configurato o ha fallito. */
  emailSent: boolean
  /** Il link per scegliere la password, da passare a mano quando la mail non è partita. */
  inviteUrl: string
}

interface ListUsersResponse {
  users: BackofficeUser[]
  /** §14.374: gli utenti della ricerca, su tutte le pagine; assente sui backend più vecchi. */
  total?: number
}

export interface BackofficeUsersPage {
  users: BackofficeUser[]
  total: number
}

/**
 * GET /backoffice/users (§14.374): una pagina di utenti, i più recenti per primi, con la ricerca
 * `q` su nome, username ed email (ogni parola deve trovarsi). Un backend di prima del §14.374
 * ignora i parametri e manda tutti gli utenti senza `total`: allora il totale sono quelli arrivati.
 */
export async function getBackofficeUsers(params: {
  limit: number
  offset: number
  q?: string
}): Promise<BackofficeUsersPage> {
  const { data } = await apiClient.get<ListUsersResponse>('/backoffice/users', {
    params: { limit: params.limit, offset: params.offset, q: params.q || undefined },
  })
  return { users: data.users, total: data.total ?? data.users.length }
}

/** PATCH /backoffice/users/:id/sections (§14.366): una sezione accesa o spenta per un utente; risponde con la riga aggiornata. */
export async function setBackofficeUserSection(
  id: string,
  section: SectionKey,
  enabled: boolean,
): Promise<BackofficeUser> {
  const { data } = await apiClient.patch<{ user: BackofficeUser }>(
    `/backoffice/users/${id}/sections`,
    { section, enabled },
  )
  return data.user
}

/**
 * PATCH /backoffice/users/:id/active (§14.366): ATTIVO o NON ATTIVO. Da NON ATTIVO l'utente esce
 * subito da ogni sessione e non rientra; il backend rifiuta di disattivare il proprio account.
 */
export async function setBackofficeUserActive(
  id: string,
  active: boolean,
): Promise<BackofficeUser> {
  const { data } = await apiClient.patch<{ user: BackofficeUser }>(
    `/backoffice/users/${id}/active`,
    { active },
  )
  return data.user
}

/**
 * POST /backoffice/users (§14.383): un account per un tester. Il backend lo crea verificato e
 * senza password, con la scadenza `expiresOn` (`AAAA-MM-GG`, ultimo giorno compreso; `null` senza
 * scadenza) e le sezioni scelte, e manda la mail di invito con il link per scegliere la password.
 */
export async function createBackofficeUser(payload: {
  email: string
  name?: string
  expiresOn: string | null
  sections: SectionKey[]
}): Promise<BackofficeInviteResult> {
  const { data } = await apiClient.post<BackofficeInviteResult>('/backoffice/users', payload)
  return data
}

/** PATCH /backoffice/users/:id/expiry (§14.383): l'ultimo giorno dell'account, o `null` per toglierlo. */
export async function setBackofficeUserExpiry(
  id: string,
  expiresOn: string | null,
): Promise<BackofficeUser> {
  const { data } = await apiClient.patch<{ user: BackofficeUser }>(
    `/backoffice/users/${id}/expiry`,
    { expiresOn },
  )
  return data.user
}

/**
 * POST /backoffice/users/:id/invite (§14.383): un link nuovo (vale 7 giorni, il vecchio smette di
 * funzionare) e una mail nuova, per un tester che non ha ancora scelto la password.
 */
export async function resendBackofficeUserInvite(id: string): Promise<BackofficeInviteResult> {
  const { data } = await apiClient.post<BackofficeInviteResult>(`/backoffice/users/${id}/invite`)
  return data
}
