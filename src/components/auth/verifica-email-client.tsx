'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { authClient } from '@/services/api/auth-client'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthMessage } from '@/components/auth/auth-primitives'
import { LandingButton } from '@/components/landing/landing-primitives'

type Status = 'idle' | 'loading' | 'success' | 'invalid' | 'error'

export function VerificaEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = React.useState<Status>(token ? 'loading' : 'invalid')
  const [userEmail, setUserEmail] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    let cancelled = false
    setStatus('loading')
    authClient
      .verifyEmail(token)
      .then((res) => {
        if (!cancelled) {
          setUserEmail(res.user.email)
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <div className="flex flex-col gap-8">
        <AuthHeader
          title="Link non valido"
          subtitle="Il link di verifica non è valido o è stato utilizzato in modo errato. Richiedi una nuova verifica effettuando di nuovo la registrazione o contatta il supporto."
        />
        <LandingButton href="/login" variant="ghost" className="self-start">
          Torna al login
        </LandingButton>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <p className="text-[15px] text-ow-text-3" role="status">
        Verifica in corso...
      </p>
    )
  }

  if (status === 'success' && userEmail) {
    return (
      <div className="flex flex-col gap-8">
        <AuthHeader
          title="Email verificata"
          subtitle="Il tuo account è attivo. Verrai reindirizzato alla tua dashboard."
        />
        <AuthMessage tone="success">Email verificata con successo per {userEmail}.</AuthMessage>
        <LandingButton href={POST_AUTH_REDIRECT} variant="accent" className="self-start">
          Vai alla dashboard
        </LandingButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Link non valido o scaduto"
        subtitle="Il link di verifica non è più valido. Registrati nuovamente o effettua il login per richiedere una nuova email di verifica."
      />
      <LandingButton href="/login" variant="ghost" className="self-start">
        Torna al login
      </LandingButton>
    </div>
  )
}
