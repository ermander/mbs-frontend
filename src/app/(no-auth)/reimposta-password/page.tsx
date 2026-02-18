import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

interface ReimpostaPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ReimpostaPasswordPage({ searchParams }: ReimpostaPasswordPageProps) {
  const params = await searchParams
  const token = params.token ?? ''

  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          {!token ? (
            <div className="space-y-6 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Link non valido</h1>
              <p className="text-muted-foreground">
                Il link per reimpostare la password non è valido o è scaduto. Richiedi un nuovo link
                dalla pagina di recupero password.
              </p>
              <p>
                <Link
                  href="/recupero-password"
                  className="rounded font-medium text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Recupero password
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Reimposta password
                </h1>
                <p className="text-muted-foreground">
                  Inserisci la nuova password per il tuo account.
                </p>
              </div>
              <Card className="mt-8">
                <CardHeader className="space-y-0 pb-4">
                  <h2 className="sr-only">Form reimposta password</h2>
                </CardHeader>
                <CardContent>
                  <ResetPasswordForm token={token} />
                </CardContent>
              </Card>
            </>
          )}
        </Container>
      </main>
      <Footer />
    </>
  )
}
