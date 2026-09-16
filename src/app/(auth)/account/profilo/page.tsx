'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TelegramLinkWidget } from '@/components/profit-tracker/telegram-link-widget'
import { authClient } from '@/services/api/auth-client'
import type { AuthUser } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorMessage } from '@/lib/error-utils'
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram-bot'

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  USER_ROLE: 'Utente',
  ADMIN_ROLE: 'Amministratore',
}

function getInitials(name: string | undefined, email: string | undefined): string {
  const source = (name ?? email ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AccountProfiloPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <Container className="max-w-3xl space-y-6">
      <header className="border-b border-border/60 pb-3">
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Profilo
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Dati dell&apos;account, sicurezza e notifiche.
        </p>
      </header>

      {user ? (
        <>
          <AccountDataCard key={`${user.id}:${user.name}:${user.username}`} user={user} />
          <SecurityCard />
          <NotificationsCard />
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento del profilo...
        </p>
      )}
    </Container>
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
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-lg font-semibold text-foreground"
        >
          {getInitials(user.name, user.email)}
        </div>
        <div className="min-w-0">
          <CardTitle className="text-lg">{user.name}</CardTitle>
          <CardDescription className="mt-1 truncate">
            @{user.username} · {ROLE_LABEL[user.role]}
            {joinedAt ? ` · iscritto dal ${joinedAt}` : ''}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
          data-testid="profile-form"
        >
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-username">Username</Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user.email} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              L&apos;email è l&apos;identificativo dell&apos;account e non si può cambiare da qui.
            </p>
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" size="sm" disabled={!canSave}>
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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

function SecurityCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword
  const weak = newPassword.length > 0 && !isStrongPassword(newPassword)
  const canSave =
    currentPassword.length > 0 &&
    isStrongPassword(newPassword) &&
    confirmPassword === newPassword &&
    !saving

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sicurezza</CardTitle>
        <CardDescription>
          Cambia la password. Le altre sessioni aperte verranno disconnesse.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
          data-testid="password-form"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="password-current">Password attuale</Label>
            <Input
              id="password-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-new">Nuova password</Label>
            <Input
              id="password-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={weak || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-confirm">Conferma nuova password</Label>
            <Input
              id="password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={mismatch || undefined}
            />
          </div>
          <p
            className={`text-xs sm:col-span-2 ${weak ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {PASSWORD_HINT}
          </p>
          {mismatch && (
            <p className="text-xs text-destructive sm:col-span-2">
              Le due password non coincidono.
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" size="sm" disabled={!canSave}>
              {saving ? 'Aggiornamento...' : 'Cambia password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Notifiche ─────────────────────────────────────────────────────────

function NotificationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifiche</CardTitle>
        <CardDescription>
          I promemoria del Profit Tracker arrivano su Telegram. Li gestisci dalla pagina{' '}
          <Link
            href="/profit-tracker/promemoria"
            className="text-primary underline-offset-2 hover:underline"
          >
            Promemoria
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TelegramLinkWidget botUsername={TELEGRAM_BOT_USERNAME} />
      </CardContent>
    </Card>
  )
}
