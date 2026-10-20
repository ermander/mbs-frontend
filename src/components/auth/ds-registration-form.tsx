'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  REGISTRATION_PASSWORD_HINT,
  registrationSchema,
  type RegistrationFormData,
} from '@/lib/validations/auth'
import { authClient } from '@/services/api/auth-client'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { dsFocusRing } from '@/components/landing/ds-primitives'
import {
  DsCallout,
  DsDivider,
  DsField,
  DsFieldError,
  DsFieldHint,
  DsFormButton,
  DsGoogleSignInButton,
  DsInput,
  DsLabel,
} from '@/components/auth/ds-auth-primitives'
import { DsCheckInbox, DsInboxEmail, type ResendState } from '@/components/auth/ds-check-inbox'

const GENERIC_ERROR = 'Registrazione non riuscita per un errore del server. Riprova tra poco.'

type FormError = { kind: 'exists' } | { kind: 'message'; text: string } | null

/** 409 = email già registrata (copy del design); altrimenti il primo messaggio del backend. */
function registrationError(err: unknown): FormError {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return { kind: 'message', text: GENERIC_ERROR }
  }
  const response = (
    err as { response?: { status?: number; data?: { message?: string; errors?: string[] } } }
  ).response
  if (response?.status === 409) return { kind: 'exists' }
  const text = response?.data?.message ?? response?.data?.errors?.[0]
  return { kind: 'message', text: text ?? GENERIC_ERROR }
}

/** Link nel testo del form: brand, brand-hover al passaggio, senza sottolineatura come nel design. */
const inlineLink = cn(
  'rounded-sm text-ds-brand transition-colors hover:text-ds-brand-hover',
  dsFocusRing,
)

/**
 * Registrazione dal design di Claude Design (§14.253): Google, «oppure con email», email e
 * password a 48px con il suggerimento della regola, «Mostra la password», la casella dei 18 anni
 * con termini e informativa, Callout warning «Registrazione non riuscita» sull'errore (409 = email
 * già registrata), «Crea l'account» primary con la freccia. Dopo il 201 la vista «Controlla la
 * posta»: «Invia di nuovo» passa da forgot-password, che per un account non attivo rimanda il
 * link di conferma; «Cambia email» torna al form con i valori di prima.
 */
export function DsRegistrationForm() {
  const [formError, setFormError] = React.useState<FormError>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const [resend, setResend] = React.useState<ResendState>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email: '', password: '', adult: false },
  })

  // Tornando indietro da Google la pagina può riaprirsi dalla bfcache con «Attendi Google…».
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setGooglePending(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const onSubmit = React.useCallback(async (data: RegistrationFormData) => {
    setFormError(null)
    try {
      const response = await authClient.register({
        email: data.email,
        password: data.password,
        username: data.email,
      })
      setResend('idle')
      setSentTo(response.email)
    } catch (err) {
      setFormError(registrationError(err))
    }
  }, [])

  const onResend = React.useCallback(async () => {
    if (!sentTo) return
    setResend('sending')
    try {
      await authClient.requestPasswordReset(sentTo)
      setResend('sent')
    } catch {
      setResend('error')
    }
  }, [sentTo])

  if (sentTo) {
    return (
      <DsCheckInbox
        note="Se non arriva entro un minuto, controlla la posta indesiderata."
        resend={resend}
        onResend={onResend}
        onChangeEmail={() => setSentTo(null)}
      >
        Abbiamo mandato un link di conferma a <DsInboxEmail>{sentTo}</DsInboxEmail>. Aprilo per
        attivare l&apos;account: vale 24 ore.
      </DsCheckInbox>
    )
  }

  const busy = isSubmitting || googlePending

  return (
    <>
      <h1 className="ds-title">Crea il tuo account</h1>
      <p className="mt-2 text-ds-ink-muted">
        Hai già un account?{' '}
        <Link href={LANDING_ROUTES.login} className={inlineLink}>
          Accedi
        </Link>
      </p>

      <div className="mt-8 flex max-w-[440px] flex-col gap-5">
        <DsGoogleSignInButton
          label={googlePending ? 'Attendi Google…' : 'Continua con Google'}
          onClick={() => {
            setFormError(null)
            setGooglePending(true)
          }}
        />
        <DsDivider />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 flex max-w-[440px] flex-col gap-5"
      >
        <DsField>
          <DsLabel htmlFor="register-email">Email</DsLabel>
          <DsInput
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@esempio.it"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email', { onChange: () => setFormError(null) })}
          />
          {errors.email && (
            <DsFieldError id="register-email-error">{errors.email.message}</DsFieldError>
          )}
        </DsField>

        <div>
          <DsField>
            <DsLabel htmlFor="register-password">Password</DsLabel>
            <DsInput
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? 'register-password-error' : 'register-password-hint'
              }
              {...register('password', { onChange: () => setFormError(null) })}
            />
            {errors.password ? (
              <DsFieldError id="register-password-error">{errors.password.message}</DsFieldError>
            ) : (
              <DsFieldHint id="register-password-hint">{REGISTRATION_PASSWORD_HINT}</DsFieldHint>
            )}
          </DsField>
          <label
            htmlFor="register-show-password"
            className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm leading-5 text-ds-ink-muted"
          >
            <input
              id="register-show-password"
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword((v) => !v)}
              aria-controls="register-password"
              className={cn('m-0 h-4 w-4 accent-ds-brand', dsFocusRing)}
            />
            Mostra la password
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <label
            htmlFor="register-adult"
            className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-ds-ink"
          >
            <input
              id="register-adult"
              type="checkbox"
              aria-invalid={Boolean(errors.adult)}
              aria-describedby={errors.adult ? 'register-adult-error' : undefined}
              className={cn('m-0 mt-0.5 h-4 w-4 flex-none accent-ds-brand', dsFocusRing)}
              {...register('adult')}
            />
            <span>
              Ho almeno 18 anni, accetto i{' '}
              <Link href={LANDING_ROUTES.termini} className={inlineLink}>
                termini di servizio
              </Link>{' '}
              e dichiaro di aver letto l&apos;
              <Link href={LANDING_ROUTES.privacy} className={inlineLink}>
                informativa sulla privacy
              </Link>
              .
            </span>
          </label>
          {errors.adult && (
            <p
              id="register-adult-error"
              role="alert"
              className="ml-[26px] text-sm leading-5 text-ds-loss"
            >
              {errors.adult.message}
            </p>
          )}
        </div>

        {formError && (
          <DsCallout title="Registrazione non riuscita">
            {formError.kind === 'exists' ? (
              <>
                Esiste già un account con questa email.{' '}
                <Link href={LANDING_ROUTES.login} className={inlineLink}>
                  Accedi
                </Link>{' '}
                oppure{' '}
                <Link href="/recupero-password" className={inlineLink}>
                  recupera la password
                </Link>
                .
              </>
            ) : (
              formError.text
            )}
          </DsCallout>
        )}

        <div>
          <DsFormButton
            type="submit"
            iconEnd="arrow-right"
            disabled={busy}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? 'Creazione in corso…' : "Crea l'account"}
          </DsFormButton>
        </div>
      </form>

      <p className="mt-8 max-w-[440px] text-sm leading-5 text-ds-ink-muted">
        Continuando con Google accetti i{' '}
        <Link href={LANDING_ROUTES.termini} className={inlineLink}>
          termini di servizio
        </Link>{' '}
        e dichiari di aver letto l&apos;
        <Link href={LANDING_ROUTES.privacy} className={inlineLink}>
          informativa sulla privacy
        </Link>
        .
      </p>
    </>
  )
}
