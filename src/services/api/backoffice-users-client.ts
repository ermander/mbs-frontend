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
