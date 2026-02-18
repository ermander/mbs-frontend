'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { registrationSchema, type RegistrationFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export function RegistrationForm() {
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  })

  const onSubmit = React.useCallback(async (data: RegistrationFormData) => {
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      // Placeholder: replace with apiClient.post('/auth/register', data) when backend is ready
      console.log('Registration data:', data)
      setSubmitStatus('success')
      setSubmitMessage(
        'Registrazione in sviluppo. Controlla la tua email quando il backend sarà attivo.',
      )
    } catch (err) {
      setSubmitStatus('error')
      setSubmitMessage(
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'Errore durante la registrazione. Riprova.')
          : 'Errore durante la registrazione. Riprova.',
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Almeno 8 caratteri"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Conferma password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Ripeti la password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="confirmPassword-error" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="terms"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? 'terms-error' : undefined}
              />
            )}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className={cn('cursor-pointer text-sm font-normal text-muted-foreground')}
            >
              Accetto i{' '}
              <Link
                href="/termini"
                className="text-primary underline underline-offset-4 hover:text-primary/90"
              >
                Termini di servizio
              </Link>{' '}
              e la{' '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:text-primary/90"
              >
                Privacy policy
              </Link>
            </Label>
            {errors.terms && (
              <p id="terms-error" className="text-sm text-destructive">
                {errors.terms.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Hai già un account?{' '}
        <Link
          href="/login"
          className="rounded text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Accedi
        </Link>
      </p>
    </form>
  )
}
