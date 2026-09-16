import { apiClient } from './client'
import type { UserRole } from './auth-client'
import type { ToolKey } from '@/lib/tools'

export interface BackofficeUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  is_email_verified: boolean
  created_at: string
  /** Strumenti abilitati dal backoffice (§14.122); assente sui backend più vecchi. */
  enabled_tools?: string[]
}

interface ListUsersResponse {
  users: BackofficeUser[]
}

export async function getBackofficeUsers(): Promise<BackofficeUser[]> {
  const { data } = await apiClient.get<ListUsersResponse>('/backoffice/users')
  return data.users
}

/** PATCH /backoffice/users/:id/tools: uno strumento acceso o spento per un utente; risponde con la riga aggiornata. */
export async function setBackofficeUserTool(
  id: string,
  tool: ToolKey,
  enabled: boolean,
): Promise<BackofficeUser> {
  const { data } = await apiClient.patch<{ user: BackofficeUser }>(
    `/backoffice/users/${id}/tools`,
    { tool, enabled },
  )
  return data.user
}
