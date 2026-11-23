'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Search, Send, SlidersHorizontal, UserPlus } from 'lucide-react'
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
import { DsModal, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader, countLabel } from '@/components/profit-tracker/tracker-ds'
import { OmPagination } from '@/components/strumenti/scanner-v2/om-ds'
import { cn } from '@/lib/utils'
import { SECTIONS, type SectionKey } from '@/lib/tools'
import {
  USERS_PAGE_SIZE,
  backendErrorMessage,
  expiryLabel,
  invitePending,
  italianDay,
  lastUsersPage,
  sectionsSummary,
  usersEmptyMessage,
} from '@/lib/backoffice-users'
import { ExpiryPicker, InviteLinkBox, NewUserModal } from '@/components/backoffice/user-invite'
import { useAuthStore } from '@/stores/auth-store'
import {
  getBackofficeUsers,
  resendBackofficeUserInvite,
  setBackofficeUserActive,
  setBackofficeUserExpiry,
  setBackofficeUserSection,
  type BackofficeUser,
} from '@/services/api/backoffice-users-client'

/** La ricerca parte quando si smette di scrivere per un attimo. */
const SEARCH_DEBOUNCE_MS = 300

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
 * §14.383: la scadenza nella finestra «Abilitazioni»: com'è adesso, le scorciatoie e il giorno, e
 * «Salva scadenza». Spostarla in avanti fa rientrare subito un account scaduto.
 */
function ExpiryEditor({
  user,
  busy,
  onSave,
}: {
  user: BackofficeUser
  busy: boolean
  onSave: (expiresOn: string | null) => void
}) {
  const current = user.expires_on ?? null
  const [draft, setDraft] = useState<string | null>(current)
  return (
    <section className="flex flex-col gap-3 rounded-ds-md border border-ds-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="ds-body font-semibold text-ds-ink">Scadenza</span>
        <span
          className={cn(
            'ds-body-sm',
            user.is_expired ? 'font-semibold text-ds-loss' : 'text-ds-ink-muted',
          )}
        >
          {current === null
            ? 'Adesso: nessuna'
            : user.is_expired
              ? `Scaduto il ${italianDay(current)}: non può entrare`
              : `Adesso: fino al ${italianDay(current)}`}
        </span>
      </div>
      <ExpiryPicker id={`expiry-${user.id}`} value={draft} onChange={setDraft} disabled={busy} />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy || draft === current}
          onClick={() => onSave(draft)}
          className={dsButtonClass('secondary', 'sm')}
        >
          Salva scadenza
        </button>
      </div>
    </section>
  )
}

/**
 * Gestione utenti del Backoffice (§14.122, design §14.365, §14.366): per ogni utente lo stato
 * ATTIVO / NON ATTIVO (NON ATTIVO = fuori dal sito subito e niente accesso finché non lo si
 * riattiva; il proprio account non si disattiva) e le sezioni del sito che può aprire, in una
 * finestra «Abilitazioni» con uno switch «abilitato / non abilitato» per sezione. Gli admin
 * aprono tutte le sezioni. Dal §14.374 una pagina di USERS_PAGE_SIZE utenti alla volta, letta dal
 * backend, con la ricerca su nome, username ed email; cambiare ricerca riporta alla pagina 1.
 * Dal §14.383 «Nuovo utente» crea l'account di un tester (email, durata, sezioni) e gli manda il
 * link per scegliere la password; la colonna «Scadenza» e la finestra «Abilitazioni» dicono e
 * spostano l'ultimo giorno, e rimandano l'invito a chi non ha ancora scelto la password.
 */
