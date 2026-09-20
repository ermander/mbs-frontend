'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { authClient } from '@/services/api/auth-client'
import {
  AuthButton,
  AuthField,
  AuthInput,
  AuthLabel,
  AuthLink,
  AuthMessage,
  FieldError,
} from '@/components/auth/auth-primitives'

const SUCCESS_MESSAGE =
  "Se l'email è associata a un account, riceverai a breve un link per reimpostare la password. Controlla anche la cartella spam."

export function ForgotPasswordForm() {
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = React.useCallback(async (data: ForgotPasswordFormData) => {
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      const res = await authClient.requestPasswordReset(data.email)
      setSubmitStatus('success')
      setSubmitMessage(res.message ?? SUCCESS_MESSAGE)
    } catch (err) {
      setSubmitStatus('error')
      setSubmitMessage(
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
              "Errore durante l'invio. Riprova.")
          : "Errore durante l'invio. Riprova.",
      )
    }
  }, [])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitStatus === 'success' && <AuthMessage tone="success">{submitMessage}</AuthMessage>}
      {submitStatus === 'error' && <AuthMessage tone="error">{submitMessage}</AuthMessage>}

      <AuthField>
        <AuthLabel htmlFor="forgot-email">Email</AuthLabel>
        <AuthInput
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && <FieldError id="forgot-email-error">{errors.email.message}</FieldError>}
      </AuthField>

      <AuthButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Invio in corso...' : 'Invia link'}
      </AuthButton>

      <p className="text-center text-sm text-ow-text-3">
        <AuthLink href="/login">Torna al login</AuthLink>
      </p>
    </form>
  )
}
