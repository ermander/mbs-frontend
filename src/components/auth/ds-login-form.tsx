'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuthStore } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { dsFocusRing } from '@/components/landing/ds-primitives'
import {
  DsCallout,
  DsDivider,
  DsField,
  DsFieldError,
  DsFormButton,
  DsGoogleSignInButton,
  DsInput,
  DsLabel,
} from '@/components/auth/ds-auth-primitives'

const WRONG_CREDENTIALS = 'Email o password non corretti. Riprova o recupera la password.'
const GENERIC_ERROR = "Errore durante l'accesso. Riprova."

/** Il testo del Callout: il copy del design sul 401, altrimenti il messaggio del backend. */
function loginErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return GENERIC_ERROR
  const response = (err as { response?: { status?: number; data?: { message?: string } } }).response
  if (response?.status === 401) return WRONG_CREDENTIALS
  return response?.data?.message ?? GENERIC_ERROR
}

/** Link nel testo del form: brand, brand-hover al passaggio, senza sottolineatura come nel design. */
const inlineLink = cn(
  'rounded-sm text-ds-brand transition-colors hover:text-ds-brand-hover',
  dsFocusRing,
)

/**
 * Form di accesso dal design di Claude Design (§14.252): Google, «oppure con email», email e
 * password a 48px, «Mostra la password» come casella (al posto dell'occhio) accanto a «Password
 * dimenticata?», Callout warning «Accesso non riuscito» sull'errore, «Accedi» primary con la
 * freccia. La logica è quella di prima: loginSchema, authClient.login, utente nello store e
 * router.push verso POST_AUTH_REDIRECT.
 */
export function DsLoginForm({ redirectTo = POST_AUTH_REDIRECT }: { redirectTo?: string }) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [formError, setFormError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = React.useCallback(
    async (data: LoginFormData) => {
      setFormError('')
      try {
        const response = await authClient.login({ email: data.email, password: data.password })
        setUser(response.user)
        router.push(redirectTo)
      } catch (err) {
        setFormError(loginErrorMessage(err))
      }
    },
    [router, setUser, redirectTo],
  )

  return (
    <>
      <h1 className="ds-title">Accedi</h1>
      <p className="mt-2 text-ds-ink-muted">
        Non hai un account?{' '}
        <Link href={LANDING_ROUTES.register} className={inlineLink}>
          Inizia gratis
        </Link>
      </p>

      <div className="mt-8 flex max-w-[440px] flex-col gap-5">
        <DsGoogleSignInButton />
        <DsDivider />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 flex max-w-[440px] flex-col gap-5"
      >
        <DsField>
          <DsLabel htmlFor="login-email">Email</DsLabel>
          <DsInput
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@esempio.it"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email', { onChange: () => setFormError('') })}
          />
          {errors.email && (
            <DsFieldError id="login-email-error">{errors.email.message}</DsFieldError>
          )}
        </DsField>

        <div>
          <DsField>
            <DsLabel htmlFor="login-password">Password</DsLabel>
            <DsInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password', { onChange: () => setFormError('') })}
            />
            {errors.password && (
              <DsFieldError id="login-password-error">{errors.password.message}</DsFieldError>
            )}
          </DsField>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm leading-5">
            <label
              htmlFor="login-show-password"
              className="flex cursor-pointer items-center gap-2 text-ds-ink-muted"
            >
              <input
                id="login-show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((v) => !v)}
                aria-controls="login-password"
                className={cn('m-0 h-4 w-4 accent-ds-brand', dsFocusRing)}
              />
              Mostra la password
            </label>
            <Link href="/recupero-password" className={inlineLink}>
              Password dimenticata?
            </Link>
          </div>
        </div>

        {formError && <DsCallout title="Accesso non riuscito">{formError}</DsCallout>}

        <div>
          <DsFormButton
            type="submit"
            iconEnd="arrow-right"
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? 'Accesso in corso…' : 'Accedi'}
          </DsFormButton>
        </div>
      </form>

      <p className="mt-8 max-w-[440px] text-sm leading-5 text-ds-ink-muted">
        Accedendo accetti i{' '}
        <Link href={LANDING_ROUTES.termini} className={inlineLink}>
          termini di servizio
        </Link>{' '}
        e l&apos;
        <Link href={LANDING_ROUTES.privacy} className={inlineLink}>
          informativa sulla privacy
        </Link>
        .
      </p>
    </>
  )
}
