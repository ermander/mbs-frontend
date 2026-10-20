'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'
import { recoveryErrorMessage } from '@/lib/password-recovery'
import { authClient } from '@/services/api/auth-client'
import {
  DsCallout,
  DsField,
  DsFieldError,
  DsFormButton,
  DsInput,
  DsLabel,
} from '@/components/auth/ds-auth-primitives'
import { DsCheckInbox, DsInboxEmail, type ResendState } from '@/components/auth/ds-check-inbox'

const GENERIC_ERROR = 'Invio non riuscito per un errore del server. Riprova tra poco.'

/**
 * Recupero password dal design di Claude Design (§14.257): titolo, una riga su cosa succede e la
 * card con l'email a 48px e «Inviami il link» primary a tutta larghezza. Il backend risponde
 * sempre 200 se l'email esiste o no; dopo l'invio la vista «Controlla la posta»: «Invia di nuovo»
 * richiama forgot-password, «Cambia email» torna al form con l'indirizzo di prima. Sull'errore
 * (rete, 500, 429 del limitatore) un Callout warning sopra il pulsante.
 */
export function DsForgotPasswordForm() {
  const [formError, setFormError] = React.useState('')
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const [resend, setResend] = React.useState<ResendState>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = React.useCallback(async (data: ForgotPasswordFormData) => {
    setFormError('')
    try {
      await authClient.requestPasswordReset(data.email)
      setResend('idle')
      setSentTo(data.email)
    } catch (err) {
      setFormError(recoveryErrorMessage(err, GENERIC_ERROR))
    }
  }, [])

  const onResend = React.useCallback(async () => {
    if (!sentTo) return
    setResend('sending')
    try {
      await authClient.requestPasswordReset(sentTo)
      setResend('sent')
    } catch {
      setResend('error')
    }
  }, [sentTo])

  if (sentTo) {
    return (
      <DsCheckInbox
        note="Se non arriva entro un minuto, controlla la posta indesiderata o verifica di aver scritto l'indirizzo giusto."
        resend={resend}
        onResend={onResend}
        onChangeEmail={() => setSentTo(null)}
      >
        Se <DsInboxEmail>{sentTo}</DsInboxEmail> è registrata, riceverai un link per cambiare la
        password. Vale 60 minuti e funziona una volta sola.
      </DsCheckInbox>
    )
  }

  return (
    <>
      <h1 className="ds-title">Recupera la password</h1>
      <p className="mt-2 text-ds-ink-muted [text-wrap:pretty]">
        Scrivi l&apos;email con cui ti sei registrato. Ti mandiamo un link per scegliere una
        password nuova.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 flex flex-col gap-5 rounded-ds-lg border border-ds-line bg-ds-surface-raised p-6 shadow-ds-sm sm:p-8"
      >
        <DsField>
          <DsLabel htmlFor="forgot-email">Email</DsLabel>
          <DsInput
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@esempio.it"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            {...register('email', { onChange: () => setFormError('') })}
          />
          {errors.email && (
            <DsFieldError id="forgot-email-error">{errors.email.message}</DsFieldError>
          )}
        </DsField>

        {formError && <DsCallout title="Invio non riuscito">{formError}</DsCallout>}

        <DsFormButton
          type="submit"
          block
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting ? 'Invio in corso…' : 'Inviami il link'}
        </DsFormButton>
      </form>
    </>
  )
}
