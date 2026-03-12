'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'
import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
          router.push('/dashboard')
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitStatus === 'success' && (
        <p className="text-sm text-primary" role="status">
          {submitMessage}
        </p>
      )}
      {submitStatus === 'success' && (
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="rounded text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Accedi
          </Link>
        </p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          {submitMessage}
        </p>
      )}

      {submitStatus !== 'success' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nuova password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="Almeno 8 caratteri"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'reset-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="reset-password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Conferma password</Label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Ripeti la password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="reset-confirm-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : 'Aggiorna password'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/recupero-password"
              className="rounded text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Torna al recupero password
            </Link>
          </p>
        </>
      )}
    </form>
  )
}
