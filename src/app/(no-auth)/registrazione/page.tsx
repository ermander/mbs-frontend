import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RegistrationForm } from '@/components/auth/registration-form'

export default function RegistrazionePage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md">
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Crea un account</h1>
            <p className="text-muted-foreground">
              Inizia gratis. Inserisci i tuoi dati per registrarti.
            </p>
          </div>
          <Card className="mt-8">
            <CardHeader className="space-y-0 pb-4">
              <h2 className="sr-only">Form di registrazione</h2>
            </CardHeader>
            <CardContent>
              <RegistrationForm />
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  )
}
