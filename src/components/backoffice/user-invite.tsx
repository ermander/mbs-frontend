'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, MailCheck } from 'lucide-react'
import { BoChip, BoMuted } from '@/components/backoffice/backoffice-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsModal, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert } from '@/components/profit-tracker/tracker-ds'
import { SECTIONS, type SectionKey } from '@/lib/tools'
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_PRESETS,
  NEW_USER_DEFAULT_SECTIONS,
  addDaysIso,
  backendErrorMessage,
  expiresOnFor,
  italianDay,
  romeToday,
} from '@/lib/backoffice-users'
import {
  createBackofficeUser,
  type BackofficeInviteResult,
} from '@/services/api/backoffice-users-client'

/** Il backend accetta una scadenza fino a 730 giorni da oggi. */
const MAX_EXPIRY_DAYS = 730

/**
 * La durata di un account (§14.383): le scorciatoie 7 / 14 / 30 / 90 giorni / Senza scadenza e
 * il giorno esatto, modificabile. `value` è l'ultimo giorno in cui l'account funziona
 * (`AAAA-MM-GG`, compreso), `null` senza scadenza.
 */
export function ExpiryPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const today = romeToday()
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Durata dell'accesso" className="flex flex-wrap gap-2">
        {EXPIRY_PRESETS.map((p) => {
          const target = expiresOnFor(p.days)
          return (
            <BoChip
              key={p.label}
              pressed={value === target}
              disabled={disabled}
              onClick={() => onChange(target)}
            >
              {p.label}
            </BoChip>
          )
        })}
      </div>
      {value === null ? (
        <BoMuted>L&apos;account non scade: resta attivo finché non lo disattivi.</BoMuted>
      ) : (
        <GTextField
          id={id}
          label="Ultimo giorno"
          type="date"
          size="sm"
          value={value}
          disabled={disabled}
          onChange={(next) => next && onChange(next)}
          inputProps={{ min: today, max: addDaysIso(today, MAX_EXPIRY_DAYS) }}
          hint={
            value < today
              ? 'Questo giorno è passato: scegli da oggi in poi per farlo rientrare.'
              : `Funziona fino al ${italianDay(value)} compreso, poi non entra più.`
          }
          className="sm:max-w-[240px]"
        />
      )}
    </div>
  )
}

/**
 * Il link per scegliere la password, quando la mail non è partita (SMTP non configurato o in
 * errore): l'admin lo copia e lo manda al tester da sé.
 */
export function InviteLinkBox({ url }: { url: string }) {
  const copy = () => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast.success('Link copiato'))
      .catch(() => toast.error('Copia non riuscita: seleziona il link e copialo a mano.'))
  }
  return (
    <div className="flex flex-col gap-2">
      <DsAlert tone="warning">
        La mail di invito non è partita. Copia il link e mandalo tu al tester: vale 7 giorni e
        funziona una volta sola.
      </DsAlert>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          aria-label="Link dell'invito"
          onFocus={(e) => e.currentTarget.select()}
          className="ds-body-sm min-w-0 flex-1 rounded-ds-sm border border-ds-line-strong bg-ds-surface-sunken px-3 py-2 font-mono text-ds-ink"
        />
        <button type="button" onClick={copy} className={dsButtonClass('secondary', 'sm')}>
          <Copy className="h-4 w-4" aria-hidden />
          Copia
        </button>
      </div>
    </div>
  )
}

/** Le sezioni da accendere o spegnere, come chip: le stesse dell'«Abilitazioni». */
function SectionChips({
  value,
  onChange,
  disabled,
}: {
  value: readonly SectionKey[]
  onChange: (next: SectionKey[]) => void
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label="Sezioni abilitate" className="flex flex-wrap gap-2">
      {SECTIONS.map((s) => {
        const on = value.includes(s.key)
        return (
          <BoChip
            key={s.key}
            pressed={on}
            disabled={disabled}
            onClick={() =>
              onChange(
                on
                  ? value.filter((k) => k !== s.key)
                  : SECTIONS.map((x) => x.key).filter((k) => k === s.key || value.includes(k)),
              )
            }
          >
            {s.label}
          </BoChip>
        )
      })}
    </div>
  )
}

