'use client'

import * as React from 'react'
import { CircleCheck, Clock, Link2Off, TriangleAlert } from 'lucide-react'

import { verifyEmailOnce, verifyFailureOf } from '@/lib/email-verification'
import { isDeadResetLink, recoveryErrorMessage } from '@/lib/password-recovery'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { DsButton } from '@/components/landing/ds-primitives'
import { DsCallout, DsFormButton } from '@/components/auth/ds-auth-primitives'
import { DsInboxEmail } from '@/components/auth/ds-check-inbox'

const VERIFY_ERROR =
  'Non siamo riusciti a controllare il link per un errore del server. Riprova tra poco.'
const RESEND_ERROR = 'Il nuovo link non è partito per un errore del server. Riprova tra poco.'

type View =
  | { step: 'verifying' }
  | { step: 'verified'; email: string }
  | { step: 'expired'; email: string; sending: boolean; error: string | null }
  | { step: 'resent'; email: string }
  | { step: 'dead' }
  | { step: 'error'; message: string }

/**
 * Convalida dell'email dal design di Claude Design (artifact QDTUn7GYt7LBfr1rpVB6Jz, §14.258).
 * All'apertura POST /auth/verify-email con il token del link: 200 → «Email confermata» (il backend
 * ha già fatto entrare l'utente); 400 con l'email → «Il link non vale più» con «Inviami un nuovo
 * link», che sostituisce il token e porta a «Nuovo link inviato»; 400 senza email (già usato,
 * sostituito o inesistente) e pagina senza token → la stessa vista senza email e senza reinvio,
 * con l'accesso; rete, 500 o 429 → «Verifica non riuscita» con «Riprova».
 */
export function DsVerifyEmail({ token }: { token: string }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [view, setView] = React.useState<View>(() =>
    token ? { step: 'verifying' } : { step: 'dead' },
  )
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    verifyEmailOnce(token)
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setView({ step: 'verified', email: res.user.email })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const failure = verifyFailureOf(err)
        setView(
          failure.kind === 'expired'
            ? { step: 'expired', email: failure.email, sending: false, error: null }
            : failure.kind === 'dead'
              ? { step: 'dead' }
              : { step: 'error', message: recoveryErrorMessage(err, VERIFY_ERROR) },
        )
      })
    return () => {
      cancelled = true
    }
  }, [token, attempt, setUser])

  const retry = () => {
    setView({ step: 'verifying' })
    setAttempt((n) => n + 1)
  }

  const resend = async (email: string) => {
    setView({ step: 'expired', email, sending: true, error: null })
    try {
      const res = await authClient.resendVerificationEmail(token)
      setView({ step: 'resent', email: res.email })
    } catch (err) {
      setView(
        isDeadResetLink(err)
          ? { step: 'dead' }
          : {
              step: 'expired',
              email,
              sending: false,
              error: recoveryErrorMessage(err, RESEND_ERROR),
            },
      )
    }
  }

  switch (view.step) {
    case 'verifying':
      return <Verifying />
    case 'verified':
      return (
        <div key="verified">
          <CircleCheck className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
          <FocusedTitle>Email confermata</FocusedTitle>
          <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
            L&apos;account <DsInboxEmail>{view.email}</DsInboxEmail> è attivo. Il posto giusto da
            cui partire è la prima guida: mezz&apos;ora, deposito di 10 €, il conto lo fa il sito.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DsButton href={LANDING_ROUTES.guide} variant="primary" size="lg" iconEnd="arrow-right">
              Apri la prima guida
            </DsButton>
            <DsButton href={POST_AUTH_REDIRECT} variant="ghost" size="lg">
              Vai al tracker
            </DsButton>
          </div>
        </div>
      )
    case 'expired':
      return (
        <div key="expired">
          <TriangleAlert className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
          <FocusedTitle>Il link non vale più</FocusedTitle>
          <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
            È scaduto o è già stato usato. L&apos;account non è ancora attivo: chiedi un nuovo link
            a <DsInboxEmail>{view.email}</DsInboxEmail>.
          </p>
          {view.error && (
            <div className="mt-6">
              <DsCallout title="Invio non riuscito">{view.error}</DsCallout>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DsFormButton
              onClick={() => resend(view.email)}
              disabled={view.sending}
              aria-busy={view.sending || undefined}
            >
              {view.sending ? 'Invio in corso…' : 'Inviami un nuovo link'}
            </DsFormButton>
            <DsButton href={LANDING_ROUTES.login} variant="ghost" size="lg">
              Torna all&apos;accesso
            </DsButton>
          </div>
        </div>
      )
    case 'resent':
      return (
        <div key="resent">
          <Clock className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
          <FocusedTitle>Nuovo link inviato</FocusedTitle>
          <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
            Controlla la posta di <DsInboxEmail>{view.email}</DsInboxEmail>. Il nuovo link vale 24
            ore; quello vecchio non funziona più.
          </p>
          <div className="mt-6">
            <DsCallout tone="note" title="Nota">
              Se non arriva entro un minuto, controlla la posta indesiderata. Puoi chiudere questa
              pagina.
            </DsCallout>
          </div>
        </div>
      )
    case 'dead':
      return (
        <div key="dead">
          <Link2Off className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
          <FocusedTitle>Il link non vale più</FocusedTitle>
          <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">
            È già stato usato oppure ne hai ricevuto uno più recente. Se hai già confermato
            l&apos;email puoi accedere; altrimenti apri il link dell&apos;ultima email che ti
            abbiamo mandato.
          </p>
          <div className="mt-6">
            <DsButton href={LANDING_ROUTES.login} variant="primary" size="lg" iconEnd="arrow-right">
              Vai all&apos;accesso
            </DsButton>
          </div>
        </div>
      )
    case 'error':
      return (
        <div key="error">
          <TriangleAlert className="h-8 w-8 text-ds-ink" strokeWidth={2} aria-hidden />
          <FocusedTitle>Verifica non riuscita</FocusedTitle>
          <p className="ds-body-lg mt-3 text-ds-ink-muted [text-wrap:pretty]">{view.message}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DsFormButton onClick={retry}>Riprova</DsFormButton>
            <DsButton href={LANDING_ROUTES.login} variant="ghost" size="lg">
              Torna all&apos;accesso
            </DsButton>
          </div>
        </div>
      )
  }
}

/** «Verifica in corso…»: titolo, una riga e due barre in surface-sunken al posto del testo. */
function Verifying() {
  return (
    <div aria-busy="true">
      <h1 className="ds-title">Verifica in corso…</h1>
      <p className="ds-body-lg mt-3 text-ds-ink-muted">
        Stiamo controllando il link. Ci vuole un attimo.
      </p>
      <div className="mt-6 flex flex-col gap-2.5" aria-hidden>
        <div className="h-3.5 w-[70%] rounded bg-ds-surface-sunken" />
        <div className="h-3.5 w-1/2 rounded bg-ds-surface-sunken" />
      </div>
    </div>
  )
}

/**
 * Titolo che prende il fuoco al cambio di vista, perché il lettore di schermo lo annunci. Ogni
 * vista ha la sua `key`: fra due viste con la stessa forma il titolo si rimonta e torna a fuoco.
 */
function FocusedTitle({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <h1 ref={ref} tabIndex={-1} className="ds-title mt-4 outline-none [text-wrap:pretty]">
      {children}
    </h1>
  )
}