export default function BackofficeUsersPage() {
  const me = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<BackofficeUser[]>([])
  const [total, setTotal] = useState(0)
  /** Le modifiche in corso, `<id>:active` o `<id>:<sezione>`. */
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<BackofficeUser | null>(null)
  const [creating, setCreating] = useState(false)
  /** §14.383: il link di un invito rimandato quando la mail non è partita, da copiare. */
  const [inviteLink, setInviteLink] = useState<{ id: string; url: string } | null>(null)
  /** Cresce per rileggere la pagina (dopo «Nuovo utente») anche a query uguale. */
  const [reload, setReload] = useState(0)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /** Da 0, come OmPagination. */
  const [page, setPage] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollOnArrival = useRef(false)

  // Si cerca quando si smette di scrivere; la ricerca nuova riparte dalla pagina 1.
  useEffect(() => {
    if (search === debouncedSearch) return
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search, debouncedSearch])

  const query = useMemo(
    () => ({
      limit: USERS_PAGE_SIZE,
      offset: page * USERS_PAGE_SIZE,
      q: debouncedSearch.trim(),
      reload,
    }),
    [page, debouncedSearch, reload],
  )

  // Le righe in mano sono «per» una query: finché non è quella corrente si sta caricando, e le
  // righe di prima restano a schermo (più chiare) invece di sparire a ogni lettera o pagina; il
  // primo caricamento è l'unico a tabella vuota. L'errore vale per la query corrente. Lo stato
  // cambia nei callback della promise e una risposta superata viene ignorata
  // (react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{ query: typeof query; error: string | null } | null>(null)
  const firstLoad = loaded === null
  const loading = loaded?.query !== query
  const error = loaded?.query === query ? loaded.error : null

  useEffect(() => {
    let cancelled = false
    getBackofficeUsers({ limit: query.limit, offset: query.offset, q: query.q })
      .then((data) => {
        if (cancelled) return
        // Una pagina oltre la fine (utenti cancellati nel frattempo): si va all'ultima.
        if (data.users.length === 0 && data.total > 0 && query.offset > 0) {
          setPage(lastUsersPage(data.total))
          return
        }
        setUsers(data.users)
        setTotal(data.total)
        setLoaded({ query, error: null })
        if (scrollOnArrival.current) {
          scrollOnArrival.current = false
          topRef.current?.scrollIntoView({ block: 'start' })
        }
      })
      .catch(() => {
        if (cancelled) return
        setUsers([])
        setTotal(0)
        setLoaded({ query, error: 'Errore nel caricamento degli utenti.' })
      })
    return () => {
      cancelled = true
    }
  }, [query])

  const goToPage = (next: number) => {
    scrollOnArrival.current = true
    setPage(next)
  }

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
        const message = backendErrorMessage(err)
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

  const setExpiry = useCallback(
    (user: BackofficeUser, expiresOn: string | null) =>
      run(
        `${user.id}:expiry`,
        () => setBackofficeUserExpiry(user.id, expiresOn),
        (u) =>
          u.expires_on
            ? `${u.username}: accesso fino al ${italianDay(u.expires_on)}`
            : `${u.username}: senza scadenza`,
      ),
    [run],
  )

  /** §14.383: un link nuovo e una mail nuova; se la mail non parte, il link resta da copiare. */
  const resendInvite = useCallback(
    (user: BackofficeUser) => {
      setInviteLink(null)
      return run(
        `${user.id}:invite`,
        async () => {
          const result = await resendBackofficeUserInvite(user.id)
          if (!result.emailSent) setInviteLink({ id: user.id, url: result.inviteUrl })
          return result.user
        },
        (u) => `Invito rimandato a ${u.email}`,
      )
    },
    [run],
  )

  /** Dopo «Nuovo utente»: la prima pagina senza ricerca, dove l'account appena creato sta in cima. */
  const showNewest = () => {
    setSearch('')
    setDebouncedSearch('')
    setPage(0)
    setReload((n) => n + 1)
  }

  const editing = users.find((u) => u.id === editingId) ?? null

  return (
    <>
      <DsPageHeader
        title="Utenti"
        description="Tutti gli utenti iscritti alla piattaforma. Un utente NON ATTIVO esce subito dal sito e non può rientrare; da «Abilitazioni» scegli le sezioni che può aprire e fino a quando. Gli amministratori le aprono tutte."
        actions={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={dsButtonClass('primary', 'md')}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Nuovo utente
          </button>
        }
      />

      <div ref={topRef} className="scroll-mt-[calc(var(--topnav-h)+1.5rem)]">
        <GTextField
          id="bo-users-search"
          ariaLabel="Cerca un utente per nome, username o email"
          type="search"
          size="sm"
          value={search}
          onChange={setSearch}
          placeholder="Cerca per nome, username o email…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          suffix={!firstLoad && loading ? '…' : undefined}
          className="w-full sm:max-w-sm"
        />
      </div>

      {error && <DsAlert>{error}</DsAlert>}

      <div
        className={cn(BO_TABLE_WRAP, !firstLoad && loading && 'opacity-60 transition-opacity')}
        aria-busy={loading}
      >
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Nome</th>
              <th className={BO_TH}>Username</th>
              <th className={BO_TH}>Email</th>
              <th className={BO_TH}>Ruolo</th>
              <th className={BO_TH}>Email verificata</th>
              <th className={BO_TH}>Data iscrizione</th>
              <th className={BO_TH}>Scadenza</th>
              <th className={BO_TH}>Stato</th>
              <th className={BO_TH}>Sezioni</th>
            </tr>
          </thead>
          <tbody>
            {firstLoad ? (
              <tr>
                <td colSpan={9} className={BO_EMPTY_CELL}>
                  Caricamento degli utenti…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className={BO_EMPTY_CELL}>
                  {error ? 'Nessun utente da mostrare.' : usersEmptyMessage(debouncedSearch)}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const active = isActive(user)
                const expired = active && user.is_expired === true
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
                    <td className={cn(BO_TD, 'whitespace-nowrap tabular-nums')}>
                      <span
                        className={cn(
                          'block',
                          user.is_expired ? 'font-semibold text-ds-loss' : 'text-ds-ink',
                        )}
                      >
                        {expiryLabel(user)}
                      </span>
                      {invitePending(user) && (
                        <span className="ds-body-sm block text-ds-ink-muted">Invito in attesa</span>
                      )}
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
                            expired
                              ? 'text-ds-warning'
                              : active
                                ? 'text-ds-profit'
                                : 'text-ds-loss',
                          )}
                          title={
                            expired
                              ? 'Attivo ma scaduto: non entra finché non sposti la scadenza da «Abilitazioni»'
                              : undefined
                          }
                        >
                          {expired ? 'SCADUTO' : active ? 'ATTIVO' : 'NON ATTIVO'}
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

      {/* Un backend di prima del §14.374 manda tutti gli utenti in una volta: niente pagine. */}
      {total > USERS_PAGE_SIZE && users.length <= USERS_PAGE_SIZE ? (
        <OmPagination
          page={page}
          pageSize={USERS_PAGE_SIZE}
          total={total}
          unit={total === 1 ? 'utente' : 'utenti'}
          onChange={goToPage}
        />
      ) : (
        !firstLoad && users.length > 0 && <BoMuted>{countLabel(total, 'utente', 'utenti')}</BoMuted>
      )}

      <DsModal
        open={editing !== null}
        onOpenChange={(next) => {
          if (next) return
          setEditingId(null)
          setInviteLink(null)
        }}
        title={editing ? `Abilitazioni di ${editing.username}` : 'Abilitazioni'}
        description="Fino a quando l'utente può entrare e le sezioni del sito che può aprire. Ogni modifica vale subito: una sezione non abilitata sparisce dal suo menu e la pagina gli dice che non è abilitata."
        footer={
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setInviteLink(null)
            }}
            className={dsButtonClass('primary', 'md')}
          >
            Fatto
          </button>
        }
      >
        {editing && (
          <ExpiryEditor
            key={`${editing.id}:${editing.expires_on ?? ''}`}
            user={editing}
            busy={busy.has(`${editing.id}:expiry`)}
            onSave={(expiresOn) => void setExpiry(editing, expiresOn)}
          />
        )}
        {editing && invitePending(editing) && (
          <section className="flex flex-col gap-3 rounded-ds-md border border-ds-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="ds-body font-semibold text-ds-ink">Invito</span>
                <span className="ds-body-sm text-ds-ink-muted">
                  Non ha ancora scelto la password
                  {editing.invited_at ? `; ultimo invito il ${formatDate(editing.invited_at)}` : ''}
                  .
                </span>
              </div>
              <button
                type="button"
                disabled={busy.has(`${editing.id}:invite`)}
                onClick={() => void resendInvite(editing)}
                className={dsButtonClass('secondary', 'sm')}
              >
                <Send className="h-4 w-4" aria-hidden />
                Reinvia invito
              </button>
            </div>
            {inviteLink?.id === editing.id && <InviteLinkBox url={inviteLink.url} />}
          </section>
        )}
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

      <NewUserModal open={creating} onOpenChange={setCreating} onCreated={showNewest} />

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
