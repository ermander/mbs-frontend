import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function RecuperoPasswordPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Password dimenticata?
            </h1>
            <p className="text-muted-foreground">
              Inserisci l&apos;email del tuo account: ti invieremo un link per reimpostare la
              password.
            </p>
          </div>
          <Card className="mt-8">
            <CardHeader className="space-y-0 pb-4">
              <h2 className="sr-only">Form recupero password</h2>
            </CardHeader>
            <CardContent>
              <ForgotPasswordForm />
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  )
}
