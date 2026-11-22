'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SlidersHorizontal } from 'lucide-react'
import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoConfirmModal,
  BoMuted,
  BoSwitch,
} from '@/components/backoffice/backoffice-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { DsModal } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader, countLabel } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { SECTIONS, type SectionKey } from '@/lib/tools'
import { sectionsSummary } from '@/lib/backoffice-users'
import { useAuthStore } from '@/stores/auth-store'
import {
  getBackofficeUsers,
  setBackofficeUserActive,
  setBackofficeUserSection,
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

/** Un backend più vecchio non manda `is_active`: lì erano tutti attivi. */
function isActive(user: BackofficeUser): boolean {
  return user.is_active !== false
}

function hasSection(user: BackofficeUser, section: SectionKey): boolean {
  return (user.enabled_tools ?? []).includes(section)
}

/**
 * Gestione utenti del Backoffice (§14.122, design §14.365, §14.366): per ogni utente lo stato
 * ATTIVO / NON ATTIVO (NON ATTIVO = fuori dal sito subito e niente accesso finché non lo si
 * riattiva; il proprio account non si disattiva) e le sezioni del sito che può aprire, in una
 * finestra «Abilitazioni» con uno switch «abilitato / non abilitato» per sezione. Gli admin
 * aprono tutte le sezioni.
 */
export default function BackofficeUsersPage() {
  const me = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<BackofficeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Le modifiche in corso, `<id>:active` o `<id>:<sezione>`. */
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<BackofficeUser | null>(null)

  // Lo stato cambia solo nei callback della promise; loading parte già a true
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    getBackofficeUsers()
      .then((data) => setUsers(data))
      .catch(() => setError('Errore nel caricamento degli utenti.'))
      .finally(() => setLoading(false))
  }, [])

  const run = useCallback(
    async (
      key: string,
      call: () => Promise<BackofficeUser>,
      done: (u: BackofficeUser) => string,
    ) => {
      setBusy((prev) => new Set(prev).add(key))
      try {
        const updated = await call()
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
        toast.success(done(updated))
      } catch (err) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message
        toast.error(message ? `Modifica non salvata: ${message}` : 'Modifica non salvata: riprova.')
      } finally {
        setBusy((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [],
  )

  const setActive = useCallback(
    (user: BackofficeUser, active: boolean) =>
      run(
        `${user.id}:active`,
        () => setBackofficeUserActive(user.id, active),
        () => `${user.username}: ${active ? 'ATTIVO' : 'NON ATTIVO'}`,
      ),
    [run],
  )

  const setSection = useCallback(
    (user: BackofficeUser, section: SectionKey, label: string, enabled: boolean) =>
      run(
        `${user.id}:${section}`,
        () => setBackofficeUserSection(user.id, section, enabled),
        () => `${label} ${enabled ? 'abilitato' : 'non abilitato'} per ${user.username}`,
      ),
    [run],
  )

  const editing = users.find((u) => u.id === editingId) ?? null

  return (
    <>
      <DsPageHeader
        title="Utenti"
        description="Tutti gli utenti iscritti alla piattaforma. Un utente NON ATTIVO esce subito dal sito e non può rientrare; da «Abilitazioni» scegli le sezioni che può aprire. Gli amministratori le aprono tutte."
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
              <th className={BO_TH}>Stato</th>
              <th className={BO_TH}>Sezioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={BO_EMPTY_CELL}>
                  Caricamento degli utenti…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className={BO_EMPTY_CELL}>
                  Nessun utente trovato.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const active = isActive(user)
                const isAdmin = user.role === 'ADMIN_ROLE'
                const isMe = me?.id === user.id
                return (
                  <tr key={user.id} className={cn(BO_ROW, !active && 'bg-ds-surface-sunken/40')}>
                    <td
                      className={cn(
                        BO_TD,
                        'font-semibold whitespace-nowrap',
                        active ? 'text-ds-ink' : 'text-ds-ink-muted',
                      )}
                    >
                      {user.name || '—'}
                    </td>
                    <td className={cn(BO_TD, active ? 'text-ds-ink' : 'text-ds-ink-muted')}>
                      {user.username}
                    </td>
                    <td className={cn(BO_TD, active ? 'text-ds-ink' : 'text-ds-ink-muted')}>
                      {user.email}
                    </td>
                    <td className={BO_TD}>
                      <DsBadge tone={isAdmin ? 'brand' : 'neutral'}>
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
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <BoSwitch
                          size="sm"
                          checked={active}
                          disabled={isMe || busy.has(`${user.id}:active`)}
                          title={isMe ? 'Non puoi disattivare il tuo account' : undefined}
                          onChange={(next) =>
                            next ? void setActive(user, true) : setDeactivating(user)
                          }
                          label={`Stato di ${user.username}`}
                        />
                        <span
                          className={cn(
                            'ds-body-sm font-semibold',
                            active ? 'text-ds-profit' : 'text-ds-loss',
                          )}
                        >
                          {active ? 'ATTIVO' : 'NON ATTIVO'}
                        </span>
                      </span>
                    </td>
                    <td className={BO_TD}>
                      {isAdmin ? (
                        <span className="ds-body-sm whitespace-nowrap text-ds-ink-muted">
                          Tutte (admin)
                        </span>
                      ) : (
                        <span className="flex items-center gap-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingId(user.id)}
                            className={dsButtonClass('secondary', 'sm')}
                            aria-label={`Abilitazioni di ${user.username}`}
                          >
                            <SlidersHorizontal className="h-4 w-4" aria-hidden />
                            Abilitazioni
                          </button>
                          <span className="ds-body-sm text-ds-ink-muted">
                            {sectionsSummary(user.enabled_tools)}
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

      <DsModal
        open={editing !== null}
        onOpenChange={(next) => !next && setEditingId(null)}
        title={editing ? `Abilitazioni di ${editing.username}` : 'Abilitazioni'}
        description="Le sezioni del sito che l'utente può aprire. Ogni modifica vale subito: una sezione non abilitata sparisce dal suo menu e la pagina gli dice che non è abilitata."
        footer={
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className={dsButtonClass('primary', 'md')}
          >
            Fatto
          </button>
        }
      >
        {editing && (
          <ul className="m-0 flex list-none flex-col divide-y divide-ds-line rounded-ds-md border border-ds-line p-0">
            {SECTIONS.map((s) => {
              const on = hasSection(editing, s.key)
              return (
                <li key={s.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="ds-body font-semibold text-ds-ink">{s.label}</span>
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'ds-body-sm w-[92px] text-right',
                        on ? 'text-ds-ink' : 'text-ds-ink-muted',
                      )}
                    >
                      {on ? 'abilitato' : 'non abilitato'}
                    </span>
                    <BoSwitch
                      checked={on}
                      disabled={busy.has(`${editing.id}:${s.key}`)}
                      onChange={(next) => void setSection(editing, s.key, s.label, next)}
                      label={`${s.label} per ${editing.username}`}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </DsModal>

      <BoConfirmModal
        open={deactivating !== null}
        title={deactivating ? `Disattivare ${deactivating.username}?` : 'Disattivare l’utente?'}
        description="Esce subito dal sito, anche dalle sessioni già aperte, e non può più accedere né con la password né con Google finché non lo riattivi. I suoi dati restano."
        confirmLabel="Disattiva"
        busy={deactivating !== null && busy.has(`${deactivating.id}:active`)}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          const target = deactivating
          if (!target) return
          void setActive(target, false).then(() => setDeactivating(null))
        }}
      />
    </>
  )
}
