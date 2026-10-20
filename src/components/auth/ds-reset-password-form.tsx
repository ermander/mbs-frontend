'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, Link2Off } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  REGISTRATION_PASSWORD_HINT,
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/lib/validations/auth'
import { isDeadResetLink, recoveryErrorMessage } from '@/lib/password-recovery'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { DsButton, dsFocusRing } from '@/components/landing/ds-primitives'
import {
  DsCallout,
  DsField,
  DsFieldError,
  DsFieldHint,
  DsFormButton,
  DsInput,
  DsLabel,
} from '@/components/auth/ds-auth-primitives'

const RECOVERY_PATH = '/recupero-password'
const GENERIC_ERROR = 'Salvataggio non riuscito per un errore del server. Riprova tra poco.'

/** Link nel testo del form: brand, brand-hover al passaggio, senza sottolineatura come nel design. */
const inlineLink = cn(
  'rounded-sm text-ds-brand transition-colors hover:text-ds-brand-hover',
  dsFocusRing,
)

/**
 * Il link aperto dall'email: si controlla appena la pagina si apre (§14.257). `email` null
 * quando il controllo non ha risposto (rete, 429, backend senza la rotta): si va avanti senza.
 */
type LinkCheck =
  | { status: 'checking' }
  | { status: 'valid'; email: string | null }
  | { status: 'dead' }

type FormError = { kind: 'dead' } | { kind: 'message'; text: string } | null

/**
 * Reimposta password dal design di Claude Design (§14.257). All'apertura POST
 * /auth/reset-password/check: link scaduto o già usato → vista «Link non valido» con «Richiedi un
 * nuovo link»; link buono → «Scegli una password nuova» con l'email dell'account, la password
 * due volte con la regola del backend e «Mostra le password». Se il link muore fra il controllo e
 * il salvataggio, Callout warning «Link non valido» nel form, come nel design. Dopo il 200 il
 * backend ha già fatto entrare l'utente (cookie e utente nella risposta) e scollegato gli altri
 * dispositivi (token_version): vista «Password cambiata» con il pulsante verso il tracker.
 */
export function DsResetPasswordForm({ token }: { token: string }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [link, setLink] = React.useState<LinkCheck>(() =>
    token ? { status: 'checking' } : { status: 'dead' },
  )
  const [formError, setFormError] = React.useState<FormError>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [done, setDone] = React.useState(false)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    authClient
      .checkPasswordResetToken(token)
      .then(({ email }) => {
        if (!cancelled) setLink({ status: 'valid', email })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLink(isDeadResetLink(err) ? { status: 'dead' } : { status: 'valid', email: null })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = React.useCallback(
    async (data: ResetPasswordFormData) => {
      setFormError(null)
      try {
        const response = await authClient.resetPassword({ token, password: data.password })
        if (response.user) setUser(response.user)
        setDone(true)
      } catch (err) {
        setFormError(
          isDeadResetLink(err)
            ? { kind: 'dead' }
            : { kind: 'message', text: recoveryErrorMessage(err, GENERIC_ERROR) },
        )
      }
    },
    [token, setUser],
  )

  if (done) return <PasswordChanged />
  if (link.status === 'dead') return <DeadLink />

  const clearError = () => setFormError(null)

  return (
    <>
      <h1 className="ds-title">Scegli una password nuova</h1>
      <p className="mt-2 text-ds-ink-muted" aria-live="polite">
        {link.status === 'checking' ? (
          'Controllo il link…'
        ) : link.email ? (
          <>
            Per l&apos;account{' '}
            <b className="font-semibold text-ds-ink [overflow-wrap:anywhere]">{link.email}</b>.
          </>
        ) : (
          'Scegli la password con cui accederai da adesso.'
        )}
      </p>

      {link.status === 'valid' && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-8 flex flex-col gap-5 rounded-ds-lg border border-ds-line bg-ds-surface-raised p-6 shadow-ds-sm sm:p-8"
        >
          {/* Il nome utente per i gestori di password: sanno a quale account salvare la nuova. */}
          {link.email && (
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={link.email}
              readOnly
              hidden
            />
          )}

          <DsField>
            <DsLabel htmlFor="reset-password">Nuova password</DsLabel>
            <DsInput
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'reset-password-error' : 'reset-password-hint'}
              {...register('password', { onChange: clearError })}
            />
            {errors.password ? (
              <DsFieldError id="reset-password-error">{errors.password.message}</DsFieldError>
            ) : (
              <DsFieldHint id="reset-password-hint">{REGISTRATION_PASSWORD_HINT}</DsFieldHint>
            )}
          </DsField>

          <div>
            <DsField>
              <DsLabel htmlFor="reset-confirm">Ripeti la password</DsLabel>
              <DsInput
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                {...register('confirmPassword', { onChange: clearError })}
              />
              {errors.confirmPassword && (
                <DsFieldError id="reset-confirm-error">
                  {errors.confirmPassword.message}
                </DsFieldError>
              )}
            </DsField>
            <label
              htmlFor="reset-show-password"
              className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ds-ink-muted"
            >
              <input
                id="reset-show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((v) => !v)}
                aria-controls="reset-password reset-confirm"
                className={cn('m-0 h-4 w-4 accent-ds-brand', dsFocusRing)}
              />
              Mostra le password
            </label>
          </div>

          {formError && (
            <DsCallout
              title={formError.kind === 'dead' ? 'Link non valido' : 'Salvataggio non riuscito'}
            >
              {formError.kind === 'dead' ? (
                <>
                  Questo link è scaduto o è già stato usato. Richiedi un nuovo link dalla{' '}
                  <Link href={RECOVERY_PATH} className={inlineLink}>
                    pagina di recupero
                  </Link>
                  .
                </>
              ) : (
                formError.text
              )}
            </DsCallout>
          )}

          <DsFormButton
            type="submit"
            block
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? 'Salvataggio…' : 'Salva la nuova password'}
          </DsFormButton>
        </form>
      )}
    </>
  )
}

/** Titolo che prende il fuoco al cambio di vista, perché il lettore di schermo lo annunci. */
function FocusedTitle({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <h1 ref={ref} tabIndex={-1} className="ds-title mt-4 outline-none">
      {children}
    </h1>
  )
}

/** Link scaduto, già usato o senza token, già all'apertura: nessun form da riempire per niente. */
function DeadLink() {
  return (
    <div>
      <Link2Off className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
      <FocusedTitle>Link non valido</FocusedTitle>
      <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
        Questo link è scaduto o è già stato usato. I link per cambiare la password valgono 60 minuti
        e funzionano una volta sola.
      </p>
      <div className="mt-6">
        <DsButton href={RECOVERY_PATH} variant="primary" size="lg" iconEnd="arrow-right">
          Richiedi un nuovo link
        </DsButton>
      </div>
    </div>
  )
}

/** Dopo il 200: l'utente è già dentro con la password nuova. */
function PasswordChanged() {
  return (
    <div>
      <Check className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
      <FocusedTitle>Password cambiata</FocusedTitle>
      <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
        Da adesso usi la nuova password e sei già dentro. Gli altri dispositivi collegati sono stati
        scollegati.
      </p>
      <div className="mt-6">
        <DsButton href={POST_AUTH_REDIRECT} variant="primary" size="lg" iconEnd="arrow-right">
          Vai al tracker
        </DsButton>
      </div>
    </div>
  )
}
