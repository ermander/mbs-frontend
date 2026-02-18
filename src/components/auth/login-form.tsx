'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
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
        // Mock: no API call; when backend is ready, call API and only login() on success
        login({ email: data.email })
        setSubmitStatus('success')
        setSubmitMessage('Accesso effettuato.')
        router.push('/dashboard')
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
    [login, router],
  )

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
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/recupero-password"
            className="rounded text-xs text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Password dimenticata?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="La tua password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="login-password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Non hai un account?{' '}
        <Link
          href="/registrazione"
          className="rounded text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Registrati
        </Link>
      </p>
    </form>
  )
}
