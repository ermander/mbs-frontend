import * as React from 'react'

import { cn } from '@/lib/utils'
import { landingButtonVariant, landingFocusRing } from '@/components/landing/landing-primitives'
import { GOOGLE_AUTH_START_URL } from '@/services/api/auth-client'

/**
 * «Continua con Google» (§14.246): un link, non un pulsante. La navigazione va a
 * /api/auth/google, che il frontend inoltra al backend; quello manda il browser alla
 * schermata di consenso di Google e lo riporta su /accesso-google con i cookie di sessione.
 * Niente script di Google nella pagina, così la CSP di middleware.ts resta com'è. Un <a>
 * e non il Link di Next: la rotta non è una pagina dell'app e risponde con un redirect
 * verso un altro dominio. Stesse misure del pulsante ghost dei form (40px, raggio 6).
 */
export function GoogleSignInButton({
  label = 'Continua con Google',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <a
      href={GOOGLE_AUTH_START_URL}
      className={cn(
        'inline-flex h-10 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-ow-btn px-4 text-sm font-medium tracking-[-0.011em] transition-[opacity,background-color]',
        landingFocusRing,
        landingButtonVariant.ghost,
        className,
      )}
    >
      <GoogleMark />
      {label}
    </a>
  )
}

/** Il marchio «G» di Google nei suoi quattro colori: è un marchio di terzi, non un accento nostro. */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
