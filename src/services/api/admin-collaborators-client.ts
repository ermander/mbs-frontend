import { apiClient } from './client'

export interface Collaborator {
  id: string
  name: string
  username: string
  email: string | null
  profitSharePercentage: number | null
  status: 'active' | 'disabled'
  parentAdminId: string
  accountSharesCount: number
  walletSharesCount: number
  createdAt: string
  updatedAt: string
}

export interface CollaboratorShares {
  accountIds: string[]
  walletIds: string[]
}

export interface CreateCollaboratorPayload {
  name: string
  username: string
  password: string
  email?: string | null
  profitSharePercentage: number
}

export interface UpdateCollaboratorPayload {
  name?: string
  password?: string
  email?: string | null
  status?: 'active' | 'disabled'
}

export interface BackfillOperatorPayload {
  accountIds: string[]
  fromDate?: string
  toDate?: string
  onlyUnassigned?: boolean
}

export interface BackfillOperatorResult {
  ongoingBetsUpdated: number
  betLegsUpdated: number
  accountMovementsUpdated: number
  ledgerUpdated: number
  quickBetsUpdated: number
}

export type PayoutRecipient = 'admin' | 'collaborator'

export interface PayoutEntry {
  id: string
  walletId: string | null
  walletNome: string | null
  amount: number
  dataRegistrazione: string
  descrizione: string | null
  recipient: PayoutRecipient
  createdAt: string
}

export interface CreatePayoutPayload {
  walletId: string
  amount: number
  recipient: PayoutRecipient
  dataRegistrazione?: string
  descrizione?: string | null
}

export interface CapitalSummary {
  totalProfit: number
  sharePercentage: number | null
  adminShareAmount: number
  collaboratorShareAmount: number
  poolAccountsBalance: number
  poolWalletsBalance: number
  poolTotalBalance: number
  adminWithdrawals: number
  collaboratorWithdrawals: number
  adminCapital: number
  collaboratorCapital: number
  totalCapital: number
}

export const adminCollaboratorsClient = {
  async list(): Promise<Collaborator[]> {
    const { data } = await apiClient.get<{ items: Collaborator[] }>('/admin/collaborators')
    return data.items
  },

  async getById(id: string): Promise<Collaborator> {
    const { data } = await apiClient.get<{ item: Collaborator }>(`/admin/collaborators/${id}`)
    return data.item
  },

  async create(payload: CreateCollaboratorPayload): Promise<Collaborator> {
    const { data } = await apiClient.post<{ item: Collaborator }>('/admin/collaborators', payload)
    return data.item
  },

  async update(id: string, payload: UpdateCollaboratorPayload): Promise<Collaborator> {
    const { data } = await apiClient.patch<{ item: Collaborator }>(
      `/admin/collaborators/${id}`,
      payload,
    )
    return data.item
  },

  async disable(id: string): Promise<Collaborator> {
    const { data } = await apiClient.delete<{ item: Collaborator }>(`/admin/collaborators/${id}`)
    return data.item
  },

  async setProfitShare(id: string, percentage: number): Promise<Collaborator> {
    const { data } = await apiClient.patch<{ item: Collaborator }>(
      `/admin/collaborators/${id}/profit-share`,
      { percentage },
    )
    return data.item
  },

  async getShares(id: string): Promise<CollaboratorShares> {
    const { data } = await apiClient.get<{ item: CollaboratorShares }>(
      `/admin/collaborators/${id}/shares`,
    )
    return data.item
  },

  async setAccountShares(id: string, ids: string[]): Promise<CollaboratorShares> {
    const { data } = await apiClient.put<{ item: CollaboratorShares }>(
      `/admin/collaborators/${id}/account-shares`,
      { ids },
    )
    return data.item
  },

  async setWalletShares(id: string, ids: string[]): Promise<CollaboratorShares> {
    const { data } = await apiClient.put<{ item: CollaboratorShares }>(
      `/admin/collaborators/${id}/wallet-shares`,
      { ids },
    )
    return data.item
  },

  async backfillOperator(
    id: string,
    payload: BackfillOperatorPayload,
  ): Promise<BackfillOperatorResult> {
    const { data } = await apiClient.post<{ item: BackfillOperatorResult }>(
      `/admin/collaborators/${id}/backfill-operator`,
      payload,
    )
    return data.item
  },

  async getCapitalSummary(id: string): Promise<CapitalSummary> {
    const { data } = await apiClient.get<{ item: CapitalSummary }>(
      `/admin/collaborators/${id}/capital`,
    )
    return data.item
  },

  async listPayouts(
    id: string,
    params?: { page?: number; limit?: number; recipient?: PayoutRecipient },
  ): Promise<{ items: PayoutEntry[]; total: number; page: number; limit: number }> {
    const { data } = await apiClient.get<{
      items: PayoutEntry[]
      total: number
      page: number
      limit: number
    }>(`/admin/collaborators/${id}/capital/payouts`, { params: params ?? {} })
    return data
  },

  async createPayout(id: string, payload: CreatePayoutPayload): Promise<PayoutEntry> {
    const { data } = await apiClient.post<{ item: PayoutEntry }>(
      `/admin/collaborators/${id}/capital/payouts`,
      payload,
    )
    return data.item
  },

  async deletePayout(id: string, movementId: string): Promise<void> {
    await apiClient.delete(`/admin/collaborators/${id}/capital/payouts/${movementId}`)
  },
}
