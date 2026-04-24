import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { VerificaEmailClient } from '@/components/auth/verifica-email-client'

export default function VerificaEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Verifica in corso...
          </CardContent>
        </Card>
      }
    >
      <VerificaEmailClient />
    </Suspense>
  )
}
