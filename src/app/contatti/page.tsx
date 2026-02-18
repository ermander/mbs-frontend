import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContactForm } from '@/components/contact/contact-form'

export default function ContattiPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-2xl space-y-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Contatti</h1>
            <p className="mt-2 text-muted-foreground">
              Per domande, supporto o collaborazioni puoi scriverci o usare il form sotto.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Scrivici</h2>
            <p className="text-muted-foreground">
              Email:{' '}
              <a
                href="mailto:info@example.com"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                info@example.com
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              [Indirizzo o altri recapiti placeholder da aggiornare]
            </p>
          </section>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-foreground">Invia un messaggio</h2>
              <p className="text-sm text-muted-foreground">
                Compila il form e ti risponderemo al più presto.
              </p>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  )
}
