'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

import { DsCallout, DsFormButton } from '@/components/auth/ds-auth-primitives'

export type ResendState = 'idle' | 'sending' | 'sent' | 'error'

const RESEND_LABEL: Record<ResendState, string> = {
  idle: 'Invia di nuovo',
  sending: 'Invio in corso…',
  sent: 'Email inviata di nuovo',
  error: 'Invio non riuscito, riprova',
}

/**
 * «Controlla la posta» dei design di registrazione (§14.253) e recupero password (§14.257):
 * orologio da 32px, titolo, il testo in body-lg (`children`, con l'indirizzo in grassetto),
 * Callout note, «Invia di nuovo» secondary e «Cambia email» ghost. Il titolo prende il fuoco,
 * così il lettore di schermo annuncia il cambio di vista.
 */
export function DsCheckInbox({
  note,
  resend,
  onResend,
  onChangeEmail,
  children,
}: {
  note: React.ReactNode
  resend: ResendState
  onResend: () => void
  onChangeEmail: () => void
  children: React.ReactNode
}) {
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="max-w-[440px]">
      <Clock className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
      <h1 ref={headingRef} tabIndex={-1} className="ds-title mt-4 outline-none">
        Controlla la posta
      </h1>
      <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">{children}</p>
      <div className="mt-6">
        <DsCallout tone="note" title="Nota">
          {note}
        </DsCallout>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
        <DsFormButton
          variant="secondary"
          size="md"
          onClick={onResend}
          disabled={resend === 'sending' || resend === 'sent'}
        >
          {RESEND_LABEL[resend]}
        </DsFormButton>
        <DsFormButton variant="ghost" size="md" onClick={onChangeEmail}>
          Cambia email
        </DsFormButton>
      </div>
    </div>
  )
}

/** L'indirizzo dentro il testo: ink a 600, a capo dove serve sui telefoni. */
export function DsInboxEmail({ children }: { children: React.ReactNode }) {
  return <b className="font-semibold text-ds-ink [overflow-wrap:anywhere]">{children}</b>
}
