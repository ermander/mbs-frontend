import Link from 'next/link'
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
  const verified = Boolean(token)

  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Verifica la tua email
                </h1>
                {verified ? (
                  <>
                    <p className="font-medium text-primary">Email verificata con successo.</p>
                    <p className="text-sm text-muted-foreground">
                      Il tuo account è attivo. Puoi accedere con le tue credenziali.
                    </p>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/login">Accedi</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Ti abbiamo inviato un link di conferma all&apos;indirizzo email che hai
                      indicato in registrazione. Controlla la tua casella (e la cartella spam) e
                      clicca il link per attivare l&apos;account.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Non hai ricevuto l&apos;email? In futuro potrai richiederne una nuova dalla
                      pagina di login.
                    </p>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/login">Torna al login</Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  )
}
