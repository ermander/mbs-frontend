'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { contactSchema, type ContactFormData } from '@/lib/validations/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
        <Label htmlFor="contact-name">Nome</Label>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Il tuo nome"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="contact-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">Messaggio</Label>
        <textarea
          id="contact-message"
          rows={4}
          placeholder="Scrivi il tuo messaggio..."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...register('message')}
        />
        {errors.message && (
          <p id="contact-message-error" className="text-sm text-destructive">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Invio in corso...' : 'Invia messaggio'}
      </Button>
    </form>
  )
}
