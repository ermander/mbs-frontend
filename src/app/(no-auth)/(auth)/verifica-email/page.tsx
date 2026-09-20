import { Suspense } from 'react'

import { VerificaEmailClient } from '@/components/auth/verifica-email-client'

export default function VerificaEmailPage() {
  return (
    <Suspense
      fallback={
        <p className="text-[15px] text-ow-text-3" role="status">
          Verifica in corso...
        </p>
      }
    >
      <VerificaEmailClient />
    </Suspense>
  )
}
