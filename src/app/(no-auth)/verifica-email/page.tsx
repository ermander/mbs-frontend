import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { VerificaEmailClient } from '@/components/auth/verifica-email-client'

export default function VerificaEmailPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          <Suspense
            fallback={
              <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                Verifica in corso...
              </div>
            }
          >
            <VerificaEmailClient />
          </Suspense>
        </Container>
      </main>
      <Footer />
    </>
  )
}
