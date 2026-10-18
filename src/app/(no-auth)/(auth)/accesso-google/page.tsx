import { Suspense } from 'react'

import { GoogleCallbackClient } from '@/components/auth/google-callback-client'

/** Fine del giro «Continua con Google» (§14.246): il backend riporta qui il browser. */
export default function AccessoGooglePage() {
  return (
    <Suspense
      fallback={
        <p className="text-[15px] text-ow-text-3" role="status">
          Accesso in corso...
        </p>
      }
    >
      <GoogleCallbackClient />
    </Suspense>
  )
}