const FIELD_LABEL = 'text-sm leading-5 font-semibold text-ds-ink'

/**
 * «Nuovo utente» (§14.383): l'email del tester, il nome se lo si sa, quanto dura l'accesso e le
 * sezioni che può aprire. Il backend crea l'account verificato e senza password e manda la mail
 * con il link per sceglierla; qui si vede poi a chi è partita e fino a quando vale, oppure il link
 * da copiare se la mail non è partita.
 */
export function NewUserModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (result: BackofficeInviteResult) => void
}) {
  // Il contenuto si rimonta a ogni apertura: il modulo riparte pulito.
  return (
    <DsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nuovo utente"
      description="Il tester riceve una mail con il link per scegliere la sua password. Alla scadenza l'account smette di funzionare da solo."
    >
      {open && <NewUserForm onClose={() => onOpenChange(false)} onCreated={onCreated} />}
    </DsModal>
  )
}

function NewUserForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (result: BackofficeInviteResult) => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expiresOn, setExpiresOn] = useState<string | null>(() => expiresOnFor(DEFAULT_EXPIRY_DAYS))
  const [sections, setSections] = useState<SectionKey[]>([...NEW_USER_DEFAULT_SECTIONS])
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BackofficeInviteResult | null>(null)

  const submit = async () => {
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(trimmed ? 'Email non valida' : "Inserisci l'email")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createBackofficeUser({
        email: trimmed,
        name: name.trim() || undefined,
        expiresOn,
        sections,
      })
      setResult(created)
      onCreated(created)
    } catch (err) {
      setError(backendErrorMessage(err) ?? 'Account non creato: riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const until = result.user.expires_on
      ? `fino al ${italianDay(result.user.expires_on)} compreso`
      : 'senza scadenza'
    return (
      <>
        <div className="flex flex-col gap-3">
          <p className="ds-body m-0 flex items-start gap-2 text-ds-ink">
            <MailCheck className="mt-0.5 h-5 w-5 flex-none text-ds-profit" aria-hidden />
            <span>
              Account creato per <b className="font-semibold wrap-anywhere">{result.user.email}</b>,{' '}
              {until}.{result.emailSent && ' La mail di invito è partita.'}
            </span>
          </p>
          {result.emailSent ? (
            <BoMuted>
              Il link per scegliere la password vale 7 giorni. Se scade prima che lo usi, lo rimandi
              da «Abilitazioni».
            </BoMuted>
          ) : (
            <InviteLinkBox url={result.inviteUrl} />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={dsButtonClass('primary', 'md')}>
            Fatto
          </button>
        </div>
      </>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-5"
    >
      <GTextField
        id="new-user-email"
        label="Email"
        type="email"
        value={email}
        onChange={(v) => {
          setEmail(v)
          setEmailError(null)
        }}
        placeholder="nome@esempio.it"
        error={emailError ?? undefined}
        disabled={busy}
        inputProps={{ autoComplete: 'off', autoFocus: true, maxLength: 254 }}
      />
      <GTextField
        id="new-user-name"
        label="Nome"
        optional
        value={name}
        onChange={setName}
        placeholder="Mario Rossi"
        disabled={busy}
        inputProps={{ autoComplete: 'off', maxLength: 100 }}
      />
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Durata dell&apos;accesso</span>
        <ExpiryPicker
          id="new-user-expiry"
          value={expiresOn}
          onChange={setExpiresOn}
          disabled={busy}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Sezioni</span>
        <SectionChips value={sections} onChange={setSections} disabled={busy} />
        <BoMuted>
          Già scelte quelle di un nuovo iscritto. Le cambi anche dopo, da «Abilitazioni».
        </BoMuted>
      </div>
      {error && <DsAlert>{error}</DsAlert>}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className={dsButtonClass('secondary', 'md')}
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy || undefined}
          className={dsButtonClass('primary', 'md')}
        >
          {busy ? 'Creazione…' : 'Crea e invia invito'}
        </button>
      </div>
    </form>
  )
}
