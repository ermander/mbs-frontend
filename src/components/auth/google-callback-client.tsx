'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { authClient } from '@/services/api/auth-client'
import { useAuthStore } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthMessage } from '@/components/auth/auth-primitives'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { LandingButton } from '@/components/landing/landing-primitives'

/** I codici che il backend mette in ?error= quando una gamba del giro con Google fallisce. */
const ERROR_MESSAGES: Record<string, string> = {
  google_unavailable:
    "L'accesso con Google non è disponibile al momento. Accedi con email e password.",
  google_denied: "Hai annullato l'accesso con Google.",
  google_state: 'La richiesta di accesso è scaduta o non è valida. Riprova.',
  google_email_unverified:
    "L'indirizzo email del tuo account Google non risulta verificato da Google: verificalo e riprova, oppure registrati con email e password.",
  google_failed:
    "Non siamo riusciti a completare l'accesso con Google. Riprova fra qualche istante.",
}

/**
 * /accesso-google (§14.246): dove il backend riporta il browser alla fine del giro con Google.
 * Senza errore i cookie di sessione sono già impostati: si legge /auth/me, si mette l'utente
 * nello store (che persiste `isLoggedIn`, quello che DashboardAuthGuard controlla) e si va
 * alla dashboard. Con ?error= si spiega e si offre di riprovare o di accedere con la password.
 */
export function GoogleCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)
  const errorCode = searchParams.get('error')
  const [meFailed, setMeFailed] = React.useState(false)

  React.useEffect(() => {
    if (errorCode) return
    let cancelled = false
    authClient
      .me()
      .then(({ user }) => {
        if (cancelled) return
        setUser(user)
        router.replace(POST_AUTH_REDIRECT)
      })
      .catch(() => {
        if (!cancelled) setMeFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [errorCode, router, setUser])

  if (!errorCode && !meFailed) {
    return (
      <p className="text-[15px] text-ow-text-3" role="status">
        Accesso in corso...
      </p>
    )
  }

  const unavailable = errorCode === 'google_unavailable'
  const message = (errorCode && ERROR_MESSAGES[errorCode]) || ERROR_MESSAGES.google_failed

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Accesso con Google non riuscito"
        subtitle={
          unavailable
            ? 'Puoi accedere con email e password.'
            : 'Puoi riprovare con Google oppure accedere con email e password.'
        }
      />
      <AuthMessage tone="error">{message}</AuthMessage>
      <div className="flex flex-col gap-3">
        {!unavailable && <GoogleSignInButton label="Riprova con Google" />}
        <LandingButton href="/login" variant={unavailable ? 'accent' : 'ghost'} className="h-10">
          Vai al login
        </LandingButton>
      </div>
    </div>
  )
}
