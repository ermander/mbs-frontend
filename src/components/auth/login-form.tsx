'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuthStore } from '@/stores/auth-store'
import { authClient } from '@/services/api/auth-client'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import {
  AuthButton,
  AuthField,
  AuthInput,
  AuthLabel,
  AuthLink,
  AuthMessage,
  FieldError,
} from '@/components/auth/auth-primitives'

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo = POST_AUTH_REDIRECT }: LoginFormProps) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = React.useCallback(
    async (data: LoginFormData) => {
      setSubmitStatus('idle')
      setSubmitMessage('')
      try {
        const response = await authClient.login({
          email: data.email,
          password: data.password,
        })
        setUser(response.user)
        setSubmitStatus('success')
        setSubmitMessage('Accesso effettuato.')
        router.push(redirectTo)
      } catch (err) {
        setSubmitStatus('error')
        setSubmitMessage(
          err && typeof err === 'object' && 'response' in err
            ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
                "Errore durante l'accesso. Riprova.")
            : "Errore durante l'accesso. Riprova.",
        )
      }
    },
    [router, setUser, redirectTo],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitStatus === 'success' && <AuthMessage tone="success">{submitMessage}</AuthMessage>}
      {submitStatus === 'error' && <AuthMessage tone="error">{submitMessage}</AuthMessage>}

      <AuthField>
        <AuthLabel htmlFor="login-email">Email</AuthLabel>
        <AuthInput
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && <FieldError id="login-email-error">{errors.email.message}</FieldError>}
      </AuthField>

      <AuthField>
        <div className="flex items-center justify-between">
          <AuthLabel htmlFor="login-password">Password</AuthLabel>
          <AuthLink href="/recupero-password" className="text-[13px]">
            Password dimenticata?
          </AuthLink>
        </div>
        <AuthInput
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="La tua password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <FieldError id="login-password-error">{errors.password.message}</FieldError>
        )}
      </AuthField>

      <AuthButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
      </AuthButton>

      <p className="text-center text-sm text-ow-text-3">
        Non hai un account? <AuthLink href="/registrazione">Registrati</AuthLink>
      </p>
    </form>
  )
}
