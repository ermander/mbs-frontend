'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import { getBackofficeUsers, type BackofficeUser } from '@/services/api/backoffice-users-client'

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

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBackofficeUsers()
      setUsers(data)
    } catch {
      setError('Errore nel caricamento degli utenti.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return (
    <Container>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Gestione utenti</h2>
        <p className="text-sm text-muted-foreground">Tutti gli utenti iscritti alla piattaforma.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ruolo</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Email verificata
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Data iscrizione
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun utente trovato.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-border transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-2 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-2 text-foreground">{user.username}</td>
                  <td className="px-4 py-2 text-foreground">{user.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN_ROLE'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {user.is_email_verified ? 'Sì' : 'No'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{formatDate(user.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && users.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Totale: {users.length} utent{users.length === 1 ? 'e' : 'i'}
        </p>
      )}
    </Container>
  )
}
