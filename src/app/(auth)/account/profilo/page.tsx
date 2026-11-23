'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import {
  DsModal,
  FieldError,
  GReadOnly,
  GTextField,
  GiocateDsShell,
  dsDangerButtonClass,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { TelegramLinkWidget } from '@/components/profit-tracker/telegram-link-widget'
import { authClient } from '@/services/api/auth-client'
import type { AuthUser } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import {
  ACCOUNT_DELETE_CONFIRM_WORD,
  accountDeletionPayload,
  deletionUsesPassword,
} from '@/lib/account-deletion'
import { getErrorMessage } from '@/lib/error-utils'
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram-bot'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  USER_ROLE: 'Utente',
  ADMIN_ROLE: 'Amministratore',
}

function getInitials(name: string | undefined, email: string | undefined): string {
  // || e non ??: dalla registrazione del design (§14.253) il nome può essere la stringa vuota.
  const source = (name || email || '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const inlineLink = cn(
  'rounded-sm text-ds-brand underline-offset-2 transition-colors hover:text-ds-brand-hover hover:underline',
  dsFocusRing,
)

/**
 * Il Profilo sul design OddWise (§14.350): dati dell'account, sicurezza, notifiche Telegram ed
 * eliminazione dell'account, sul guscio chiaro del tracker. Logica e salvataggi come prima.
 * Dal §14.382 la colonna da 760px sta al centro della pagina (`mx-auto`), come il dettaglio
 * dell'offerta (§14.373): con la pagina a tutta larghezza (§14.357) restava attaccata a sinistra.
 */
export default function AccountProfiloPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <GiocateDsShell>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        <DsPageHeader
          title="Profilo"
          description="I dati dell'account, la sicurezza e le notifiche."
        />

        {user ? (
          <>
            <AccountDataCard key={`${user.id}:${user.name}:${user.username}`} user={user} />
            <SecurityCard user={user} />
            <NotificationsCard />
            <DeleteAccountCard user={user} />
          </>
        ) : (
          <p className="ds-body-sm m-0 flex items-center gap-2 text-ds-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Caricamento del profilo…
          </p>
        )}
      </div>
    </GiocateDsShell>
  )
}

/** Un riquadro del profilo: titolo, riga di spiegazione e contenuto. */
function ProfileCard({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string
  title: string
  description?: React.ReactNode
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(DS_PANEL, 'flex flex-col gap-4 p-6', danger && 'border-ds-loss/40')}
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className={cn('ds-subheading m-0', danger && 'text-ds-loss')}>
          {title}
        </h2>
        {description && (
          <p className="ds-body-sm m-0 text-pretty text-ds-ink-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Dati account ──────────────────────────────────────────────────────

function AccountDataCard({ user }: { user: AuthUser }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [saving, setSaving] = useState(false)

  const trimmedName = name.trim()
  const trimmedUsername = username.trim()
  const dirty = trimmedName !== user.name || trimmedUsername !== user.username
  const canSave = dirty && trimmedName.length > 0 && trimmedUsername.length >= 3 && !saving

  const joinedAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('it-IT', { dateStyle: 'long' })
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      const payload: { name?: string; username?: string } = {}
      if (trimmedName !== user.name) payload.name = trimmedName
      if (trimmedUsername !== user.username) payload.username = trimmedUsername
      const { user: updated } = await authClient.updateMe(payload)
      setUser(updated)
      toast.success('Profilo aggiornato.')
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile aggiornare il profilo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="profilo-dati" className={cn(DS_PANEL, 'flex flex-col gap-5 p-6')}>
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ds-brand-soft text-lg font-semibold text-ds-brand"
        >
          {getInitials(user.name, user.email)}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="profilo-dati" className="ds-heading m-0 truncate">
            {user.name || user.email}
          </h2>
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            @{user.username} · {ROLE_LABEL[user.role]}
            {joinedAt ? ` · iscritto dal ${joinedAt}` : ''}
          </p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
        data-testid="profile-form"
      >
        <GTextField
          id="profile-name"
          label="Nome"
          value={name}
          onChange={setName}
          inputProps={{ maxLength: 100, autoComplete: 'name' }}
        />
        <GTextField
          id="profile-username"
          label="Username"
          value={username}
          onChange={setUsername}
          inputProps={{ maxLength: 32, autoComplete: 'username' }}
        />
        <div className="sm:col-span-2">
          <GReadOnly
            label="Email"
            hint="L'email è l'identificativo dell'account e non si può cambiare da qui."
          >
            <span id="profile-email" className="truncate">
              {user.email}
            </span>
          </GReadOnly>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={!canSave}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {saving ? 'Salvataggio…' : 'Salva le modifiche'}
          </button>
        </div>
      </form>
    </section>
  )
}

// ── Sicurezza ─────────────────────────────────────────────────────────

const PASSWORD_HINT =
  'Almeno 12 caratteri, con una minuscola, una maiuscola, un numero e un carattere speciale.'

function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 12 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
  )
}

