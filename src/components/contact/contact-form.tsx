'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { contactSchema, type ContactFormData } from '@/lib/validations/contact'
import {
  AuthButton,
  AuthField,
  AuthInput,
  AuthLabel,
  AuthMessage,
  AuthTextarea,
  FieldError,
} from '@/components/auth/auth-primitives'

export function ContactForm() {
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  })

  const onSubmit = React.useCallback(async (data: ContactFormData) => {
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      // Placeholder: replace with api call when backend is ready
      console.log('Contact form:', data)
      setSubmitStatus('success')
      setSubmitMessage('Messaggio inviato. Ti risponderemo al più presto.')
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
        <AuthLabel htmlFor="contact-name">Nome</AuthLabel>
        <AuthInput
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Il tuo nome"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && <FieldError id="contact-name-error">{errors.name.message}</FieldError>}
      </AuthField>

      <AuthField>
        <AuthLabel htmlFor="contact-email">Email</AuthLabel>
        <AuthInput
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && <FieldError id="contact-email-error">{errors.email.message}</FieldError>}
      </AuthField>

      <AuthField>
        <AuthLabel htmlFor="contact-message">Messaggio</AuthLabel>
        <AuthTextarea
          id="contact-message"
          rows={5}
          placeholder="Scrivi il tuo messaggio..."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          {...register('message')}
        />
        {errors.message && (
          <FieldError id="contact-message-error">{errors.message.message}</FieldError>
        )}
      </AuthField>

      <AuthButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Invio in corso...' : 'Invia messaggio'}
      </AuthButton>
    </form>
  )
}
