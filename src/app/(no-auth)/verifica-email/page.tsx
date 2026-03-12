import Link from 'next/link'
import { authClient } from '@/services/api/auth-client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface VerificaEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerificaEmailPage({ searchParams }: VerificaEmailPageProps) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token) {
    return (
      <>
        <Header />
        <main className="py-12 sm:py-16">
          <Container className="max-w-md">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6 text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Link non valido
                  </h1>
                  <p className="text-muted-foreground">
                    Il link di verifica non è valido o è stato utilizzato in modo errato. Richiedi
                    una nuova verifica effettuando di nuovo la registrazione o contatta il supporto.
                  </p>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/login">Torna al login</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  let verifyResult: { user: { email: string } } | null = null
  try {
    verifyResult = await authClient.verifyEmail(token)
  } catch {
    verifyResult = null
  }

  if (verifyResult) {
    const { user } = verifyResult
    return (
      <>
        <Header />
        <main className="py-12 sm:py-16">
          <Container className="max-w-md">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6 text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Email verificata
                  </h1>
                  <p className="font-medium text-primary">
                    Email verificata con successo per {user.email}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Il tuo account è attivo. Verrai reindirizzato alla homepage autenticata.
                  </p>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/">Vai alla home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Link non valido o scaduto
                </h1>
                <p className="text-muted-foreground">
                  Il link di verifica non è più valido. Registrati nuovamente o effettua il login
                  per richiedere una nuova email di verifica.
                </p>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/login">Torna al login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  )
}
