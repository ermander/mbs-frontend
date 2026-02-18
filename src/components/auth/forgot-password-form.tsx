'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      // Placeholder: replace with apiClient.post('/auth/forgot-password', { email: data.email })
      console.log('Forgot password request:', data.email)
      setSubmitStatus('success')
      setSubmitMessage(SUCCESS_MESSAGE)
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitStatus === 'success' && (
        <p className="text-sm text-primary" role="status">
          {submitMessage}
        </p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          {submitMessage}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="forgot-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Invio in corso...' : 'Invia link'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="rounded text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Torna al login
        </Link>
      </p>
    </form>
  )
}
