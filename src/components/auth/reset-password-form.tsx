'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'
import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
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

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = React.useCallback(
    async (data: ResetPasswordFormData) => {
      setSubmitStatus('idle')
      setSubmitMessage('')
      try {
        const response = await authClient.resetPassword({
          token,
          password: data.password,
        })
        setSubmitStatus('success')
        setSubmitMessage('Password aggiornata. Puoi accedere con la nuova password.')
        if (response.user) {
          setUser(response.user)
          router.push(POST_AUTH_REDIRECT)
        }
      } catch (err) {
        setSubmitStatus('error')
        setSubmitMessage(
          err && typeof err === 'object' && 'response' in err
            ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
                "Errore durante l'aggiornamento. Riprova.")
            : "Errore durante l'aggiornamento. Riprova.",
        )
      }
    },
    [token, setUser, router],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitStatus === 'success' && <AuthMessage tone="success">{submitMessage}</AuthMessage>}
      {submitStatus === 'success' && (
        <p className="text-center text-sm text-ow-text-3">
          <AuthLink href="/login">Accedi</AuthLink>
        </p>
      )}
      {submitStatus === 'error' && <AuthMessage tone="error">{submitMessage}</AuthMessage>}

      {submitStatus !== 'success' && (
        <>
          <AuthField>
            <AuthLabel htmlFor="reset-password">Nuova password</AuthLabel>
            <AuthInput
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="Almeno 8 caratteri"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'reset-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <FieldError id="reset-password-error">{errors.password.message}</FieldError>
            )}
          </AuthField>

          <AuthField>
            <AuthLabel htmlFor="reset-confirm">Conferma password</AuthLabel>
            <AuthInput
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Ripeti la password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <FieldError id="reset-confirm-error">{errors.confirmPassword.message}</FieldError>
            )}
          </AuthField>

          <AuthButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : 'Aggiorna password'}
          </AuthButton>

          <p className="text-center text-sm text-ow-text-3">
            <AuthLink href="/recupero-password">Torna al recupero password</AuthLink>
          </p>
        </>
      )}
    </form>
  )
}
