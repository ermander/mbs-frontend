import { apiClient } from './client'
import type { UserRole } from './auth-client'

export interface BackofficeUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  is_email_verified: boolean
  created_at: string
}

interface ListUsersResponse {
  users: BackofficeUser[]
}

export async function getBackofficeUsers(): Promise<BackofficeUser[]> {
  const { data } = await apiClient.get<ListUsersResponse>('/backoffice/users')
  return data.users
}