/**
 * §14.249: chi è entrato con Google e non ha mai impostato una password (`hasPassword` false)
 * non vede il form «Cambia password», che il backend rifiuterebbe con un 400, ma un pulsante
 * che gli manda il link per impostarne una. `hasPassword` assente (backend più vecchio) =
 * form come prima.
 */
function SecurityCard({ user }: { user: AuthUser }) {
  const withoutPassword = user.hasPassword === false
  return (
    <ProfileCard
      id="profilo-sicurezza"
      title="Sicurezza"
      description={
        withoutPassword
          ? 'Il tuo account accede con Google e non ha una password.'
          : 'Cambia la password. Le altre sessioni aperte verranno disconnesse.'
      }
    >
      {withoutPassword ? <SetPasswordPanel email={user.email} /> : <ChangePasswordForm />}
    </ProfileCard>
  )
}

function SetPasswordPanel({ email }: { email: string }) {
  const [sending, setSending] = useState(false)

  const handleClick = async () => {
    if (sending) return
    setSending(true)
    try {
      const { message } = await authClient.requestPasswordReset(email)
      toast.success(message)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile inviare il link per impostare la password.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="set-password-panel"
    >
      <p className="ds-body-sm m-0 text-ds-ink-muted">
        Per entrare anche con email e password, ricevi su{' '}
        <span className="font-semibold text-ds-ink">{email}</span> un link per impostarne una.
        Continuerai comunque ad accedere con Google.
      </p>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={sending}
        className={cn(dsButtonClass('primary', 'md'), 'flex-none disabled:opacity-50')}
      >
        {sending ? 'Invio…' : 'Imposta una password'}
      </button>
    </div>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword
  const weak = newPassword.length > 0 && !isStrongPassword(newPassword)
  const canSave =
    currentPassword.length > 0 &&
    isStrongPassword(newPassword) &&
    confirmPassword === newPassword &&
    !saving
  const type = showPasswords ? 'text' : 'password'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      await authClient.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password aggiornata. Le altre sessioni aperte sono state disconnesse.')
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile cambiare la password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" data-testid="password-form">
      <GTextField
        id="password-current"
        label="Password attuale"
        type={type}
        value={currentPassword}
        onChange={setCurrentPassword}
        inputProps={{ autoComplete: 'current-password' }}
        className="sm:col-span-2"
      />
      <GTextField
        id="password-new"
        label="Nuova password"
        type={type}
        value={newPassword}
        onChange={setNewPassword}
        error={weak ? PASSWORD_HINT : undefined}
        hint={PASSWORD_HINT}
        inputProps={{ autoComplete: 'new-password' }}
      />
      <GTextField
        id="password-confirm"
        label="Ripeti la nuova password"
        type={type}
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={mismatch ? 'Le due password non coincidono.' : undefined}
        inputProps={{ autoComplete: 'new-password' }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <label
          htmlFor="password-show"
          className="flex w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ds-ink-muted"
        >
          <input
            id="password-show"
            type="checkbox"
            checked={showPasswords}
            onChange={() => setShowPasswords((v) => !v)}
            aria-controls="password-current password-new password-confirm"
            className={cn('m-0 h-4 w-4 accent-ds-brand', dsFocusRing)}
          />
          Mostra le password
        </label>
        <button
          type="submit"
          disabled={!canSave}
          className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
        >
          {saving ? 'Aggiornamento…' : 'Cambia la password'}
        </button>
      </div>
    </form>
  )
}

// ── Notifiche ─────────────────────────────────────────────────────────

function NotificationsCard() {
  return (
    <ProfileCard
      id="profilo-notifiche"
      title="Notifiche"
      description={
        <>
          I promemoria del Profit Tracker arrivano su Telegram. Li gestisci dalla pagina{' '}
          <Link href="/profit-tracker/promemoria" className={inlineLink}>
            Promemoria
          </Link>
          .
        </>
      }
    >
      <TelegramLinkWidget botUsername={TELEGRAM_BOT_USERNAME} />
    </ProfileCard>
  )
}

// ── Elimina account ───────────────────────────────────────────────────

/**
 * §14.251: cancellazione dell'account da parte dell'utente (art. 17 GDPR). Il riquadro in fondo
 * al profilo apre una finestra di conferma: chi ha una password la ridigita, chi accede solo con
 * Google scrive la parola di conferma. Il backend cancella la riga e tutti i dati collegati,
 * risponde 204 e azzera i cookie; qui si svuota lo store e si torna alla home con una
 * navigazione completa, così il guard dell'area riservata non ha nulla da reindirizzare.
 */
function DeleteAccountCard({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false)
  return (
    <ProfileCard
      id="profilo-elimina"
      title="Elimina account"
      danger
      description="Elimina definitivamente l'account e tutti i dati collegati: collaboratori, conti, wallet, movimenti, giocate, promemoria e collegamento Telegram. L'operazione non si può annullare."
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="delete-account-open"
          className={dsDangerButtonClass('md')}
        >
          Elimina l&apos;account
        </button>
      </div>
      {open && <DeleteAccountDialog user={user} onClose={() => setOpen(false)} />}
    </ProfileCard>
  )
}

/** Montata solo mentre è aperta: i campi ripartono vuoti a ogni apertura. */
function DeleteAccountDialog({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const clearUser = useAuthStore((s) => s.clearUser)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usesPassword = deletionUsesPassword(user)
  const payload = accountDeletionPayload(user, { password, confirm })
  const canDelete = payload !== null && !deleting

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !deleting) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payload || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await authClient.deleteMe(payload)
      toast.success('Account eliminato.')
      clearUser()
      // Navigazione completa, non router.replace: svuota anche lo store in memoria del Profit
      // Tracker con i dati dell'utente appena cancellato e non lascia al guard
      // dell'area riservata il tempo di reindirizzare a /login (stessa scelta del guard su /me).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- ricarica voluta
      window.location.href = '/'
    } catch (err) {
      setError(getErrorMessage(err) || "Impossibile eliminare l'account.")
      setDeleting(false)
    }
  }

  return (
    <DsModal
      open
      onOpenChange={handleOpenChange}
      title="Eliminare l'account?"
      description={
        <>
          Perderai l&apos;accesso a OddWise e tutti i dati del Profit Tracker.{' '}
          {usesPassword
            ? 'Per confermare inserisci la password attuale.'
            : `Per confermare scrivi ${ACCOUNT_DELETE_CONFIRM_WORD} nel campo qui sotto.`}
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        data-testid="delete-account-form"
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
          {usesPassword ? (
            <GTextField
              id="delete-account-password"
              label="Password attuale"
              type="password"
              value={password}
              onChange={setPassword}
              disabled={deleting}
              inputProps={{ autoComplete: 'current-password', autoFocus: true }}
            />
          ) : (
            <GTextField
              id="delete-account-confirm"
              label={`Scrivi ${ACCOUNT_DELETE_CONFIRM_WORD}`}
              value={confirm}
              onChange={setConfirm}
              placeholder={ACCOUNT_DELETE_CONFIRM_WORD}
              disabled={deleting}
              inputProps={{
                autoComplete: 'off',
                autoCapitalize: 'characters',
                spellCheck: false,
                autoFocus: true,
              }}
            />
          )}
          {error && <FieldError id="delete-account-error">{error}</FieldError>}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={!canDelete}
            data-testid="delete-account-submit"
            className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
          >
            {deleting ? 'Eliminazione…' : 'Elimina definitivamente'}
          </button>
        </div>
      </form>
    </DsModal>
  )
}
