'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { registrationSchema, type RegistrationFormData } from '@/lib/validations/auth'
import { authClient } from '@/services/api/auth-client'
import {
  AuthButton,
  AuthCheckbox,
  AuthField,
  AuthInput,
  AuthLabel,
  AuthLink,
  AuthMessage,
  FieldError,
} from '@/components/auth/auth-primitives'

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
      name: '',
      surname: '',
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
      const response = await authClient.register({
        email: data.email,
        password: data.password,
        name: `${data.name} ${data.surname}`.trim(),
        username: data.email,
      })

      setSubmitStatus('success')
      setSubmitMessage(
        `Registrazione completata. Ti abbiamo inviato una mail di verifica a ${response.email}. ` +
          'Controlla la tua casella (anche spam) e clicca il link per confermare il tuo account.',
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitStatus === 'success' && <AuthMessage tone="success">{submitMessage}</AuthMessage>}
      {submitStatus === 'error' && <AuthMessage tone="error">{submitMessage}</AuthMessage>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <AuthField>
          <AuthLabel htmlFor="name">Nome</AuthLabel>
          <AuthInput
            id="name"
            type="text"
            autoComplete="given-name"
            placeholder="Mario"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          {errors.name && <FieldError id="name-error">{errors.name.message}</FieldError>}
        </AuthField>

        <AuthField>
          <AuthLabel htmlFor="surname">Cognome</AuthLabel>
          <AuthInput
            id="surname"
            type="text"
            autoComplete="family-name"
            placeholder="Rossi"
            aria-invalid={Boolean(errors.surname)}
            aria-describedby={errors.surname ? 'surname-error' : undefined}
            {...register('surname')}
          />
          {errors.surname && <FieldError id="surname-error">{errors.surname.message}</FieldError>}
        </AuthField>
      </div>

      <AuthField>
        <AuthLabel htmlFor="email">Email</AuthLabel>
        <AuthInput
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && <FieldError id="email-error">{errors.email.message}</FieldError>}
      </AuthField>

      <AuthField>
        <AuthLabel htmlFor="password">Password</AuthLabel>
        <AuthInput
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Almeno 8 caratteri"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && <FieldError id="password-error">{errors.password.message}</FieldError>}
      </AuthField>

      <AuthField>
        <AuthLabel htmlFor="confirmPassword">Conferma password</AuthLabel>
        <AuthInput
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Ripeti la password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <FieldError id="confirmPassword-error">{errors.confirmPassword.message}</FieldError>
        )}
      </AuthField>

      <AuthField>
        <div className="flex items-start gap-3">
          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <AuthCheckbox
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
          <AuthLabel
            htmlFor="terms"
            className="cursor-pointer font-normal leading-[1.5] text-ow-text-3"
          >
            Accetto i <AuthLink href="/termini">Termini di servizio</AuthLink> e la{' '}
            <AuthLink href="/privacy">Privacy policy</AuthLink>
          </AuthLabel>
        </div>
        {errors.terms && <FieldError id="terms-error">{errors.terms.message}</FieldError>}
      </AuthField>

      <AuthButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
      </AuthButton>

      <p className="text-center text-sm text-ow-text-3">
        Hai già un account? <AuthLink href="/login">Accedi</AuthLink>
      </p>
    </form>
  )
}
