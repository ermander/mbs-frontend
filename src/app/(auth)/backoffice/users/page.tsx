'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoMuted,
  BoSwitch,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { DsAlert, DsPageHeader, countLabel } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { TOOL_RESULT_BTTS } from '@/lib/tools'
import {
  getBackofficeUsers,
  setBackofficeUserTool,
  type BackofficeUser,
} from '@/services/api/backoffice-users-client'

const ROLE_LABELS: Record<string, string> = {
  ADMIN_ROLE: 'Admin',
  USER_ROLE: 'Utente',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function BackofficeUsersPage() {
  const [users, setUsers] = useState<BackofficeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Lo stato cambia solo nei callback della promise; loading parte già a true
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    getBackofficeUsers()
      .then((data) => setUsers(data))
      .catch(() => setError('Errore nel caricamento degli utenti.'))
      .finally(() => setLoading(false))
  }, [])

  // §14.122: «Risultato + Goal» acceso o spento per un utente; la riga torna dal backend.
  const toggleResultBtts = useCallback(async (user: BackofficeUser, enabled: boolean) => {
    setTogglingId(user.id)
    try {
      const updated = await setBackofficeUserTool(user.id, TOOL_RESULT_BTTS, enabled)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
      toast.success(
        `Risultato + Goal ${enabled ? 'abilitato' : 'disabilitato'} per ${user.username}`,
      )
    } catch {
      toast.error('Modifica non salvata: riprova.')
    } finally {
      setTogglingId(null)
    }
  }, [])

  return (
    <>
      <DsPageHeader
        title="Utenti"
        description="Tutti gli utenti iscritti alla piattaforma. La colonna «Risultato + Goal» accende lo strumento per un utente; gli amministratori lo hanno sempre."
      />

      {error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Nome</th>
              <th className={BO_TH}>Username</th>
              <th className={BO_TH}>Email</th>
              <th className={BO_TH}>Ruolo</th>
              <th className={BO_TH}>Email verificata</th>
              <th className={BO_TH}>Data iscrizione</th>
              <th className={BO_TH}>Risultato + Goal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  Caricamento degli utenti…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  Nessun utente trovato.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const enabled = (user.enabled_tools ?? []).includes(TOOL_RESULT_BTTS)
                return (
                  <tr key={user.id} className={BO_ROW}>
                    <td className={cn(BO_TD, 'font-semibold whitespace-nowrap text-ds-ink')}>
                      {user.name || '—'}
                    </td>
                    <td className={cn(BO_TD, 'text-ds-ink')}>{user.username}</td>
                    <td className={cn(BO_TD, 'text-ds-ink')}>{user.email}</td>
                    <td className={BO_TD}>
                      <DsBadge tone={user.role === 'ADMIN_ROLE' ? 'brand' : 'neutral'}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </DsBadge>
                    </td>
                    <td className={BO_TD}>
                      <DsBadge tone={user.is_email_verified ? 'profit' : 'warning'}>
                        {user.is_email_verified ? 'Sì' : 'No'}
                      </DsBadge>
                    </td>
                    <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink tabular-nums')}>
                      {formatDate(user.created_at)}
                    </td>
                    <td className={BO_TD}>
                      {user.role === 'ADMIN_ROLE' ? (
                        <span className="ds-body-sm text-ds-ink-muted">sempre (admin)</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <BoSwitch
                            size="sm"
                            checked={enabled}
                            disabled={togglingId === user.id}
                            onChange={(next) => void toggleResultBtts(user, next)}
                            label={`Risultato + Goal per ${user.username}`}
                          />
                          <span className="ds-body-sm text-ds-ink-muted">
                            {enabled ? 'abilitato' : 'spento'}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && users.length > 0 && (
        <BoMuted>{countLabel(users.length, 'utente', 'utenti')}</BoMuted>
      )}
    </>
  )
}
